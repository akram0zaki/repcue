import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [step, setStep] = useState<'confirm' | 'reason' | 'final'>('confirm');
  const [confirmation, setConfirmation] = useState('');
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session, signOut } = useAuth();

  const handleClose = () => {
    if (!isDeleting) {
      setStep('confirm');
      setConfirmation('');
      setReason('');
      setError(null);
      onClose();
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmation !== 'DELETE') {
      setError('You must type "DELETE" to confirm');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await supabase.functions.invoke('delete-account', {
        body: {
          confirmation: 'DELETE',
          reason: reason.trim() || undefined
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Account deletion failed');
      }

      // Sign out user
      await signOut();
      
      onSuccess?.();
      handleClose();

    } catch (err) {
      console.error('Account deletion failed:', err);
      setError(err instanceof Error ? err.message : 'Account deletion failed');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        {step === 'confirm' && (
          <>
            <h2 className="text-xl font-bold text-red-600 mb-4">Delete Account</h2>
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <h3 className="font-semibold text-red-800 mb-2">⚠️ This action cannot be undone</h3>
                <p className="text-red-700 text-sm">
                  Deleting your account will permanently remove all your data including:
                </p>
                <ul className="list-disc list-inside text-red-700 text-sm mt-2 space-y-1">
                  <li>All workout history and progress</li>
                  <li>Custom exercises and routines</li>
                  <li>Personal settings and preferences</li>
                  <li>Activity logs and statistics</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">30-Day Grace Period</h3>
                <p className="text-yellow-700 text-sm">
                  Your account will be marked for deletion with a 30-day grace period. 
                  You can reactivate it by logging in during this time.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('reason')}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Continue
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}

        {step === 'reason' && (
          <>
            <h2 className="text-xl font-bold text-red-600 mb-4">Why are you leaving?</h2>
            <div className="space-y-4">
              <p className="text-gray-700 text-sm">
                Your feedback helps us improve. This information is optional and anonymous.
              </p>
              
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tell us why you're deleting your account (optional)"
                className="w-full p-3 border border-gray-300 rounded-md resize-none"
                rows={4}
                maxLength={500}
              />
              
              <div className="text-xs text-gray-500">
                {reason.length}/500 characters
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('final')}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Continue
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          </>
        )}

        {step === 'final' && (
          <>
            <h2 className="text-xl font-bold text-red-600 mb-4">Final Confirmation</h2>
            <div className="space-y-4">
              <p className="text-gray-700">
                Type <strong>DELETE</strong> to confirm you want to permanently delete your account:
              </p>
              
              <input
                type="text"
                value={confirmation}
                onChange={(e) => {
                  setConfirmation(e.target.value);
                  setError(null);
                }}
                placeholder="Type DELETE here"
                className="w-full p-3 border border-gray-300 rounded-md font-mono"
                autoFocus
                disabled={isDeleting}
              />

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2" role="alert">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || confirmation !== 'DELETE'}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting Account...' : 'Delete My Account'}
                </button>
                <button
                  onClick={handleClose}
                  disabled={isDeleting}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                This action will immediately sign you out and begin the deletion process.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteAccountModal;