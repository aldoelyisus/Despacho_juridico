/** Convierte texto libre (nombres con acentos, enie, espacios...) en un slug apto para rutas/URLs y llaves de S3 */
export function slugify(texto: string): string {
  const marcasDiacriticas = new RegExp('[\\u0300-\\u036f]', 'g');
  const sinAcentos = texto.normalize('NFD').replace(marcasDiacriticas, '');
  const slug = sinAcentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'sin-nombre';
}
