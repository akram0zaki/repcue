/**
 * Local conversion script to replicate the edge function CSV → Exercise[] mapping.
 * Usage (PowerShell):
 *   node scripts/convert-exercises-csv-to-json.mjs > exercises.local.json
 *
 * Mirrors logic in `supabase/functions/generate-ai-workout/exercise-catalog.ts`.
 */
import fs from 'node:fs';
import path from 'node:path';

// Source CSV (same file used in edge function bundle)
const csvPath = path.resolve('supabase/functions/generate-ai-workout/exercises.csv');

// Simple CSV parser (no external deps) respecting basic quoting
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  // First row is header; edge code skips it.
  const dataLines = lines.slice(1);
  const rows = [];
  for (const line of dataLines) {
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        // Handle escaped double quotes inside quoted field
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip next
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cols.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current);
    rows.push(cols.map(c => c.trim()));
  }
  return rows;
}

function mapRow(row) {
  return {
    id: row[0],
    name: row[1],
    description: row[2] || '',
    exercise_type: row[3],
    default_duration: row[4] ? Number(row[4]) : undefined,
    muscle_groups: row[5] ? row[5].split('|').filter(Boolean) : [],
    base_tags: row[6] ? row[6].split('|').filter(Boolean) : [],
    benefits: row[7] || '',
    limitations: row[8] || '',
    suggested_combinations: row[9] ? row[9].split('|').filter(Boolean) : [],
    catalogs: row[10] ? row[10].split(',').map(c => c.trim()).filter(Boolean) : []
  };
}

try {
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(csvContent);
  const exercises = rows.map(mapRow);
  // Summary instrumentation like edge initialization
  const catalogCounts = exercises.reduce((acc, ex) => {
    ex.catalogs.forEach(c => { acc[c] = (acc[c] || 0) + 1; });
    if (ex.catalogs.length === 0) acc['<no-catalog>'] = (acc['<no-catalog>'] || 0) + 1;
    return acc;
  }, {});

  const output = {
    meta: {
      total: exercises.length,
      uniqueCatalogs: Object.keys(catalogCounts).length,
      catalogCounts
    },
    exercises
  };
  process.stdout.write(JSON.stringify(output, null, 2));
} catch (e) {
  console.error('Failed to parse CSV locally:', e.message);
  process.exit(1);
}
