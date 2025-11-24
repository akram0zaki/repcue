/**
 * Export Exercises to CSV for AI Edge Function
 * 
 * Exports built-in exercises with comprehensive metadata for AI workout generation.
 * Excludes premium catalogs (zumba, tai-chi, aikido) to reduce token usage.
 * 
 * Output: supabase/functions/_shared/exercises.csv
 * 
 * Fields exported:
 * - id, name, description, exercise_type, default_duration
 * - muscle_groups, base_tags, benefits, limitations
 * - suggested_combinations, catalogs
 */

import { GLOBAL_EXERCISES } from '../apps/frontend/src/data/globalExercises.js';
import { ALL_CATALOG_MEMBERSHIPS } from '../apps/frontend/src/data/memberships/index.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Catalogs to exclude (premium catalogs not for general AI use)
const EXCLUDED_CATALOGS = ['zumba', 'tai-chi', 'aikido'];

/**
 * Escape CSV field value
 */
function escapeCSV(value: string | undefined | null): string {
  if (!value) return '';
  // Replace quotes with double quotes and wrap in quotes if contains comma, quote, or newline
  const escaped = value.replace(/"/g, '""');
  if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
    return `"${escaped}"`;
  }
  return escaped;
}

/**
 * Join array with pipe separator, escape if needed
 */
function joinArray(arr: string[] | undefined | null): string {
  if (!arr || arr.length === 0) return '';
  // Use pipe separator for arrays, escape individual items if they contain pipes
  return arr.map(item => item.replace(/\|/g, '\\|')).join('|');
}

console.log('🔨 Exporting exercises for AI edge function...\n');

// Get all memberships for non-excluded catalogs
const includedMemberships = ALL_CATALOG_MEMBERSHIPS.filter(
  m => !EXCLUDED_CATALOGS.includes(m.catalog_id)
);

// Get unique exercise IDs that belong to included catalogs
const includedExerciseIds = new Set(
  includedMemberships.map(m => m.exercise_id)
);

console.log(`📊 Total exercises in system: ${GLOBAL_EXERCISES.length}`);
console.log(`📋 Total memberships: ${ALL_CATALOG_MEMBERSHIPS.length}`);
console.log(`🚫 Excluded catalogs: ${EXCLUDED_CATALOGS.join(', ')}`);
console.log(`✅ Exercises to export: ${includedExerciseIds.size}\n`);

// Filter exercises and join with catalog memberships
const exercisesForExport = GLOBAL_EXERCISES
  .filter(ex => includedExerciseIds.has(ex.id))
  .map(ex => {
    // Get all catalog memberships for this exercise (from included catalogs only)
    const exerciseMemberships = includedMemberships.filter(
      m => m.exercise_id === ex.id
    );
    
    // Get catalog IDs
    const catalogIds = exerciseMemberships.map(m => m.catalog_id);
    
    return {
      id: ex.id,
      name: ex.name,
      description: ex.description || '',
      exercise_type: ex.exercise_type,
      default_duration: ex.default_duration || ex.rep_duration_seconds || '',
      muscle_groups: joinArray(ex.muscle_groups),
      base_tags: joinArray(ex.tags),
      benefits: ex.benefits || '',
      limitations: ex.limitations || '',
      suggested_combinations: joinArray(ex.suggested_combinations),
      catalogs: catalogIds.join(',') // Comma-separated catalog list
    };
  });

// Generate CSV content
const headers = [
  'id',
  'name',
  'description',
  'exercise_type',
  'default_duration',
  'muscle_groups',
  'base_tags',
  'benefits',
  'limitations',
  'suggested_combinations',
  'catalogs'
];

const csvRows = [
  headers.join(','),
  ...exercisesForExport.map(ex => [
    escapeCSV(ex.id),
    escapeCSV(ex.name),
    escapeCSV(ex.description),
    escapeCSV(ex.exercise_type),
    escapeCSV(String(ex.default_duration)),
    escapeCSV(ex.muscle_groups),
    escapeCSV(ex.base_tags),
    escapeCSV(ex.benefits),
    escapeCSV(ex.limitations),
    escapeCSV(ex.suggested_combinations),
    escapeCSV(ex.catalogs)
  ].join(','))
];

const csvContent = csvRows.join('\n');

// Ensure _shared directory exists
const outputDir = join(process.cwd(), 'supabase/functions/_shared');
const outputPath = join(outputDir, 'exercises.csv');

try {
  writeFileSync(outputPath, csvContent, 'utf-8');
  
  console.log('✅ Export complete!\n');
  console.log(`📁 Output: ${outputPath}`);
  console.log(`📊 Exercises exported: ${exercisesForExport.length}`);
  console.log(`📦 File size: ${(csvContent.length / 1024).toFixed(2)} KB`);
  console.log(`🎯 Estimated token count: ~${Math.round(csvContent.length / 4)} tokens`);
  
  // Show catalog breakdown
  console.log('\n📋 Catalog breakdown:');
  const catalogCounts = new Map<string, number>();
  exercisesForExport.forEach(ex => {
    ex.catalogs.split(',').forEach(cat => {
      if (cat) {
        catalogCounts.set(cat, (catalogCounts.get(cat) || 0) + 1);
      }
    });
  });
  
  catalogCounts.forEach((count, catalog) => {
    console.log(`   - ${catalog}: ${count} exercises`);
  });
  
  // Also copy to the edge function directory for deployment
  const edgeFunctionPath = join(__dirname, '..', 'supabase', 'functions', 'generate-ai-workout', 'exercises.csv');
  try {
    writeFileSync(edgeFunctionPath, csvContent);
    console.log(`\n📋 CSV also copied to edge function directory for deployment`);
  } catch (copyError) {
    console.warn(`⚠️  Warning: Could not copy to edge function directory:`, copyError);
  }
  
  console.log('\n🎉 Ready for edge function deployment!');
} catch (error) {
  console.error('❌ Export failed:', error);
  process.exit(1);
}
