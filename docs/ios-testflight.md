# iOS TestFlight Distribution Guide

**Last Updated**: 2025-12-06  
**For**: RepCue iOS App (Bundle ID: `me.repcue.app`)

This guide walks you through the complete process of getting RepCue published to TestFlight for beta testing on physical iOS devices.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create App ID in Developer Portal](#step-1-create-app-id-in-developer-portal)
3. [Step 2: Create App in App Store Connect](#step-2-create-app-in-app-store-connect)
4. [Step 3: Configure Signing in Xcode](#step-3-configure-signing-in-xcode)
5. [Step 4: Build and Archive](#step-4-build-and-archive)
6. [Step 5: Upload to App Store Connect](#step-5-upload-to-app-store-connect)
7. [Step 6: Configure TestFlight](#step-6-configure-testflight)
8. [Step 7: Invite Testers](#step-7-invite-testers)
9. [Troubleshooting](#troubleshooting)
10. [Updating the App](#updating-the-app)

---

## Prerequisites

Before starting, ensure you have:

- [x] **Apple Developer Program membership** ($99/year) - [developer.apple.com](https://developer.apple.com)
- [x] **Xcode installed** (latest version recommended) - Download from Mac App Store
- [x] **Apple ID signed in to Xcode** - Xcode → Settings → Accounts → Add your Apple ID
- [x] **RepCue project built** - Run `pnpm build && npx cap sync ios` in the frontend directory

---

## Step 1: Create App ID in Developer Portal

The App ID tells Apple about your app and its capabilities.

### 1.1 Go to Apple Developer Portal

1. Open [developer.apple.com/account](https://developer.apple.com/account)
2. Sign in with your Apple Developer account
3. Click **Certificates, Identifiers & Profiles**

### 1.2 Create a New Identifier

1. In the left sidebar, click **Identifiers**
2. Click the **+** button (top left)
3. Select **App IDs** → Click **Continue**
4. Select **App** (not App Clip) → Click **Continue**

### 1.3 Configure the App ID

Fill in the following:

| Field | Value |
|-------|-------|
| **Description** | RepCue - Exercise Tracker |
| **Bundle ID** | Select **Explicit** and enter: `me.repcue.app` |

### 1.4 Select Capabilities

Scroll down and enable these capabilities (check the boxes):

- [x] **Associated Domains** - Required for Universal Links (magic link login)
- [x] **Push Notifications** - For future workout reminders (optional but recommended)

Leave other capabilities unchecked unless you need them.

### 1.5 Register the App ID

1. Click **Continue**
2. Review the settings
3. Click **Register**

✅ **Checkpoint**: You should now see `me.repcue.app` in your Identifiers list.

---

## Step 2: Create App in App Store Connect

App Store Connect is where you manage your app's presence on the App Store and TestFlight.

### 2.1 Go to App Store Connect

1. Open [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Sign in with your Apple Developer account
3. Click **My Apps**

### 2.2 Create a New App

1. Click the **+** button (top left) → Select **New App**

2. Fill in the form:

| Field | Value |
|-------|-------|
| **Platforms** | ✅ iOS |
| **Name** | RepCue |
| **Primary Language** | English (U.S.) |
| **Bundle ID** | Select `me.repcue.app` from dropdown |
| **SKU** | `repcue-ios-001` (any unique identifier) |
| **User Access** | Full Access (or Limited if you have multiple teams) |

3. Click **Create**

✅ **Checkpoint**: You now have an app record in App Store Connect. You'll see the app dashboard.

---

## Step 3: Configure Signing in Xcode

Code signing proves that your app comes from you and hasn't been tampered with.

### 3.1 Open the iOS Project in Xcode

```bash
cd /Users/akramzaki/Library/CloudStorage/OneDrive-Personal/Documents/Workspace/repcue/apps/frontend
npx cap open ios
```

Or manually: Open `/apps/frontend/ios/App/App.xcworkspace` in Xcode.

> ⚠️ **Important**: Always open the `.xcworkspace` file, NOT the `.xcodeproj` file!

### 3.2 Select the App Target

1. In the left sidebar (Project Navigator), click the top-level **App** project (blue icon)
2. In the center panel, under **TARGETS**, select **App**
3. Click the **Signing & Capabilities** tab

### 3.3 Enable Automatic Signing

1. Check ✅ **Automatically manage signing**
2. For **Team**, select your Apple Developer team from the dropdown
   - If your team doesn't appear, go to Xcode → Settings → Accounts and sign in

3. Xcode will automatically:
   - Create a signing certificate
   - Create a provisioning profile
   - Register your Bundle ID

### 3.4 Verify Settings

You should see:

| Field | Expected Value |
|-------|----------------|
| **Team** | Your name or organization |
| **Bundle Identifier** | `me.repcue.app` |
| **Provisioning Profile** | Xcode Managed Profile |
| **Signing Certificate** | Apple Development: your@email.com |

### 3.5 Add Associated Domains Capability (for Universal Links)

1. Still in **Signing & Capabilities** tab
2. Click **+ Capability** button
3. Search for and add **Associated Domains**
4. In the Associated Domains section, click **+** and add:
   ```
   applinks:repcue.me
   ```

✅ **Checkpoint**: No red error icons should appear in the Signing section.

---

## Step 4: Build and Archive

An archive is a release-ready build of your app.

### 4.1 Prepare the Web Build

First, ensure you have the latest web build:

```bash
cd /Users/akramzaki/Library/CloudStorage/OneDrive-Personal/Documents/Workspace/repcue/apps/frontend

# Build for production
pnpm build

# Sync to iOS project
npx cap sync ios
```

### 4.2 Configure Build Settings

In Xcode:

1. Click the **App** target in the left sidebar
2. Select the **Build Settings** tab
3. Search for "version" and verify:

| Setting | Value |
|---------|-------|
| **Marketing Version** (MARKETING_VERSION) | `1.0.0` (or your version) |
| **Current Project Version** (CURRENT_PROJECT_VERSION) | `1` (increment for each upload) |

> 💡 **Tip**: The Marketing Version is what users see (e.g., "1.0.0"). The Current Project Version is the build number (e.g., "1", "2", "3").

### 4.3 Select the Build Destination

1. In the Xcode toolbar, click the device selector (next to the play button)
2. Select **Any iOS Device (arm64)**
   - NOT a simulator - simulators can't be archived

### 4.4 Create the Archive

1. In the menu bar, click **Product → Archive**
2. Wait for the build to complete (this may take a few minutes)
3. The **Organizer** window will open automatically showing your archive

### 4.5 Validate the Archive (Optional but Recommended)

1. In the Organizer, select your archive
2. Click **Validate App**
3. Follow the prompts:
   - Distribution method: **App Store Connect**
   - Destination: **Upload**
   - Keep default options for signing
4. Click **Validate**
5. Wait for validation to complete

If validation fails, see the [Troubleshooting](#troubleshooting) section.

✅ **Checkpoint**: You have a valid archive ready to upload.

---

## Step 5: Upload to App Store Connect

### 5.1 Distribute the Archive

1. In the Organizer window, select your archive
2. Click **Distribute App**
3. Select **App Store Connect** → Click **Next**
4. Select **Upload** → Click **Next**

### 5.2 Configure Distribution Options

Keep the default options:
- ✅ Upload your app's symbols to receive symbolicated reports
- ✅ Manage Version and Build Number

Click **Next**

### 5.3 Review Signing

Xcode should automatically select the correct signing options:
- Distribution certificate
- App Store provisioning profile

Click **Next**

### 5.4 Upload

1. Review the summary
2. Click **Upload**
3. Wait for the upload to complete (may take 5-15 minutes depending on app size)

### 5.5 Wait for Processing

After upload, Apple processes your build:
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click your app (**RepCue**)
3. Click the **TestFlight** tab
4. Your build will appear with status **Processing**
5. Processing typically takes 10-30 minutes

You'll receive an email when processing is complete.

✅ **Checkpoint**: Your build is uploaded and processing.

---

## Step 6: Configure TestFlight

Once your build finishes processing, you need to configure it for testing.

### 6.1 Handle Export Compliance

1. In App Store Connect, go to your app → **TestFlight**
2. Click on your build (e.g., "1.0.0 (1)")
3. You'll see a yellow warning about **Export Compliance**
4. Click **Manage** next to Export Compliance

Answer the questions:
- "Does your app use encryption?" → **No**
  - RepCue only uses HTTPS for network calls, which is exempt
  - If you're unsure, Apple provides [guidance here](https://developer.apple.com/documentation/security/complying_with_encryption_export_regulations)

5. Click **Save**

### 6.2 Add Test Information (Optional for Internal Testing)

For external testing, you'll need to provide:
- Beta App Description
- Feedback Email
- Privacy Policy URL
- Test account credentials (if app requires login)

For now, we'll focus on internal testing which doesn't require these.

✅ **Checkpoint**: Your build is ready for TestFlight distribution.

---

## Step 7: Invite Testers

### Option A: Internal Testing (Fastest)

Internal testers are members of your App Store Connect team (up to 100 people).

1. In App Store Connect → TestFlight → **Internal Testing**
2. Click **App Store Connect Users** group (or create a new group)
3. Click **+** next to Testers
4. Add yourself and any team members
5. Ensure the build checkbox is selected
6. Click **Add**

Testers receive an email invitation immediately.

### Option B: External Testing (For Non-Team Members)

External testing requires a brief beta review by Apple (usually 24-48 hours for first submission).

1. In TestFlight, click **External Testing** in the left sidebar
2. Click **+** to create a new group (e.g., "Beta Testers")
3. Add testers by email address
4. Select your build
5. Click **Submit for Review**

Fill in required information:
- Beta App Description: "RepCue is an exercise timer and workout tracker app."
- Feedback Email: your email
- Privacy Policy URL: your privacy policy (if you have one)

### 7.1 Installing on Your Device

Once invited:

1. Open the email on your iPhone
2. Tap **View in TestFlight** or **Start Testing**
3. If prompted, download the **TestFlight** app from the App Store
4. Open TestFlight and tap **Accept** for RepCue
5. Tap **Install**

The app will install on your device with a yellow dot indicator (indicating it's a beta).

✅ **Checkpoint**: RepCue is installed on your physical device via TestFlight!

---

## Troubleshooting

### "No signing certificate found"

**Solution**: 
1. Xcode → Settings → Accounts → Select your team
2. Click **Manage Certificates**
3. Click **+** → **Apple Distribution**
4. Try archiving again

### "Invalid provisioning profile"

**Solution**:
1. In Xcode, go to Signing & Capabilities
2. Uncheck "Automatically manage signing"
3. Check it again
4. Xcode will regenerate profiles

### "Bundle ID is not available"

**Cause**: Someone else has registered this Bundle ID.

**Solution**: You need to use a different Bundle ID. Update:
1. `capacitor.config.ts` → change `appId`
2. Xcode → Target → Bundle Identifier
3. App Store Connect → Create new app with new Bundle ID

### "App Store Connect operation error"

**Solution**:
1. Check your internet connection
2. Try again in a few minutes (Apple servers may be busy)
3. Check [Apple System Status](https://developer.apple.com/system-status/)

### Build stuck in "Processing"

Processing usually takes 10-30 minutes. If it's been over an hour:
1. Check [Apple System Status](https://developer.apple.com/system-status/)
2. Contact Apple Developer Support if the issue persists

### App crashes on launch

**Debug steps**:
1. Connect your device to Mac
2. Open Xcode → Window → Devices and Simulators
3. Select your device → View Device Logs
4. Look for crash logs related to RepCue

Common causes:
- Missing capabilities in App ID
- Incorrect signing
- JavaScript errors in the web app

---

## Updating the App

To release a new version to TestFlight:

### Quick Update Process

```bash
cd /Users/akramzaki/Library/CloudStorage/OneDrive-Personal/Documents/Workspace/repcue/apps/frontend

# Build the web app
pnpm build

# Sync to iOS
npx cap sync ios

# Open Xcode
npx cap open ios
```

Then in Xcode:
1. **Increment the build number**:
   - Target → Build Settings → Current Project Version
   - Change from `1` to `2` (or whatever the next number is)
   
2. **Optionally update version**:
   - Target → Build Settings → Marketing Version
   - e.g., `1.0.0` → `1.0.1`

3. **Archive and upload**:
   - Product → Archive
   - Distribute App → App Store Connect → Upload

4. **Enable for testing**:
   - App Store Connect → TestFlight → Select new build
   - Handle export compliance
   - Testers automatically get the update

---

## Version Number Guidelines

| Type | When to Increment | Example |
|------|-------------------|---------|
| **Build Number** | Every upload to App Store Connect | 1 → 2 → 3 |
| **Patch Version** | Bug fixes | 1.0.0 → 1.0.1 |
| **Minor Version** | New features | 1.0.1 → 1.1.0 |
| **Major Version** | Breaking changes or major redesign | 1.1.0 → 2.0.0 |

---

## Quick Reference Commands

```bash
# Build and sync
cd apps/frontend
pnpm build && npx cap sync ios

# Open in Xcode
npx cap open ios

# Check iOS project status
npx cap doctor
```

---

## Next Steps

After successful TestFlight testing:

1. **Collect feedback** from testers
2. **Fix bugs** and upload new builds
3. **Prepare for App Store** when ready:
   - Add screenshots (required)
   - Write app description
   - Set pricing (free or paid)
   - Submit for App Store Review

---

## Related Documentation

- [Platform Abstraction Architecture](platform-abstraction.md)
- [iOS PWA Magic Links](ios-pwa-magic-links.md)
- [iOS Implementation Plan](implementation-plans/ios-app/ios-app-implementation-plan.md)

---

*This guide is specific to RepCue but the general process applies to any Capacitor-based iOS app.*
