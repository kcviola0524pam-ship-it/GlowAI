/**
 * Parse JSON from localStorage. Handles missing keys and the literal strings
 * "undefined" / "null" (e.g. from setItem(key, undefined)).
 */
export function readStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null || raw === '' || raw === 'undefined' || raw === 'null') {
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
