#!/usr/bin/env node
/**
 * verify-media-existence.mjs
 * Quick diagnostics script to confirm Cloudflare Pages / R2 media objects exist.
 * Uses range request (bytes=0-0) to minimize transfer while verifying object presence.
 *
 * Usage:
 *   node scripts/video/verify-media-existence.mjs --base=https://repcue-dev.pages.dev --ids=dead-bug,glute-bridges,high-knees,jumping-jacks
 *
 * Exit code 0 even if missing objects (non-destructive); inspect summary.
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const argMap = Object.fromEntries(args.map(a => {
  const [k,v] = a.split('=');
  return [k.replace(/^--/, ''), v];
}));

const base = (argMap.base || '').replace(/\/$/, '');
if (!base) {
  console.error('ERROR: --base is required (e.g. https://repcue-dev.pages.dev)');
  process.exit(1);
}

const idsFilter = argMap.ids ? argMap.ids.split(',').map(s => s.trim()).filter(Boolean) : [];

const manifestPath = path.resolve('apps/frontend/public/exercise_media.json');
if (!fs.existsSync(manifestPath)) {
  console.error('ERROR: exercise_media.json not found at', manifestPath);
  process.exit(1);
}

let manifestRaw;
try { manifestRaw = fs.readFileSync(manifestPath,'utf8'); } catch (e) { console.error('ERROR reading manifest', e); process.exit(1); }

let manifest;
try { manifest = JSON.parse(manifestRaw); } catch (e) { console.error('ERROR parsing manifest', e); process.exit(1); }

if (!Array.isArray(manifest)) {
  console.error('ERROR: manifest expected array');
  process.exit(1);
}

const targetEntries = idsFilter.length ? manifest.filter(e => idsFilter.includes(e.id)) : manifest;
if (idsFilter.length && targetEntries.length === 0) {
  console.warn('WARNING: No matching IDs found in manifest for filter:', idsFilter.join(','));
}

// Minimal concurrency-limited runner without leaking references
const concurrency = 6;
const queue = [];
function enqueue(taskFactory) { queue.push(taskFactory); }

async function runQueue() {
  const outputs = [];
  let index = 0;

  const worker = async () => {
    while (true) {
      const current = index++;
      if (current >= queue.length) break;
      const task = queue[current];
      try {
        const res = await task();
        outputs.push(res);
      } catch (err) {
        outputs.push({ error: err instanceof Error ? err.message : String(err) });
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => worker());
  await Promise.all(workers);
  return outputs;
}

function collectUrls(entry) {
  const urls = [];
  if (entry?.variants) {
    for (const aspect of Object.keys(entry.variants)) {
      for (const res of Object.keys(entry.variants[aspect])) {
        const formats = entry.variants[aspect][res];
        for (const fmt of Object.keys(formats)) {
          const url = formats[fmt]?.url;
          if (url) urls.push({ url, aspect, res, fmt });
        }
      }
    }
  }
  return urls;
}

for (const entry of targetEntries) {
  const urls = collectUrls(entry);
  if (urls.length === 0) {
    // No variants recorded for this entry
    console.log(`\nExercise: ${entry.id}`);
    console.log('  Variants: 0  Accessible: 0  Missing: 0');
    continue;
  }
  for (const u of urls) {
    enqueue(() => (async () => {
      const full = base + u.url;
      let ok = false, status = 0;
      try {
        const res = await fetch(full, { headers: { Range: 'bytes=0-0' }, cache: 'no-store' });
        status = res.status;
        ok = res.ok || status === 206;
      } catch (err) {
        return { id: entry.id, ...u, full, ok: false, status: 'FETCH_ERROR', error: err.message };
      }
      return { id: entry.id, ...u, full, ok, status };
    })());
  }
}

const outputs = await runQueue();

// Aggregate per exercise
const byId = new Map();
for (const o of outputs) {
  const list = byId.get(o.id) || []; list.push(o); byId.set(o.id, list);
}

for (const [id, list] of byId.entries()) {
  const okCount = list.filter(r => r.ok).length;
  const total = list.length;
  const missing = total - okCount;
  console.log(`\nExercise: ${id}`);
  console.log(`  Variants: ${total}  Accessible: ${okCount}  Missing: ${missing}`);
  list.forEach(r => {
    const label = r.ok ? 'OK ' : 'MISS';
    console.log(`   ${label}  ${r.aspect}/${r.res}/${r.fmt}  status=${r.status}  url=${r.url}`);
  });
}

console.log('\nSummary:');
let totalVariants = 0, totalOk = 0;
for (const list of byId.values()) { totalVariants += list.length; totalOk += list.filter(r => r.ok).length; }
console.log(`  Total variants: ${totalVariants}`);
console.log(`  Accessible variants: ${totalOk}`);
console.log(`  Missing variants: ${totalVariants - totalOk}`);

console.log('\nNext actions:');
console.log('  - Re-upload missing variants with --force if any MISS entries appear.');
console.log('  - If all variants are OK yet placeholders show, investigate client selection or MIME types.');
