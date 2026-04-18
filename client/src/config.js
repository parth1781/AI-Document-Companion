// Centralised API URL — import this instead of repeating in every file.
// In production (Vercel), VITE_API_URL is '' so we use '' (same-origin relative URLs).
// In development, it falls back to localhost.
const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl !== undefined && envUrl !== null) return envUrl; // '' is valid for same-origin
  return 'http://localhost:5000';
};

export const API_URL = getApiUrl();
