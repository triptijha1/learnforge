// src/components/ui/toast.ts
"use client";

import { toast as sonnerToast } from "sonner";


type Variant = "destructive" | "success" | "loading" | "info" | "default";


export type ShadcnToastProps = {
  title?: string;
  description?: string;
  variant?: Variant;
  duration?: number;
};


function mappedToast(arg: string | ShadcnToastProps) {
  if (typeof arg === "string") {
    // simple direct message
    return sonnerToast(arg);
  }

  const { title, description, variant = "default", duration } = arg;
  // message shown as primary string; prefer title, fall back to description or empty
  const message = title ?? description ?? "";

  const opts: Record<string, any> = {};
  if (description && title) opts.description = description;
  if (typeof duration === "number") opts.duration = duration;

  switch (variant) {
    case "destructive":
      return sonnerToast.error(message, opts);
    case "loading":
      return sonnerToast.loading(message, opts);
    case "success":
      return sonnerToast.success(message, opts);
    case "info":
      return sonnerToast(message, opts);
    case "default":
    default:
      return sonnerToast(message, opts);
  }
}

/**
 * Hook-style API used across the app:
 * const { toast } = useToast();
 * toast({ title: 'Error', description: 'Fill all units', variant: 'destructive' })
 */
export function useToast() {
  return { toast: mappedToast };
}


export const toast = mappedToast;
