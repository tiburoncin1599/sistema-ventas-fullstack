import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import ImagenProducto from '@/components/ImagenProducto';
import { API_URL } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export interface ProductoCardData {
  id: number;
  nombre: string;
  precio: number;
  imagen_url?: string | null;
  stock?: number | null;
  categoria?: { nombre: string } | null;
}

export default function ProductCard({ producto }: { producto: ProductoCardData }) {
  const agotado = typeof producto.stock === 'number' && producto.stock === 0;
  const disponible = typeof producto.stock === 'number' && producto.stock > 0;

  return (
    <Link
      href={`/productos/${producto.id}`}
      className="group flex flex-col overflow-hidden rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-3 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] transition-all duration-500 hover:-translate-y-1.5 hover:border-prolimal-teal-500/40 hover:shadow-[0_34px_80px_-46px_rgba(11,37,32,0.5)] dark:border-prolimal-sand-100/10 dark:bg-card-dark"
    >
      <div className="relative aspect-[5/4] overflow-hidden rounded-[1.55rem] bg-prolimal-sand-100 dark:bg-prolimal-ink-800">
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-prolimal-teal-200/55 blur-2xl transition-transform duration-500 group-hover:scale-125 dark:bg-prolimal-teal-700/20" />
        <div className="absolute inset-x-4 bottom-4 h-8 rounded-full bg-prolimal-ink-900/10 blur-xl dark:bg-black/30" />
        {producto.imagen_url ? (
          <div className="relative h-full w-full p-6">
            <ImagenProducto src={`${API_URL}${producto.imagen_url}`} alt={producto.nombre} />
          </div>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-5xl" aria-hidden="true">
            🧴
          </span>
        )}

        {producto.categoria?.nombre && (
          <span className="absolute left-3 top-3 max-w-[70%] truncate rounded-full bg-white/90 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-500 shadow-sm backdrop-blur dark:bg-prolimal-ink-900/80 dark:text-prolimal-sand-100">
            {producto.categoria.nombre}
          </span>
        )}

        {agotado && (
          <span className="absolute right-3 top-3 rounded-full bg-prolimal-red-600 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
            Agotado
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-3 pb-2 pt-5">
        <h3 className="line-clamp-2 text-[15px] font-extrabold leading-snug tracking-[-0.02em] text-prolimal-ink-800 transition-colors group-hover:text-prolimal-teal-700 dark:text-prolimal-sand-50 dark:group-hover:text-prolimal-teal-300">
          {producto.nombre}
        </h3>

        <div className="mt-2 flex items-center gap-2">
          {disponible && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-prolimal-teal-500" aria-hidden="true" />
              <span className="text-[11px] font-semibold text-prolimal-ink-400 dark:text-prolimal-ink-300">
                {producto.stock} disponibles
              </span>
            </>
          )}
          {agotado && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-prolimal-red-500" aria-hidden="true" />
              <span className="text-[11px] font-semibold text-prolimal-red-500">Sin stock</span>
            </>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-6">
          <p className="text-xl font-extrabold tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
            {formatCurrency(producto.precio)}
          </p>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-prolimal-ink-900 text-prolimal-sand-50 transition-all duration-300 group-hover:bg-prolimal-teal-600 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900 dark:group-hover:bg-prolimal-teal-300">
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
          </span>
        </div>
      </div>
    </Link>
  );
}
