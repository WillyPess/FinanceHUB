// Backend origin the frontend talks to. Set VITE_API_URL in production (e.g. on
// Vercel, pointed at the Render backend); falls back to the local dev server.
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";
