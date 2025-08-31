// Authentication components
export { AuthModal } from './AuthModal';
export { SignInForm } from './SignInForm';
export { SignUpForm } from './SignUpForm';
export { MagicLinkForm } from './MagicLinkForm';
export { UserProfile } from './UserProfile';
export { AuthGuard } from './AuthGuard';
export { SignInButton } from './SignInButton';

// Re-export hooks for convenience
export { useAuth, useUser, useIsAuthenticated } from '../../hooks/useAuth';

