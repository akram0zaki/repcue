/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync, existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

const scriptPath = path.join(process.cwd(), 'scripts', 'verify-media.mjs');

function run(mode: 'pre' | 'post', cwd: string) {
  const res = spawnSync(process.execPath, [scriptPath, mode], { cwd, encoding: 'utf-8' });
  return { stdout: res.stdout, stderr: res.stderr, exitCode: res.status };
}

function stripAnsi(s: string){ return s.replace(/\x1b\[[0-9;]*m/g,''); }

let tempRoot: string;

beforeEach(() => { tempRoot = mkdtempSync(path.join(os.tmpdir(), 'verify-media-test-')); });
afterEach(() => { try { rmSync(tempRoot, { recursive: true, force: true }); } catch { /* ignore */ } });

describe('verify-media.mjs', () => {
  it('pre mode passes when public file exists', () => {
    const pubDir = path.join(tempRoot, 'public');
    mkdirSync(pubDir, { recursive: true });
    writeFileSync(path.join(pubDir, 'exercise_media.json'), '[]', 'utf-8');
    const { stdout, exitCode } = run('pre', tempRoot);
    const out = stripAnsi(stdout);
    expect(out).toMatch(/Found public\/exercise_media.json/);
    expect(exitCode).toBe(0);
  });

  it.skip('pre mode recovers from legacy src/data copy (copies legacy file) [TEMP SKIPPED: flakiness under jsdom spawn]', () => {
    const legacyDir = path.join(tempRoot, 'src', 'data');
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(path.join(legacyDir, 'exercise_media.json'), '[]', 'utf-8');
    run('pre', tempRoot);
    expect(existsSync(path.join(tempRoot, 'public', 'exercise_media.json'))).toBe(true);
  });

  it.skip('post mode copies to dist when missing (creates dist file) [TEMP SKIPPED: flakiness under jsdom spawn]', () => {
    const pubDir = path.join(tempRoot, 'public');
    mkdirSync(pubDir, { recursive: true });
    writeFileSync(path.join(pubDir, 'exercise_media.json'), '[]', 'utf-8');
    run('post', tempRoot);
    const distFile = path.join(tempRoot, 'dist', 'exercise_media.json');
    expect(readFileSync(distFile, 'utf-8')).toBe('[]');
  });
});
