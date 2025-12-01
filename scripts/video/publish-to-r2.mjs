#!/usr/bin/env node
/**
 * RepCue Video Publisher - Upload exercise videos to Cloudflare R2 (LEGACY AWS SDK VERSION)
 * 
 * ⚠️ DEPRECATED: Use publish-to-r2-wrangler.mjs instead (simpler, no credentials needed)
 * 
 * This script uses AWS SDK v3 for R2 uploads. Requires complex credential setup.
 * Kept for reference only.
 * 
 * Recommended: Use wrangler CLI version (publish-to-r2-wrangler.mjs)
 * 
 * Usage:
 *   node scripts/video/publish-to-r2.mjs [options]
 * 
 * Options:
 *   --dir=<path>          Source directory for encoded videos (default: scripts/video/encoded)
 *   --bucket=<name>       R2 bucket name (default: repcue-videos)
 *   --dry-run[=true]      Show actions without uploading
 *   --force               Upload even if file exists (skip HEAD check)
 *   --manifest-update     Update exercise_media.json after upload
 * 
 * Environment Variables (required):
 *   CLOUDFLARE_ACCOUNT_ID   Your Cloudflare account ID
 *   R2_ACCESS_KEY_ID        R2 access key ID (from Account API Token)
 *   R2_SECRET_ACCESS_KEY    R2 secret access key (SHA-256 hash of token)
 * 
 * File Naming Convention (input):
 *   exerciseId_v1_<resolution>.<ext>
 *   Examples: plank_v1_1080.webm, pushup_v1_720.mp4
 *   Or legacy: exerciseId_v1_1920x1080.webm
 * 
 * File Naming Convention (output in R2):
 *   exerciseId_v1_<resolution>_<hash>.<ext>
 *   Hash: First 8 chars of SHA256 for immutability
 */

import fs from 'node:fs/promises';
import fscb from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

// Load .env file if it exists
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');
if (fscb.existsSync(envPath)) {
  const envContent = fscb.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

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

/**
 * Compute SHA256 hash of file content
 */
async function computeFileHash(filePath) {
  const buffer = await fs.readFile(filePath);
  const hash = createHash('sha256').update(buffer).digest('hex');
  return hash;
}

/**
 * Check file size against performance budget
 */
async function checkPerformanceBudget(filePath, ext) {
  const MAX_SIZE_MP4 = 3 * 1024 * 1024; // 3 MB
  const MAX_SIZE_WEBM = 2 * 1024 * 1024; // 2 MB
  
  const stats = await fs.stat(filePath);
  const maxSize = ext === 'mp4' ? MAX_SIZE_MP4 : MAX_SIZE_WEBM;
  
  if (stats.size > maxSize) {
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    const maxMB = (maxSize / 1024 / 1024).toFixed(2);
    console.warn(`⚠️  File exceeds budget: ${path.basename(filePath)} (${sizeMB} MB > ${maxMB} MB)`);
    return false;
  }
  return true;
}

function inferFromName(filename) {
  // Support both formats:
  // New: <exercise_id>_v1_1080.<ext> or <exercise_id>_v1_720.<ext>
  // Legacy: <exercise_id>_v1_1920x1080.<ext>
  const base = path.basename(filename);
  
  // Try new format first (resolution only)
  let m = base.match(/^(.+?)_v(\d+)_(\d{3,4}p?)\.(webm|mp4)$/i);
  if (m) {
    const [, exerciseId, vStr, resStr, ext] = m;
    const resolution = resStr.replace('p', ''); // Remove 'p' if present
    const resNum = parseInt(resolution, 10);
    return {
      exerciseId,
      version: Number(vStr),
      resolution,
      width: resNum >= 1080 ? (resNum === 1080 ? 1920 : resNum * 16 / 9) : 1280,
      height: resNum,
      aspect: 'landscape', // Assume landscape for resolution-only format
      ext: ext.toLowerCase(),
      key: base,
    };
  }
  
  // Try legacy format (widthxheight)
  m = base.match(/^(.+?)_v(\d+)_(\d+)x(\d+)\.(webm|mp4)$/i);
  if (!m) return null;
  
  const [, exerciseId, vStr, wStr, hStr, ext] = m;
  const width = Number(wStr);
  const height = Number(hStr);
  
  return {
    exerciseId,
    version: Number(vStr),
    resolution: String(height), // Use height as resolution identifier
    width,
    height,
    aspect: width >= height ? 'landscape' : (width / height < 0.75 ? 'portrait' : 'square'),
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

  const uploadResults = [];
  const warnings = [];
  
  for (const full of all) {
    const info = inferFromName(full);
    if (!info) {
      console.warn('Skipping (unsupported name):', full);
      continue;
    }
    
    // Compute hash for immutable filename
    const fullHash = await computeFileHash(full);
    const shortHash = fullHash.slice(0, 8);
    
    // Generate hashed key: exerciseId_v1_resolution_hash.ext
    const hashedKey = `${info.exerciseId}_v1_${info.resolution}_${shortHash}.${info.ext}`;
    
    // Check performance budget
    const budgetOk = await checkPerformanceBudget(full, info.ext);
    if (!budgetOk) {
      warnings.push(path.basename(full));
    }
    
    console.log(`📹 ${path.basename(full)}`);
    console.log(`   → ${hashedKey}`);

    // Upload if not exists (unless force flag)
    const exists = await headObjectIfExists(hashedKey);
    if (exists && !args.force) {
      console.log('   ✓ Already exists (skipped)\n');
    } else if (DRY_RUN) {
      console.log('   🔵 Would upload (dry-run)\n');
    } else {
      const body = await fs.readFile(full);
      await putObject(hashedKey, body, contentTypeFor(full));
      console.log('   ✅ Uploaded\n');
    }

    // Track for manifest update
    const rec = grouped.get(info.exerciseId) || { 
      mp4: null, 
      webm: null, 
      width: info.width, 
      height: info.height,
      resolution: info.resolution,
      aspect: info.aspect,
    };
    rec[info.ext] = `/media/${hashedKey}`;
    rec[`${info.ext}_hash`] = fullHash;
    grouped.set(info.exerciseId, rec);
    
    uploadResults.push({
      original: path.basename(full),
      key: hashedKey,
      exerciseId: info.exerciseId,
      resolution: info.resolution,
      format: info.ext,
      aspect: info.aspect,
      hash: fullHash,
      url: `/media/${hashedKey}`,
    });
  }
  
  // Summary
  console.log('\n📈 Summary:');
  console.log(`   📹 Processed: ${all.length} files`);
  console.log(`   ✅ Successful: ${uploadResults.length}`);
  console.log(`   ⚠️  Warnings: ${warnings.length}`);
  
  // Save mapping file for manifest builder
  if (uploadResults.length > 0 && !DRY_RUN) {
    const mappingPath = path.join(INPUT_DIR, 'upload-mapping.json');
    await fs.writeFile(mappingPath, JSON.stringify(uploadResults, null, 2));
    console.log(`\n💾 Mapping saved to: ${mappingPath}`);
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
