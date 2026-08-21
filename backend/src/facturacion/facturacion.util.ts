/** Vence el mismo día que se registró el despacho; si el mes no tiene ese día, usa el último día del mes */
export function calcularFechaLimiteMensualidad(fechaRegistro: Date, anio: number, mes: number): Date {
  const diaRegistro = new Date(fechaRegistro).getDate();
  const ultimoDiaMes = new Date(anio, mes, 0).getDate();
  const dia = Math.min(diaRegistro, ultimoDiaMes);
  return new Date(anio, mes - 1, dia);
}
