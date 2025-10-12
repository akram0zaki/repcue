# Supabase Changes - 2025-10-12

## Edge Function Updates

### webauthn-authenticate (v13)

**Issue**: When authenticating with biometrics and providing an email address, the edge function returned a 500 error with: "TypeError: r.replace is not a function"

**Root Cause**: The `generateAuthenticationOptions` function was receiving credential IDs as `Uint8Array` objects, but SimpleWebAuthn v12+ expects them as base64url strings.

**Fix Applied**:
- Added `uint8ArrayToBase64url()` helper function to convert credential ID bytes to base64url format
- Updated `allowCredentials` mapping to convert credential IDs from stored byte arrays to base64url strings before passing to SimpleWebAuthn

**Code Changes**:
```typescript
// Helper function to convert bytes to base64url
function uint8ArrayToBase64url(bytes: Uint8Array): string {
  const binaryString = String.fromCharCode(...bytes);
  const base64 = btoa(binaryString);
  // Convert base64 to base64url
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Use conservative transport list for better cross-browser compatibility
const transports: AuthenticatorTransport[] = ['internal', 'usb', 'ble', 'nfc'];

allowCredentials = userAuthenticators.map(auth => {
  const credentialBytes = new Uint8Array(JSON.parse(auth.credential_id));
  return {
    id: uint8ArrayToBase64url(credentialBytes),
    type: 'public-key' as const,
    transports
  };
})
```

**Testing**:
- Biometric authentication without email: ✓ Works (discoverable credentials flow)
- Biometric authentication with email: ✓ Fixed (now properly converts credential IDs)

**Environment**: Both Development and Production

**Status**: ✅ Deployed to both environments
- Development (repcue-dev): v13 - Deployed 2025-10-12
- Production (RepCue): v9 - Deployed 2025-10-12
