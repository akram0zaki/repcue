import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RateLimitRule {
  endpoint: string
  maxRequests: number
  windowMinutes: number
  identifier: 'user' | 'ip' | 'user_ip'
}

interface RateLimitResult {
  allowed: boolean
  remaining?: number
  resetTime?: Date
  message?: string
}

// Rate limiting rules for different endpoints
const RATE_LIMITS: RateLimitRule[] = [
  // Sync endpoint - per user
  {
    endpoint: 'sync',
    maxRequests: 60, // 60 syncs per hour per user
    windowMinutes: 60,
    identifier: 'user'
  },
  // Export data - per user
  {
    endpoint: 'export-data',
    maxRequests: 3, // 3 exports per day per user
    windowMinutes: 1440, // 24 hours
    identifier: 'user'
  },
  // Delete account - per user
  {
    endpoint: 'delete-account',
    maxRequests: 1, // 1 deletion request per day per user
    windowMinutes: 1440,
    identifier: 'user'
  },
  // General API - per IP (for unauthenticated requests)
  {
    endpoint: '*',
    maxRequests: 1000, // 1000 requests per hour per IP
    windowMinutes: 60,
    identifier: 'ip'
  }
]

export class RateLimiter {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  async checkRateLimit(
    endpoint: string,
    userId?: string,
    ipAddress?: string
  ): Promise<RateLimitResult> {
    try {
      // Find applicable rate limit rule
      const rule = RATE_LIMITS.find(r => r.endpoint === endpoint) || 
                   RATE_LIMITS.find(r => r.endpoint === '*')!

      // Determine identifier value
      let identifierValue: string
      switch (rule.identifier) {
        case 'user':
          if (!userId) {
            return { allowed: false, message: 'Authentication required' }
          }
          identifierValue = `user:${userId}`
          break
        case 'ip':
          if (!ipAddress) {
            return { allowed: false, message: 'IP address required' }
          }
          identifierValue = `ip:${ipAddress}`
          break
        case 'user_ip':
          if (!userId || !ipAddress) {
            return { allowed: false, message: 'Authentication and IP required' }
          }
          identifierValue = `user_ip:${userId}:${ipAddress}`
          break
        default:
          return { allowed: false, message: 'Invalid rate limit configuration' }
      }

      // Calculate time window
      const windowStart = new Date(Date.now() - rule.windowMinutes * 60 * 1000)

      // Check current usage
      const { data: requests, error } = await this.supabase
        .from('audit_logs')
        .select('id, created_at')
        .eq('action', 'API_REQUEST')
        .eq('resource_type', 'rate_limit')
        .eq('resource_id', `${endpoint}:${identifierValue}`)
        .gte('created_at', windowStart.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Rate limit check error:', error)
        // On error, allow the request (fail open)
        return { allowed: true, message: 'Rate limit check failed - allowing request' }
      }

      const currentCount = requests?.length || 0
      const remaining = Math.max(0, rule.maxRequests - currentCount)
      const resetTime = new Date(Date.now() + rule.windowMinutes * 60 * 1000)

      if (currentCount >= rule.maxRequests) {
        // Rate limit exceeded
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          message: `Rate limit exceeded. Maximum ${rule.maxRequests} requests per ${rule.windowMinutes} minutes.`
        }
      }

      // Log the request for rate limiting
      await this.logRequest(endpoint, identifierValue, userId, ipAddress)

      return {
        allowed: true,
        remaining: remaining - 1, // Account for this request
        resetTime
      }

    } catch (error) {
      console.error('Rate limiter error:', error)
      // On error, allow the request (fail open for availability)
      return { allowed: true, message: 'Rate limiter error - allowing request' }
    }
  }

  private async logRequest(
    endpoint: string,
    identifierValue: string,
    userId?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      await this.supabase.rpc('log_audit_event', {
        p_user_id: userId || null,
        p_action: 'API_REQUEST',
        p_resource_type: 'rate_limit',
        p_resource_id: `${endpoint}:${identifierValue}`,
        p_details: {
          endpoint,
          identifier: identifierValue
        },
        p_ip_address: ipAddress || null,
        p_user_agent: null,
        p_success: true
      })
    } catch (error) {
      console.error('Failed to log request for rate limiting:', error)
      // Don't throw - this shouldn't break the main request
    }
  }

  // Cleanup old rate limit logs
  async cleanupOldLogs(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .delete()
        .eq('action', 'API_REQUEST')
        .eq('resource_type', 'rate_limit')
        .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // 7 days old

      if (error) {
        console.error('Rate limit cleanup error:', error)
        return 0
      }

      return data?.length || 0
    } catch (error) {
      console.error('Rate limit cleanup failed:', error)
      return 0
    }
  }
}

// Helper function to extract IP address from request
export function extractClientIP(req: Request): string {
  return req.headers.get('CF-Connecting-IP') || 
         req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
         req.headers.get('X-Real-IP') || 
         req.headers.get('X-Client-IP') ||
         'unknown'
}