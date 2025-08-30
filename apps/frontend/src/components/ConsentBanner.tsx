/* eslint-disable no-restricted-syntax -- i18n-exempt: consent copy pending localization; UX validated */
import { useState } from 'react';
import { consentService } from '../services/consentService';

interface ConsentBannerProps {
  onConsentGranted: () => void;
}

export const ConsentBanner: React.FC<ConsentBannerProps> = ({ onConsentGranted }) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleAcceptAll = () => {
    consentService.grantConsent(true); // Include analytics
    onConsentGranted();
  };

  const handleAcceptEssential = () => {
    consentService.grantConsent(false); // Essential only
    onConsentGranted();
  };

  return (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50" data-testid="consent-banner">
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="consent-title"
        aria-describedby="consent-description"
      >
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
              <svg 
                className="w-6 h-6 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                />
              </svg>
            </div>
            <h2 id="consent-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Your Privacy Matters
            </h2>
          </div>

          <div id="consent-description" className="text-gray-700 dark:text-gray-300 mb-6">
            <p className="mb-3">
              RepCue needs your permission to store exercise data on your device to provide 
              the best experience.
            </p>
            
            {!showDetails ? (
              <button
                onClick={() => setShowDetails(true)}
                className="text-blue-600 hover:text-blue-700 underline font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                aria-expanded="false"
                aria-controls="privacy-details"
              >
                Learn more about how we protect your privacy
              </button>
            ) : (
              <div id="privacy-details" className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">
                    What data do we store?
                  </h3>
                  <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• Your exercise preferences and favorites</li>
                    <li>• Activity logs with exercise duration and timestamps</li>
                    <li>• App settings (sound, vibration, intervals)</li>
                    <li>• No personal information or biometric data</li>
                  </ul>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">
                    Your data stays private
                  </h3>
                  <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• All data is stored locally on your device</li>
                    <li>• Nothing is sent to external servers without your permission</li>
                    <li>• You can export or delete your data at any time</li>
                    <li>• Full GDPR compliance with your rights</li>
                  </ul>
                </div>

                <button
                  onClick={() => setShowDetails(false)}
                  className="text-blue-600 hover:text-blue-700 underline font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  aria-expanded="true"
                  aria-controls="privacy-details"
                >
                  Show less
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={handleAcceptAll}
              className="btn-primary w-full touch-target"
              autoFocus
              data-testid="consent-accept-all"
            >
              Accept All & Continue
            </button>
            
            <button
              onClick={handleAcceptEssential}
              className="btn-secondary w-full touch-target"
              data-testid="consent-accept-essential"
            >
              Essential Only
            </button>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              You can change your preferences later in Settings. 
              Essential cookies are required for the app to function.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentBanner; 