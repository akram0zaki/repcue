// Debug script to test JWT validation
// Run this in the browser console when you're getting the 401 error

async function debugAuth() {
  console.log('🔍 Debugging authentication...');

  // Check if we have the auth service
  if (!window.authService) {
    console.log('❌ AuthService not available on window');
    return;
  }

  const authState = window.authService.getAuthState();
  console.log('🔐 Auth State:', {
    isAuthenticated: authState.isAuthenticated,
    hasUser: !!authState.user,
    hasAccessToken: !!authState.accessToken,
    accessTokenLength: authState.accessToken ? authState.accessToken.length : 0,
    tokenStart: authState.accessToken ? authState.accessToken.substring(0, 20) + '...' : 'none'
  });

  if (!authState.isAuthenticated) {
    console.log('❌ User is not authenticated');
    return;
  }

  // Try to get fresh session
  try {
    const { supabase } = await import('./apps/frontend/src/config/supabase.js');
    const { data: { session }, error } = await supabase.auth.getSession();

    console.log('🔄 Fresh Session Check:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      sessionError: error?.message,
      tokenMatches: session?.access_token === authState.accessToken,
      tokenExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown'
    });

    if (session?.access_token) {
      // Try to validate the token manually
      try {
        const testResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync_v2`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            mode: 'light',
            since: {},
            tables: {},
            clientInfo: { deviceId: 'debug', appVersion: '1.0.0' }
          })
        });

        console.log('🧪 Test API Call:', {
          status: testResponse.status,
          statusText: testResponse.statusText,
          ok: testResponse.ok
        });

        if (!testResponse.ok) {
          const errorText = await testResponse.text();
          console.log('❌ API Error Response:', errorText);
        }
      } catch (apiError) {
        console.log('❌ API Call Failed:', apiError);
      }
    }

  } catch (sessionError) {
    console.log('❌ Session Check Failed:', sessionError);
  }
}

// Make it available globally
window.debugAuth = debugAuth;

console.log('🛠️ Debug script loaded. Run debugAuth() to check authentication.');