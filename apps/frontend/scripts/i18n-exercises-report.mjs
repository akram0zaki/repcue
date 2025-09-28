#!/usr/bin/env node
// i18n exercises report
// Generates a summary of canonical exercise UI key coverage per locale.
// - Uses English exercises.json as source of truth
// - Reports missing keys, placeholder (TODO_) counts, and extra (obsolete) keys
// Security: local file system only; no remote calls.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const FRONTEND_DIR = new URL('..', import.meta.url).pathname
const LOCALES_DIR = join(FRONTEND_DIR, 'public', 'locales')

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out)
    else out[key] = v
  }
  return out
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

const en = loadJson(join(LOCALES_DIR, 'en', 'exercises.json'))

// Derive canonical UI key list: everything before the first exercise object (heuristic: objects that contain a 'name')
// We'll explicitly enumerate to ensure stable ordering and avoid accidental inclusion of exercise IDs.
const CANON_KEYS = [
  'variable','notFound','loadError','backToExercises','description','instructions','details','type','difficulty','defaultDuration','defaultSetsReps','equipment','muscleGroups','tagsHeading','startTimer','edit','addToFavorites','removeFromFavorites','benefits','limitations','bestTiming','suggestedCombinations','notes','references','repDuration','difficultyLevel',
  'types.time_based','types.repetition_based',
  'categories.core','categories.upperbody','categories.lowerbody','categories.fullbody','categories.balance','categories.mobility','categories.yoga','categories.cardio','categories.strength',
  'difficulties.beginner','difficulties.intermediate','difficulties.advanced'
]

const enFlat = flatten(en)

function collectLocales() {
  return readdirSync(LOCALES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
}

function report() {
  const locales = collectLocales()
  const results = []
  for (const lng of locales) {
    const file = join(LOCALES_DIR, lng, 'exercises.json')
    let data
    try { data = loadJson(file) } catch { continue }
    const flat = flatten(data)
    const missing = []
    const placeholders = []
    for (const key of CANON_KEYS) {
      if (!(key in flat)) missing.push(key)
      else if (typeof flat[key] === 'string' && flat[key].startsWith('TODO_')) placeholders.push(key)
    }
    // Extra keys: canonical removed/obsolete ones we wanted to prune
    const obsoleteCandidates = ['ratingsAndReviews','stats','copies','created','equipmentNeeded','tags','defaultDurationLabel','tagsLabel']
    const obsolete = obsoleteCandidates.filter(k => k in flat)
    results.push({ lng, missing, placeholders, obsolete })
  }

  console.log('[i18n-exercises] Report:')
  for (const r of results) {
    console.log(`  ${r.lng}: missing=${r.missing.length} placeholders=${r.placeholders.length} obsolete=${r.obsolete.length}`)
    if (r.missing.length) console.log('    Missing:', r.missing.join(', '))
    if (r.placeholders.length) console.log('    Placeholders:', r.placeholders.join(', '))
    if (r.obsolete.length) console.log('    Obsolete:', r.obsolete.join(', '))
  }
  console.log('\n[i18n-exercises] Legend:')
  console.log('  missing      Canonical UI keys absent in locale file')
  console.log('  placeholders Keys whose value starts with TODO_ (need translation)')
  console.log('  obsolete     Keys that should be pruned (legacy)')
  console.log('\nDone.')
}

report()
