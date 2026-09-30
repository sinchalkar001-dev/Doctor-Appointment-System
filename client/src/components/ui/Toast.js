import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../lib/cn';

const ToastContext = createContext(null);

const TONES = {
  success: { icon: CheckCircle2, iconClass: 'text-signal' },
  error: { icon: AlertCircle, iconClass: 'text-danger-on-sign' },
  info: { icon: Info, iconClass: 'text-sign-muted' },
};

const MAX_VISIBLE = 3;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (options) => {
      counter.current += 1;
      const id = counter.current;
      const toast = {
        id,
        tone: 'success',
        duration: 5000,
        ...(typeof options === 'string' ? { title: options } : options),
      };
      setToasts((current) => [...current.slice(-(MAX_VISIBLE - 1)), toast]);
      if (toast.duration) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), toast.duration)
        );
      }
      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => activeTimers.forEach((timer) => clearTimeout(timer));
  }, []);

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
        >
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }) {
  const tone = TONES[toast.tone] || TONES.info;
  const Icon = tone.icon;
  return (
    <div className="on-sign pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-plate bg-sign py-3.5 pl-4 pr-2 text-ink-inverse shadow-overlay">
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', tone.iconClass)} aria-hidden="true" />
      <div className="min-w-0 flex-1 pt-px">
        <p className="font-semibold">{toast.title}</p>
        {toast.description ? <p className="mt-0.5 text-sm text-sign-muted">{toast.description}</p> : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-my-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sign-muted transition-colors hover:bg-sign-raised hover:text-ink-inverse"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
