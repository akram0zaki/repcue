#!/usr/bin/env node
/*
publish-to-r2.mjs

- Uploads encoded exercise videos in a local directory to Cloudflare R2 via S3 API
- Updates apps/frontend/public/exercise_media.json automatically
- Sets has_video=true for matching exercises across all catalogs under apps/frontend/src/data/exercises/**

Assumptions
- Filenames follow: <exercise_id>_v1_1920x1080.<ext>
  - ext is one of: webm, mp4 (mp4 preferred for compatibility)
- Videos are landscape (1920x1080). Adjust if you later support other shapes.

Env
- CLOUDFLARE_ACCOUNT_ID
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY

Usage
node scripts/video/publish-to-r2.mjs --dir "C:/path/to/videos/out" --bucket repcue-videos --dry-run=false

Notes
- Uses immutable key equal to the basename. If you later add hashes, the key becomes hashed accordingly.
*/

import fs from 'node:fs/promises';
import fscb from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const args = Object.fromEntries(process.argv.slice(2).map(s => {
  const [k, v] = s.startsWith('--') ? s.slice(2).split('=') : [s, true];
  return [k, v === undefined ? true : v];
}));

const INPUT_DIR = args.dir || 'scripts/video/encoded';
const BUCKET = args.bucket || 'repcue-videos';
const DRY_RUN = String(args['dry-run'] || args.dryRun || 'false') === 'true';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error('Missing env vars. Set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
  forcePathStyle: true,
});

const MEDIA_JSON_PATH = path.join('apps', 'frontend', 'public', 'exercise_media.json');
const CATALOG_GLOB_ROOT = path.join('apps', 'frontend', 'src', 'data', 'exercises');

function contentTypeFor(file) {
  const lower = file.toLowerCase();
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  return 'application/octet-stream';
}

function inferFromName(filename) {
  // <exercise_id>_v1_1920x1080.<ext>
  const base = path.basename(filename);
  const m = base.match(/^(.+?)_v(\d+)_(\d+)x(\d+)\.(webm|mp4)$/i);
  if (!m) return null;
  const [, exerciseId, vStr, wStr, hStr, ext] = m;
  return {
    exerciseId,
    version: Number(vStr),
    width: Number(wStr),
    height: Number(hStr),
    aspect: Number(wStr) >= Number(hStr) ? 'landscape' : 'portrait',
    ext: ext.toLowerCase(),
    key: base,
  };
}

async function listFilesRecursive(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (ent) => {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) return await listFilesRecursive(full);
    return full;
  }));
  return files.flat();
}

async function ensureMediaJson() {
  if (!fscb.existsSync(MEDIA_JSON_PATH)) return {};
  try {
    const raw = await fs.readFile(MEDIA_JSON_PATH, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function selectPreferredUrl(existing, candidateMp4, candidateWebm) {
  // Prefer MP4 for compatibility; if absent, use WebM.
  if (candidateMp4) return candidateMp4;
  if (candidateWebm) return candidateWebm;
  return existing || null;
}

async function headObjectIfExists(Key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key }));
    return true;
  } catch {
    return false;
  }
}

async function putObject(Key, Body, ContentType) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key,
    Body,
    ContentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

async function updateCatalogHasVideo(exerciseIds) {
  // Find all .ts files under exercises folder
  async function walk(dir) {
    const out = [];
    const ents = await fs.readdir(dir, { withFileTypes: true });
    for (const e of ents) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) out.push(...await walk(full));
      else if (e.isFile() && e.name.endsWith('.ts')) out.push(full);
    }
    return out;
  }

  const files = fscb.existsSync(CATALOG_GLOB_ROOT) ? await walk(CATALOG_GLOB_ROOT) : [];
  const changed = [];

  for (const file of files) {
    let text = await fs.readFile(file, 'utf8');
    let orig = text;

    for (const id of exerciseIds) {
      // For each occurrence of id: "id: 'X'" or "id: \"X\"", ensure has_video: true within the same object literal.
      let idx = 0;
      while (true) {
        const m = text.slice(idx).match(new RegExp(String.raw`id\s*:\s*(['"])${id}\1`));
        if (!m) break;
        const abs = idx + (m.index ?? 0);
        // Walk backwards to find opening '{'
        let start = abs;
        while (start > 0 && text[start] !== '{') start--;
        if (text[start] !== '{') { idx = abs + m[0].length; continue; }
        // Walk forward to matching '}' with simple brace balance
        let balance = 0; let end = start;
        for (; end < text.length; end++) {
          if (text[end] === '{') balance++;
          else if (text[end] === '}') { balance--; if (balance === 0) { end++; break; } }
        }
        const block = text.slice(start, end);
        let newBlock = block;
        // If has_video exists, force to true
        if (/has_video\s*:\s*false/.test(block)) {
          newBlock = block.replace(/has_video\s*:\s*false/g, 'has_video: true');
        } else if (!/has_video\s*:/.test(block)) {
          // Insert after id line
          newBlock = block.replace(/(id\s*:\s*['"][^'"]+['"].*?\n)/s, (m0) => `${m0}    has_video: true,\n`);
          if (newBlock === block) {
            // Fallback: insert after opening brace
            newBlock = block.replace('{', '{\n    has_video: true,');
          }
        }
        text = text.slice(0, start) + newBlock + text.slice(end);
        idx = start + newBlock.length;
      }
    }

    if (text !== orig) {
      await fs.writeFile(file, text, 'utf8');
      changed.push(file);
    }
  }
  return changed;
}

(async () => {
  const all = (await listFilesRecursive(INPUT_DIR)).filter(p => /\.(mp4|webm)$/i.test(p));
  if (all.length === 0) {
    console.log('No video files found in', INPUT_DIR);
    process.exit(0);
  }

  const grouped = new Map(); // id -> { mp4: key, webm: key }

  for (const full of all) {
    const info = inferFromName(full);
    if (!info) {
      console.warn('Skipping (unsupported name):', full);
      continue;
    }
    const key = path.basename(full);
    const rel = key; // Object key in R2 equals basename

    // Upload if not exists
    const exists = await headObjectIfExists(rel);
    if (exists) {
      console.log('SKIP exists in R2:', rel);
    } else if (DRY_RUN) {
      console.log('[DRY] PUT', rel);
    } else {
      const body = await fs.readFile(full);
      await putObject(rel, body, contentTypeFor(full));
      console.log('UPLOADED', rel);
    }

    const rec = grouped.get(info.exerciseId) || { mp4: null, webm: null, width: info.width, height: info.height };
    rec[info.ext] = `/media/${rel}`;
    grouped.set(info.exerciseId, rec);
  }

  // Load existing manifest
  const manifest = await ensureMediaJson();

  // Update manifest with preferred URL (mp4 preferred)
  for (const [exerciseId, rec] of grouped.entries()) {
    const preferred = selectPreferredUrl(null, rec.mp4, rec.webm);
    if (!preferred) continue;
    const aspect = (rec.width >= rec.height) ? 'landscape' : 'portrait';
    const entry = manifest[exerciseId] || { id: exerciseId, repsPerLoop: 1, fps: 30, video: {} };
    entry.video = entry.video || {};
    entry.video[aspect] = preferred;
    manifest[exerciseId] = entry;
  }

  // Write manifest
  await fs.writeFile(MEDIA_JSON_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log('Updated manifest:', MEDIA_JSON_PATH);

  // Update catalogs: set has_video=true for all matched IDs
  const changed = await updateCatalogHasVideo([...grouped.keys()]);
  if (changed.length) {
    console.log('Updated has_video in:', changed.length, 'files');
    changed.forEach(f => console.log(' -', f));
  } else {
    console.log('No catalog files required changes');
  }
})();
