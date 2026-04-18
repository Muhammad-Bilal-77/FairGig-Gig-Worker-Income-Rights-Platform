import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (props: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast = { ...props, id };
      setToasts((prev) => [...prev, newToast]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);

      return {
        dismiss: () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      };
    },
    []
  );

  const dismiss = useCallback((id?: string) => {
    if (!id) {
      setToasts([]);
    } else {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }
  }, []);

  return {
    toasts,
    toast,
    dismiss,
  };
}
