'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Package, ShieldCheck, ShoppingCart, Trash2, X } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { useCarrito } from '@/store/carrito';
import { useDrawerAccesible } from '@/lib/useDrawerAccesible';
import { formatCurrency } from '@/lib/utils';

interface CarritoDrawerProps {
  abierto: boolean;
  onCerrar: () => void;
}

function ImagenItem({ nombre, imagenUrl }: { nombre: string; imagenUrl?: string }) {
  const [fallo, setFallo] = useState(false);

  if (!imagenUrl || fallo) {
    return (
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-prolimal-sand-100 dark:bg-prolimal-ink-800">
        <Package className="h-7 w-7 text-prolimal-ink-400" />
      </div>
    );
  }

  const src = imagenUrl.startsWith('http') ? imagenUrl : `${API_URL}${imagenUrl}`;

  return (
    <img
      src={src}
      alt={nombre}
      loading="lazy"
      onError={() => setFallo(true)}
      className="h-20 w-20 shrink-0 rounded-2xl bg-prolimal-sand-50 object-contain p-1.5 dark:bg-prolimal-ink-800"
    />
  );
}

export default function CarritoDrawer({ abierto, onCerrar }: CarritoDrawerProps) {
  const { items, quitar, cambiarCantidad, total, vaciar } = useCarrito();
  const panelRef = useRef<HTMLElement | null>(null);

  useDrawerAccesible({ abierto, onCerrar, panelRef });

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          key="carrito-overlay"
          className="fixed inset-0 z-[80]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-prolimal-ink-900/55 backdrop-blur-sm"
            onClick={onCerrar}
            aria-hidden="true"
          />

          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="carrito-titulo"
            tabIndex={-1}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#F7F5EF] shadow-[0_30px_100px_-30px_rgba(11,37,32,0.7)] outline-none dark:bg-prolimal-ink-900 sm:bottom-3 sm:right-3 sm:top-3 sm:h-auto sm:rounded-[2rem] sm:border sm:border-prolimal-ink-900/10 dark:sm:border-prolimal-sand-100/10"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-prolimal-ink-900/10 px-5 py-5 dark:border-prolimal-sand-100/10 sm:px-6">
              <div className="min-w-0">
                <p className="prolimal-eyebrow">Tu compra</p>
                <div className="mt-1 flex items-center gap-2">
                  <h2 id="carrito-titulo" className="prolimal-display text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                    Carrito
                  </h2>
                  <span className="rounded-full bg-prolimal-teal-100 px-2 py-0.5 text-xs font-bold text-prolimal-teal-800 dark:bg-prolimal-teal-900/40 dark:text-prolimal-teal-200">
                    {items.length}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onCerrar}
                aria-label="Cerrar carrito"
                className="prolimal-icon-btn -mr-1 -mt-1 shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {items.length === 0 ? (
                <div className="flex h-full min-h-72 flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-prolimal-teal-100 dark:bg-prolimal-teal-900/30">
                    <ShoppingCart className="h-8 w-8 text-prolimal-teal-700 dark:text-prolimal-teal-300" />
                  </div>
                  <h3 className="font-extrabold text-prolimal-ink-800 dark:text-prolimal-sand-50">
                    Tu carrito está vacío
                  </h3>
                  <p className="mt-1 mb-5 max-w-64 text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
                    Agregá productos para comenzar tu compra.
                  </p>
                  <Link href="/productos" onClick={onCerrar} className="prolimal-btn-primary">
                    Ver productos
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((item) => {
                    const maxAlcanzado = typeof item.stock === 'number' && item.cantidad >= item.stock;
                    return (
                      <li
                        key={item.id}
                        className="rounded-2xl border border-prolimal-ink-900/10 bg-card p-3 dark:border-prolimal-sand-100/10 dark:bg-card-dark"
                      >
                        <div className="flex gap-3">
                          <ImagenItem nombre={item.nombre} imagenUrl={item.imagen_url} />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate font-bold text-prolimal-ink-800 dark:text-prolimal-sand-50">
                                  {item.nombre}
                                </p>
                                <p className="mt-0.5 text-xs font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
                                  {formatCurrency(item.precio)} c/u
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => quitar(item.id)}
                                aria-label={`Quitar ${item.nombre}`}
                                className="shrink-0 rounded-lg p-1.5 text-prolimal-red-500 transition-colors hover:bg-prolimal-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prolimal-red-400 dark:hover:bg-prolimal-red-900/30"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => cambiarCantidad(item.id, Math.max(0, item.cantidad - 3))}
                                  aria-label="Quitar 3 unidades"
                                  className="flex h-8 w-8 items-center justify-center rounded-full border border-prolimal-ink-900/10 bg-card text-sm font-bold text-prolimal-ink-600 transition-colors hover:bg-prolimal-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prolimal-teal-500 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100 dark:hover:bg-prolimal-ink-700"
                                >
                                  -3
                                </button>
                                <span className="min-w-8 text-center text-sm font-bold text-prolimal-ink-800 dark:text-prolimal-sand-50">
                                  {item.cantidad}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => cambiarCantidad(item.id, item.cantidad + 3)}
                                  disabled={maxAlcanzado}
                                  aria-label="Añadir 3 unidades"
                                  className="flex h-8 w-8 items-center justify-center rounded-full border border-prolimal-ink-900/10 bg-card text-sm font-bold text-prolimal-ink-600 transition-colors hover:bg-prolimal-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prolimal-teal-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100 dark:hover:bg-prolimal-ink-700"
                                >
                                  +3
                                </button>
                              </div>
                              <p className="text-sm font-extrabold text-prolimal-teal-700 dark:text-prolimal-teal-300">
                                {formatCurrency(item.precio * item.cantidad)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <footer className="border-t border-prolimal-ink-900/10 px-5 py-5 dark:border-prolimal-sand-100/10 sm:px-6">
                <div className="mb-1 flex items-center justify-between text-xs font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
                  <span>Artículos</span>
                  <span>{items.length}</span>
                </div>
                <div className="mb-4 flex items-baseline justify-between gap-4">
                  <span className="text-sm font-bold text-prolimal-ink-600 dark:text-prolimal-sand-100">
                    Total
                  </span>
                  <span className="text-2xl font-extrabold tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                    {formatCurrency(total())}
                  </span>
                </div>

                <Link
                  href="/checkout"
                  onClick={onCerrar}
                  className="prolimal-btn-primary w-full py-3"
                >
                  Finalizar compra
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link href="/carrito" onClick={onCerrar} className="prolimal-btn-secondary">
                    Ver carrito
                  </Link>
                  <button type="button" onClick={() => vaciar()} className="prolimal-btn-ghost-danger">
                    Vaciar
                  </button>
                </div>

                <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-prolimal-teal-600 dark:text-prolimal-teal-300" />
                  Revisá tu pedido antes de continuar.
                </p>
              </footer>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
