export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function aFechaISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

export function rangoSemana(): { desde: Date; hasta: Date } {
  const hoy = new Date();
  const dia = (hoy.getDay() + 6) % 7;
  const desde = new Date(hoy);
  desde.setDate(hoy.getDate() - dia);
  desde.setHours(0, 0, 0, 0);
  const hasta = new Date(desde);
  hasta.setDate(desde.getDate() + 6);
  return { desde, hasta };
}

export function rangoMes(): { desde: Date; hasta: Date } {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  return { desde, hasta };
}

export function listaDias(desde: Date, hasta: Date, periodo: 'semana' | 'mes') {
  const dias: { fecha: string; etiqueta: string }[] = [];
  for (let d = new Date(desde); d <= hasta; d.setDate(d.getDate() + 1)) {
    if (periodo === 'semana') {
      dias.push({
        fecha: aFechaISO(d),
        etiqueta: DIAS_SEMANA[(d.getDay() + 6) % 7],
      });
    } else {
      dias.push({ fecha: aFechaISO(d), etiqueta: String(d.getDate()) });
    }
  }
  return dias;
}
