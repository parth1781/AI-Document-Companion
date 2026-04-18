// Centralised API URL — import this instead of repeating in every file.
// In production (Vercel), we just use an empty string so fetch uses same-origin relative URLs (/api/...)
// In development, it defaults to localhost.
const getApiUrl = () => {
  if (import.meta.env.PROD) {
    return ''; // production: app and api are on the same domain
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5000';
};

export const API_URL = getApiUrl();
