'use client';

import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ToastTone = 'success' | 'error';
type Toast = { id: number; message: string; tone: ToastTone };
type ToastContextValue = { notify: (message: string, tone?: ToastTone) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const dismiss = useCallback((id: number) => setToasts((items) => items.filter((item) => item.id !== id)), []);
  const notify = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = ++nextId.current;
    setToasts((items) => [...items.slice(-2), { id, message, tone }]);
    window.setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);
  const value = useMemo(() => ({ notify }), [notify]);

  return <ToastContext.Provider value={value}>
    {children}
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(390px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => {
        const Icon = toast.tone === 'success' ? CheckCircle2 : CircleAlert;
        return <div key={toast.id} role={toast.tone === 'error' ? 'alert' : 'status'} className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-semibold text-white shadow-xl ${toast.tone === 'success' ? 'border-emerald-400 bg-emerald-600' : 'border-rose-400 bg-rose-600'}`}>
          <Icon size={19} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1 leading-5">{toast.message}</span>
          <button type="button" onClick={() => dismiss(toast.id)} className="rounded-md p-0.5 text-white/80 hover:bg-white/15 hover:text-white" aria-label="Dismiss notification"><X size={17} /></button>
        </div>;
      })}
    </div>
  </ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider.');
  return context;
}
