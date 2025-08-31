#!/usr/bin/env node
// Simple i18n missing-keys scanner
// - Scans src/**/*.{ts,tsx} for t('key.path') usages
// - Loads all JSON under public/locales/<lng>/*.json and flattens keys
// - Reports any missing keys per locale (with plural _one/_other fallback)
// Security: reads only local files; does not execute code.

import { readdirSync, readFileSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Resolve paths relative to the frontend workspace so the script can run
// from repository root or from apps/frontend
const __dirname = dirname(fileURLToPath(import.meta.url))
const FRONTEND_DIR = join(__dirname, '..')
const SRC_DIR = join(FRONTEND_DIR, 'src')
const LOCALES_DIR = join(FRONTEND_DIR, 'public', 'locales')

function walkFiles(dir, exts) {
  const out = []
  const stack = [dir]
  while (stack.length) {
    const d = stack.pop()
    for (const name of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, name.name)
      if (name.isDirectory()) stack.push(p)
      else if (exts.includes(extname(p))) out.push(p)
    }
  }
  return out
}

function extractKeysFromSource(content) {
  const keys = new Set()
  // Capture t('key.path') | t("key.path") | t(`key.path`)
  const re = /\bt\(\s*(["'`])([^"'`\n]+)\1\s*(?:,|\))/g
  let m
  while ((m = re.exec(content))) {
    const key = m[2]
    // Ignore React-Intl style or invalid keys
    if (!key || /\{|\}/.test(key)) continue
    keys.add(key)
  }
  return keys
}

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out)
    else out[key] = v
  }
  return out
}

function loadLocaleMaps() {
  const locales = {}
  for (const lngDir of readdirSync(LOCALES_DIR, { withFileTypes: true })) {
    if (!lngDir.isDirectory()) continue
    const lng = lngDir.name
    const map = {}
    const files = readdirSync(join(LOCALES_DIR, lng))
      .filter(f => f.endsWith('.json'))
      .map(f => join(LOCALES_DIR, lng, f))
    for (const f of files) {
      try {
        const json = JSON.parse(readFileSync(f, 'utf8'))
        Object.assign(map, flatten(json))
      } catch {
        // Skip invalid JSON; build will fail elsewhere
      }
    }
    locales[lng] = map
  }
  return locales
}

function hasKeyWithAliases(key, map) {
  // Support i18next namespace prefix (ns:key.path)
  let keyNoNs = key.includes(':') ? key.split(':', 2)[1] : key
  // Also support pseudo-namespace with dot (ns.key.path) used in some files
  if (!key.includes(':') && key.includes('.')) {
    const idx = key.indexOf('.')
    keyNoNs = key.slice(idx + 1)
  }

  // Direct match (with or without namespace)
  if (map[keyNoNs] || map[key]) return true

  // i18next pluralization forms
  if (map[`${keyNoNs}_one`] || map[`${keyNoNs}_other`] || map[`${key}_one`] || map[`${key}_other`]) return true

  // Allow bare keys to resolve under common.* (project convention)
  if (!keyNoNs.includes('.') && (map[`common.${keyNoNs}`] || map[`common.${keyNoNs}_one`] || map[`common.${keyNoNs}_other`])) return true

  return false
}

function main() {
  const args = process.argv.slice(2)
  const listFlag = args.includes('--list') || process.env.I18N_LIST === '1'
  const onlyArg = args.find(a => a.startsWith('--only='))
  const onlyLocale = onlyArg ? onlyArg.split('=')[1] : undefined
  const files = walkFiles(SRC_DIR, ['.ts', '.tsx'])
  const allKeys = new Set()
  for (const f of files) {
    try {
      const content = readFileSync(f, 'utf8')
      const keys = extractKeysFromSource(content)
      keys.forEach(k => allKeys.add(k))
    } catch {}
  }

  const locales = loadLocaleMaps()
  const missing = {}
  for (const [lng, map] of Object.entries(locales)) {
    const missingForLng = []
    for (const key of allKeys) {
      if (!hasKeyWithAliases(key, map)) missingForLng.push(key)
    }
    if (missingForLng.length) missing[lng] = missingForLng.sort()
  }

  if (listFlag) {
    const entries = Object.entries(missing)
      .filter(([lng]) => !onlyLocale || lng === onlyLocale)
    if (!entries.length) {
      console.log('[i18n] No missing keys' + (onlyLocale ? ` for ${onlyLocale}` : ''))
    } else {
      console.log('[i18n] Missing keys detail:')
      for (const [lng, list] of entries) {
        console.log(`  ${lng}: ${list.length} missing`)
        for (const k of list) console.log(`   - ${k}`)
      }
    }
    // Do not fail in list mode
    return
  }

  if (Object.keys(missing).length) {
    // Fail only on EN (source of truth), warn on others
    const enMissing = missing.en || []
    const others = Object.fromEntries(Object.entries(missing).filter(([k]) => k !== 'en' && (missing[k] || []).length))
    if (enMissing.length) {
      console.error('\n[i18n] Missing keys in canonical locale EN:')
      for (const k of enMissing) console.error(` - ${k}`)
      if (Object.keys(others).length) {
        console.error('\n[i18n] Additional missing keys in other locales (warnings):')
        for (const [lng, list] of Object.entries(others)) {
          console.error(`  ${lng}:`)
          for (const k of list) console.error(`   - ${k}`)
        }
      }
      process.exit(2)
    } else {
      console.warn('[i18n] Non-blocking: Missing keys in non-EN locales:')
      for (const [lng, list] of Object.entries(others)) {
        console.warn(`  ${lng}: ${list.length} keys missing`)
      }
      console.log('[i18n] Scan passed (EN complete).')
      return
    }
  }
  console.log('[i18n] All referenced keys are present (EN complete).')
}

main()
