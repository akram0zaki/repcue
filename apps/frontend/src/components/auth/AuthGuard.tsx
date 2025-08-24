import React from 'react';
import { useAuth } from '../../hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

/**
 * AuthGuard component that conditionally renders children based on authentication state
 * 
 * @param children - Content to render when auth requirement is met
 * @param fallback - Content to render when auth requirement is not met (optional)
 * @param requireAuth - Whether authentication is required (default: true)
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback = null,
  requireAuth = true
}) => {
  const { isAuthenticated, loading } = useAuth();

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If auth is required and user is not authenticated, show fallback
  if (requireAuth && !isAuthenticated) {
    return <>{fallback}</>;
  }

  // If auth is not required and user is authenticated, show fallback
  if (!requireAuth && isAuthenticated) {
    return <>{fallback}</>;
  }

  // Otherwise, show children
  return <>{children}</>;
};

