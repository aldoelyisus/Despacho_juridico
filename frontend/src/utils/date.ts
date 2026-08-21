/**
 * Formatea columnas DATE (sin hora) del backend. MySQL las devuelve como
 * medianoche UTC; formatear con la zona local del navegador corre el día
 * hacia atrás en timezones negativos (México, etc). Forzamos UTC para que
 * el día mostrado sea siempre el que está guardado en la base de datos.
 */
export function formatFecha(fecha: string | Date | null | undefined): string {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-MX', { timeZone: 'UTC' });
}
