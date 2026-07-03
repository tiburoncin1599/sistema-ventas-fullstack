export function parseCurrency(value: unknown): number {
  if (typeof value === 'number') return value

  const cleaned = String(value ?? '0')
    .replace(/Bs/gi, '')
    .replace(/\$/g, '')
    .replace(/\s/g, '')
    .replace(',', '.')

  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatCurrency(value: unknown): string {
  const num = parseCurrency(value);
  if (!Number.isFinite(num)) return 'Bs0.00';
  return ('Bs' + num.toFixed(2)).replace(/\$/g, '').replace(/Bs\$/g, 'Bs');
}
