/**
 * Safe one-time legacy localStorage key sanitizer.
 * Purges legacy mock fixture seeds and client-side unencrypted caches
 * adhering to Gate 1 hardening and zero-mock integrity invariants.
 */
export function sanitizeLegacyStorage(): void {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith("avarta_bank_accounts_") ||
        key.startsWith("avarta_items_catalogue_") ||
        key === "avarta_custom_supplier_meta"
      ) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn("Legacy storage sanitization encountered an error:", err);
  }
}
