/* eslint-disable react-refresh/only-export-components */
/* eslint-disable no-restricted-syntax -- i18n-exempt: developer toasts not user-localized */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type SnackbarType = 'info' | 'warning' | 'danger' | 'success' | 'error';

interface SnackbarItem {
  id: number;
  message: string;
  type: SnackbarType;
  durationMs: number;
}

interface SnackbarContextValue {
  showSnackbar: (message: string, options?: { type?: SnackbarType; durationMs?: number }) => void;
}

// i18n-exempt: developer-only messages handled here are not user-facing text
// Move non-component values below component export to satisfy react-refresh rule
const SnackbarContext = createContext<SnackbarContextValue | null>(null);

// NOTE: Exporting a hook alongside a component can trigger react-refresh rule.
// This hook is tightly coupled to the provider and safe to export here.
// i18n-exempt: developer-only error message below isn't user-facing UI.
export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar must be used within a SnackbarProvider');
  return ctx;
}

export const SnackbarProvider: React.FC<{ children: React.ReactNode } > = ({ children }) => {
  const [queue, setQueue] = useState<SnackbarItem[]>([]);
  const [current, setCurrent] = useState<SnackbarItem | null>(null);
  const timerRef = useRef<number | null>(null);
  const nextId = useRef(1);
  const currentRef = useRef<SnackbarItem | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const showSnackbar = useCallback((message: string, options?: { type?: SnackbarType; durationMs?: number }) => {
    const item: SnackbarItem = {
      id: nextId.current++,
      message,
      type: options?.type ?? 'warning',
      durationMs: options?.durationMs ?? 3000,
    };
    if (!currentRef.current) {
      setCurrent(item);
      currentRef.current = item;
    } else {
      setQueue(prev => [...prev, item]);
    }
  }, []);

  useEffect(() => {
    if (!current && queue.length > 0) {
      const [head, ...rest] = queue;
      setCurrent(head);
      setQueue(rest);
    }
  }, [queue, current]);

  useEffect(() => {
    clearTimer();
    if (current) {
      currentRef.current = current;
      timerRef.current = window.setTimeout(() => {
        setCurrent(null);
        currentRef.current = null;
      }, current.durationMs);
    }
    return clearTimer;
  }, [current]);

  const value = useMemo(() => ({ showSnackbar }), [showSnackbar]);

  const typeClasses = (type: SnackbarType) => {
    switch (type) {
      case 'danger':
      case 'error':
        return 'bg-red-600 text-white';
      case 'info':
        return 'bg-blue-600 text-white';
      case 'success':
        return 'bg-green-600 text-white';
      case 'warning':
      default:
        return 'bg-yellow-500 text-black';
    }
  };

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {/* Persistent live region for a11y/tests */}
      <div role="status" aria-live="polite" style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, overflow: 'hidden' }} />
      {current && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg ${typeClasses(current.type)} z-[1000]`}
        >
          {current.message}
        </div>
      )}
    </SnackbarContext.Provider>
  );
};



