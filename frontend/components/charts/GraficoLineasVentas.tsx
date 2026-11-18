'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';

export interface PuntoLinea {
  fecha: string;
  etiqueta: string;
  valor: number;
  pedidos: number;
}

/**
 * Gráfico de líneas/área construido con SVG puro (no hay recharts instalado).
 * Incluye tooltip interactivo al pasar el cursor sobre cada punto.
 */
export default function GraficoLineasVentas({
  datos,
}: {
  datos: PuntoLinea[];
}) {
  const [activo, setActivo] = useState<number | null>(null);

  const W = 760;
  const H = 300;
  const padIzq = 64;
  const padDer = 16;
  const padSup = 26;
  const padInf = 46;
  const plotW = W - padIzq - padDer;
  const plotH = H - padSup - padInf;

  const max = Math.max(...datos.map((d) => d.valor), 1);
  const paso = datos.length > 1 ? plotW / (datos.length - 1) : plotW;

  const x = (i: number) => padIzq + i * paso;
  const y = (valor: number) => padSup + plotH - (valor / max) * plotH;

  const puntos = datos.map((d, i) => `${x(i)},${y(d.valor)}`).join(' ');
  const area = `${padIzq},${padSup + plotH} ${puntos} ${x(
    datos.length - 1,
  )},${padSup + plotH}`;

  const lineasY = 4;
  const each = Math.ceil(datos.length / 12) || 1;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full min-w-[560px]"
        role="img"
        aria-label="Evolución de ventas en el período seleccionado"
      >
        <defs>
          <linearGradient id="areaVentas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00b84c" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#005a24" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {Array.from({ length: lineasY + 1 }, (_, i) => {
          const yy = padSup + plotH - (plotH * i) / lineasY;
          const valor = (max * i) / lineasY;
          return (
            <g key={i}>
              <line
                x1={padIzq}
                y1={yy}
                x2={W - padDer}
                y2={yy}
                stroke="currentColor"
                strokeOpacity="0.12"
                strokeWidth="1"
              />
              <text
                x={padIzq - 8}
                y={yy + 4}
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

        <polygon points={area} fill="url(#areaVentas)" />
        <polyline
          points={puntos}
          fill="none"
          stroke="#008f3a"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {datos.map((d, i) => (
          <g key={`${d.fecha}-${i}`}>
            {i % each === 0 && (
              <text
                x={x(i)}
                y={H - 16}
                textAnchor="middle"
                fontSize="9.5"
                fill="currentColor"
                fillOpacity="0.6"
              >
                {d.etiqueta}
              </text>
            )}
            <circle
              cx={x(i)}
              cy={y(d.valor)}
              r={activo === i ? 5.5 : 3}
              fill="#008f3a"
              stroke="currentColor"
              strokeWidth={activo === i ? 2 : 0}
            />
            <rect
              x={x(i) - paso / 2}
              y={padSup}
              width={Math.max(paso, 6)}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setActivo(i)}
              onMouseLeave={() => setActivo(null)}
            />
          </g>
        ))}

        {activo !== null && datos[activo] && (
          <g pointerEvents="none">
            <line
              x1={x(activo)}
              y1={padSup}
              x2={x(activo)}
              y2={padSup + plotH}
              stroke="currentColor"
              strokeOpacity="0.35"
              strokeDasharray="4 3"
            />
            <g
              transform={`translate(${Math.min(
                Math.max(x(activo) - 70, padIzq),
                W - 168,
              )}, ${Math.max(y(datos[activo].valor) - 58, padSup)})`}
            >
              <rect
                width="156"
                height="48"
                rx="8"
                fill="#0b251f"
                fillOpacity="0.95"
              />
              <text x="10" y="18" fontSize="10" fill="#e9dfcd">
                {datos[activo].fecha}
              </text>
              <text x="10" y="33" fontSize="11" fontWeight="700" fill="#5ce29a">
                {formatCurrency(datos[activo].valor)}
              </text>
              <text x="10" y="44" fontSize="9" fill="#c9bda9">
                {datos[activo].pedidos} pedidos
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
