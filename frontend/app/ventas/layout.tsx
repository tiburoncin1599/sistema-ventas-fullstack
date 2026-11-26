'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cerrarSesion } from '@/lib/api';
import { esRol, normalizarRol } from '@/lib/roles';
import { useDrawerAccesible } from '@/lib/useDrawerAccesible';
import DarkModeToggle from '@/components/DarkModeToggle';
import { LogOut, Store, ChevronLeft, Menu, X } from 'lucide-react';

const ventasSecciones = [
  { href: '/ventas/clientes', titulo: 'Clientes', rol: 'ventas' },
  { href: '/ventas/pedidos', titulo: 'Pedidos', rol: 'ventas' },
  { href: '/ventas/deudas', titulo: 'Deudas', rol: 'ventas' },
  { href: '/ventas/rendimiento', titulo: 'Mi Rendimiento', rol: 'ventas' },
];

export default function VentasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Cargar usuario de localStorage (mismo patrón que AdminLayout)
  const [usuario, setUsuario] = useState<{ nombre: string; rol: string } | null>(null);
  useEffect(() => {
    const checkUser = () => {
      if (typeof window !== 'undefined') {
        try {
          const u = localStorage.getItem('usuario');
          if (!u) {
            setUsuario(null);
            return;
          }
          const datos = JSON.parse(u) as { nombre: string; rol: string };
          setUsuario({ ...datos, rol: normalizarRol(datos.rol) });
        } catch { setUsuario(null); }
      }
    };
    checkUser();
    const onStorage = () => checkUser();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarColapsado, setSidebarColapsado] = useState(false);
  const [seccionActual, setSeccionActual] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const cerrarMenu = useCallback(() => setMenuOpen(false), []);

  useDrawerAccesible({ abierto: menuOpen, onCerrar: cerrarMenu, panelRef });

  const visibleSecciones = ventasSecciones.filter(s => esRol(usuario?.rol, s.rol));

  return (
    <div className="prolimal-page min-h-screen">
      <header className="sticky top-0 z-30 border-b border-prolimal-ink-900/10 bg-prolimal-sand-50/85 backdrop-blur-xl dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-900/85">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <Link href="/ventas" prefetch={false} className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-prolimal-ink-900 text-prolimal-sand-50 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900">
                <Store className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="prolimal-display block truncate text-lg leading-none tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                  Portal de Ventas
                </span>
                {usuario && (
                  <span className="mt-1 block truncate text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    {usuario.nombre}
                  </span>
                )}
              </span>
            </Link>
            <div className="flex flex-wrap items-center justify-end gap-1.5 sm:flex-nowrap">
              <button
                type="button"
                className="flex items-center gap-2 rounded-full p-2 text-prolimal-ink-600 transition-colors hover:bg-prolimal-sand-100 md:hidden"
                onClick={() => router.push('/ventas')}
                aria-label="Volver al menú principal"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs font-medium">Menú</span>
              </button>
              {visibleSecciones.map((seccion, indice) => {
                const esActivo = pathname === seccion.href || pathname.startsWith(seccion.href + '/');
                return (
                  <Link
                    key={seccion.href}
                    href={seccion.href}
                    prefetch={false}
                    className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-2 text-[11px] font-bold transition-colors sm:px-3.5 sm:text-xs ${
                      indice >= 2 ? 'hidden sm:inline-flex' : ''
                    } ${
                      esActivo
                        ? 'bg-prolimal-ink-900 text-white dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
                        : 'text-prolimal-ink-500 hover:bg-prolimal-sand-100 dark:text-prolimal-ink-200 dark:hover:bg-prolimal-ink-800'
                    }`}
                  >
                    {seccion.titulo}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </header>
      {(menuOpen || sidebarColapsado) && (
        <div
          className="fixed inset-0 z-40 bg-prolimal-ink-900/55 dark:bg-prolimal-ink-900/55 backdrop-blur-sm md:hidden"
          onClick={() => {
            setMenuOpen(false);
            setSidebarColapsado(false);
          }}
          aria-hidden="true"
        />
      )}
      <aside
        ref={panelRef}
        tabIndex={-1}
        className={`fixed bottom-0 left-0 top-0 z-50 flex w-[min(17rem,85vw)] flex-col bg-prolimal-ink-900 text-prolimal-sand-50 shadow-[20px_0_60px_-40px_rgba(11,37,32,0.8)] transition-transform duration-300 ${
          sidebarColapsado ? 'md:-translate-x-full' : 'md:translate-x-0'
        } ${menuOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}`}
      >
        <div className="flex h-[5.5rem] items-center justify-between gap-3 border-b border-white/10 px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/"
              prefetch={false}
              className="flex min-w-0 cursor-pointer items-center gap-3 transition-opacity hover:opacity-80"
              onClick={() => setMenuOpen(false)}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-prolimal-sand-50 p-1.5">
                <img src="/logo.png" alt="Logo PROLIMAC" className="h-full w-full object-contain" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-extrabold tracking-[-0.03em]">PROLIMAC</span>
                <span className="prolimal-display truncate text-xs italic text-prolimal-teal-300">
                  panel ventas
                </span>
              </span>
            </Link>
            {seccionActual && (
              <button
                type="button"
                className="flex shrink-0 items-center gap-2 rounded-full p-2 text-prolimal-sand-100/70 transition-colors hover:bg-white/10 md:hidden"
                onClick={() => setSeccionActual(null)}
                aria-label="Volver al panel principal"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs font-medium">Volver</span>
              </button>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="rounded-full p-2 text-prolimal-sand-100/70 transition-colors hover:bg-white/10 hover:text-white md:hidden"
              onClick={() => setMenuOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="hidden rounded-full p-2 text-prolimal-sand-100/60 transition-colors hover:bg-white/10 hover:text-white md:inline-flex"
              onClick={() => setSidebarColapsado(true)}
              aria-label="Colapsar menú"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navegación de ventas">
          <p className="px-3 text-[9px] font-bold uppercase tracking-[0.22em] text-prolimal-sand-100/35">
            Operaciones
          </p>
          <div className="mt-3 space-y-1">
            {visibleSecciones.map((seccion) => {
              const esActivo = pathname === seccion.href || pathname.startsWith(seccion.href + '/');

              return (
                <Link
                  key={seccion.href}
                  href={seccion.href}
                  prefetch={false}
                  onClick={() => {
                    setSeccionActual(seccion.href);
                    setMenuOpen(false);
                  }}
                  aria-current={esActivo ? 'page' : undefined}
                  className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition-colors ${
                    esActivo
                      ? 'bg-white/10 text-prolimal-sand-50'
                      : 'text-prolimal-sand-100/60 hover:bg-white/5 hover:text-prolimal-sand-50'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      esActivo
                        ? 'bg-prolimal-teal-400 text-prolimal-ink-900'
                        : 'bg-white/5 text-prolimal-sand-100/60 group-hover:text-prolimal-teal-300'
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 truncate">{seccion.titulo}</span>
                  {esActivo && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-prolimal-coral-300" />}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      <main className={`min-h-screen min-w-0 px-4 py-6 transition-[margin-left] duration-300 sm:px-6 lg:px-10 lg:py-8 ${sidebarColapsado ? 'md:ml-0' : 'md:ml-[17rem]'}`}>
        <header className="mb-8 flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-full border border-prolimal-ink-900/10 bg-card p-2.5 text-prolimal-ink-600 transition-colors hover:bg-prolimal-sand-100 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100 dark:hover:bg-prolimal-ink-700 md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button
              type="button"
              className="hidden rounded-full border border-prolimal-ink-900/10 bg-card p-2.5 text-prolimal-ink-600 transition-colors hover:bg-prolimal-sand-100 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100 dark:hover:bg-prolimal-ink-700 md:inline-flex"
              onClick={() => setSidebarColapsado((v) => !v)}
              aria-label={sidebarColapsado ? 'Mostrar menú' : 'Ocultar menú'}
            >
              {sidebarColapsado ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                PROLIMAC SRL
              </p>
              <h1 className="prolimal-display text-xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50 sm:text-2xl lg:text-3xl">
                Portal de Ventas
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <DarkModeToggle />
            <div className="hidden items-center gap-2 rounded-full border border-prolimal-ink-900/10 bg-card px-3 py-1.5 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800 lg:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-prolimal-teal-100 text-xs font-extrabold text-prolimal-teal-800 dark:bg-prolimal-teal-900/40 dark:text-prolimal-teal-200">
                {usuario?.nombre?.charAt(0).toUpperCase() || '?'}
              </span>
              <span className="max-w-24 truncate text-xs font-bold text-prolimal-ink-600 dark:text-prolimal-sand-100 lg:max-w-32">
                {usuario?.nombre || 'Bienvenido'}
              </span>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-7xl">
          {children}
        </section>
      </main>
    </div>
  );
}