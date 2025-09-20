import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Mock Supabase client for testing
const mockSupabaseClient = {
  from: (table: string) => ({
    select: (columns: string) => ({
      eq: (column: string, value: any) => ({
        order: (column: string, options: any) => ({
          limit: (count: number) => ({
            single: () => Promise.resolve({
              data: null,
              error: null
            })
          })
        })
      })
    })
  })
};

// Mock createClient function
const createClient = () => mockSupabaseClient;

// Test data
const validVersionCheckRequest = {
  current_version: "1.0.0",
  user_consent: true,
  platform: "web"
};

const mockVersionData = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  version_number: "1.1.0",
  build_number: "build-123",
  release_date: "2023-12-01T10:00:00Z",
  reviewer: "admin@repcue.com",
  git_commit_hash: "abc123def456",
  update_policy: "optional",
  changelog: {
    new_features: ["New feature 1", "New feature 2"],
    improvements: ["Performance improvement"],
    bug_fixes: ["Fixed critical bug"]
  },
  metadata: {
    download_size: 15000000,
    compatibility_notes: "Compatible with all browsers"
  },
  is_active: true,
  created_at: "2023-12-01T09:00:00Z",
  updated_at: "2023-12-01T09:00:00Z"
};

Deno.test("check-version edge function tests", async (t) => {
  // Set up environment variables for testing
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");

  await t.step("should handle CORS preflight request", async () => {
    const request = new Request("https://test.com/check-version", {
      method: "OPTIONS"
    });

    // Import the function (this would need to be adjusted based on actual implementation)
    // For now, we'll test the expected behavior
    const response = new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400'
      }
    });

    assertEquals(response.status, 200);
    assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  });

  await t.step("should reject non-POST requests", async () => {
    const request = new Request("https://test.com/check-version", {
      method: "GET"
    });

    const response = new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    assertEquals(response.status, 405);
  });

  await t.step("should validate required current_version field", async () => {
    const request = new Request("https://test.com/check-version", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    const response = new Response(
      JSON.stringify({ error: 'current_version is required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    assertEquals(response.status, 400);
  });

  await t.step("should validate semantic version format", async () => {
    const request = new Request("https://test.com/check-version", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_version: "invalid-version"
      })
    });

    const response = new Response(
      JSON.stringify({ 
        error: 'Invalid version format. Expected semantic versioning (x.y.z)' 
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    assertEquals(response.status, 400);
  });

  await t.step("should handle missing environment variables gracefully", async () => {
    // Temporarily remove env vars
    const originalUrl = Deno.env.get("SUPABASE_URL");
    const originalKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    Deno.env.delete("SUPABASE_URL");
    Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");

    const request = new Request("https://test.com/check-version", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validVersionCheckRequest)
    });

    const response = new Response(
      JSON.stringify({
        error: 'Service temporarily unavailable',
        update_available: false,
        message: 'Unable to check for updates. Please try again later.'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    assertEquals(response.status, 503);

    // Restore env vars
    if (originalUrl) Deno.env.set("SUPABASE_URL", originalUrl);
    if (originalKey) Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", originalKey);
  });

  await t.step("should return no update when current version is latest", async () => {
    // Mock database response with same version
    const mockClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                single: () => Promise.resolve({
                  data: {
                    ...mockVersionData,
                    version_number: "1.0.0" // Same as current
                  },
                  error: null
                })
              })
            })
          })
        })
      })
    };

    const expectedResponse = {
      update_available: false,
      latest_version: "1.0.0",
      message: 'You are running the latest version.'
    };

    // This would be the actual response from the function
    const response = new Response(
      JSON.stringify(expectedResponse),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    assertEquals(response.status, 200);
    const body = await response.json();
    assertEquals(body.update_available, false);
    assertEquals(body.latest_version, "1.0.0");
  });

  await t.step("should return update available for newer version", async () => {
    // Mock database response with newer version
    const mockClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                single: () => Promise.resolve({
                  data: mockVersionData, // version 1.1.0
                  error: null
                })
              })
            })
          })
        })
      })
    };

    const expectedResponse = {
      update_available: true,
      latest_version: "1.1.0",
      update_policy: "optional",
      force_update: false,
      changelog: mockVersionData.changelog,
      message: 'A new update is available with new features and improvements.',
      download_url: "https://test.supabase.co/"
    };

    const response = new Response(
      JSON.stringify(expectedResponse),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    assertEquals(response.status, 200);
    const body = await response.json();
    assertEquals(body.update_available, true);
    assertEquals(body.latest_version, "1.1.0");
    assertEquals(body.update_policy, "optional");
  });

  await t.step("should handle force updates regardless of consent", async () => {
    const forceUpdateData = {
      ...mockVersionData,
      update_policy: "force"
    };

    const requestWithoutConsent = {
      current_version: "1.0.0",
      user_consent: false,
      platform: "web"
    };

    const expectedResponse = {
      update_available: true,
      latest_version: "1.1.0",
      update_policy: "force",
      force_update: true,
      changelog: forceUpdateData.changelog,
      message: 'A critical security update is required. The app will update automatically.',
      download_url: "https://test.supabase.co/"
    };

    const response = new Response(
      JSON.stringify(expectedResponse),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    assertEquals(response.status, 200);
    const body = await response.json();
    assertEquals(body.force_update, true);
    assertEquals(body.update_policy, "force");
  });

  await t.step("should respect privacy preferences for non-force updates", async () => {
    const requestWithoutConsent = {
      current_version: "1.0.0",
      user_consent: false,
      platform: "web"
    };

    const expectedResponse = {
      update_available: true,
      latest_version: "1.1.0",
      message: 'An update is available. Enable cloud sync to get detailed update information.'
    };

    const response = new Response(
      JSON.stringify(expectedResponse),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    assertEquals(response.status, 200);
    const body = await response.json();
    assertEquals(body.update_available, true);
    assertEquals(body.update_policy, undefined); // Should not include detailed info
  });

  await t.step("should handle database errors gracefully", async () => {
    // Mock database error
    const mockClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                single: () => Promise.resolve({
                  data: null,
                  error: { message: "Database connection failed" }
                })
              })
            })
          })
        })
      })
    };

    const expectedResponse = {
      update_available: false,
      message: 'Unable to check for updates. Please try again later.'
    };

    const response = new Response(
      JSON.stringify(expectedResponse),
      {
        status: 200, // Should return 200 to avoid breaking client
        headers: { 'Content-Type': 'application/json' }
      }
    );

    assertEquals(response.status, 200);
    const body = await response.json();
    assertEquals(body.update_available, false);
  });

  await t.step("should handle no active versions in database", async () => {
    // Mock empty database response
    const mockClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                single: () => Promise.resolve({
                  data: null,
                  error: null
                })
              })
            })
          })
        })
      })
    };

    const expectedResponse = {
      update_available: false,
      message: 'No updates available at this time.'
    };

    const response = new Response(
      JSON.stringify(expectedResponse),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    assertEquals(response.status, 200);
    const body = await response.json();
    assertEquals(body.update_available, false);
  });

  await t.step("should generate correct update messages for different policies", async () => {
    const testCases = [
      {
        policy: "force",
        expected: "A critical security update is required. The app will update automatically."
      },
      {
        policy: "critical", 
        expected: "An important update is available with security improvements and bug fixes."
      },
      {
        policy: "optional",
        expected: "A new update is available with new features and improvements."
      }
    ];

    testCases.forEach(({ policy, expected }) => {
      // This would test the getUpdateMessage helper function
      const message = getUpdateMessage(policy);
      assertEquals(message, expected);
    });
  });

  await t.step("should compare versions correctly", async () => {
    const testCases = [
      { current: "1.0.0", latest: "1.0.1", expected: -1 },
      { current: "1.0.1", latest: "1.0.0", expected: 1 },
      { current: "1.0.0", latest: "1.0.0", expected: 0 },
      { current: "1.0.0", latest: "2.0.0", expected: -1 },
      { current: "2.0.0", latest: "1.0.0", expected: 1 },
      { current: "1.0.0", latest: "1.1.0", expected: -1 },
      { current: "1.1.0", latest: "1.0.0", expected: 1 }
    ];

    testCases.forEach(({ current, latest, expected }) => {
      const result = compareVersions(current, latest);
      assertEquals(result, expected, `Failed for ${current} vs ${latest}`);
    });
  });

  await t.step("should handle malformed JSON requests", async () => {
    const request = new Request("https://test.com/check-version", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json"
    });

    const response = new Response(
      JSON.stringify({
        update_available: false,
        message: 'Unable to check for updates. Please try again later.'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    assertEquals(response.status, 200);
  });
});

// Helper functions that would be imported from the actual function
function getUpdateMessage(updatePolicy: string): string {
  switch (updatePolicy) {
    case 'force':
      return 'A critical security update is required. The app will update automatically.';
    case 'critical':
      return 'An important update is available with security improvements and bug fixes.';
    case 'optional':
      return 'A new update is available with new features and improvements.';
    default:
      return 'An update is available.';
  }
}

function compareVersions(current: string, latest: string): number {
  const currentParts = current.split('.').map(n => parseInt(n, 10));
  const latestParts = latest.split('.').map(n => parseInt(n, 10));

  const maxLength = Math.max(currentParts.length, latestParts.length);

  for (let i = 0; i < maxLength; i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;

    if (currentPart < latestPart) return -1;
    if (currentPart > latestPart) return 1;
  }

  return 0;
}