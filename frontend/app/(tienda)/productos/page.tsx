'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowUpRight, CheckCircle2, Package, Search, SlidersHorizontal, X } from 'lucide-react';
import ImagenProducto from '@/components/ImagenProducto';
import { api, API_URL } from '@/lib/api';
import {
  Categoria,
  ProductoCatalogo,
  SIN_CATEGORIA,
  TODAS_CATEGORIAS,
  categoriasParaFiltro,
} from '@/lib/productos';
import { formatCurrency } from '@/lib/utils';
import { useCarrito } from '@/store/carrito';

interface FiltrosIniciales {
  busqueda: string;
  categoria: string;
}

function ProductosContent({ inicial }: { inicial: FiltrosIniciales }) {
  const router = useRouter();
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [haySinCategoria, setHaySinCategoria] = useState(false);
  const [busqueda, setBusqueda] = useState(inicial.busqueda);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ id: number; texto: string } | null>(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState(inicial.categoria);
  const { agregar } = useCarrito();

  useEffect(() => {
    let activo = true;
    Promise.allSettled([
      api.get<Categoria[]>('/categorias', { params: { limit: 100 } }),
      // El chip "Sin categoría" solo existe si hay productos huérfanos reales.
      api.get<ProductoCatalogo[]>('/productos', {
        params: { limit: 1, sinCategoria: 'true' },
      }),
    ]).then(([respuestaCategorias, respuestaSinCategoria]) => {
      if (!activo) return;
      setCategorias(
        respuestaCategorias.status === 'fulfilled'
          ? categoriasParaFiltro(respuestaCategorias.value.data ?? [])
          : [],
      );
      setHaySinCategoria(
        respuestaSinCategoria.status === 'fulfilled' &&
          (respuestaSinCategoria.value.data?.length ?? 0) > 0,
      );
    });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    const params: Record<string, string | number> = { limit: 100 };
    const id = Number(categoriaFiltro);
    if (Number.isInteger(id) && id > 0) params.categoriaId = id;
    if (categoriaFiltro === SIN_CATEGORIA) params.sinCategoria = 'true';

    api.get<ProductoCatalogo[]>('/productos', { params })
      .then(res => { if (activo) setProductos(res.data || []); })
      .catch(err => console.error(err))
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [categoriaFiltro]);

  const seleccionarCategoria = (valor: string) => {
    setCategoriaFiltro(valor);
    const params = new URLSearchParams();
    if (busqueda.trim()) params.set('q', busqueda.trim());
    if (valor !== TODAS_CATEGORIAS) params.set('categoria', valor);
    const query = params.toString();
    router.replace(`/productos${query ? `?${query}` : ''}`, { scroll: false });
  };

  const termino = busqueda.trim().toLocaleLowerCase('es');
  const filtrados = productos.filter(p =>
    p.nombre.toLocaleLowerCase('es').includes(termino),
  );

  const chips: { valor: string; etiqueta: string }[] = [
    { valor: TODAS_CATEGORIAS, etiqueta: 'Todo' },
    ...categorias.map(c => ({ valor: String(c.id), etiqueta: c.nombre })),
    ...(haySinCategoria
      ? [{ valor: SIN_CATEGORIA, etiqueta: 'Sin categoría' }]
      : []),
  ];

  const stockDe = (producto: ProductoCatalogo) =>
    typeof producto.stock === 'number' ? producto.stock : 0;

  const agregarRapido = (producto: ProductoCatalogo, cantidad: number, texto: string) => {
    agregar({
      ...producto,
      imagen_url: producto.imagen_url ?? undefined,
      cantidad,
      tipo_presentacion: 'UNIDAD',
    });
    setMensaje({ id: producto.id, texto });
    setTimeout(() => setMensaje(null), 1500);
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setCategoriaFiltro(TODAS_CATEGORIAS);
    router.replace('/productos', { scroll: false });
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
        <div className="prolimal-surface p-4 sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6 lg:gap-8">
            <div className="relative w-full md:w-64 lg:w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400" />
              <input
                type="text"
                placeholder="Buscar un producto..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                aria-label="Buscar un producto"
                className="prolimal-search-input py-3 pl-11"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-prolimal-ink-400 transition-colors hover:bg-prolimal-sand-100 hover:text-prolimal-ink-700 dark:hover:bg-prolimal-ink-800 dark:hover:text-prolimal-sand-100"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtrar
              </span>
              <div
                role="group"
                aria-label="Filtrar productos por categoría"
                className="scrollbar-hide -mx-1 -my-2 flex min-w-0 flex-1 snap-x snap-mandatory scroll-smooth items-center gap-2 overflow-x-auto px-1 py-2"
              >
                {chips.map(cat => {
                  const activo = categoriaFiltro === cat.valor;
                  const esTodo = cat.valor === TODAS_CATEGORIAS;
                  return (
                    <button
                      key={cat.valor}
                      type="button"
                      onClick={() => seleccionarCategoria(cat.valor)}
                      aria-pressed={activo}
                      className={`inline-flex min-h-11 snap-start shrink-0 items-center whitespace-nowrap rounded-full border px-4 py-2.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prolimal-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-10 sm:px-3.5 sm:py-2 ${
                        activo
                          ? 'border-prolimal-ink-900 bg-prolimal-ink-900 text-white shadow-sm dark:border-prolimal-teal-400 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
                          : esTodo
                            ? 'border-prolimal-teal-600/40 bg-prolimal-teal-50 text-prolimal-teal-800 hover:border-prolimal-teal-500 dark:border-prolimal-teal-400/30 dark:bg-prolimal-teal-900/20 dark:text-prolimal-teal-200'
                            : 'border-prolimal-ink-900/10 bg-white/70 text-prolimal-ink-600 hover:border-prolimal-teal-500/50 hover:text-prolimal-teal-800 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/50 dark:text-prolimal-ink-200 dark:hover:text-prolimal-teal-300'
                      }`}
                    >
                      {cat.etiqueta}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
            {cargando ? 'Cargando catálogo' : `${filtrados.length} ${filtrados.length === 1 ? 'producto' : 'productos'}`}
          </p>
          {(busqueda || categoriaFiltro !== TODAS_CATEGORIAS) && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex min-h-10 items-center text-[11px] font-bold uppercase tracking-[0.16em] text-prolimal-teal-700 transition-colors hover:text-prolimal-ink-900 dark:text-prolimal-teal-300 dark:hover:text-prolimal-sand-50"
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
                      <span className="absolute left-3 top-3 max-w-[55%] truncate rounded-full bg-white/90 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-500 shadow-sm backdrop-blur dark:bg-prolimal-ink-900/80 dark:text-prolimal-sand-100 sm:max-w-[70%]">
                        {producto.categoria.nombre}
                      </span>
                    )}
                    {stock === 0 && (
                      <span className="absolute right-3 top-3 rounded-full bg-prolimal-red-600 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                        Agotado
                      </span>
                    )}
                    <span className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-prolimal-ink-800 opacity-100 shadow-sm backdrop-blur transition-all duration-300 sm:opacity-0 sm:group-hover:opacity-100 dark:bg-prolimal-ink-900/85 dark:text-prolimal-sand-50">
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
                            className="min-h-11 flex-1 rounded-full border border-prolimal-ink-900/12 bg-transparent py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-prolimal-ink-700 transition-colors hover:border-prolimal-teal-500/50 hover:bg-prolimal-teal-50 hover:text-prolimal-teal-800 disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-10 dark:border-prolimal-sand-100/12 dark:text-prolimal-sand-100 dark:hover:bg-prolimal-teal-900/20 dark:hover:text-prolimal-teal-300"
                          >
                            +{cant}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        disabled={stock < 12}
                        onClick={() => agregarRapido(producto, 12, 'Docena agregada')}
                        className="min-h-11 w-full rounded-full bg-prolimal-coral-500 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white transition-colors hover:bg-prolimal-coral-600 disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-10"
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
  const inicial: FiltrosIniciales = {
    busqueda: searchParams.get('q') ?? '',
    categoria: searchParams.get('categoria') ?? TODAS_CATEGORIAS,
  };

  return (
    <ProductosContent
      key={`${inicial.busqueda}|${inicial.categoria}`}
      inicial={inicial}
    />
  );
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
