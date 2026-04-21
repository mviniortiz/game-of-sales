import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Extracts a human-readable message from any error shape: Error, PostgrestError,
// FunctionsHttpError, string, or plain objects. Avoids "[object Object]" toasts.
export function formatError(err: unknown): string {
  if (!err) return "Erro desconhecido";
  if (typeof err === "string") return err;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object") {
    const e = err as Record<string, any>;
    const candidate =
      e.message ||
      e.error_description ||
      e.error?.message ||
      e.error ||
      e.details ||
      e.hint ||
      e.msg;
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    try {
      const json = JSON.stringify(err);
      if (json && json !== "{}") return json;
    } catch {
      /* circular refs — fall through */
    }
  }
  return "Erro desconhecido";
}
