# Legal Documents System

This directory contains legal documents for RepCue in multiple languages, along with the manifest system for version tracking and cache invalidation.

## Structure

```
legal/
├── manifest.json                    # Generated manifest with content hashes
├── 01-terms_conditions.{locale}.md  # Terms & Conditions (required)
├── 02-privacy_policy.{locale}.md    # Privacy Policy (required)
├── 03-cookie_policy.{locale}.md     # Cookie Policy (required)
├── 04-medical_disclaimer.{locale}.md # Medical Disclaimer (required)
├── 05-liability_waiver.{locale}.md  # Liability Waiver (required)
├── 06-dpa.{locale}.md               # Data Processing Agreement (optional)
├── 07-subscription_policy.{locale}.md # Subscription Policy (optional)
├── 08-community_guidelines.{locale}.md # Community Guidelines (optional)
├── 09-imprint.{locale}.md           # Imprint (required)
└── 10-appendices.{locale}.md        # Appendices (optional)
```

## Supported Locales

- **en** - English (canonical/fallback)
- **ar** - Arabic
- **nl** - Dutch

**Note**: `ar-EG` (Egyptian Arabic) users automatically fall back to `ar` base locale.

## Manifest System

### Automatic Generation

The `manifest.json` file is **automatically generated** during the build process:

```bash
# Runs automatically with build
pnpm build
pnpm build:dev
pnpm build:prod

# Manual generation (if needed)
cd apps/frontend
pnpm generate-legal-manifest
```

### Manifest Structure

```json
{
  "updatedAt": "2025-10-21T21:32:17.147Z",
  "documents": [
    {
      "id": "terms_conditions",
      "title": "Terms & Conditions",
      "version": "1.0.0",
      "required": true,
      "policy": "deferred",
      "effectiveFrom": "2025-11-01T00:00:00Z",
      "locales": [
        {
          "locale": "en",
          "path": "/legal/01-terms_conditions.en.md",
          "contentHash": "K1TZx5J2MCWBYrh61Q5xNKxaPO09HBNdxJPefYN3Fv8="
        },
        {
          "locale": "ar",
          "path": "/legal/01-terms_conditions.ar.md",
          "contentHash": "O53l1/YOmqJsaEowAOjdJCpIXJwi/ikFbbDlO3B6+LI="
        },
        {
          "locale": "nl",
          "path": "/legal/01-terms_conditions.nl.md",
          "contentHash": "o/pIVM633FZAO8h6EOQcVE76Me/dGTbn3k+cxY4vnSM="
        }
      ]
    }
  ]
}
```

### Content Hashes

- **Algorithm**: SHA-256
- **Encoding**: Base64
- **Purpose**: 
  - Cache invalidation (detect document changes)
  - Version tracking (ensure users accept latest version)
  - Integrity verification

## Adding/Updating Documents

### 1. Create/Update Markdown Files

Create or update files for all supported locales:

```bash
# Example: Adding a new document
public/legal/11-new_document.en.md
public/legal/11-new_document.ar.md
public/legal/11-new_document.nl.md
```

### 2. Update Manifest Generator

Edit `apps/frontend/scripts/generate-legal-manifest.mjs`:

```javascript
const DOCUMENTS = [
  // ... existing documents ...
  {
    id: 'new_document',
    title: 'New Document',
    version: '1.0.0',
    required: false,  // or true
    policy: 'deferred',
    filePrefix: '11-new_document'
  }
];
```

### 3. Build

The manifest will be automatically regenerated:

```bash
pnpm build
```

**Validation**: The build will fail if any locale files are missing, preventing incomplete deployments.

### 4. Update Edge Function

After adding documents, update the Edge Function baseline:

1. Copy the generated `manifest.json` content
2. Update `supabase/functions/legal-manifest/index.ts` BASELINE_MANIFEST
3. Redeploy: `supabase functions deploy legal-manifest --project-ref [project-id] --no-verify-jwt`

## Locale Fallback Chain

The system implements a cascading fallback for locales:

1. **Exact Match**: Try exact locale (e.g., `ar-EG`)
2. **Base Locale**: Try base locale without region (e.g., `ar-EG` → `ar`)
3. **English Fallback**: Use English as guaranteed fallback (`en`)

**Example Flow**:
```
User locale: ar-EG
→ Check manifest for ar-EG locale → Not found
→ Check manifest for ar locale → ✅ Found
→ Load /legal/01-terms_conditions.ar.md
```

## Architecture

### Three-Tier System

1. **Edge Function** (Live Manifest)
   - URL: `${SUPABASE_URL}/functions/v1/legal-manifest`
   - Authentication: Requires Supabase anon key
   - Cache: ETag-based validation, max-age 60s
   - Fallback: Returns hardcoded BASELINE_MANIFEST

2. **Baseline Manifest** (Local)
   - Path: `/legal/manifest.json`
   - Generated: Automatically during build
   - Purpose: Offline-first fallback

3. **Service Worker Cache**
   - Strategy: NetworkFirst
   - Cache name: `legal-manifest-cache`
   - Expiration: 1 hour
   - Invalidation: On `updatedAt` timestamp change

### Service Integration

- **legalDocsService**: Loads and parses manifest, handles locale fallback
- **legalUpdateService**: Checks for manifest updates, notifies user
- **ConsentService**: Tracks user acceptances (device-level, no auth required)

## File Naming Convention

**Format**: `{number}-{id}.{locale}.md`

- **Number**: Two-digit prefix (01-10) for ordering
- **ID**: Snake_case identifier matching manifest `id` field
- **Locale**: ISO language code (en, ar, nl)
- **Extension**: `.md` (Markdown)

**Examples**:
- `01-terms_conditions.en.md` ✅
- `01-terms_conditions.ar.md` ✅
- `07-subscription_policy.nl.md` ✅
- `07-subscription_policy.nl` ❌ (missing .md extension)

## Testing

### Verify Manifest Generation

```bash
cd apps/frontend
pnpm generate-legal-manifest
```

**Expected Output**:
```
🔨 Generating legal manifest...

📄 Processing terms_conditions...
  ✅ en: K1TZx5J2...
  ✅ ar: O53l1/YO...
  ✅ nl: o/pIVM63...

✅ Manifest generation complete!
   Documents: 10
   Locales: 30 files processed

🎉 All 30 locale files found!
```

### Test Locale Fallback

1. Switch app language to Arabic (`ar` or `ar-EG`)
2. Navigate to Legal Center (`/legal`)
3. Open DevTools Console
4. Click on a document
5. Check logs (if DEBUG=true):

```
[getDocument] Looking for docId: terms_conditions, locale: ar-EG
[getDocument] Available locales: en, ar, nl
[getDocument] Trying base locale fallback: ar
[getDocument] ✅ Found base locale match: ar
```

### Verify Build Integration

```bash
pnpm build
```

Look for in output:
```
> @repcue/frontend@0.0.0 generate-legal-manifest
> node scripts/generate-legal-manifest.mjs

🔨 Generating legal manifest...
✅ Manifest generation complete!
```

## Cache Invalidation

When legal documents are updated:

1. **Build**: Generates new manifest with updated `contentHash` and `updatedAt`
2. **Edge Function**: Deploy updated BASELINE_MANIFEST
3. **Service Worker**: Detects `updatedAt` change, invalidates cache
4. **legalUpdateService**: Compares old vs new manifest, notifies user of changes
5. **User Action**: User prompted to review updated documents

## Security

- **Content Hash Verification**: SHA-256 hashes prevent tampering
- **Same-Origin Policy**: Documents served from same origin only
- **RLS Policies**: User acceptance records protected by Row Level Security
- **CORS**: Edge Function restricts origins (production: app domain only)

## Troubleshooting

### Build Fails: "Locale files missing"

**Problem**: Not all locale files exist for a document

**Solution**: 
1. Check script output for missing files
2. Create missing locale files or temporarily comment out document in generator script
3. Rebuild

### Documents Show in English Despite Arabic Locale

**Possible Causes**:
1. Manifest not regenerated (run `pnpm generate-legal-manifest`)
2. Edge Function has stale baseline (redeploy Edge Function)
3. Service Worker cache stale (hard reload: Ctrl+Shift+R)
4. Browser cache stale (clear site data in DevTools)

**Solution**: See "Cache Invalidation" section above

### 401 Unauthorized from Edge Function

**Problem**: Edge Function requires authentication

**Solution**: Ensure `legalDocsService.loadLiveManifest()` includes anon key headers:

```typescript
const headers: HeadersInit = {};
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (anonKey) {
  headers['apikey'] = anonKey;
  headers['Authorization'] = `Bearer ${anonKey}`;
}
```

## Related Documentation

- **Legal System Overview**: `docs/consent-system.md`
- **i18n Guide**: `docs/i18n-guide.md`
- **Service Worker**: `docs/pwa-system.md`
- **Supabase Migration**: `.github/instructions/supabase.instructions.md`

---

**Last Updated**: 2025-10-21  
**System Version**: Legal Acceptance V3  
**Locales Supported**: 3 (en, ar, nl)  
**Documents**: 10 (6 required, 4 optional)
