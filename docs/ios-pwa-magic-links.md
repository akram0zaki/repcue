# iOS PWA Magic Link Setup Guide

## Browser Protocol Handler Popup

### What It Means
When you first visit RepCue and give consent, you may see a browser popup asking:
> "www.repcue.me wants to Open web+repcue links instead of localhost"

### Why It Appears
This popup enables **iOS PWA deep linking** for magic link authentication. When you install RepCue as a PWA and request magic links, they can redirect back to your installed app instead of always opening in Safari.

### Recommendation: Click "Allow"
- **Allows**: Magic links to open in your installed PWA app
- **Improves**: Authentication experience for PWA users  
- **Enables**: Seamless login flow without Safari redirects
- **Safe**: Only handles RepCue authentication URLs, no security risk

If you click "Block", magic links will still work but will always open in Safari instead of your PWA.

## Problem
When you install RepCue as a PWA on your iPhone home screen and try to sign in via magic link, clicking the email link opens Safari instead of your installed PWA app.

## Solutions

### Option 1: Manual Redirect (Immediate Solution)
1. **Click the magic link in your email** - This will open Safari
2. **In Safari, tap the Share button** (square with arrow up)
3. **Select "Add to Home Screen"** or **"Open in RepCue"** if you see the option
4. **Alternatively**: Copy the URL from Safari and paste it into your PWA app's address bar

### Option 2: iOS Settings Configuration (Better Solution)
1. **Open iOS Settings** > **Screen Time** > **Content & Privacy Restrictions**
2. **Go to Allowed Apps** and ensure **Safari** is enabled
3. **Open Settings** > **RepCue** (if available in app list)
4. **Enable "Default Browser Engine"** if the option exists

### Option 3: Use Safari for Sign-In (Recommended)
1. **Keep RepCue PWA for daily use**
2. **Use Safari specifically for sign-in/authentication**
3. **After successful authentication, return to your PWA**
4. **Your session will be shared between Safari and PWA**

## Technical Background

This is a known iOS limitation where:
- **Magic links** from emails always open in Safari
- **PWA apps** run in a separate container
- **Apple restricts** custom URL scheme handling for security

## What We've Implemented

### 1. Enhanced Manifest Configuration
- Added `protocol_handlers` for `web+repcue://` scheme
- Added `url_handlers` for broader compatibility
- Configured proper PWA scope and start URL

### 2. Smart Magic Link Detection
- Detects if app is running as PWA
- Uses appropriate redirect URLs for different contexts
- Handles both browser and PWA authentication flows

### 3. Deep Link Support
- Registers custom protocol handlers where supported
- Handles universal links with authentication tokens
- Provides fallback routing for unsupported browsers

## Testing Your Setup

### 1. Verify PWA Installation
```javascript
// Open browser console in your PWA and run:
console.log('PWA Mode:', window.matchMedia('(display-mode: standalone)').matches);
console.log('iOS Standalone:', navigator.standalone);
```

### 2. Test Magic Link Flow
1. **Request magic link** from PWA
2. **Check email** for authentication link
3. **Click link** - should detect context and route appropriately
4. **Verify authentication** works in your intended app

### 3. Debug Deep Links
```javascript
// Test deep link handling:
window.handleDeepLink('web+repcue://auth/callback?token=test');
```

## Future iOS Improvements

Apple is working on better PWA support in iOS. Future versions may:
- Allow custom URL schemes for PWAs
- Improve deep linking between apps and browsers
- Provide better authentication flow continuity

## Workarounds for Now

### For Best User Experience:
1. **Educate users** about the Safari redirect behavior
2. **Provide clear instructions** in your magic link emails
3. **Consider alternative auth methods** (password, OAuth) for PWA users
4. **Use session sharing** between Safari and PWA where possible

### Email Template Suggestion:
```
🔗 Click this link to sign in to RepCue:
[Sign In Link]

📱 If you have RepCue installed as an app:
1. This link will open in Safari
2. After signing in, return to your RepCue app
3. You'll be automatically signed in there too!
```

## Need Help?

If you continue having issues:
1. **Check iOS version** - newer versions have better PWA support
2. **Clear Safari cache** - old auth tokens can interfere
3. **Reinstall PWA** - ensures latest configuration
4. **Use password authentication** - as a reliable fallback
