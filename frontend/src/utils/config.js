/**
 * Configurações centralizadas da aplicação.
 * Valores são lidos das variáveis de ambiente via Vite (VITE_*).
 */
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
export const APP_TIMEZONE = import.meta.env.VITE_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;
