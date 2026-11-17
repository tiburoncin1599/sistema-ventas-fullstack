'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowUpRight, CheckCircle2, Package, Search, SlidersHorizontal, X } from 'lucide-react';
import ImagenProducto from '@/components/ImagenProducto';
import { api, API_URL } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useCarrito } from '@/store/carrito';

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  imagen_url: string;
  stock: number;
  disponible: boolean;
  categoria?: { nombre: string };
}

function ProductosContent({ busquedaInicial }: { busquedaInicial: string }) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState(busquedaInicial);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ id: number; texto: string } | null>(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('all');
  const { agregar } = useCarrito();

  useEffect(() => {
    api.get('/productos')
      .then(res => setProductos(res.data))
      .catch(err => console.error(err))
      .finally(() => setCargando(false));
  }, []);

  const categoriasUnicas = ['all', ...Array.from(new Set(productos.map(p => p.categoria?.nombre).filter(Boolean) as string[]))];

  const filtrados = productos.filter(p => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria = categoriaFiltro === 'all' || p.categoria?.nombre === categoriaFiltro;
    return coincideBusqueda && coincideCategoria;
  });

  const stockDe = (producto: Producto) =>
    typeof producto.stock === 'number' ? producto.stock : 0;

  const agregarRapido = (producto: Producto, cantidad: number, texto: string) => {
    agregar({ ...producto, cantidad });
    setMensaje({ id: producto.id, texto });
    setTimeout(() => setMensaje(null), 1500);
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setCategoriaFiltro('all');
  };

  return (
    <main className="prolimal-page min-h-screen">
      <section className="relative overflow-hidden border-b border-prolimal-ink-900/10 dark:border-prolimal-sand-100/10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-prolimal-coral-200/40 blur-3xl dark:bg-prolimal-coral-900/15" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-prolimal-teal-200/45 blur-3xl dark:bg-prolimal-teal-800/20" />

        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 lg:px-8 lg:pb-16 lg:pt-20">
          <p className="prolimal-eyebrow">Catálogo</p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <h1 className="prolimal-display max-w-3xl text-5xl leading-[0.92] tracking-[-0.055em] text-prolimal-ink-900 dark:text-prolimal-sand-50 sm:text-6xl lg:text-7xl">
              Todo lo que tu espacio{' '}
              <span className="block italic text-prolimal-teal-700 dark:text-prolimal-teal-300">necesita.</span>
            </h1>
            <p className="max-w-md text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200 sm:text-base">
              Buscá por nombre o filtrá por familia. Una selección pensada para el hogar, la oficina y
              los equipos de trabajo.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-4 shadow-[0_24px_70px_-50px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400" />
              <input
                type="text"
                placeholder="Buscar un producto..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="prolimal-search-input py-3 pl-11"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-prolimal-ink-400 transition-colors hover:bg-prolimal-sand-100 hover:text-prolimal-ink-700 dark:hover:bg-prolimal-ink-800 dark:hover:text-prolimal-sand-100"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:max-w-[60%] lg:flex-wrap lg:overflow-visible lg:pb-0">
              <span className="flex shrink-0 items-center gap-1.5 pr-1 text-[10px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtrar
              </span>
              {categoriasUnicas.map(cat => {
                const activo = categoriaFiltro === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoriaFiltro(cat)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
                      activo
                        ? 'border-prolimal-ink-900 bg-prolimal-ink-900 text-prolimal-sand-50 dark:border-prolimal-teal-400 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
                        : 'border-prolimal-ink-900/10 bg-transparent text-prolimal-ink-500 hover:border-prolimal-teal-500/50 hover:text-prolimal-teal-700 dark:border-prolimal-sand-100/10 dark:text-prolimal-ink-200 dark:hover:text-prolimal-teal-300'
                    }`}
                  >
                    {cat === 'all' ? 'Todo' : cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
            {cargando ? 'Cargando catálogo' : `${filtrados.length} ${filtrados.length === 1 ? 'producto' : 'productos'}`}
          </p>
          {(busqueda || categoriaFiltro !== 'all') && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="text-[11px] font-bold uppercase tracking-[0.16em] text-prolimal-teal-700 transition-colors hover:text-prolimal-ink-900 dark:text-prolimal-teal-300 dark:hover:text-prolimal-sand-50"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {cargando ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-3 dark:border-prolimal-sand-100/10 dark:bg-card-dark"
              >
                <div className="aspect-[5/4] animate-pulse rounded-[1.55rem] bg-prolimal-sand-100 dark:bg-prolimal-ink-800" />
                <div className="space-y-3 px-3 pb-2 pt-5">
                  <div className="h-4 w-3/4 animate-pulse rounded-full bg-prolimal-sand-100 dark:bg-prolimal-ink-800" />
                  <div className="h-4 w-1/2 animate-pulse rounded-full bg-prolimal-sand-100 dark:bg-prolimal-ink-800" />
                  <div className="h-6 w-1/3 animate-pulse rounded-full bg-prolimal-sand-100 dark:bg-prolimal-ink-800" />
                </div>
              </div>
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="mt-6 rounded-[2rem] border border-prolimal-ink-900/10 bg-card py-20 text-center dark:border-prolimal-sand-100/10 dark:bg-card-dark">
            <Package className="mx-auto h-14 w-14 text-prolimal-ink-300 dark:text-prolimal-ink-500" />
            <p className="mt-4 text-lg font-extrabold text-prolimal-ink-800 dark:text-prolimal-sand-50">
              No encontramos productos
            </p>
            <p className="mt-1 text-sm text-prolimal-ink-500 dark:text-prolimal-ink-200">
              Probá con otra palabra o quitá los filtros.
            </p>
            <button type="button" onClick={limpiarFiltros} className="prolimal-btn-secondary mt-6">
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtrados.map(producto => {
              const stock = stockDe(producto);
              return (
                <article
                  key={producto.id}
                  className="group flex flex-col overflow-hidden rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-3 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] transition-all duration-500 hover:-translate-y-1.5 hover:border-prolimal-teal-500/40 hover:shadow-[0_34px_80px_-46px_rgba(11,37,32,0.5)] dark:border-prolimal-sand-100/10 dark:bg-card-dark"
                >
                  <Link href={`/productos/${producto.id}`} className="relative block aspect-[5/4] overflow-hidden rounded-[1.55rem] bg-prolimal-sand-100 dark:bg-prolimal-ink-800">
                    <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-prolimal-teal-200/55 blur-2xl transition-transform duration-500 group-hover:scale-125 dark:bg-prolimal-teal-700/20" />
                    <div className="absolute inset-x-4 bottom-4 h-8 rounded-full bg-prolimal-ink-900/10 blur-xl dark:bg-black/30" />
                    {producto.imagen_url ? (
                      <div className="relative h-full w-full p-6">
                        <ImagenProducto src={`${API_URL}${producto.imagen_url}`} alt={producto.nombre} />
                      </div>
                    ) : (
                      <Package className="absolute inset-0 m-auto h-14 w-14 text-prolimal-ink-300 dark:text-prolimal-ink-500" />
                    )}

                    {producto.categoria && (
                      <span className="absolute left-3 top-3 max-w-[70%] truncate rounded-full bg-white/90 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-500 shadow-sm backdrop-blur dark:bg-prolimal-ink-900/80 dark:text-prolimal-sand-100">
                        {producto.categoria.nombre}
                      </span>
                    )}
                    {stock === 0 && (
                      <span className="absolute right-3 top-3 rounded-full bg-prolimal-red-600 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                        Agotado
                      </span>
                    )}
                    <span className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-prolimal-ink-800 opacity-0 shadow-sm backdrop-blur transition-all duration-300 group-hover:opacity-100 dark:bg-prolimal-ink-900/85 dark:text-prolimal-sand-50">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </Link>

                  <div className="flex flex-1 flex-col px-3 pb-2 pt-5">
                    <Link href={`/productos/${producto.id}`} className="flex-1">
                      <h2 className="line-clamp-2 text-[15px] font-extrabold leading-snug tracking-[-0.02em] text-prolimal-ink-800 transition-colors group-hover:text-prolimal-teal-700 dark:text-prolimal-sand-50 dark:group-hover:text-prolimal-teal-300">
                        {producto.nombre}
                      </h2>
                    </Link>

                    <div className="mt-2 flex items-center gap-2">
                      {stock > 0 ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-prolimal-teal-600 dark:text-prolimal-teal-300" />
                          <span className="text-[11px] font-semibold text-prolimal-ink-400 dark:text-prolimal-ink-300">
                            {stock} en stock
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3.5 w-3.5 text-prolimal-red-500" />
                          <span className="text-[11px] font-semibold text-prolimal-red-500">Sin stock</span>
                        </>
                      )}
                    </div>

                    <p className="mt-4 text-xl font-extrabold tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                      {formatCurrency(producto.precio)}
                    </p>

                    <div className="mt-4 space-y-2">
                      <div className="flex gap-2">
                        {([3, 6] as const).map(cant => (
                          <button
                            key={cant}
                            type="button"
                            disabled={stock < cant}
                            onClick={() => agregarRapido(producto, cant, `+${cant} agregado`)}
                            className="flex-1 rounded-full border border-prolimal-ink-900/12 bg-transparent py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-prolimal-ink-700 transition-colors hover:border-prolimal-teal-500/50 hover:bg-prolimal-teal-50 hover:text-prolimal-teal-800 disabled:cursor-not-allowed disabled:opacity-35 dark:border-prolimal-sand-100/12 dark:text-prolimal-sand-100 dark:hover:bg-prolimal-teal-900/20 dark:hover:text-prolimal-teal-300"
                          >
                            +{cant}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        disabled={stock < 12}
                        onClick={() => agregarRapido(producto, 12, 'Docena agregada')}
                        className="w-full rounded-full bg-prolimal-coral-500 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white transition-colors hover:bg-prolimal-coral-600 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        + Docena
                      </button>
                      {mensaje?.id === producto.id && (
                        <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] font-bold text-prolimal-teal-700 dark:text-prolimal-teal-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{mensaje.texto}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function ProductosConFiltro() {
  const searchParams = useSearchParams();
  const busquedaInicial = searchParams.get('q') ?? '';

  return <ProductosContent key={busquedaInicial} busquedaInicial={busquedaInicial} />;
}

export default function ProductosPage() {
  return (
    <Suspense
      fallback={
        <main className="prolimal-page flex min-h-screen items-center justify-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-prolimal-ink-400">Cargando catálogo...</p>
        </main>
      }
    >
      <ProductosConFiltro />
    </Suspense>
  );
}
