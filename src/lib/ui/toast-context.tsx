"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration = 3500) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastMessage = { id, type, message, duration };

      setToasts((prev) => [...prev.slice(-3), newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (msg: string, dur?: number) => showToast(msg, "success", dur),
    [showToast]
  );
  const error = useCallback(
    (msg: string, dur?: number) => showToast(msg, "error", dur),
    [showToast]
  );
  const info = useCallback(
    (msg: string, dur?: number) => showToast(msg, "info", dur),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      {/* Toast Render Area */}
      <div className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 max-w-sm w-full px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold backdrop-blur-md transition-all animate-in slide-in-from-bottom-3 duration-200 w-full ${
              t.type === "success"
                ? "bg-emerald-900/90 text-white border-emerald-700/60 shadow-emerald-950/20"
                : t.type === "error"
                ? "bg-rose-900/90 text-white border-rose-700/60 shadow-rose-950/20"
                : "bg-stone-900/90 text-white border-stone-700/60 shadow-stone-950/20"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {t.type === "success" && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              {t.type === "error" && (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              {t.type === "info" && (
                <Info className="w-4 h-4 text-sky-400 shrink-0" />
              )}
              <span className="truncate">{t.message}</span>
            </div>

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="p-1 text-white/70 hover:text-white rounded-lg transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return safe fallback if used outside provider
    return {
      showToast: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return context;
}
