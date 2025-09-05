import { supabase, type Json } from '../config/supabase';

export interface DataExportResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  filename?: string;
}

export interface AccountDeletionResult {
  success: boolean;
  message?: string;
  gracePeriod?: string;
  error?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Json;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  created_at: string;
}

export class SecurityService {
  private static instance: SecurityService;

  private constructor() {}

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Export user data (GDPR right to data portability)
   */
  async exportUserData(): Promise<DataExportResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      const { data, error } = await supabase.functions.invoke('export-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Export failed'
        };
      }

      const filename = `repcue-data-export-${new Date().toISOString().split('T')[0]}.json`;

      return {
        success: true,
        data,
        filename
      };

    } catch (error) {
      console.error('Data export error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Request account deletion with optional reason
   */
  async requestAccountDeletion(reason?: string): Promise<AccountDeletionResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: {
          confirmation: 'DELETE',
          reason: reason?.trim() || undefined
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Account deletion failed'
        };
      }

      return {
        success: true,
        message: data.message,
        gracePeriod: data.gracePeriod
      };

    } catch (error) {
      console.error('Account deletion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Account deletion failed'
      };
    }
  }

  /**
   * Get user's audit logs (security activity)
   */
  async getAuditLogs(limit: number = 50, offset: number = 0): Promise<{
    logs: AuditLogEntry[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1);

      if (error) {
        return {
          logs: [],
          error: error.message
        };
      }

      return {
        logs: (data || []).map(log => ({
          ...log,
          ip_address: log.ip_address as string | null
        }))
      };

    } catch (error) {
      console.error('Audit logs fetch error:', error);
      return {
        logs: [],
        error: error instanceof Error ? error.message : 'Failed to fetch audit logs'
      };
    }
  }

  /**
   * Download data export as JSON file
   */
  downloadDataExport(data: Record<string, unknown>, filename: string): void {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Download failed:', error);
      throw new Error('Failed to download export file');
    }
  }

  /**
   * Check if user has requested account deletion
   */
  async getAccountDeletionStatus(): Promise<{
    isDeletionRequested: boolean;
    requestedAt?: string;
    gracePeriodEnds?: string;
    error?: string;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          isDeletionRequested: false,
          error: 'Not authenticated'
        };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('deletion_requested_at')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        return {
          isDeletionRequested: false,
          error: error.message
        };
      }

      if (!data?.deletion_requested_at) {
        return {
          isDeletionRequested: false
        };
      }

      const requestedAt = new Date(data.deletion_requested_at);
      const gracePeriodEnds = new Date(requestedAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      return {
        isDeletionRequested: true,
        requestedAt: requestedAt.toISOString(),
        gracePeriodEnds: gracePeriodEnds.toISOString()
      };

    } catch (error) {
      console.error('Deletion status check error:', error);
      return {
        isDeletionRequested: false,
        error: error instanceof Error ? error.message : 'Status check failed'
      };
    }
  }

  /**
   * Cancel account deletion (reactivate account)
   */
  async cancelAccountDeletion(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'Not authenticated'
        };
      }

      const { error } = await supabase
        .from('profiles')
        .update({ deletion_requested_at: null })
        .eq('user_id', user.id);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true
      };

    } catch (error) {
      console.error('Cancel deletion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cancellation failed'
      };
    }
  }
}

// Export singleton instance
export const securityService = SecurityService.getInstance();