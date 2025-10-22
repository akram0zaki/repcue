#!/usr/bin/env node
/**
 * Legal Manifest Generation Script
 * 
 * Generates the baseline legal manifest with content hashes for all supported locales.
 * This script should run as part of the build process to ensure the manifest is always
 * up-to-date with the latest legal documents and locales.
 * 
 * Usage:
 *   node scripts/generate-legal-manifest.mjs
 * 
 * Output:
 *   public/legal/manifest.json
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supported locales - matches i18next configuration
const LOCALES = ['en', 'ar', 'nl'];

// Legal documents directory
const LEGAL_DIR = path.join(__dirname, '..', 'public', 'legal');
const OUTPUT_FILE = path.join(LEGAL_DIR, 'manifest.json');

/**
 * Document metadata
 * Keep this synchronized with legal document files
 */
const DOCUMENTS = [
  {
    id: 'terms_conditions',
    title: 'Terms & Conditions',
    version: '1.0.0',
    required: true,
    policy: 'deferred',
    effectiveFrom: '2025-11-01T00:00:00Z',
    filePrefix: '01-terms_conditions'
  },
  {
    id: 'privacy_policy',
    title: 'Privacy Policy',
    version: '1.0.0',
    required: true,
    policy: 'deferred',
    effectiveFrom: '2025-11-01T00:00:00Z',
    filePrefix: '02-privacy_policy'
  },
  {
    id: 'cookie_policy',
    title: 'Cookie Policy',
    version: '1.0.0',
    required: true,
    policy: 'deferred',
    effectiveFrom: '2025-11-01T00:00:00Z',
    filePrefix: '03-cookie_policy'
  },
  {
    id: 'medical_disclaimer',
    title: 'Medical Disclaimer',
    version: '1.0.0',
    required: true,
    policy: 'deferred',
    effectiveFrom: '2025-11-01T00:00:00Z',
    filePrefix: '04-medical_disclaimer'
  },
  {
    id: 'liability_waiver',
    title: 'Liability Waiver',
    version: '1.0.0',
    required: true,
    policy: 'deferred',
    effectiveFrom: '2025-11-01T00:00:00Z',
    filePrefix: '05-liability_waiver'
  },
  {
    id: 'dpa',
    title: 'Data Processing Agreement',
    version: '1.0.0',
    required: false,
    policy: 'deferred',
    filePrefix: '06-dpa'
  },
  {
    id: 'subscription_policy',
    title: 'Subscription & Payment Policy',
    version: '1.0.0',
    required: false,
    policy: 'deferred',
    filePrefix: '07-subscription_policy'
  },
  {
    id: 'community_guidelines',
    title: 'Community Guidelines',
    version: '1.0.0',
    required: false,
    policy: 'deferred',
    filePrefix: '08-community_guidelines'
  }
];

/**
 * Generate SHA-256 base64 content hash for a file
 */
async function generateContentHash(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const hash = crypto.createHash('sha256');
  hash.update(content);
  return hash.digest('base64');
}

/**
 * Check if a file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate manifest for all documents and locales
 */
async function generateManifest() {
  console.log('🔨 Generating legal manifest...\n');

  const manifest = {
    updatedAt: new Date().toISOString(),
    documents: []
  };

  let successCount = 0;
  let errorCount = 0;

  for (const doc of DOCUMENTS) {
    console.log(`📄 Processing ${doc.id}...`);
    
    const docEntry = {
      id: doc.id,
      title: doc.title,
      version: doc.version,
      required: doc.required,
      policy: doc.policy,
      locales: []
    };

    // Add effectiveFrom if present
    if (doc.effectiveFrom) {
      docEntry.effectiveFrom = doc.effectiveFrom;
    }

    // Process each locale
    for (const locale of LOCALES) {
      const filename = `${doc.filePrefix}.${locale}.md`;
      const filePath = path.join(LEGAL_DIR, filename);
      
      if (await fileExists(filePath)) {
        const contentHash = await generateContentHash(filePath);
        docEntry.locales.push({
          locale,
          path: `/legal/${filename}`,
          contentHash
        });
        console.log(`  ✅ ${locale}: ${contentHash.substring(0, 8)}...`);
        successCount++;
      } else {
        console.warn(`  ⚠️  ${locale}: File not found (${filename})`);
        errorCount++;
      }
    }

    if (docEntry.locales.length > 0) {
      manifest.documents.push(docEntry);
    } else {
      console.error(`  ❌ No locales found for ${doc.id}`);
      errorCount++;
    }
  }

  // Write manifest
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(manifest, null, 2), 'utf-8');
  
  console.log('\n✅ Manifest generation complete!');
  console.log(`   Output: ${OUTPUT_FILE}`);
  console.log(`   Documents: ${manifest.documents.length}`);
  console.log(`   Locales: ${successCount} files processed`);
  
  if (errorCount > 0) {
    console.warn(`\n⚠️  ${errorCount} warnings/errors encountered`);
    console.warn('   Some locale files may be missing');
  }

  return manifest;
}

// Run script
try {
  const manifest = await generateManifest();
  
  // Verify manifest structure
  const totalLocales = manifest.documents.reduce((sum, doc) => sum + doc.locales.length, 0);
  const expectedLocales = DOCUMENTS.length * LOCALES.length;
  
  if (totalLocales < expectedLocales) {
    console.warn(`\n⚠️  Warning: Expected ${expectedLocales} locale files, but found ${totalLocales}`);
    console.warn('   Build will continue, but some translations may be missing');
  } else {
    console.log(`\n🎉 All ${totalLocales} locale files found!`);
  }
  
  process.exit(0);
} catch (error) {
  console.error('\n❌ Error generating legal manifest:', error.message);
  console.error(error.stack);
  process.exit(1);
}
