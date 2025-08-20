#!/usr/bin/env node

import { cp, access } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function copySplash() {
  const sourceDir = join(projectRoot, 'public', 'splash');
  const targetDir = join(projectRoot, 'dist', 'splash');

  try {
    // Check if source directory exists
    await access(sourceDir);
    console.log('Copying splash screens to dist...');
    
    // Copy recursively (Node.js 16+ supports recursive flag)
    await cp(sourceDir, targetDir, { recursive: true, force: true });
    console.log('✅ Splash screens copied successfully');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('⚠️ Splash directory not found, skipping copy');
      return;
    }
    console.error('❌ Failed to copy splash screens:', error);
    process.exit(1);
  }
}

copySplash();
