'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Boxes,
  ChevronLeft,
  ClipboardList,
  Menu,
  Package,
  Settings,
  Store,
  Users,
  X,
} from 'lucide-react';
import DarkModeToggle from '@/components/DarkModeToggle';

interface SeccionMenu {
  href: string;
  titulo: string;
  desc: string;
  roles: string[];
  Icono: LucideIcon;
  esPanel: boolean;
}

function useAuth() {
  const [usuario, setUsuario] = useState<{ nombre: string; rol: string } | null>(null);

  useEffect(() => {
    const checkUser = () => {
      if (typeof window !== 'undefined') {
        try {
          const u = localStorage.getItem('usuario');
          setUsuario(u ? JSON.parse(u) : null);
        } catch { setUsuario(null); }
      }
    };
    checkUser();
    const onStorage = () => checkUser();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return usuario;
}

export default function AdminLayout({
  children,
  title = 'Panel de Administración',
}: { children: React.ReactNode; title?: string }) {
  const usuario = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarColapsado, setSidebarColapsado] = useState(false);
  const [view, setView] = useState<'main' | 'section'>('main');
  const [seccionActual, setSeccionActual] = useState<string | null>(null);

  const volverAlPanel = () => {
    setSeccionActual(null);
    setView('main');
  };

  const seccionesAdmin: SeccionMenu[] = [
    { href: '/admin/productos', titulo: 'Productos', desc: 'Gestión de productos', roles: ['admin', 'inventario'], Icono: Package, esPanel: true },
    { href: '/admin/inventario', titulo: 'Inventario', desc: 'Control de existencias', roles: ['admin', 'inventario'], Icono: Boxes, esPanel: true },
    { href: '/admin/pedidos', titulo: 'Pedidos', desc: 'Gestión de pedidos', roles: ['admin', 'inventario'], Icono: ClipboardList, esPanel: true },
    { href: '/admin/clientes', titulo: 'Clientes', desc: 'Registro de clientes', roles: ['admin'], Icono: Users, esPanel: true },
    { href: '/admin/usuarios', titulo: 'Usuarios', desc: 'Gestión de usuarios', roles: ['admin'], Icono: Settings, esPanel: true },
    { href: '/admin/deudas', titulo: 'Deudas', desc: 'Gestión de deudas', roles: ['admin'], Icono: Users, esPanel: true },
    { href: '/admin/reportes', titulo: 'Reportes', desc: 'Reportes del sistema', roles: ['admin'], Icono: Users, esPanel: true },
    { href: '/admin/rendimiento', titulo: 'Rendimiento', desc: 'Mi rendimiento', roles: ['admin'], Icono: Users, esPanel: true },
  ];

  const visibles = seccionesAdmin.filter(s => s.roles.includes(usuario?.rol ?? ''));

  return (
    <div className="prolimal-page min-h-screen text-prolimal-ink-900 dark:text-prolimal-sand-50">
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-prolimal-ink-900/55 backdrop-blur-sm md:hidden dark:bg-prolimal-ink-900/55"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[17rem] flex flex-col justify-between bg-prolimal-ink-900 text-prolimal-sand-50 shadow-[20px_0_60px_-40px_rgba(11,37,32,0.8)] transition-transform duration-300 ${
          sidebarColapsado ? 'md:-translate-x-full' : 'md:translate-x-0'
        } ${menuOpen ? 'translate-x-0' : '-translate-x-full'} dark:bg-prolimal-ink-900 dark:text-prolimal-sand-50`}
      >
        <div className="flex h-[5.5rem] items-center justify-between gap-3 border-b dark:border-prolimal-sand-100/10 px-5">
          <Link href="/" className="flex min-w-0 items-center gap-3" onClick={() => setMenuOpen(false)}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-prolimal-sand-50 p-1.5">
              <img src="/logo.png" alt="Logo PROLIMAC" className="h-full w-full object-contain" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-extrabold tracking-[-0.03em]">PROLIMAC</span>
              <span className="prolimal-display truncate text-xs italic text-prolimal-teal-300">
                panel interno
              </span>
              {view === 'section' && (
                <button
                  type="button"
                  className="rounded-full p-2 text-prolimal-ink-600 transition-colors hover:bg-prolimal-sand-100 md:hidden flex items-center gap-2"
                  onClick={volverAlPanel}
                  aria-label="Volver al panel principal"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="text-xs font-medium">Volver</span>
                </button>
              )}
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-full p-2 text-prolimal-sand-100/70 transition-colors hover:dark:bg-prolimal-sand-100/10 hover:text-white md:hidden"
              onClick={() => setMenuOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="hidden rounded-full p-2 text-prolimal-sand-100/60 transition-colors hover:dark:bg-prolimal-sand-100/10 hover:text-white md:inline-flex"
              onClick={() => setSidebarColapsado(true)}
              aria-label="Colapsar menú"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 flex-1 flex flex-col" aria-label="Navegación administrativa">
          <p className="px-3 text-[9px] font-bold uppercase tracking-[0.22em] text-prolimal-sand-100/35">
            Operaciones
          </p>
          <div className="mt-3 space-y-1 flex-1">
            {visibles.map((seccion) => {
              const esActivo = pathname === seccion.href || pathname.startsWith(seccion.href + '/');
              const Icono = seccion.Icono;

              return (
                <Link
                  key={seccion.href}
                  href={seccion.href}
                  onClick={() => {
                    setSeccionActual(seccion.esPanel ? seccion.href : null);
                    setMenuOpen(false);
                    if (seccion.esPanel) setView('section');
                  }}
                  aria-current={esActivo ? 'page' : undefined}
                  className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition-colors ${
                    esActivo
                      ? 'dark:bg-prolimal-sand-100/10 text-prolimal-sand-50'
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
                    <Icono className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 truncate">{seccion.titulo}</span>
                  {esActivo && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-prolimal-coral-300" />}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="flex flex-col items-center gap-2 px-2 pt-2 p-4 mb-4">
          <div className="rounded-2xl bg-white/5 p-3 w-full">
            <p className="truncate text-sm font-extrabold text-prolimal-sand-50">
              {usuario?.nombre || 'Usuario'}
            </p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-prolimal-teal-300">
              {usuario?.rol || 'Sin rol'}
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full px-3 py-2.5 text-xs font-bold text-prolimal-sand-100/55 transition-colors hover:bg-white/5 hover:text-prolimal-sand-50 w-full"
          >
            <Store className="h-4 w-4" />
            Ir a la tienda
          </Link>
        </div>
      </aside>

      <main className={`min-h-screen px-4 py-6 transition-[margin-left] duration-300 sm:px-6 lg:px-10 lg:py-8 ${sidebarColapsado ? 'md:ml-0' : 'md:ml-[17rem]'}`}>
        <header className="mb-8 flex items-center justify-between gap-4">
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
              <h1 className="prolimal-display truncate text-2xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50 sm:text-3xl">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <DarkModeToggle />
            <div className="hidden items-center gap-2 rounded-full border border-prolimal-ink-900/10 bg-card px-3 py-1.5 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-prolimal-teal-100 text-xs font-extrabold text-prolimal-teal-800 dark:bg-prolimal-teal-900/40 dark:text-prolimal-teal-200">
                {usuario?.nombre?.charAt(0).toUpperCase() || '?'}
              </span>
              <span className="max-w-32 truncate text-xs font-bold text-prolimal-ink-600 dark:text-prolimal-sand-100">
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
