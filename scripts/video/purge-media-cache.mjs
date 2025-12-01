#!/usr/bin/env node
/**
 * purge-media-cache.mjs
 *
 * Purges Cloudflare CDN cache for all media URLs referenced in exercise_media.json.
 * Avoids wildcard purge by enumerating exact file URLs.
 *
 * Requirements:
 *   - Cloudflare API Token with `Zone.Cache Purge` permission
 *   - Zone ID for the domain serving your Pages site
 *
 * Usage (Windows PowerShell):
 *   node scripts/video/purge-media-cache.mjs --base=https://repcue-dev.pages.dev --zone-id=<ZONE_ID> --token=<API_TOKEN>
 *
 * You can also set env vars CF_ZONE_ID and CF_API_TOKEN instead of flags.
 */

import fs from 'node:fs';
import path from 'node:path';

function args() {
  const out = {};
  for (const a of process.argv.slice(2)) {
    if (!a.startsWith('--')) continue;
    const [k,v] = a.replace(/^--/, '').split('=');
    out[k] = v === undefined ? true : v;
  }
  return out;
}

function log(level, msg, extra) {
  const colors = { INFO: '\x1b[36m', WARN: '\x1b[33m', ERROR: '\x1b[31m', DONE: '\x1b[32m' };
  const c = colors[level] || '\x1b[36m';
  const payload = extra ? ` ${JSON.stringify(extra)}` : '';
  console.log(`${c}[purge-media ${level}]\x1b[0m ${msg}${payload}`);
}

const a = args();
const base = (a.base || '').replace(/\/$/, '');
const zoneId = a['zone-id'] || process.env.CF_ZONE_ID;
const token = a.token || process.env.CF_API_TOKEN;

if (!base) { log('ERROR', 'Missing --base (e.g., https://repcue-dev.pages.dev)'); process.exit(1); }
if (!zoneId) { log('ERROR', 'Missing --zone-id or CF_ZONE_ID env'); process.exit(1); }
if (!token) { log('ERROR', 'Missing --token or CF_API_TOKEN env'); process.exit(1); }

const manifestPath = path.resolve('apps/frontend/public/exercise_media.json');
if (!fs.existsSync(manifestPath)) { log('ERROR', `Manifest not found at ${manifestPath}`); process.exit(1); }

let manifest;
try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
catch (e) { log('ERROR', 'Failed to read/parse manifest', { error: e.message }); process.exit(1); }

if (!Array.isArray(manifest)) { log('ERROR', 'Manifest not an array'); process.exit(1); }

function collectUrls(entry) {
  const urls = [];
  const v = entry?.variants || {};
  for (const aspect of Object.keys(v)) {
    for (const res of Object.keys(v[aspect])) {
      const formats = v[aspect][res] || {};
      for (const fmt of Object.keys(formats)) {
        const u = formats[fmt]?.url;
        if (u) urls.push(u);
      }
    }
  }
  return urls;
}

const relativeUrls = [...new Set(manifest.flatMap(collectUrls))];
const absoluteUrls = relativeUrls.map(u => `${base}${u}`);
log('INFO', 'Collected media URLs', { count: absoluteUrls.length });

if (absoluteUrls.length === 0) {
  log('DONE', 'No media URLs to purge');
  process.exit(0);
}

// Cloudflare API: limit files per request (use 30 to be safe)
const chunkSize = 30;
const chunks = [];
for (let i = 0; i < absoluteUrls.length; i += chunkSize) {
  chunks.push(absoluteUrls.slice(i, i + chunkSize));
}

async function purge(files) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ files })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new Error(`Purge failed: status=${res.status} body=${JSON.stringify(body)}`);
  }
  return body;
}

(async () => {
  let done = 0;
  for (const chunk of chunks) {
    log('INFO', 'Purging chunk', { start: done, size: chunk.length });
    await purge(chunk);
    done += chunk.length;
  }
  log('DONE', 'Purge complete', { totalPurged: done, chunks: chunks.length });
  process.exit(0);
})().catch(err => {
  log('ERROR', err.message || String(err));
  process.exit(2);
});
