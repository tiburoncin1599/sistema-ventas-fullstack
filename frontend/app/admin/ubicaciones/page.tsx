'use client';
import dynamic from 'next/dynamic';

const MapaSeguimiento = dynamic(
  () => import('@/components/MapaSeguimiento'),
  {
    ssr: false,
    loading: () => (
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-20 text-center">
        <p className="text-gray-500 dark:text-gray-400">Cargando mapa de seguimiento...</p>
      </main>
    ),
  },
);

export default function UbicacionesPage() {
  return <MapaSeguimiento />;
}
