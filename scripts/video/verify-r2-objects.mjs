#!/usr/bin/env node
/**
 * Verify R2 Objects Existence (LEGACY AWS SDK VERSION)
 * 
 * ⚠️ DEPRECATED: Uses AWS SDK v3. Consider using wrangler CLI for verification.
 * 
 * Checks that all video files referenced in exercise_media.json actually exist in the R2 bucket
 * 
 * Recommended: Use `wrangler r2 object get` for verification instead
 * 
 * Environment variables required:
 * - CLOUDFLARE_ACCOUNT_ID
 * - R2_ACCESS_KEY_ID (from Account API Token)
 * - R2_SECRET_ACCESS_KEY (SHA-256 hash of token)
 * 
 * Usage: node scripts/video/verify-r2-objects.mjs
 */

import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env file if it exists
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
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

const MANIFEST_PATH = resolve(process.cwd(), 'apps/frontend/public/exercise_media.json');
const BUCKET_NAME = 'repcue-videos';

// Validate environment variables
function validateEnv() {
  const required = ['CLOUDFLARE_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.log('ℹ️  This check requires R2 credentials to verify object existence');
    console.log('ℹ️  Skipping R2 verification...');
    process.exit(0); // Exit gracefully (not a hard failure)
  }
}

// Initialize R2 client
function createR2Client() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

// Extract R2 paths from manifest
function extractR2Paths(manifest) {
  const paths = new Set();
  
  manifest.forEach(entry => {
    const { variants } = entry;
    if (!variants) return;
    
    // Check default
    if (variants.default?.url) {
      paths.add(variants.default.url);
    }
    
    // Check all aspect/resolution/format combinations
    ['landscape', 'portrait', 'square'].forEach(aspect => {
      if (!variants[aspect]) return;
      
      ['720', '1080', '1440', '2160'].forEach(resolution => {
        if (!variants[aspect][resolution]) return;
        
        ['webm', 'mp4'].forEach(format => {
          const url = variants[aspect][resolution]?.[format]?.url;
          if (url && url.startsWith('/media/')) {
            paths.add(url);
          }
        });
      });
    });
  });
  
  return Array.from(paths);
}

// Check if object exists in R2
async function checkObjectExists(client, path) {
  // Remove /media/ prefix to get the R2 key
  const key = path.replace(/^\/media\//, '');
  
  try {
    await client.send(new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }));
    return { exists: true, key };
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return { exists: false, key, error: 'Not found' };
    }
    return { exists: false, key, error: err.message };
  }
}

async function verifyR2Objects() {
  console.log('🔍 Verifying R2 objects...\n');
  
  validateEnv();
  
  // Load manifest
  let manifest;
  try {
    const content = readFileSync(MANIFEST_PATH, 'utf-8');
    manifest = JSON.parse(content);
  } catch (err) {
    console.error('❌ Failed to read manifest:', err.message);
    process.exit(1);
  }
  
  // Extract R2 paths
  const paths = extractR2Paths(manifest);
  
  if (paths.length === 0) {
    console.log('ℹ️  No R2 paths found in manifest (all using legacy paths)');
    console.log('✅ Verification complete (nothing to check)');
    process.exit(0);
  }
  
  console.log(`📋 Found ${paths.length} unique R2 paths to verify\n`);
  
  // Initialize client
  const client = createR2Client();
  
  // Check all objects
  const results = await Promise.all(
    paths.map(path => checkObjectExists(client, path))
  );
  
  // Analyze results
  const existing = results.filter(r => r.exists);
  const missing = results.filter(r => !r.exists);
  
  console.log(`\n📊 Results:`);
  console.log(`   ✅ Found: ${existing.length}`);
  console.log(`   ❌ Missing: ${missing.length}`);
  
  if (missing.length > 0) {
    console.log('\n⚠️  Missing objects:');
    missing.forEach(({ key, error }) => {
      console.log(`   - ${key} (${error})`);
    });
    
    console.log('\n💡 Tip: Upload missing videos using:');
    console.log('   node scripts/video/publish-to-r2.mjs --dir=scripts/video/encoded\n');
    
    process.exit(1);
  }
  
  console.log('\n✅ All R2 objects verified successfully!');
  process.exit(0);
}

// Run verification
verifyR2Objects().catch(err => {
  console.error('❌ Verification failed:', err.message);
  process.exit(1);
});
