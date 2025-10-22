# Phase 3 Testing Guide — Legal Acceptance System

## Prerequisites
- Build completed: `pnpm build` ✅
- Development server running: `pnpm dev`

## What to Test

### 1. Navigation to Legal Center Page

**Steps:**
1. Start the app: `pnpm dev`
2. Click on the **More** button in the bottom navigation (three dots icon)
3. Click on **Legal** in the dropdown menu
4. You should see the Legal Center page

**Expected Result:**
- Legal Center page displays with two sections:
  - **Required Documents** (6 documents)
  - **Optional Documents** (4 documents)
- Each document shows:
  - Document title
  - Version number
  - Effective date countdown (if future) or "Accepted: [date]"
  - Status badge (color-coded)

### 2. Legal Gate Blocking Modal

**Current State:** The LegalGate will NOT show yet because:
- The legal documents have `effectiveFrom: "2025-11-01"` (future date)
- Documents only become blocking on/after their effective date
- Before the effective date, they're just informational

**To Test LegalGate (two options):**

**Option A: Change Effective Date (Recommended)**
1. Open `apps/frontend/public/legal/manifest.json`
2. Change the `effectiveFrom` date to today or earlier: `"2025-10-21"`
3. Restart the dev server
4. Clear browser storage (F12 → Application → Storage → Clear Site Data)
5. Reload the app
6. You should see the LegalGate blocking modal

**Option B: Wait Until Effective Date**
- Wait until November 1, 2025
- The LegalGate will automatically appear

### 3. Legal Document Modal

**Steps:**
1. Navigate to Legal Center (/legal)
2. Click **View** button on any document
3. Full-screen modal opens with markdown content

**Expected Result:**
- Modal displays document content (markdown formatted)
- Close button (X) in top-right corner
- If `requireScrollToBottom: true` in manifest:
  - Accept button disabled until you scroll to bottom
  - Message: "Please scroll to the bottom to accept"
- Accept button becomes enabled after scrolling

### 4. RTL Support (Arabic)

**Steps:**
1. Go to Settings
2. Change language to Arabic (العربية)
3. Navigate to Legal Center

**Expected Result:**
- Text direction right-to-left
- Layout mirrors correctly
- Icons and buttons positioned appropriately

### 5. LegalGate Flow (After Setting Effective Date)

**Steps:**
1. Modify manifest effectiveFrom to past/today
2. Clear browser data
3. Reload app

**Expected Flow:**
1. **LegalGate appears** (full-screen blocking modal)
2. Shows checklist of required documents (6 items)
3. Each document has:
   - Checkbox (disabled until viewed)
   - "View" button
   - Status text: "Not viewed yet"
4. Click **View** on first document
5. Modal opens with document content
6. Scroll to bottom
7. Click **Accept**
8. Modal closes, status changes to "✓ Accepted"
9. Repeat for all 6 required documents
10. **"Accept All Required"** button becomes enabled
11. Click **Accept All Required**
12. **Continue** button becomes enabled
13. Click **Continue**
14. LegalGate closes, app is accessible

### 6. Optional Documents

**Steps:**
1. In LegalGate, scroll down to "Optional Documents" section
2. Documents shown with 75% opacity
3. Can view and accept, but NOT required to continue

**Expected Result:**
- Optional docs don't block "Continue" button
- Can skip them entirely
- Still tracked if accepted

## Service Initialization Check

**Verify in Browser Console:**
1. Open DevTools (F12)
2. Reload the app
3. Look for log messages:
   ```
   📄 Initializing legal document services...
   ✅ Legal services initialized
   ```

## API Integration Check

**Verify Legal Manifest Fetch:**
1. Open DevTools → Network tab
2. Reload the app
3. Look for request to: `https://xwzrsfkzqxdybjrkkkvh.supabase.co/functions/v1/legal-manifest`
4. Response should be JSON manifest with 10 documents

## Known Behavior

### Why LegalGate Doesn't Show Initially
- Documents have future `effectiveFrom` date (2025-11-01)
- `isEffectiveNow()` returns `false` for future dates
- LegalGate only blocks when:
  - Document is `required: true`
  - Document `isEffectiveNow()` returns `true`
  - Document has `policy: "force"`
  - User hasn't accepted current version

### Testing Without Modifying Manifest
If you don't want to change the manifest:
1. Wait until 2025-11-01
2. Or manually call in browser console:
   ```javascript
   // Force show legal gate (testing only)
   window.postMessage({ type: 'test:show-legal-gate' }, '*');
   ```

## Cleanup After Testing

**Reset Legal Acceptances:**
1. Browser DevTools → Application → IndexedDB → RepCue → consent
2. Find your consent record
3. Delete `legalAcceptances` array
4. Reload app

OR clear all site data:
- F12 → Application → Storage → Clear Site Data

## Success Criteria

✅ Legal Center page accessible via More menu  
✅ All 10 documents listed (6 required, 4 optional)  
✅ Document modal opens with markdown content  
✅ Scroll-to-bottom tracking works  
✅ Accept button updates status  
✅ LegalGate appears when documents are effective and blocking  
✅ Can't continue until all required docs accepted  
✅ RTL languages display correctly  
✅ Legal services initialize on app boot  
✅ Legal manifest fetched from Edge Function

## Next Steps

After confirming Phase 3 works:
- Proceed to Phase 4: Supabase Sync
- Add unit tests for legal components
- Add E2E tests for legal flows
- Update CHANGELOG with Phase 3 completion
