const DEFAULT_API_URL = 'http://localhost:5000';

/**
 * Trim, strip trailing slashes, and ensure an absolute URL.
 * A bare host (e.g. api.example.com) is treated by browsers as a path on the
 * current origin — so always add https:// when the scheme is missing.
 */
const normalizeApiBaseUrl = (url) => {
  if (url == null) return '';
  const trimmed = String(url).trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL) || DEFAULT_API_URL;

