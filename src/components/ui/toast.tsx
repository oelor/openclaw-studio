"use client";

import * as React from "react";

export type ToastVariant = "default" | "success" | "warning" | "destructive";

export type ToastInput = {
  title?: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastRecord = ToastInput & {
  id: string;
  createdAt: number;
};

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 4500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const dismissAll = React.useCallback(() => {
    setToasts([]);
  }, []);

  const toast = React.useCallback(
    (input: ToastInput) => {
      const id = crypto.randomUUID();
      const createdAt = Date.now();
      const record: ToastRecord = {
        id,
        createdAt,
        title: input.title,
        message: input.message,
        variant: input.variant ?? "default",
        durationMs: input.durationMs ?? DEFAULT_DURATION_MS,
      };
      setToasts((prev) => [...prev, record]);
      return id;
    },
    []
  );

  const value = React.useMemo(() => ({ toast, dismiss, dismissAll }), [toast, dismiss, dismissAll]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastRecord[];
  onDismiss: (id: string) => void;
}) {
  React.useEffect(() => {
    if (toasts.length === 0) return;

    const timers = new Map<string, number>();
    for (const toast of toasts) {
      const duration = toast.durationMs ?? DEFAULT_DURATION_MS;
      if (duration <= 0) continue;
      if (timers.has(toast.id)) continue;
      const handle = window.setTimeout(() => {
        onDismiss(toast.id);
      }, duration);
      timers.set(toast.id, handle);
    }

    return () => {
      for (const handle of timers.values()) {
        window.clearTimeout(handle);
      }
    };
  }, [onDismiss, toasts]);

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastRecord; onDismiss: () => void }) {
  const variant = toast.variant ?? "default";
  const variantStyles: Record<ToastVariant, string> = {
    default: "border-border bg-card text-foreground",
    success: "border-emerald-500/40 bg-emerald-500/15 text-foreground",
    warning: "border-amber-500/40 bg-amber-500/15 text-foreground",
    destructive: "border-destructive bg-destructive text-destructive-foreground",
  };

  return (
    <div
      className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-lg backdrop-blur ${variantStyles[variant]}`}
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {toast.title ? (
            <div className="text-sm font-semibold">{toast.title}</div>
          ) : null}
          <div className="text-sm opacity-90">{toast.message}</div>
        </div>
        <button
          type="button"
          className="rounded-md border border-transparent px-2 py-1 text-xs font-semibold opacity-80 hover:opacity-100"
          onClick={onDismiss}
          aria-label="Dismiss notification"
        >
          Close
        </button>
      </div>
    </div>
  );
}
