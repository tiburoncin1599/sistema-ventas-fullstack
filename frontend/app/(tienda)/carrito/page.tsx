'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Package, ShoppingCart, Trash2 } from 'lucide-react';
import { useCarrito } from '@/store/carrito';
import { formatCurrency, parseCurrency } from '@/lib/utils';
import { API_URL } from '@/lib/api';

export default function CarritoPage() {
  const { items, quitar, cambiarCantidad, total } = useCarrito();

  if (items.length === 0) {
    return (
      <main className="prolimal-page flex min-h-[70vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-prolimal-teal-100 dark:bg-prolimal-teal-900/30">
            <ShoppingCart className="h-10 w-10 text-prolimal-teal-700 dark:text-prolimal-teal-300" />
          </div>
          <h1 className="prolimal-display mt-6 text-4xl tracking-[-0.045em] text-prolimal-ink-900 dark:text-prolimal-sand-50 sm:text-5xl">
            Tu carrito está vacío.
          </h1>
          <p className="mt-3 text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
            Agregá productos para empezar a armar tu pedido.
          </p>
          <Link href="/productos" className="prolimal-btn-primary mt-7">
            <ShoppingCart className="h-4 w-4" />
            Ver productos
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="prolimal-page min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mb-8">
          <Link
            href="/productos"
            className="group inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-500 transition-colors hover:text-prolimal-teal-700 dark:text-prolimal-ink-200 dark:hover:text-prolimal-teal-300"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Seguir comprando
          </Link>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="prolimal-eyebrow">Tu compra</p>
              <h1 className="prolimal-display mt-3 text-4xl leading-none tracking-[-0.045em] text-prolimal-ink-900 dark:text-prolimal-sand-50 sm:text-5xl">
                Carrito.
              </h1>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
              {items.length} {items.length === 1 ? 'producto' : 'productos'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.45fr_0.55fr]">
          <div className="space-y-4">
            {items.map(item => (
              <article
                key={item.id}
                className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-4 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Link
                    href={`/productos/${item.id}`}
                    className="relative flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-[1.5rem] bg-prolimal-sand-100 p-4 dark:bg-prolimal-ink-800 sm:h-28 sm:w-28"
                  >
                    {item.imagen_url ? (
                      <img
                        src={`${API_URL}${item.imagen_url}`}
                        alt={item.nombre}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Package className="h-8 w-8 text-prolimal-ink-300 dark:text-prolimal-ink-500" />
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/productos/${item.id}`}
                          className="break-words text-base font-extrabold tracking-[-0.02em] text-prolimal-ink-800 transition-colors hover:text-prolimal-teal-700 dark:text-prolimal-sand-50 dark:hover:text-prolimal-teal-300"
                        >
                          {item.nombre}
                        </Link>
                        <p className="mt-1 text-sm font-semibold text-prolimal-ink-400 dark:text-prolimal-ink-300">
                          {formatCurrency(item.precio)} c/u
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => quitar(item.id)}
                        aria-label={`Quitar ${item.nombre}`}
                        className="shrink-0 rounded-full p-2 text-prolimal-red-500 transition-colors hover:bg-prolimal-red-50 dark:hover:bg-prolimal-red-900/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                          Cantidad
                        </p>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => cambiarCantidad(item.id, Math.max(0, item.cantidad - 3))}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-prolimal-ink-900/10 text-xs font-bold text-prolimal-ink-600 transition-colors hover:bg-prolimal-sand-100 dark:border-prolimal-sand-100/10 dark:text-prolimal-ink-200 dark:hover:bg-prolimal-ink-800"
                          >
                            -3
                          </button>
                          <button
                            type="button"
                            onClick={() => cambiarCantidad(item.id, Math.max(0, item.cantidad - 6))}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-prolimal-ink-900/10 text-xs font-bold text-prolimal-ink-600 transition-colors hover:bg-prolimal-sand-100 dark:border-prolimal-sand-100/10 dark:text-prolimal-ink-200 dark:hover:bg-prolimal-ink-800"
                          >
                            -6
                          </button>
                          <span className="min-w-10 text-center text-base font-extrabold text-prolimal-ink-900 dark:text-prolimal-sand-50">
                            {item.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => cambiarCantidad(item.id, item.cantidad + 3)}
                            disabled={typeof item.stock === 'number' && item.cantidad >= item.stock}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-prolimal-ink-900/10 text-xs font-bold text-prolimal-ink-600 transition-colors hover:bg-prolimal-sand-100 disabled:cursor-not-allowed disabled:opacity-30 dark:border-prolimal-sand-100/10 dark:text-prolimal-ink-200 dark:hover:bg-prolimal-ink-800"
                          >
                            +3
                          </button>
                          <button
                            type="button"
                            onClick={() => cambiarCantidad(item.id, item.cantidad + 6)}
                            disabled={typeof item.stock === 'number' && item.cantidad >= item.stock}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-prolimal-ink-900/10 text-xs font-bold text-prolimal-ink-600 transition-colors hover:bg-prolimal-sand-100 disabled:cursor-not-allowed disabled:opacity-30 dark:border-prolimal-sand-100/10 dark:text-prolimal-ink-200 dark:hover:bg-prolimal-ink-800"
                          >
                            +6
                          </button>
                          <button
                            type="button"
                            onClick={() => cambiarCantidad(item.id, item.cantidad + 12)}
                            disabled={typeof item.stock === 'number' && item.cantidad >= item.stock}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-prolimal-ink-900/10 text-xs font-bold text-prolimal-ink-600 transition-colors hover:bg-prolimal-sand-100 disabled:cursor-not-allowed disabled:opacity-30 dark:border-prolimal-sand-100/10 dark:text-prolimal-ink-200 dark:hover:bg-prolimal-ink-800"
                          >
                            +12
                          </button>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                          Subtotal
                        </p>
                        <p className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                          {formatCurrency(parseCurrency(item.precio) * item.cantidad)}
                        </p>
                      </div>
                    </div>

                    {typeof item.stock === 'number' && (
                      <p className="mt-3 text-[11px] font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                        Máximo disponible: {item.stock}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-prolimal-ink-900 p-6 text-prolimal-sand-50 shadow-[0_34px_90px_-56px_rgba(11,37,32,0.55)] dark:border-prolimal-sand-100/10 sm:p-7">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-prolimal-teal-300">Resumen</p>
              <h2 className="prolimal-display mt-3 text-3xl tracking-[-0.04em]">Tu pedido.</h2>

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between text-prolimal-sand-100/70">
                  <span>Subtotal</span>
                  <span>{formatCurrency(total())}</span>
                </div>
                <div className="flex justify-between text-prolimal-sand-100/70">
                  <span>Envío</span>
                  <span>A coordinar</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-4">
                  <span className="font-bold">Total</span>
                  <span className="text-xl font-extrabold">{formatCurrency(total())}</span>
                </div>
              </div>

              <p className="mt-5 text-xs leading-relaxed text-prolimal-sand-100/55">
                Revisá las cantidades antes de confirmar. La entrega se coordina por WhatsApp con el
                personal de inventario.
              </p>

              <Link href="/checkout" className="group mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-prolimal-sand-50 py-3.5 text-sm font-extrabold text-prolimal-ink-900 transition-all hover:-translate-y-0.5 hover:bg-white">
                Confirmar pedido
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
