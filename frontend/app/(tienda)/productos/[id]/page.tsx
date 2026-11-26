'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, Package, ShoppingCart, Tag } from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { CANTIDAD_MINIMA, factorConversion } from '@/lib/conversion';
import { useCarrito, type TipoPresentacion } from '@/store/carrito';

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen_url: string;
  categoria: { nombre: string };
  stock: number;
  disponible: boolean;
  factor_paquete?: number | null;
}

const OPCIONES_PRESENTACION: { valor: TipoPresentacion; titulo: string }[] = [
  { valor: 'UNIDAD', titulo: 'Unidades' },
  { valor: 'PAQUETE', titulo: 'Paquetes' },
];

export default function DetalleProducto() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [agregado, setAgregado] = useState(false);
  const [tipo, setTipo] = useState<TipoPresentacion>('UNIDAD');
  const [cantidadSel, setCantidadSel] = useState(CANTIDAD_MINIMA.UNIDAD);
  const { agregar } = useCarrito();

  useEffect(() => {
    if (!id) return;
    api.get(`/productos/${id}`)
      .then(res => setProducto(res.data))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [id]);

  const handleAgregar = (cantidad?: number) => {
    if (!producto) return;
    const q = Math.max(CANTIDAD_MINIMA[tipo], cantidad ?? cantidadSel);
    agregar({ ...producto, cantidad: q, tipo_presentacion: tipo });
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2000);
  };

  const seleccionarTipo = (valor: TipoPresentacion) => {
    setTipo(valor);
    setCantidadSel(CANTIDAD_MINIMA[valor]);
  };

  if (cargando) return (
    <main className="prolimal-page flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-prolimal-teal-200 border-t-prolimal-teal-600 dark:border-prolimal-teal-900 dark:border-t-prolimal-teal-300" />
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-400">Cargando producto</p>
      </div>
    </main>
  );

  if (!producto) return (
    <main className="prolimal-page flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <Package className="mx-auto h-16 w-16 text-prolimal-ink-300 dark:text-prolimal-ink-500" />
        <h1 className="prolimal-display mt-5 text-4xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
          Producto no encontrado
        </h1>
        <p className="mt-3 text-sm text-prolimal-ink-500 dark:text-prolimal-ink-200">
          Puede que ya no esté disponible en el catálogo.
        </p>
        <Link href="/productos" className="prolimal-btn-secondary mt-7">
          <ArrowLeft className="h-4 w-4" />
          Volver al catálogo
        </Link>
      </div>
    </main>
  );

  const stock = typeof producto.stock === 'number' ? producto.stock : 0;
  const factor = factorConversion(producto);
  const opcionesCantidad = tipo === 'UNIDAD' ? [3, 6, 12] : [1, 2, 3];
  const cabe = (cantidad: number) =>
    stock >= (tipo === 'PAQUETE' ? cantidad * factor : cantidad);

  return (
    <main className="prolimal-page min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <Link
          href="/productos"
          className="group inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-500 transition-colors hover:text-prolimal-teal-700 dark:text-prolimal-ink-200 dark:hover:text-prolimal-teal-300"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Volver al catálogo
        </Link>

        <div className="mt-7 overflow-hidden rounded-[2.75rem] border border-prolimal-ink-900/10 bg-card shadow-[0_40px_100px_-60px_rgba(11,37,32,0.55)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden bg-prolimal-sand-100 p-8 dark:bg-prolimal-ink-800 sm:p-12 lg:min-h-[600px]">
              <div className="pointer-events-none absolute -right-16 top-10 h-56 w-56 rounded-full bg-prolimal-teal-200/55 blur-3xl dark:bg-prolimal-teal-700/20" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-52 w-52 rounded-full bg-prolimal-coral-200/50 blur-3xl dark:bg-prolimal-coral-900/15" />
              <div className="pointer-events-none absolute inset-x-16 bottom-12 h-12 rounded-full bg-prolimal-ink-900/10 blur-2xl dark:bg-black/30" />
              {producto.imagen_url ? (
                <img
                  src={`${API_URL}${producto.imagen_url}`}
                  alt={producto.nombre}
                  className="relative h-72 w-full object-contain drop-shadow-[0_32px_26px_rgba(11,37,32,0.18)] lg:h-[420px]"
                />
              ) : (
                <Package className="relative h-32 w-32 text-prolimal-ink-300 dark:text-prolimal-ink-500" />
              )}
            </div>

            <div className="flex flex-col p-7 sm:p-10 lg:p-12">
              {producto.categoria && (
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-prolimal-teal-600 dark:text-prolimal-teal-300" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-prolimal-teal-700 dark:text-prolimal-teal-300">
                    {producto.categoria.nombre}
                  </span>
                </div>
              )}

              <h1 className="prolimal-display mt-4 text-4xl leading-[0.96] tracking-[-0.045em] text-prolimal-ink-900 dark:text-prolimal-sand-50 sm:text-5xl">
                {producto.nombre}
              </h1>

              <p className="mt-5 text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200 sm:text-base">
                {producto.descripcion}
              </p>

              <div className="mt-6">
                {stock === 0 ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-prolimal-red-50 px-4 py-2 text-sm font-bold text-prolimal-red-700 dark:bg-prolimal-red-900/25 dark:text-prolimal-red-300">
                    <AlertCircle className="h-4 w-4" />
                    Agotado
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full bg-prolimal-teal-50 px-4 py-2 text-sm font-bold text-prolimal-teal-800 dark:bg-prolimal-teal-900/25 dark:text-prolimal-teal-200">
                    <CheckCircle2 className="h-4 w-4" />
                    {stock} unidades disponibles
                  </div>
                )}
              </div>

              <div className="mt-7 border-y border-prolimal-ink-900/10 py-6 dark:border-prolimal-sand-100/10">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  Precio
                </p>
                <p className="mt-1 text-4xl font-extrabold tracking-[-0.055em] text-prolimal-ink-900 dark:text-prolimal-sand-50 sm:text-5xl">
                  {formatCurrency(producto.precio)}
                </p>
              </div>

              <div className="mt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  Presentación
                </p>
                <div className="mt-3 inline-flex rounded-full border border-prolimal-ink-900/10 bg-prolimal-sand-50/60 p-0.5 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/60">
                  {OPCIONES_PRESENTACION.map(opcion => (
                    <button
                      key={opcion.valor}
                      type="button"
                      onClick={() => seleccionarTipo(opcion.valor)}
                      aria-pressed={tipo === opcion.valor}
                      aria-label={`${opcion.titulo} de ${producto.nombre}`}
                      className={`min-h-11 rounded-full px-4 py-2.5 text-xs font-bold transition-colors sm:min-h-10 ${
                        tipo === opcion.valor
                          ? 'bg-prolimal-teal-700 text-white dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
                          : 'text-prolimal-ink-500 hover:text-prolimal-teal-700 dark:text-prolimal-ink-200'
                      }`}
                    >
                      {opcion.titulo}
                    </button>
                  ))}
                </div>
                {tipo === 'PAQUETE' && (
                  <p className="mt-2 text-[11px] font-bold text-prolimal-teal-700 dark:text-prolimal-teal-300">
                    1 paquete = {factor} unidades
                  </p>
                )}
              </div>

              <div className="mt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  Cantidad (mín. {CANTIDAD_MINIMA[tipo]})
                </p>
                <div className="mt-3 flex gap-2">
                  {opcionesCantidad.map(q => (
                    <button
                      key={q}
                      type="button"
                      disabled={!cabe(q)}
                      onClick={() => setCantidadSel(q)}
                      className={`flex-1 rounded-full border py-3 text-sm font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-35 ${
                        cantidadSel === q
                          ? 'border-prolimal-ink-900 bg-prolimal-ink-900 text-prolimal-sand-50 dark:border-prolimal-teal-400 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
                          : 'border-prolimal-ink-900/10 bg-transparent text-prolimal-ink-600 hover:border-prolimal-teal-500/50 hover:text-prolimal-teal-700 dark:border-prolimal-sand-100/10 dark:text-prolimal-ink-200 dark:hover:text-prolimal-teal-300'
                      }`}
                    >
                      {q === 12 ? 'Docena' : `+${q}`}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAgregar()}
                disabled={!cabe(cantidadSel)}
                className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full py-4 text-base font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-35 ${
                  agregado
                    ? 'bg-prolimal-teal-600 text-white'
                    : 'bg-prolimal-coral-500 text-white shadow-[0_20px_45px_-22px_rgba(241,120,106,0.8)] hover:-translate-y-0.5 hover:bg-prolimal-coral-600'
                }`}
              >
                <ShoppingCart className="h-5 w-5" />
                {stock === 0
                  ? 'Agotado'
                  : agregado
                    ? 'Agregado al carrito'
                    : `Agregar ${tipo === 'UNIDAD' ? (cantidadSel === 12 ? 'docena' : cantidadSel) : `${cantidadSel} paq.`} al carrito`}
              </button>

              <p className="mt-4 text-center text-[11px] font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                Coordinamos la entrega por WhatsApp después de confirmar tu pedido.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
