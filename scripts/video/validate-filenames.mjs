#!/usr/bin/env node
/**
 * Validate filename patterns in exercise_media.json
 * Ensures R2 video paths follow the expected naming convention:
 * /media/{exerciseId}_v{version}_{resolution}_{hash}.{format}
 * 
 * Usage: node scripts/video/validate-filenames.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const MANIFEST_PATH = resolve(process.cwd(), 'apps/frontend/public/exercise_media.json');

// Expected pattern: /media/exerciseId_v1_1080_abc12345.webm
const R2_PATH_PATTERN = /^\/media\/[a-z0-9_-]+_v\d+_\d{3,4}_[a-f0-9]{8}\.(webm|mp4)$/i;

// Legacy path pattern (still valid during migration)
const LEGACY_PATH_PATTERN = /^\/videos\/.+\.(webm|mp4)$/i;

function validateFilenames() {
  console.log('📋 Validating exercise media manifest filenames...\n');

  let manifest;
  try {
    const content = readFileSync(MANIFEST_PATH, 'utf-8');
    manifest = JSON.parse(content);
  } catch (err) {
    console.error('❌ Failed to read manifest:', err.message);
    process.exit(1);
  }

  if (!Array.isArray(manifest)) {
    console.error('❌ Manifest is not an array');
    process.exit(1);
  }

  const errors = [];
  const warnings = [];
  let r2Count = 0;
  let legacyCount = 0;

  manifest.forEach((entry, index) => {
    const { id, variants, video } = entry;

    // Check R2 variants (new format)
    if (variants) {
      r2Count++;
      
      // Check default path if present
      if (variants.default?.url && !R2_PATH_PATTERN.test(variants.default.url)) {
        errors.push(`[${id || index}] Invalid default URL: ${variants.default.url}`);
      }

      // Check all aspect/resolution/format paths
      ['landscape', 'portrait', 'square'].forEach(aspect => {
        if (!variants[aspect]) return;
        
        ['720', '1080', '1440', '2160'].forEach(resolution => {
          if (!variants[aspect][resolution]) return;
          
          ['webm', 'mp4'].forEach(format => {
            const path = variants[aspect][resolution]?.[format]?.url;
            if (path && !R2_PATH_PATTERN.test(path)) {
              errors.push(`[${id || index}] Invalid ${aspect}/${resolution}/${format} path: ${path}`);
            }
          });
        });
      });
    }

    // Check legacy video paths (still valid during migration)
    if (video) {
      legacyCount++;
      ['landscape', 'portrait', 'square'].forEach(aspect => {
        const path = video[aspect];
        if (path && !LEGACY_PATH_PATTERN.test(path) && !R2_PATH_PATTERN.test(path)) {
          warnings.push(`[${id || index}] Legacy path with unexpected format: ${path}`);
        }
      });
    }

    // Warn if entry has neither variants nor video
    if (!variants && !video) {
      warnings.push(`[${id || index}] Exercise has no video paths (neither variants nor legacy)`);
    }
  });

  // Report results
  console.log(`✅ Processed ${manifest.length} entries`);
  console.log(`   - R2 variants: ${r2Count}`);
  console.log(`   - Legacy paths: ${legacyCount}`);
  console.log('');

  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   ${warning}`));
    console.log('');
  }

  if (errors.length > 0) {
    console.error('❌ Validation Errors:');
    errors.forEach(error => console.error(`   ${error}`));
    console.log('');
    console.error(`❌ Found ${errors.length} error(s)`);
    process.exit(1);
  }

  console.log('✅ All filename patterns are valid!');
  process.exit(0);
}

// Run validation
validateFilenames();
