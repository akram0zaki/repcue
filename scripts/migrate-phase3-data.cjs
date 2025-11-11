/**
 * Phase 3 Data Migration Script
 * Automates the migration of exercises from catalog-specific files to global repository
 * with catalog memberships.
 * 
 * Usage: node scripts/migrate-phase3-data.js
 */

const fs = require('fs');
const path = require('path');

// Duplicate exercises - use General Fitness as canonical
const DUPLICATES = new Set([
  'glute-bridges',
  'lunges',
  'calf-raises',
  'cat-cow',
  'butt-kicks',
  'high-knees',
  'single-leg-stand'
]);

// Tag classification: catalog-specific tags contain ':'
function splitTags(tags) {
  const baseTags = [];
  const catalogTags = [];
  
  tags.forEach(tag => {
    if (tag.includes(':')) {
      catalogTags.push(tag);
    } else {
      baseTags.push(tag);
    }
  });
  
  return { baseTags, catalogTags };
}

// Extract exercise definitions from source file
function extractExercises(filePath, catalogId) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const exercises = [];
  
  // Match createExercise({ ... }) blocks - handle nested objects
  const regex = /createExercise\(\{[\s\S]*?\n  \}\)/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const exerciseBlock = match[0];
    
    // Extract id
    const idMatch = exerciseBlock.match(/id:\s*['"]([^'"]+)['"]/);
    if (!idMatch) continue;
    const id = idMatch[1];
    
    // Extract tags array
    const tagsMatch = exerciseBlock.match(/tags:\s*\[([^\]]+)\]/);
    const tags = [];
    if (tagsMatch) {
      const tagsStr = tagsMatch[1];
      const tagMatches = tagsStr.match(/['"]([^'"]+)['"]/g);
      if (tagMatches) {
        tags.push(...tagMatches.map(t => t.replace(/['"]/g, '')));
      }
    }
    
    exercises.push({
      id,
      catalogId,
      raw: exerciseBlock,
      tags
    });
  }
  
  return exercises;
}

// Transform exercise to global format
function transformToGlobal(exercise) {
  const { baseTags } = splitTags(exercise.tags);
  
  // Remove catalogId line and replace tags with base_tags
  let transformed = exercise.raw
    .replace(/catalogId:\s*['"][^'"]+['"],?\s*\n?/g, '')
    .replace(/tags:\s*\[[^\]]+\]/g, `base_tags: [${baseTags.map(t => `'${t}'`).join(', ')}]`);
  
  // Replace createExercise with createGlobalExercise
  transformed = transformed.replace('createExercise', 'createGlobalExercise');
  
  return transformed;
}

async function main() {
  console.log('🚀 Phase 3 Data Migration Script\n');
  
  const rootDir = path.join(__dirname, '..');
  const dataDir = path.join(rootDir, 'apps/frontend/src/data');
  const exercisesDir = path.join(dataDir, 'exercises');
  
  // Catalog configurations
  const catalogs = [
    { id: 'general-fitness', file: 'generalFitness.ts', name: 'General Fitness' },
    { id: 'women-health', file: 'womenHealth.ts', name: 'Women\'s Health' },
    { id: 'aikido', file: 'aikido.ts', name: 'Aikido' },
    { id: 'tai-chi', file: 'taiChi.ts', name: 'Tai Chi' },
    { id: 'zumba', file: 'zumba.ts', name: 'Zumba' }
  ];
  
  const allExercises = [];
  const globalExercises = new Map();
  const memberships = new Map();
  
  // Step 1: Extract all exercises
  console.log('📖 Step 1: Extracting exercises from source files...\n');
  
  for (const catalog of catalogs) {
    const filePath = path.join(exercisesDir, catalog.file);
    const exercises = extractExercises(filePath, catalog.id);
    allExercises.push(...exercises);
    console.log(`  ✓ ${catalog.name}: ${exercises.length} exercises`);
  }
  
  console.log(`\n  Total extracted: ${allExercises.length} exercises\n`);
  
  // Step 2: Process exercises and create global definitions
  console.log('🔄 Step 2: Processing exercises and handling duplicates...\n');
  
  let duplicatesSkipped = 0;
  const displayOrderCounter = {};
  
  for (const exercise of allExercises) {
    // Initialize display order counter for catalog
    if (!displayOrderCounter[exercise.catalogId]) {
      displayOrderCounter[exercise.catalogId] = 1;
    }
    
    // Handle duplicates: only add to global if not already added (General Fitness first)
    if (DUPLICATES.has(exercise.id)) {
      if (!globalExercises.has(exercise.id)) {
        if (exercise.catalogId === 'general-fitness') {
          // Add General Fitness version as canonical
          const { baseTags } = splitTags(exercise.tags);
          globalExercises.set(exercise.id, {
            id: exercise.id,
            raw: transformToGlobal(exercise),
            baseTags
          });
          console.log(`  ✓ Added canonical: ${exercise.id} (General Fitness)`);
        }
      } else {
        // Skip duplicate, only add membership
        console.log(`  ⊘ Skipped duplicate: ${exercise.id} (${exercise.catalogId})`);
        duplicatesSkipped++;
      }
    } else {
      // Unique exercise: add to global
      const { baseTags } = splitTags(exercise.tags);
      globalExercises.set(exercise.id, {
        id: exercise.id,
        raw: transformToGlobal(exercise),
        baseTags
      });
    }
    
    // Always add membership for every catalog the exercise appears in
    if (!memberships.has(exercise.catalogId)) {
      memberships.set(exercise.catalogId, []);
    }
    
    const { catalogTags } = splitTags(exercise.tags);
    memberships.get(exercise.catalogId).push({
      exerciseId: exercise.id,
      catalogId: exercise.catalogId,
      catalogTags,
      displayOrder: displayOrderCounter[exercise.catalogId]++
    });
  }
  
  console.log(`\n  Global exercises: ${globalExercises.size}`);
  console.log(`  Duplicates handled: ${duplicatesSkipped}`);
  console.log(`  Expected unique: 87 ${globalExercises.size === 87 ? '✓' : '✗'}\n`);
  
  // Step 3: Generate globalExercises.ts
  console.log('📝 Step 3: Generating globalExercises.ts...\n');
  
  const globalExercisesTemplate = `import type { GlobalExercise } from '../types';
import { ExerciseType } from '../types';

/**
 * Global Exercise Repository
 * 
 * This file contains all unique exercises in a catalog-agnostic format.
 * Exercises are linked to catalogs via the CatalogMembership records.
 * 
 * Total exercises: ${globalExercises.size}
 * 
 * Migration notes:
 * - Migrated from 5 catalog-specific files
 * - 7 duplicate exercises resolved (General Fitness version used as canonical)
 * - catalogId field removed (exercises are now global)
 * - tags split into base_tags (universal) and catalog_tags (in memberships)
 * 
 * Canonical duplicates (General Fitness version):
 * - glute-bridges, lunges, calf-raises, cat-cow
 * - butt-kicks, high-knees, single-leg-stand
 */

/**
 * Helper function to create a global exercise with default sync metadata
 */
function createGlobalExercise(
  exerciseData: Omit<
    GlobalExercise,
    'updated_at' | 'created_at' | 'deleted' | 'version' | 'dirty' | 'op' | 'synced_at' | 'owner_id'
  > & { id: string }
): GlobalExercise {
  return {
    ...exerciseData,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    deleted: false,
    version: 1,
    dirty: 0,
    op: undefined,
    synced_at: undefined,
    owner_id: undefined
  };
}

/**
 * All global exercises
 */
export const GLOBAL_EXERCISES: GlobalExercise[] = [
${Array.from(globalExercises.values()).map(ex => ex.raw).join(',\n\n')}
];

/**
 * Get a global exercise by ID
 */
export function getGlobalExerciseById(id: string): GlobalExercise | undefined {
  return GLOBAL_EXERCISES.find(ex => ex.id === id);
}

/**
 * Get all global exercises
 */
export function getAllGlobalExercises(): GlobalExercise[] {
  return GLOBAL_EXERCISES;
}
`;
  
  const globalExercisesPath = path.join(dataDir, 'globalExercises.ts');
  fs.writeFileSync(globalExercisesPath, globalExercisesTemplate);
  console.log(`  ✓ Generated: globalExercises.ts`);
  console.log(`  ✓ Exercises: ${globalExercises.size}\n`);
  
  // Step 4: Generate membership files
  console.log('📝 Step 4: Generating membership files...\n');
  
  for (const catalog of catalogs) {
    const catalogMemberships = memberships.get(catalog.id) || [];
    const constName = catalog.id.toUpperCase().replace(/-/g, '_') + '_MEMBERSHIPS';
    
    const membershipTemplate = `import type { CatalogMembership } from '../../types';

/**
 * ${catalog.name} Catalog Memberships
 * 
 * Links exercises to the ${catalog.name} catalog with catalog-specific metadata.
 * Total memberships: ${catalogMemberships.length}
 */

/**
 * Helper function to create a membership with default sync metadata
 */
function createMembership(
  membershipData: Omit<
    CatalogMembership,
    'updated_at' | 'created_at' | 'deleted' | 'version' | 'dirty' | 'op' | 'synced_at' | 'owner_id'
  >
): CatalogMembership {
  return {
    ...membershipData,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    deleted: false,
    version: 1,
    dirty: 0,
    op: undefined,
    synced_at: undefined,
    owner_id: undefined
  };
}

/**
 * ${catalog.name} memberships
 */
export const ${constName}: CatalogMembership[] = [
${catalogMemberships.map(m => 
  `  createMembership({
    id: crypto.randomUUID(),
    exercise_id: '${m.exerciseId}',
    catalog_id: '${m.catalogId}',
    catalog_tags: [${m.catalogTags.map(t => `'${t}'`).join(', ')}],
    display_order: ${m.displayOrder},
    featured: false
  })`
).join(',\n\n')}
];
`;
    
    const membershipPath = path.join(dataDir, 'memberships', catalog.file);
    fs.writeFileSync(membershipPath, membershipTemplate);
    console.log(`  ✓ ${catalog.name}: ${catalogMemberships.length} memberships`);
  }
  
  console.log('\n✅ Migration complete!\n');
  console.log('📊 Summary:');
  console.log(`  - Global exercises: ${globalExercises.size}`);
  console.log(`  - Total memberships: ${Array.from(memberships.values()).reduce((sum, m) => sum + m.length, 0)}`);
  console.log(`  - Duplicates handled: ${duplicatesSkipped}`);
  console.log('\n🔍 Next steps:');
  console.log('  1. Run: npx tsc --noEmit');
  console.log('  2. Review generated files');
  console.log('  3. Update apps/frontend/src/data/exercises.ts aggregator');
  console.log('  4. Run: pnpm lint');
  console.log('  5. Test application startup\n');
}

main().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
