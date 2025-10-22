// @ts-nocheck // Edge function executed in Deno runtime; Deno types provided at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Legal Manifest Edge Function
 * 
 * Serves the legal documents manifest with ETag support for efficient caching.
 * This function provides a live source of truth for legal document versions
 * and allows dynamic updates without requiring app rebuilds.
 * 
 * Features:
 * - ETag-based cache validation
 * - CORS support for same-origin policy
 * - Graceful degradation (falls back to baseline manifest)
 * - Stale-while-revalidate cache headers
 * 
 * Future: Will source manifest from Supabase database for editorial workflow
 */

// CORS headers for same-origin access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Will be restricted to app origin in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, if-none-match',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

// Baseline manifest (embedded for offline-first fallback)
// In production, this will be sourced from Supabase database
const BASELINE_MANIFEST = {
  "updatedAt": "2025-10-22T18:06:23.559Z",
  "documents": [
    {
      "id": "terms_conditions",
      "title": "Terms & Conditions",
      "version": "1.0.0",
      "required": true,
      "policy": "force",
      "effectiveFrom": "2025-10-15T00:00:00Z",
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
    },
    {
      "id": "privacy_policy",
      "title": "Privacy Policy",
      "version": "1.0.0",
      "required": true,
      "policy": "deferred",
      "effectiveFrom": "2025-11-01T00:00:00Z",
      "locales": [
        {
          "locale": "en",
          "path": "/legal/02-privacy_policy.en.md",
          "contentHash": "eHojbMyhlJjt+tL5/oXsNkBZCWOnXVM6MUQ5yOHDS/Y="
        },
        {
          "locale": "ar",
          "path": "/legal/02-privacy_policy.ar.md",
          "contentHash": "6kWYH8jmaDVciMX0a6KjG3jD701JX/Pfp/rZEBZDyoQ="
        },
        {
          "locale": "nl",
          "path": "/legal/02-privacy_policy.nl.md",
          "contentHash": "HsTCu51NNB3WHQGK7IwG9Mg0dYjFd0PNyedOP14dHWE="
        }
      ]
    },
    {
      "id": "cookie_policy",
      "title": "Cookie Policy",
      "version": "1.0.0",
      "required": true,
      "policy": "force",
      "effectiveFrom": "2025-10-22T00:00:00Z",
      "locales": [
        {
          "locale": "en",
          "path": "/legal/03-cookie_policy.en.md",
          "contentHash": "G57tNCiQ8Ut0/7+Z2aSRiIE8kJz5cpzpNXnP8G+7MT8="
        },
        {
          "locale": "ar",
          "path": "/legal/03-cookie_policy.ar.md",
          "contentHash": "9lCvGtYjdCckN0tSGGhYKYC/gONeoSRWu1bIYSrbplU="
        },
        {
          "locale": "nl",
          "path": "/legal/03-cookie_policy.nl.md",
          "contentHash": "58U9kB+MMuTbjnllc/792z18iESD0GFhvexcdJjYJbE="
        }
      ]
    },
    {
      "id": "medical_disclaimer",
      "title": "Medical Disclaimer",
      "version": "1.0.0",
      "required": true,
      "policy": "deferred",
      "effectiveFrom": "2025-11-01T00:00:00Z",
      "locales": [
        {
          "locale": "en",
          "path": "/legal/04-medical_disclaimer.en.md",
          "contentHash": "nBxN5ko619EHpaIn22Y7j1NWWhXOhd0wMt5Zi0K1MdU="
        },
        {
          "locale": "ar",
          "path": "/legal/04-medical_disclaimer.ar.md",
          "contentHash": "sh/VcjkM2f7j8X+EtCOE/RdRI0d6oJd5GfoYi8HxBKI="
        },
        {
          "locale": "nl",
          "path": "/legal/04-medical_disclaimer.nl.md",
          "contentHash": "nS7WMULZjutyrneM8/yZwXsFcG63BzEU9DeDdgZTUfE="
        }
      ]
    },
    {
      "id": "liability_waiver",
      "title": "Liability Waiver",
      "version": "1.0.0",
      "required": true,
      "policy": "deferred",
      "effectiveFrom": "2025-11-01T00:00:00Z",
      "locales": [
        {
          "locale": "en",
          "path": "/legal/05-liability_waiver.en.md",
          "contentHash": "xj6Rrt0/D3wHL75+6hA91NQQad+/ExsXdXjmscJ/IDg="
        },
        {
          "locale": "ar",
          "path": "/legal/05-liability_waiver.ar.md",
          "contentHash": "UhqMaZ4I2nMAENudIsZ8yG0SbeulthYhlXtv8De/Tgk="
        },
        {
          "locale": "nl",
          "path": "/legal/05-liability_waiver.nl.md",
          "contentHash": "Dbbp4YyeJlIyPmZLWblrgC4WLQU5ZZJkXGuncLhn5Fs="
        }
      ]
    },
    {
      "id": "dpa",
      "title": "Data Processing Agreement",
      "version": "1.0.0",
      "required": false,
      "policy": "deferred",
      "locales": [
        {
          "locale": "en",
          "path": "/legal/06-dpa.en.md",
          "contentHash": "G2WdKCY0EcAZrkQwqsG+7nyhFVkIf5kgqMpAjYl9IpM="
        },
        {
          "locale": "ar",
          "path": "/legal/06-dpa.ar.md",
          "contentHash": "bk5BjXJg4FK6zZyfSPENSqH4FbasVwPgCUYd5evqD1A="
        },
        {
          "locale": "nl",
          "path": "/legal/06-dpa.nl.md",
          "contentHash": "CLEdzCX85a9GQLyx3GTZEyo144e8oMbEATM4V4mpCSs="
        }
      ]
    },
    {
      "id": "subscription_policy",
      "title": "Subscription & Payment Policy",
      "version": "1.0.0",
      "required": false,
      "policy": "deferred",
      "locales": [
        {
          "locale": "en",
          "path": "/legal/07-subscription_policy.en.md",
          "contentHash": "Sx3vD//WZjRqUUQz8BdBfaDMYeyMZaKVZLIkEDLUbKc="
        },
        {
          "locale": "ar",
          "path": "/legal/07-subscription_policy.ar.md",
          "contentHash": "WYi+5HoG/czsEXE2yeANiAVkbXWbPTPCRpRoxXLcG9w="
        },
        {
          "locale": "nl",
          "path": "/legal/07-subscription_policy.nl.md",
          "contentHash": "OFIek4HTjNdl8T/OH5199iyDouMCkSLjL+5KoStcZl8="
        }
      ]
    },
    {
      "id": "community_guidelines",
      "title": "Community Guidelines",
      "version": "1.0.0",
      "required": false,
      "policy": "deferred",
      "locales": [
        {
          "locale": "en",
          "path": "/legal/08-community_guidelines.en.md",
          "contentHash": "Y3VKQUVwZDYoupvjXGvaqJuHZNnKtOcAf/wXt7G5/Ks="
        },
        {
          "locale": "ar",
          "path": "/legal/08-community_guidelines.ar.md",
          "contentHash": "IInxre5APJkRwLVgwMD1+xMxzb3YLkTe6dxHh44/2so="
        },
        {
          "locale": "nl",
          "path": "/legal/08-community_guidelines.nl.md",
          "contentHash": "thObx4nHgAsoOftcbh34Wk1RtbRjWhsdW0tOX6TrFJY="
        }
      ]
    }
  ]
};

/**
 * Generate ETag from manifest content
 * Uses SHA-256 hash of JSON string for cache validation
 */
async function generateETag(manifest: any): Promise<string> {
  const manifestString = JSON.stringify(manifest);
  const msgBuffer = new TextEncoder().encode(manifestString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `"${hashHex}"`;
}

/**
 * Fetch manifest from database (future implementation)
 * Currently returns baseline manifest
 */
async function fetchManifestFromDatabase(): Promise<any> {
  // TODO: Phase 7 - Query Supabase tables:
  // - legal_documents (id, title, version, required, policy, effective_from)
  // - legal_document_locales (doc_id, locale, path, content_hash)
  // Build manifest JSON from DB rows
  
  // For now, return baseline manifest with updated timestamp
  return {
    ...BASELINE_MANIFEST,
    updatedAt: new Date().toISOString()
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    console.log('Legal manifest requested');

    // Fetch current manifest (currently baseline, future: from database)
    const manifest = await fetchManifestFromDatabase();

    // Generate ETag for cache validation
    const etag = await generateETag(manifest);

    // Check if client has current version (If-None-Match header)
    const clientETag = req.headers.get('If-None-Match');
    if (clientETag === etag) {
      console.log('Client manifest is up-to-date (ETag match)');
      return new Response(null, {
        status: 304, // Not Modified
        headers: {
          ...corsHeaders,
          'ETag': etag,
          'Cache-Control': 'max-age=60, stale-while-revalidate=86400'
        }
      });
    }

    // Return manifest with cache headers
    console.log(`Serving legal manifest - ${manifest.documents.length} documents`);
    
    return new Response(
      JSON.stringify(manifest),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'ETag': etag,
          'Cache-Control': 'max-age=60, stale-while-revalidate=86400',
          'X-Legal-Manifest-Version': manifest.updatedAt
        }
      }
    );

  } catch (error) {
    console.error('Error serving legal manifest:', error);

    // Graceful degradation - return baseline manifest
    const etag = await generateETag(BASELINE_MANIFEST);
    
    return new Response(
      JSON.stringify(BASELINE_MANIFEST),
      {
        status: 200, // Return 200 to avoid breaking client
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'ETag': etag,
          'Cache-Control': 'max-age=60, stale-while-revalidate=86400',
          'X-Legal-Manifest-Fallback': 'true'
        }
      }
    );
  }
});
