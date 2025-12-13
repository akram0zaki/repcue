/**
 * DeepLinkHandler Component
 * 
 * A component that handles deep links (Universal Links / App Links) for native apps.
 * Must be placed inside a Router context.
 * 
 * This component renders nothing - it only sets up the deep link listener.
 */

import React from 'react';
import { useDeepLinks } from '../hooks/useDeepLinks';

export const DeepLinkHandler: React.FC = () => {
  useDeepLinks();
  return null;
};

export default DeepLinkHandler;
