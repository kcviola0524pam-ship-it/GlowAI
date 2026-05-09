const DEFAULT_API_URL = 'http://localhost:5000';

// Ensure trailing slashes do not cause double slashes in requests
const normalizeUrl = (url) => url?.replace(/\/+$/, '');

export const API_BASE_URL = normalizeUrl(import.meta.env.VITE_API_URL) || DEFAULT_API_URL;

