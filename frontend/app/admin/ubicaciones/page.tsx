'use client';
import dynamic from 'next/dynamic';

const MapaSeguimiento = dynamic(
  () => import('@/components/MapaSeguimiento'),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-8">
        <p className="text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          Cargando mapa de seguimiento...
        </p>
      </div>
    ),
  },
);

export default function UbicacionesPage() {
  return <MapaSeguimiento />;
}
