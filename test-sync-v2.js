// Simple test script for sync_v2 edge function
// Run with: node test-sync-v2.js

const testSyncV2 = async () => {
  // You'll need to replace these with actual values:
  const SUPABASE_URL = 'your-supabase-url';
  const ACCESS_TOKEN = 'your-access-token'; // Get from browser dev tools after login
  
  const functionUrl = `${SUPABASE_URL}/functions/v1/sync_v2`;
  
  const testPayload = {
    mode: 'light',
    tables: {}, // Empty push for basic connectivity test
    clientInfo: {
      deviceId: 'test-device',
      appVersion: '1.0.0-test'
    }
  };
  
  try {
    console.log('Testing sync_v2 endpoint...');
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! Response:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ Error:', error);
    }
  } catch (err) {
    console.error('❌ Network error:', err.message);
  }
};

testSyncV2();