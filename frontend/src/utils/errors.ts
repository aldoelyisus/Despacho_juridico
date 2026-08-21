/** Extrae un mensaje de error legible de una respuesta de axios/Nest, sea string o string[] */
export function getErrorMessage(err: any, fallback = 'Ocurrió un error inesperado'): string {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message.join('\n');
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}
