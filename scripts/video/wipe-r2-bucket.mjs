#!/usr/bin/env node
/**
 * wipe-r2-bucket.mjs
 *
 * Irreversibly deletes ALL objects in a Cloudflare R2 bucket using Wrangler.
 * Loops until the bucket is empty (handles eventual consistency of listings).
 *
 * WARNING: This is destructive. There is NO backup step here.
 * Ensure you truly want to purge the bucket before running.
 *
 * Usage:
 *   node scripts/video/wipe-r2-bucket.mjs --bucket=repcue-videos [--limit=1000] [--confirm]
 *
 * Flags:
 *   --bucket   (required)  Name of the R2 bucket bound in wrangler.toml
 *   --limit    (optional)  Max objects per list pass (default 1000, Wrangler max)
 *   --confirm  (optional)  Must be provided to actually delete. Without it, script exits.
 *
 * Exit codes:
 *   0 success (or already empty)
 *   1 usage / argument error
 *   2 wrangler invocation failure
 */

import { spawnSync } from 'node:child_process';

function parseArgs() {
  const out = {};
  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith('--')) continue;
    const [k,v] = arg.replace(/^--/, '').split('=');
    out[k] = v === undefined ? true : v;
  }
  return out;
}

function log(level, msg, extra) {
  const colors = { INFO: '\x1b[36m', WARN: '\x1b[33m', ERROR: '\x1b[31m', DONE: '\x1b[32m' };
  const c = colors[level] || '\x1b[36m';
  const payload = extra ? ` ${JSON.stringify(extra)}` : '';
  console.log(`${c}[wipe-r2 ${level}]\x1b[0m ${msg}${payload}`);
}

function runWrangler(args) {
  const attempts = [];
  // Prefer shell resolution on Windows to pick up PATH shims
  attempts.push({ cmd: 'wrangler', fullArgs: args, opts: { encoding: 'utf-8', shell: true, windowsHide: true } });
  // Direct invoke
  attempts.push({ cmd: 'wrangler', fullArgs: args, opts: { encoding: 'utf-8' } });
  if (process.platform === 'win32') {
    attempts.push({ cmd: 'wrangler.cmd', fullArgs: args, opts: { encoding: 'utf-8', shell: true, windowsHide: true } });
  }
  // Package manager fallbacks
  attempts.push({ cmd: 'npx', fullArgs: ['-y', 'wrangler', ...args], opts: { encoding: 'utf-8' } });
  attempts.push({ cmd: 'pnpm', fullArgs: ['dlx', 'wrangler', ...args], opts: { encoding: 'utf-8' } });

  let lastError = null;
  for (const a of attempts) {
    const res = spawnSync(a.cmd, a.fullArgs, a.opts);
    if (res.error) {
      lastError = res.error;
      continue;
    }
    // We started the process; return regardless of exit status (caller will check status)
    if (res.status !== 0) {
      // Still return so caller can read stderr and decide
      return res;
    }
    return res;
  }
  log('ERROR', 'Failed to start wrangler', { error: lastError ? lastError.message : 'unknown' });
  process.exit(2);
}

const args = parseArgs();
const bucket = args.bucket;
const limit = Number(args.limit || 1000);
const confirmed = !!args.confirm;

if (!bucket) {
  log('ERROR', 'Missing required --bucket argument');
  process.exit(1);
}

if (!confirmed) {
  log('WARN', 'Confirmation flag missing. Add --confirm to proceed with deletion.');
  process.exit(1);
}

log('INFO', 'Starting destructive purge', { bucket, limit });

let pass = 0;
let totalDeleted = 0;
const startTs = Date.now();

while (true) {
  pass++;
  log('INFO', `Listing objects (pass ${pass})`);
  const listArgs = ['r2', 'object', 'list', bucket, `--limit=${limit}`, '--json'];
  const listRes = runWrangler(listArgs);
  if (listRes.status !== 0) {
    log('ERROR', 'Listing failed; aborting', { status: listRes.status, stderr: (listRes.stderr || '').trim(), stdout: (listRes.stdout || '').trim(), args: listArgs });
    process.exit(2);
  }
  let listJson;
  try {
    listJson = JSON.parse(listRes.stdout || '');
  } catch (e) {
    log('ERROR', 'Failed to parse list JSON', { error: e.message });
    process.exit(2);
  }
  const objects = listJson.objects || [];
  if (objects.length === 0) {
    log('DONE', 'Bucket empty');
    break;
  }

  log('INFO', `Deleting ${objects.length} objects`);
  for (const obj of objects) {
    const key = obj.key;
    const delRes = runWrangler(['r2', 'object', 'delete', bucket, key]);
    if (delRes.status === 0) {
      totalDeleted++;
    } else {
      log('WARN', 'Delete failed for key (will continue)', { key });
    }
  }
  // Small delay to allow eventual consistency to catch up
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500); // ~0.5s
}

const durationMs = Date.now() - startTs;
log('DONE', 'Purge complete', { totalDeleted, passes: pass, durationMs });
process.exit(0);