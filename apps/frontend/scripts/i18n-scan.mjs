#!/usr/bin/env node
// Simple i18n missing-keys scanner
// - Scans src/**/*.{ts,tsx} for t('key.path') usages
// - Loads all JSON under public/locales/<lng>/*.json and flattens keys
// - Reports any missing keys per locale (with plural _one/_other fallback)
// Security: reads only local files; does not execute code.

import { readdirSync, readFileSync } from 'node:fs'
import { join, extname } from 'node:path'

const SRC_DIR = join(process.cwd(), 'src')
const LOCALES_DIR = join(process.cwd(), 'public', 'locales')

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
  // direct
  if (map[key]) return true
  // i18next pluralization
  if (map[`${key}_one`] || map[`${key}_other`]) return true
  // Aliases: common.<key> when key is bare
  if (!key.includes('.') && (map[`common.${key}`] || map[`common.${key}_one`] || map[`common.${key}_other`])) return true
  // Namespace alias: allow referencing namespace.key while stored as key in its own namespace file
  if (key.includes('.')) {
    const idx = key.indexOf('.')
    const rest = key.slice(idx + 1)
    if (map[rest] || map[`${rest}_one`] || map[`${rest}_other`]) return true
  }
  return false
}

function main() {
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
