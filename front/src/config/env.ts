// Same-origin '/api' works in development through the Vite proxy (vite.config.ts).
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api'
