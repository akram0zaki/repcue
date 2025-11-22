/**
 * Import Script for CSV Exercise Data (Version 2)
 * 
 * Converts the TAB-delimited CSV file with proper quote handling
 * 
 * Usage: node scripts/import-csv-exercises-v2.cjs
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse TAB-delimited CSV with proper quote handling
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Split into lines properly handling quoted fields
  const allLines = [];
  let currentLine = '';
  let inQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (currentLine.trim() && char === '\n') {
        allLines.push(currentLine);
        currentLine = '';
      }
    } else {
      currentLine += char;
    }
  }
  
  if (currentLine.trim()) {
    allLines.push(currentLine);
  }
  
  // Parse header
  const header = splitTabLine(allLines[0]);
  
  // Parse data
  const exercises = [];
  for (let i = 1; i < allLines.length; i++) {
    const values = splitTabLine(allLines[i]);
    const exercise = {};
    
    header.forEach((key, index) => {
      let value = values[index] || '';
      // Remove surrounding quotes and unescape internal quotes
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      value = value.replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\n/g, '\n');
      exercise[key] = value;
    });
    
    exercises.push(exercise);
  }
  
  return exercises;
}

function splitTabLine(line) {
  const values = [];
  let currentValue = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
      currentValue += char;
    } else if (char === '\t' && !inQuotes) {
      values.push(currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  values.push(currentValue);
  return values;
}

/**
 * Split tags into base_tags and catalog_tags
 */
function splitTags(tagsString) {
  if (!tagsString || tagsString === 'TRUE' || tagsString === 'FALSE') {
    return { base_tags: [], catalog_tags: [] };
  }
  
  const allTags = tagsString.split(/[\t\n]/).map(t => t.trim()).filter(Boolean);
  
  const catalogPrefixes = ['equipment:', 'category:', 'difficulty:', 'muscle:', 'level:'];
  
  const base_tags = allTags.filter(tag => 
    !catalogPrefixes.some(prefix => tag.startsWith(prefix))
  );
  
  const catalog_tags = allTags.filter(tag => 
    catalogPrefixes.some(prefix => tag.startsWith(prefix))
  );
  
  return { base_tags, catalog_tags };
}

/**
 * Convert CSV row to GlobalExercise format
 */
function convertExercise(row) {
  // Parse muscle groups
  let muscle_groups = [];
  if (row.muscle_groups && row.muscle_groups !== 'TRUE' && row.muscle_groups !== 'FALSE') {
    muscle_groups = row.muscle_groups.split(/[\t\n]/).map(m => m.trim()).filter(Boolean);
  }
  
  // Split tags from 'tags' column
  const { base_tags, catalog_tags } = splitTags(row.tags);
  
  const exercise = {
    id: row.id || '',
    name: row.name || '',
    description: row.description || '',
    exercise_type: row.exercise_type || 'repetition-based',
    catalogId: row.catalogId || '',
    default_sets: row.default_sets ? parseInt(row.default_sets) : undefined,
    default_reps: row.default_reps ? parseInt(row.default_reps) : undefined,
    default_duration: row.default_duration ? parseInt(row.default_duration) : undefined,
    rep_duration_seconds: row.rep_duration_seconds ? parseInt(row.rep_duration_seconds) : undefined,
    is_favorite: row.is_favorite === 'TRUE',
    has_video: row.has_video === 'TRUE',
    muscle_groups,
    base_tags,
    catalog_tags, // Store for membership generation
    benefits: row.benefits || '',
    limitations: row.limitations || '',
    best_timing: row.best_timing || '',
    suggested_combinations: row.suggested_combinations ? 
      row.suggested_combinations.split(/[\t\n]/).map(c => c.trim()).filter(Boolean) : [],
    notes: row.notes || ''
  };
  
  return exercise;
}

/**
 * Escape string for TypeScript code
 */
function escapeString(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Generate TypeScript code for an exercise
 */
function generateExerciseCode(exercise, displayOrder) {
  const lines = [];
  
  lines.push('createGlobalExercise({');
  lines.push(`    id: '${exercise.id}',`);
  lines.push(`    name: '${escapeString(exercise.name)}',`);
  lines.push(`    description: '${escapeString(exercise.description)}',`);
  lines.push(`    exercise_type: ExerciseType.${exercise.exercise_type.toUpperCase().replace('-', '_')},`);
  
  if (exercise.default_sets) {
    lines.push(`    default_sets: ${exercise.default_sets},`);
  }
  if (exercise.default_reps) {
    lines.push(`    default_reps: ${exercise.default_reps},`);
  }
  if (exercise.default_duration) {
    lines.push(`    default_duration: ${exercise.default_duration},`);
  }
  if (exercise.rep_duration_seconds) {
    lines.push(`    rep_duration_seconds: ${exercise.rep_duration_seconds},`);
  }
  
  lines.push(`    is_favorite: ${exercise.is_favorite},`);
  lines.push(`    has_video: ${exercise.has_video},`);
  
  // Muscle groups
  if (exercise.muscle_groups.length > 0) {
    const muscleStr = exercise.muscle_groups.map(m => `'${escapeString(m)}'`).join(', ');
    lines.push(`    muscle_groups: [${muscleStr}],`);
  }
  
  // Base tags
  if (exercise.base_tags.length > 0) {
    const tagsStr = exercise.base_tags.map(t => `'${escapeString(t)}'`).join(', ');
    lines.push(`    base_tags: [${tagsStr}],`);
  }
  
  // Benefits, limitations, etc.
  if (exercise.benefits) {
    lines.push(`    benefits: '${escapeString(exercise.benefits)}',`);
  }
  if (exercise.limitations) {
    lines.push(`    limitations: '${escapeString(exercise.limitations)}',`);
  }
  if (exercise.best_timing) {
    lines.push(`    best_timing: '${escapeString(exercise.best_timing)}',`);
  }
  if (exercise.suggested_combinations.length > 0) {
    const combosStr = exercise.suggested_combinations.map(c => `'${escapeString(c)}'`).join(', ');
    lines.push(`    suggested_combinations: [${combosStr}],`);
  }
  if (exercise.notes) {
    lines.push(`    notes: '${escapeString(exercise.notes)}',`);
  }
  
  lines.push('  }),');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Generate catalog membership code
 */
function generateMembershipCode(exercise, displayOrder) {
  const catalogTags = exercise.catalog_tags.join('\\t');
  
  return `{
    id: 'mbr-${exercise.id}',
    exercise_id: '${exercise.id}',
    catalog_id: '${exercise.catalogId}',
    catalog_tags: ['${escapeString(catalogTags)}'],
    display_order: ${displayOrder},
    featured: false,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    deleted: false,
    version: 1,
    dirty: 0,
    owner_id: undefined
  },`;
}

/**
 * Main import function
 */
function main() {
  const csvPath = path.join(__dirname, '..', 'docs', 'exercise-catalogs', 'new_exercises.csv');
  
  console.log(`Reading CSV file: ${csvPath}`);
  
  const exercises = parseCSV(csvPath);
  const convertedExercises = exercises.map(convertExercise);
  
  // Generate exercise code
  console.log('\n=== Generated Exercise Code ===\n');
  convertedExercises.forEach((ex, index) => {
    console.log(generateExerciseCode(ex, 1000 + index));
  });
  
  // Generate membership code
  console.log('\n=== Generated Membership Code ===\n');
  console.log('// Create a new file: apps/frontend/src/data/catalogMemberships.ts\n');
  console.log(`import type { CatalogMembership } from '../types';\n`);
  console.log('/**');
  console.log(' * Catalog Memberships for Imported Exercises');
  console.log(' * Links GlobalExercise entries to their respective catalogs');
  console.log(' */');
  console.log('export const IMPORTED_MEMBERSHIPS: Omit<CatalogMembership, \'op\' | \'synced_at\'>[] = [');
  
  convertedExercises.forEach((ex, index) => {
    console.log(generateMembershipCode(ex, 1000 + index));
  });
  
  console.log('];\n');
  
  console.log('\n=== Import Summary ===');
  console.log(`Total exercises to import: ${convertedExercises.length}`);
  console.log('\nNext steps:');
  console.log('1. Copy the exercise code into apps/frontend/src/data/globalExercises.ts');
  console.log('2. Create apps/frontend/src/data/catalogMemberships.ts with the membership code');
  console.log('3. Import and add memberships to storageService initialization');
  console.log('4. Run tests to verify: pnpm test');
  console.log('5. Commit changes: git add . && git commit -m "feat: import 48 exercises from CSV"');
}

main();
