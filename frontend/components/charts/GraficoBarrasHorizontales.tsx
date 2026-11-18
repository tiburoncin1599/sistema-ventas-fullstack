import { formatCurrency } from '@/lib/utils';

export interface BarraHorizontal {
  etiqueta: string;
  valor: number;
  detalle?: string;
}

/** Barras horizontales en SVG, usadas para el ranking de productos. */
export default function GraficoBarrasHorizontales({
  datos,
}: {
  datos: BarraHorizontal[];
}) {
  if (datos.length === 0) {
    return (
      <p className="py-10 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
        Sin datos en el período seleccionado.
      </p>
    );
  }

  const filaH = 40;
  const W = 720;
  const etiquetaW = 190;
  const barraW = W - etiquetaW - 96;
  const H = datos.length * filaH + 12;
  const max = Math.max(...datos.map((d) => d.valor), 1);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full min-w-[560px]"
        role="img"
        aria-label="Ranking de productos"
      >
        {datos.map((d, i) => {
          const ancho = (d.valor / max) * barraW;
          const yy = i * filaH + 6;
          return (
            <g key={`${d.etiqueta}-${i}`}>
              <text
                x={etiquetaW - 10}
                y={yy + 17}
                textAnchor="end"
                fontSize="11"
                fontWeight="600"
                fill="currentColor"
                fillOpacity="0.85"
              >
                {d.etiqueta.length > 24
                  ? `${d.etiqueta.slice(0, 23)}…`
                  : d.etiqueta}
              </text>
              <rect
                x={etiquetaW}
                y={yy + 4}
                width={barraW}
                height="18"
                rx="9"
                fill="currentColor"
                fillOpacity="0.08"
              />
              <rect
                x={etiquetaW}
                y={yy + 4}
                width={Math.max(ancho, 2)}
                height="18"
                rx="9"
                fill={i === 0 ? '#008f3a' : '#39b878'}
              >
                <title>{`${d.etiqueta}: ${formatCurrency(d.valor)}${
                  d.detalle ? ` · ${d.detalle}` : ''
                }`}</title>
              </rect>
              <text
                x={etiquetaW + barraW + 8}
                y={yy + 17}
                fontSize="10"
                fontWeight="700"
                fill="currentColor"
                fillOpacity="0.8"
              >
                {d.valor >= 1000
                  ? `${(d.valor / 1000).toFixed(1)}k`
                  : Math.round(d.valor)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
