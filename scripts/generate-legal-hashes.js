/**
 * DEPRECATED: Generate Content Hashes for Legal Documents
 * 
 * @deprecated This script is deprecated. Use apps/frontend/scripts/generate-legal-manifest.mjs instead.
 *             The new script is integrated into the build process via `pnpm generate-legal-manifest`.
 * 
 * This script computes SHA-256 base64 hashes for all legal markdown files
 * and generates/updates the legal manifest JSON.
 * 
 * Usage: node scripts/generate-legal-hashes.js (deprecated, use pnpm generate-legal-manifest instead)
 */

console.warn('\n⚠️  WARNING: This script is DEPRECATED!');
console.warn('   New location: apps/frontend/scripts/generate-legal-manifest.mjs');
console.warn('   Usage: cd apps/frontend && pnpm generate-legal-manifest');
console.warn('   The new script runs automatically during build.\n');

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const LEGAL_DOCS_DIR = path.join(__dirname, '..', 'apps', 'frontend', 'public', 'legal');
const MANIFEST_PATH = path.join(LEGAL_DOCS_DIR, 'manifest.json');

// Document metadata (order matters!)
const DOCUMENT_METADATA = [
  {
    id: 'terms_conditions',
    title: 'Terms & Conditions',
    version: '1.0.0',
    required: true,
    policy: 'deferred',
    effectiveFrom: '2025-11-01T00:00:00Z',
    filePrefix: '01'
  },
  {
    id: 'privacy_policy',
    title: 'Privacy Policy',
    version: '1.0.0',
    required: true,
    policy: 'deferred',
    effectiveFrom: '2025-11-01T00:00:00Z',
    filePrefix: '02'
  },
  {
    id: 'cookie_policy',
    title: 'Cookie Policy',
    version: '1.0.0',
    required: true,
    policy: 'deferred',
    effectiveFrom: '2025-11-01T00:00:00Z',
    filePrefix: '03'
  },
  {
    id: 'medical_disclaimer',
    title: 'Medical Disclaimer',
    version: '1.0.0',
    required: true,
    policy: 'deferred',
    effectiveFrom: '2025-11-01T00:00:00Z',
    filePrefix: '04'
  },
  {
    id: 'liability_waiver',
    title: 'Liability Waiver',
    version: '1.0.0',
    required: true,
    policy: 'deferred',
    effectiveFrom: '2025-11-01T00:00:00Z',
    filePrefix: '05'
  },
  {
    id: 'dpa',
    title: 'Data Processing Agreement',
    version: '1.0.0',
    required: false,
    policy: 'deferred',
    filePrefix: '06'
  },
  {
    id: 'subscription_policy',
    title: 'Subscription & Payment Policy',
    version: '1.0.0',
    required: false,
    policy: 'deferred',
    filePrefix: '07'
  },
  {
    id: 'community_guidelines',
    title: 'Community Guidelines',
    version: '1.0.0',
    required: false,
    policy: 'deferred',
    filePrefix: '08'
  },
  {
    id: 'imprint',
    title: 'Imprint',
    version: '1.0.0',
    required: true,
    policy: 'deferred',
    effectiveFrom: '2025-11-01T00:00:00Z',
    filePrefix: '09'
  },
  {
    id: 'appendices',
    title: 'Appendices',
    version: '1.0.0',
    required: false,
    policy: 'deferred',
    filePrefix: '10'
  }
];

// Supported locales
const LOCALES = ['en', 'ar', 'nl']; // English, Arabic, Dutch

/**
 * Compute SHA-256 base64 hash of file content
 */
function computeHash(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const hash = crypto.createHash('sha256');
  hash.update(content);
  return hash.digest('base64');
}

/**
 * Generate manifest JSON
 */
function generateManifest() {
  console.log('🔐 Generating content hashes for legal documents...\n');

  const documents = DOCUMENT_METADATA.map((doc) => {
    const locales = LOCALES.map((locale) => {
      const fileName = `${doc.filePrefix}-${doc.id}.${locale}.md`;
      const filePath = path.join(LEGAL_DOCS_DIR, fileName);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  Warning: File not found: ${fileName}`);
        return null;
      }

      const contentHash = computeHash(filePath);
      console.log(`✅ ${fileName}`);
      console.log(`   Hash: ${contentHash.substring(0, 20)}...`);

      return {
        locale,
        path: `/legal/${fileName}`,
        contentHash
      };
    }).filter(Boolean);

    const manifestDoc = {
      id: doc.id,
      title: doc.title,
      version: doc.version,
      required: doc.required,
      policy: doc.policy,
      locales
    };

    // Only add effectiveFrom if it exists
    if (doc.effectiveFrom) {
      manifestDoc.effectiveFrom = doc.effectiveFrom;
    }

    return manifestDoc;
  });

  const manifest = {
    updatedAt: new Date().toISOString(),
    documents
  };

  // Write manifest to file
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  
  console.log(`\n✨ Manifest generated successfully!`);
  console.log(`📄 Location: ${MANIFEST_PATH}`);
  console.log(`📊 Total documents: ${documents.length}`);
  console.log(`🔢 Required documents: ${documents.filter(d => d.required).length}`);
  console.log(`🌍 Locales: ${LOCALES.join(', ')}`);
  
  return manifest;
}

/**
 * Verify all expected files exist
 */
function verifyFiles() {
  console.log('🔍 Verifying legal document files...\n');
  
  let allExist = true;
  DOCUMENT_METADATA.forEach((doc) => {
    LOCALES.forEach((locale) => {
      const fileName = `${doc.filePrefix}-${doc.id}.${locale}.md`;
      const filePath = path.join(LEGAL_DOCS_DIR, fileName);
      
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Missing: ${fileName}`);
        allExist = false;
      }
    });
  });
  
  if (allExist) {
    console.log('✅ All expected files found!\n');
  } else {
    console.error('\n❌ Some files are missing. Please create them before generating manifest.\n');
    process.exit(1);
  }
}

// Main execution - ES modules don't have require.main, so we always run when executed directly
try {
  verifyFiles();
  const manifest = generateManifest();
  
  console.log('\n📋 Manifest Summary:');
  console.log(JSON.stringify(manifest, null, 2));
} catch (error) {
  console.error('\n💥 Error generating manifest:', error.message);
  console.error(error.stack);
  process.exit(1);
}

export { computeHash, generateManifest };
