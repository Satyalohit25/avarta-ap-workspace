import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { ToastContainer, ToastItem, ToastType } from "./Toast";

export interface ShowToastOptions {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toast: {
    (options: ShowToastOptions): string;
    success: (title: string, description?: string) => string;
    error: (title: string, description?: string) => string;
    warning: (title: string, description?: string) => string;
    info: (title: string, description?: string) => string;
  };
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ title, description, type = "info", duration = 4000 }: ShowToastOptions): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastItem = { id, title, description, type, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast],
  );

  const toastMethods = Object.assign(
    (options: ShowToastOptions) => addToast(options),
    {
      success: (title: string, description?: string) =>
        addToast({ title, description, type: "success" }),
      error: (title: string, description?: string) =>
        addToast({ title, description, type: "error" }),
      warning: (title: string, description?: string) =>
        addToast({ title, description, type: "warning" }),
      info: (title: string, description?: string) =>
        addToast({ title, description, type: "info" }),
    },
  );

  return (
    <ToastContext.Provider value={{ toast: toastMethods, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
