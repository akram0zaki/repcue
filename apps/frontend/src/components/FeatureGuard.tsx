import React, { type ReactNode } from 'react';
import { useFeatureFlags } from '../hooks/useFeatureFlags';

interface FeatureGuardProps {
  feature: keyof ReturnType<typeof useFeatureFlags>['flags'];
  children: ReactNode;
  fallback?: ReactNode;
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({ feature, children, fallback = null }) => {
  const { flags } = useFeatureFlags();
  
  return flags[feature] ? <>{children}</> : <>{fallback}</>;
};

export default FeatureGuard;
