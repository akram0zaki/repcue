#!/usr/bin/env node
/**
 * verify-media.mjs
 * Ensures exercise_media.json is present both in public/ (pre-build) and in dist/ (post-build).
 * If dist copy is missing post-build (leading to 404 -> HTML served -> JSON parse error),
 * we attempt recovery by copying from public/ or legacy src/data/ and emit warnings.
 */
import fs from 'fs';
import path from 'path';

const mode = process.argv[2] || 'pre';
// Run from the frontend workspace (apps/frontend)
const root = process.cwd();
const publicPath = path.join(root, 'public', 'exercise_media.json');
const legacySrcPath = path.join(root, 'src', 'data', 'exercise_media.json');
const distPath = path.join(root, 'dist', 'exercise_media.json');

function fileExists(p){ try { return fs.statSync(p).isFile(); } catch { return false; } }
function log(level, msg){
  const colors = { INFO:'\x1b[36m', WARN:'\x1b[33m', ERROR:'\x1b[31m' };
  const c = colors[level] || '\x1b[36m';
  console.log(`${c}[verify-media ${level}]\x1b[0m ${msg}`);
}

if (mode === 'pre') {
  if (!fileExists(publicPath)) {
    if (fileExists(legacySrcPath)) {
      fs.copyFileSync(legacySrcPath, publicPath);
      log('WARN','Recovered missing public/exercise_media.json from legacy src/data/. Commit this file to source control.');
    } else {
      log('ERROR','public/exercise_media.json is missing. Videos will fail in production.');
      process.exitCode = 1; // Non-fatal to not block dev experimentation
    }
  } else {
    log('INFO','Found public/exercise_media.json (pre-build check).');
  }
} else if (mode === 'post') {
  if (!fileExists(distPath)) {
    if (fileExists(publicPath)) {
      fs.copyFileSync(publicPath, distPath);
      log('WARN','dist/exercise_media.json was missing. Copied from public/. Investigate why Vite did not copy.');
    } else if (fileExists(legacySrcPath)) {
      fs.copyFileSync(legacySrcPath, distPath);
      log('WARN','dist & public missing; recovered from legacy src/data/. Please migrate permanently to public/.');
    } else {
      log('ERROR','dist/exercise_media.json missing and no recovery source available.');
      process.exitCode = 1;
    }
  } else {
    log('INFO','Found dist/exercise_media.json (post-build check).');
  }
}
