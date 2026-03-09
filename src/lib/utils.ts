import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize text for accent/diacritic-insensitive search.
 * Decomposes characters (NFD), strips combining diacritical marks, then lowercases.
 * e.g. "São Paulo" → "sao paulo", "José" → "jose"
 */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Check if `text` contains `search` in an accent-insensitive, case-insensitive way.
 */
export function includesNormalized(text: string, search: string): boolean {
  return normalizeSearch(text).includes(normalizeSearch(search));
}
