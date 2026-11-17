'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Home,
  LayoutDashboard,
  LogOut,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  Store,
  User,
  X,
} from 'lucide-react';
import { useDrawerAccesible } from '@/lib/useDrawerAccesible';

interface EnlaceMenu {
  href: string;
  label: string;
}

interface UsuarioMenu {
  nombre: string;
  rol: string;
}

interface MenuMovilProps {
  abierto: boolean;
  onCerrar: () => void;
  usuario: UsuarioMenu | null;
  enlaces: EnlaceMenu[];
  cantidadItems: number;
  onAbrirCarrito: () => void;
  onSalir: () => void | Promise<void>;
}

function iconoEnlace(href: string) {
  if (href === '/') return Home;
  if (href === '/productos') return Package;
  if (href === '/admin') return LayoutDashboard;
  if (href === '/ventas') return Store;
  return ArrowRight;
}

export default function MenuMovil({
  abierto,
  onCerrar,
  usuario,
  enlaces,
  cantidadItems,
  onAbrirCarrito,
  onSalir,
}: MenuMovilProps) {
  const router = useRouter();
  const pathname = usePathname();
  const panelRef = useRef<HTMLElement | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const cerrarMenu = useCallback(() => {
    setBusqueda('');
    onCerrar();
  }, [onCerrar]);

  useDrawerAccesible({ abierto, onCerrar: cerrarMenu, panelRef });

  useEffect(() => {
    if (!abierto) return;
    const onResize = () => {
      if (window.innerWidth >= 1024) cerrarMenu();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [abierto, cerrarMenu]);

  const buscar = (event: React.FormEvent) => {
    event.preventDefault();
    const q = busqueda.trim();
    cerrarMenu();
    router.push(q ? `/productos?q=${encodeURIComponent(q)}` : '/productos');
  };

  const abrirCarrito = () => {
    setBusqueda('');
    onAbrirCarrito();
  };

  const salir = () => {
    setBusqueda('');
    void onSalir();
  };

  const esRutaActiva = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  const claseEnlace = (href: string) =>
    `prolimal-nav-link w-full ${esRutaActiva(href) ? 'bg-prolimal-teal-50 text-prolimal-teal-800 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-200' : ''}`;

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          key="menu-movil-overlay"
          className="fixed inset-0 z-[70] lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-prolimal-ink-900/55 backdrop-blur-sm"
            onClick={cerrarMenu}
            aria-hidden="true"
          />

          <motion.aside
            ref={panelRef}
            id="menu-movil"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            tabIndex={-1}
            className="absolute inset-y-0 left-0 flex w-[min(88vw,22rem)] flex-col bg-[#F7F5EF] shadow-[24px_0_80px_-40px_rgba(11,37,32,0.65)] outline-none dark:bg-prolimal-ink-900"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.28, ease: 'easeOut' }}
          >
            <header className="flex items-center justify-between border-b border-prolimal-ink-900/10 px-5 py-4 dark:border-prolimal-sand-100/10">
              <Link href="/" onClick={cerrarMenu} className="flex min-w-0 items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Logo PROLIMAC"
                  className="h-11 w-11 shrink-0 rounded-full bg-white object-contain p-1.5 ring-1 ring-prolimal-ink-900/10 dark:bg-prolimal-sand-50 dark:ring-prolimal-sand-100/15"
                />
                <span className="min-w-0">
                  <span className="block truncate text-base font-extrabold tracking-[-0.03em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                    PROLIMAC SRL
                  </span>
                  <span className="prolimal-display block truncate text-xs italic text-prolimal-teal-700 dark:text-prolimal-teal-300">
                    productos de limpieza
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={cerrarMenu}
                aria-label="Cerrar menú"
                className="prolimal-icon-btn shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-6">
              <form onSubmit={buscar} role="search" className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Buscar productos..."
                  aria-label="Buscar productos"
                  data-autofocus
                  className="prolimal-search-input"
                />
              </form>

              <nav className="mt-6 space-y-1" aria-label="Navegación principal">
                {enlaces.map((enlace) => {
                  const Icono = iconoEnlace(enlace.href);
                  return (
                    <Link
                      key={enlace.href}
                      href={enlace.href}
                      onClick={cerrarMenu}
                      aria-current={esRutaActiva(enlace.href) ? 'page' : undefined}
                      className={claseEnlace(enlace.href)}
                    >
                      <Icono className="h-4 w-4" />
                      {enlace.label}
                    </Link>
                  );
                })}
              </nav>

              {usuario ? (
                <div className="mt-6 border-t border-prolimal-ink-900/10 pt-6 dark:border-prolimal-sand-100/10">
                  <p className="prolimal-eyebrow">Tu cuenta</p>
                  <Link
                    href="/cuenta"
                    onClick={cerrarMenu}
                    className="mt-3 flex items-center gap-3 rounded-2xl border border-prolimal-ink-900/10 bg-card p-3 transition-colors hover:border-prolimal-teal-500/40 hover:bg-prolimal-teal-50/50 dark:border-prolimal-sand-100/10 dark:bg-card-dark dark:hover:border-prolimal-teal-600/40 dark:hover:bg-prolimal-ink-800"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-prolimal-teal-100 text-sm font-extrabold text-prolimal-teal-800 dark:bg-prolimal-teal-900/40 dark:text-prolimal-teal-200">
                      {usuario.nombre.charAt(0).toUpperCase() || '?'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-prolimal-ink-800 dark:text-prolimal-sand-50">
                        {usuario.nombre}
                      </span>
                      <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                        {usuario.rol}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-prolimal-ink-400" />
                  </Link>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-prolimal-ink-900/10 bg-card p-4 dark:border-prolimal-sand-100/10 dark:bg-card-dark">
                  <p className="prolimal-display text-xl tracking-[-0.03em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                    Todo listo para comprar.
                  </p>
                  <p className="mt-1.5 text-xs font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200">
                    Ingresá a tu cuenta para guardar productos en el carrito.
                  </p>
                </div>
              )}
            </div>

            <footer className="space-y-2 border-t border-prolimal-ink-900/10 px-5 py-5 dark:border-prolimal-sand-100/10">
              {usuario ? (
                <>
                  <button
                    type="button"
                    onClick={abrirCarrito}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-prolimal-ink-600 transition-colors hover:bg-prolimal-teal-50 hover:text-prolimal-teal-800 dark:text-prolimal-ink-200 dark:hover:bg-prolimal-ink-800 dark:hover:text-prolimal-teal-200"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Mi carrito
                    {cantidadItems > 0 && (
                      <span className="ml-auto rounded-full bg-prolimal-teal-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        {cantidadItems > 99 ? '99+' : cantidadItems}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={salir}
                    className="prolimal-btn-ghost-danger w-full justify-start"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <Link href="/auth" onClick={cerrarMenu} className="prolimal-btn-primary w-full">
                  <User className="h-4 w-4" />
                  Ingresar
                </Link>
              )}

              <p className="flex items-center justify-center gap-2 pt-2 text-[11px] font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                <ShieldCheck className="h-3.5 w-3.5 text-prolimal-teal-600 dark:text-prolimal-teal-300" />
                Compra simple y segura
              </p>
            </footer>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
