'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
  createdAt: number;
}

const TOAST_EVENT = 'clias:toast:event';

function dispatchToast(data: { type: ToastType; message: string; title?: string; duration?: number }) {
  if (typeof window === 'undefined') return;
  const detail: ToastItem = {
    id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    type: data.type,
    message: String(data.message || ''),
    title: data.title,
    duration: data.duration || (data.type === 'error' ? 5000 : 4000),
    createdAt: Date.now(),
  };
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail }));
}

export const toast = {
  success: (message: string, title?: string, duration?: number) => {
    dispatchToast({ type: 'success', message, title: title || 'Success', duration });
  },
  error: (message: string, title?: string, duration?: number) => {
    dispatchToast({ type: 'error', message, title: title || 'Error', duration });
  },
  warning: (message: string, title?: string, duration?: number) => {
    dispatchToast({ type: 'warning', message, title: title || 'Attention', duration });
  },
  info: (message: string, title?: string, duration?: number) => {
    dispatchToast({ type: 'info', message, title: title || 'Notification', duration });
  },
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  const duration = item.duration || 4500;

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        handleClose();
      }
    }, 25);

    return () => clearInterval(interval);
  }, [duration]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => {
      onDismiss(item.id);
    }, 200);
  };

  const getTheme = () => {
    switch (item.type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
          border: 'border-emerald-500/50',
          accent: 'bg-emerald-500',
          titleColor: 'text-emerald-700 dark:text-emerald-400',
          shadow: 'shadow-lg shadow-emerald-500/10',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-[#e05033] shrink-0 mt-0.5" />,
          border: 'border-[#e05033]/60',
          accent: 'bg-[#e05033]',
          titleColor: 'text-[#e05033] dark:text-[#f87171]',
          shadow: 'shadow-xl shadow-red-500/15',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
          border: 'border-amber-500/50',
          accent: 'bg-amber-500',
          titleColor: 'text-amber-700 dark:text-amber-400',
          shadow: 'shadow-lg shadow-amber-500/10',
        };
      default:
        return {
          icon: <Info className="w-5 h-5 text-[#4a6fa5] dark:text-[#6a90c5] shrink-0 mt-0.5" />,
          border: 'border-[#4a6fa5]/50',
          accent: 'bg-[#4a6fa5]',
          titleColor: 'text-[#4a6fa5] dark:text-[#6a90c5]',
          shadow: 'shadow-lg shadow-blue-500/10',
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      role="alert"
      className={`toast-card pointer-events-auto relative overflow-hidden w-[90vw] max-w-sm sm:max-w-md p-4 bg-white dark:bg-[#121927] border ${theme.border} ${theme.shadow} backdrop-blur-2xl transition-all duration-200 transform ${
        exiting ? 'opacity-0 translate-x-12 scale-95' : 'opacity-100 translate-x-0 scale-100'
      } flex items-start gap-3 rounded-xl`}
      style={{
        borderRadius: '12px',
        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
      }}
    >
      {/* Icon */}
      {theme.icon}

      {/* Body */}
      <div className="flex-1 min-w-0 pr-1">
        {item.title && (
          <h4 className={`text-xs font-mono font-bold tracking-wider uppercase mb-1 ${theme.titleColor}`}>
            {item.title}
          </h4>
        )}
        <p className="text-xs text-slate-700 dark:text-slate-200 font-sans leading-relaxed break-words">
          {item.message}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress countdown bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full ${theme.accent} transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    setMounted(true);

    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastItem>;
      if (customEvent.detail) {
        setToasts((prev) => [customEvent.detail, ...prev].slice(0, 5));
      }
    };

    window.addEventListener(TOAST_EVENT, handleToastEvent);

    // Global alert replacement
    (window as any).toast = toast;
    const originalAlert = window.alert;

    window.alert = (msg: any) => {
      const text = String(msg ?? '').trim();
      if (!text) return;

      const lower = text.toLowerCase();
      if (
        lower.includes('success') ||
        lower.includes('approved') ||
        lower.includes('created') ||
        lower.includes('logged') ||
        lower.includes('published') ||
        text.startsWith('✓')
      ) {
        toast.success(text, 'Success');
      } else if (
        lower.includes('error') ||
        lower.includes('failed') ||
        lower.includes('fail') ||
        lower.includes('invalid') ||
        lower.includes('please') ||
        lower.includes('at least') ||
        lower.includes('denied') ||
        lower.includes('rejected') ||
        text.startsWith('✕')
      ) {
        toast.error(text, 'Alert');
      } else {
        toast.info(text, 'Notice');
      }
    };

    return () => {
      window.removeEventListener(TOAST_EVENT, handleToastEvent);
      window.alert = originalAlert;
    };
  }, []);

  const toastContainer = (
    <div
      className="fixed top-5 right-5 z-[999999] flex flex-col gap-2.5 pointer-events-none items-end"
      style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 999999 }}
      aria-live="polite"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={dismiss} />
      ))}
    </div>
  );

  return (
    <>
      {children}
      {mounted && typeof document !== 'undefined'
        ? createPortal(toastContainer, document.body)
        : null}
    </>
  );
}

export function useToast() {
  return { toast };
}
