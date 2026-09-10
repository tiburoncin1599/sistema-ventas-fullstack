import { formatCurrency } from '@/lib/utils';

interface DatosGrafico {
  etiqueta: string;
  valor: number;
  pedidos: number;
  fecha: string;
}

export default function GraficoBarras({ datos }: { datos: DatosGrafico[] }) {
  const W = 720;
  const H = 280;
  const padIzq = 56;
  const padInf = 34;
  const padSup = 24;
  const plotW = W - padIzq - 12;
  const plotH = H - padInf - padSup;

  const max = Math.max(...datos.map((d) => d.valor), 1);
  const pasoBarra = plotW / datos.length;
  const anchoBarra = Math.min(pasoBarra * 0.68, 48);
  const lineasY = 4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Gráfica de ventas por día">
      <defs>
        <linearGradient id="barraGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00b84c" />
          <stop offset="100%" stopColor="#005a24" />
        </linearGradient>
      </defs>

      {Array.from({ length: lineasY + 1 }, (_, i) => {
        const y = padSup + plotH - (plotH * i) / lineasY;
        const valor = (max * i) / lineasY;
        return (
          <g key={i}>
            <line x1={padIzq} y1={y} x2={W - 12} y2={y} stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />
            <text
              x={padIzq - 8}
              y={y + 4}
              textAnchor="end"
              fontSize="10"
              fill="currentColor"
              fillOpacity="0.55"
            >
              {valor >= 1000 ? `${(valor / 1000).toFixed(1)}k` : Math.round(valor)}
            </text>
          </g>
        );
      })}

      {datos.map((d, i) => {
        const altura = max > 0 ? (d.valor / max) * plotH : 0;
        const x = padIzq + i * pasoBarra + (pasoBarra - anchoBarra) / 2;
        const y = padSup + plotH - altura;
        const mostrarValor = d.valor > 0 && (datos.length <= 8 || i % 3 === 0);
        return (
          <g key={d.fecha}>
            {altura > 0 && (
              <>
                <rect
                  x={x}
                  y={y}
                  width={anchoBarra}
                  height={altura}
                  rx="4"
                  fill="url(#barraGrad)"
                >
                  <title>{`${d.fecha} — ${formatCurrency(d.valor)} (${d.pedidos} pedidos)`}</title>
                </rect>
                {mostrarValor && (
                  <text
                    x={x + anchoBarra / 2}
                    y={y - 5}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="600"
                    fill="currentColor"
                    fillOpacity="0.75"
                  >
                    {d.valor >= 1000 ? `${(d.valor / 1000).toFixed(1)}k` : Math.round(d.valor)}
                  </text>
                )}
              </>
            )}
            <text
              x={padIzq + i * pasoBarra + pasoBarra / 2}
              y={H - 14}
              textAnchor="middle"
              fontSize="9.5"
              fill="currentColor"
              fillOpacity="0.6"
            >
              {d.etiqueta}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
