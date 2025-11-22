#!/usr/bin/env node
// i18n Locale Parity Checker
// Ensures all locale files have the same set of keys across all languages
// Particularly important for exerciseDetails.json which isn't checked by i18n-scan.mjs

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FRONTEND_DIR = join(__dirname, '..')
const LOCALES_DIR = join(FRONTEND_DIR, 'public', 'locales')

// Supported locales based on your project
const SUPPORTED_LOCALES = ['en', 'ar', 'ar-EG', 'nl', 'de', 'fy', 'es', 'fr']

// JSON files to check for parity
const FILES_TO_CHECK = [
  'exerciseDetails.json',
  'common.json',
  'exercises.json',
  'settings.json',
  'timer.json',
  'workouts.json'
]

function getKeysFromJson(filePath) {
  if (!existsSync(filePath)) {
    return null
  }
  
  try {
    const content = readFileSync(filePath, 'utf8')
    const json = JSON.parse(content)
    
    // Extract all keys except _meta
    const keys = Object.keys(json).filter(k => k !== '_meta').sort()
    return keys
  } catch (error) {
    console.error(`Error reading ${filePath}: ${error.message}`)
    return null
  }
}

function checkFileParity(filename) {
  console.log(`\n📋 Checking: ${filename}`)
  console.log('─'.repeat(60))
  
  const localeKeys = {}
  let canonicalKeys = null
  let canonicalLocale = null
  
  // Load keys from all locales
  for (const locale of SUPPORTED_LOCALES) {
    const filePath = join(LOCALES_DIR, locale, filename)
    const keys = getKeysFromJson(filePath)
    
    if (keys === null) {
      console.log(`  ⚠️  ${locale}: File not found`)
      continue
    }
    
    localeKeys[locale] = keys
    
    // Use 'en' as canonical if available
    if (locale === 'en') {
      canonicalKeys = keys
      canonicalLocale = 'en'
    } else if (canonicalKeys === null) {
      // Fallback to first available locale
      canonicalKeys = keys
      canonicalLocale = locale
    }
  }
  
  if (!canonicalKeys) {
    console.log(`  ❌ No locales found for ${filename}`)
    return { hasMismatches: true, details: [] }
  }
  
  console.log(`  ℹ️  Using ${canonicalLocale} as reference (${canonicalKeys.length} keys)`)
  
  let hasMismatches = false
  const details = []
  
  // Check each locale against canonical
  for (const [locale, keys] of Object.entries(localeKeys)) {
    if (locale === canonicalLocale) continue
    
    const missing = canonicalKeys.filter(k => !keys.includes(k))
    const extra = keys.filter(k => !canonicalKeys.includes(k))
    
    if (missing.length === 0 && extra.length === 0) {
      console.log(`  ✅ ${locale}: Perfect match (${keys.length} keys)`)
    } else {
      hasMismatches = true
      console.log(`  ❌ ${locale}: Mismatches detected`)
      
      if (missing.length > 0) {
        console.log(`     Missing ${missing.length} keys:`)
        missing.slice(0, 5).forEach(k => console.log(`       - ${k}`))
        if (missing.length > 5) {
          console.log(`       ... and ${missing.length - 5} more`)
        }
        details.push({ locale, type: 'missing', keys: missing })
      }
      
      if (extra.length > 0) {
        console.log(`     Extra ${extra.length} keys:`)
        extra.slice(0, 5).forEach(k => console.log(`       - ${k}`))
        if (extra.length > 5) {
          console.log(`       ... and ${extra.length - 5} more`)
        }
        details.push({ locale, type: 'extra', keys: extra })
      }
    }
  }
  
  return { hasMismatches, details }
}

function main() {
  console.log('🔍 i18n Locale Parity Checker')
  console.log('═'.repeat(60))
  
  const args = process.argv.slice(2)
  const listAllFlag = args.includes('--list-all')
  const fileArg = args.find(a => a.startsWith('--file='))
  const filesToCheck = fileArg 
    ? [fileArg.split('=')[1]] 
    : FILES_TO_CHECK
  
  let totalMismatches = 0
  const allDetails = []
  
  for (const filename of filesToCheck) {
    const result = checkFileParity(filename)
    if (result.hasMismatches) {
      totalMismatches++
      allDetails.push({ filename, details: result.details })
    }
  }
  
  console.log('\n' + '═'.repeat(60))
  
  if (totalMismatches === 0) {
    console.log('✅ All locale files are in perfect parity!')
    process.exit(0)
  } else {
    console.log(`❌ Found mismatches in ${totalMismatches} file(s)`)
    
    if (listAllFlag) {
      console.log('\n📝 Detailed Mismatch Report:')
      console.log('─'.repeat(60))
      
      for (const { filename, details } of allDetails) {
        console.log(`\n${filename}:`)
        for (const { locale, type, keys } of details) {
          console.log(`  ${locale} (${type}):`)
          keys.forEach(k => console.log(`    - ${k}`))
        }
      }
    } else {
      console.log('\nℹ️  Run with --list-all to see all missing/extra keys')
    }
    
    console.log('\n💡 Tip: Ensure all translations are added to all supported locales')
    console.log('   Supported locales:', SUPPORTED_LOCALES.join(', '))
    
    process.exit(1)
  }
}

main()
