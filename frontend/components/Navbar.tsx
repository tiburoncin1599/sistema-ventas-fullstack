'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, Search, ShoppingCart, User, X } from 'lucide-react';
import { cerrarSesion } from '@/lib/api';
import { esRol, etiquetaRol, normalizarRol } from '@/lib/roles';
import { useCarrito } from '@/store/carrito';
import DarkModeToggle from './DarkModeToggle';
import CarritoDrawer from './CarritoDrawer';
import MenuMovil from './MenuMovil';

interface Usuario {
  nombre: string;
  rol: string;
}

const WHATSAPP_NUMERO = process.env.NEXT_PUBLIC_WHATSAPP || '59170000000';

function getUsuarioFromStorage(): Usuario | null {
  if (typeof window === 'undefined') return null;
  try {
    const u = localStorage.getItem('usuario');
    if (!u) return null;
    const datos = JSON.parse(u) as Usuario;
    return { ...datos, rol: normalizarRol(datos.rol) };
  } catch {
    return null;
  }
}

function useAuth() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    const actualizar = () => setUsuario(getUsuarioFromStorage());
    actualizar();
    window.addEventListener('auth-change', actualizar);
    window.addEventListener('storage', actualizar);
    return () => {
      window.removeEventListener('auth-change', actualizar);
      window.removeEventListener('storage', actualizar);
    };
  }, []);

  return usuario;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const usuario = useAuth();
  const { items } = useCarrito();
  const [busqueda, setBusqueda] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  const cantidadItems = usuario ? items.reduce((sum, i) => sum + i.cantidad, 0) : 0;
  const puedeComprar = Boolean(usuario);
  const inicialUsuario = usuario?.nombre?.charAt(0).toUpperCase() || '?';

  const cerrarMenu = useCallback(() => setMenuOpen(false), []);
  const cerrarCarrito = useCallback(() => setCarritoAbierto(false), []);

  useEffect(() => {
    const cerrarDrawers = () => {
      setMenuOpen(false);
      setCarritoAbierto(false);
    };
    window.addEventListener('popstate', cerrarDrawers);
    return () => window.removeEventListener('popstate', cerrarDrawers);
  }, []);

  const buscar = (event: React.FormEvent) => {
    event.preventDefault();
    const q = busqueda.trim();
    router.push(q ? `/productos?q=${encodeURIComponent(q)}` : '/productos');
  };

  const salir = async () => {
    cerrarMenu();
    cerrarCarrito();
    await cerrarSesion();
    router.push('/');
  };

  const abrirCarrito = () => {
    cerrarMenu();
    setCarritoAbierto(true);
  };

  const enlaces: { href: string; label: string }[] = [
    { href: '/', label: 'Inicio' },
    { href: '/productos', label: 'Productos' },
  ];

  if (esRol(usuario?.rol, 'admin')) {
    enlaces.push({ href: '/admin', label: 'Panel' });
    // El POS `/ventas` es exclusivo del rol ventas: el admin usa su panel.
    enlaces.push({ href: '/admin/ventas', label: 'Ventas' });
    enlaces.push({ href: '/admin/rendimiento', label: 'Rendimiento' });
    enlaces.push({ href: '/admin/deudas', label: 'Deudas' });
  } else if (esRol(usuario?.rol, 'inventario')) {
    enlaces.push({ href: '/admin/inventario', label: 'Inventario' });
    enlaces.push({ href: '/admin/deudas', label: 'Deudas' });
  } else if (esRol(usuario?.rol, 'ventas')) {
    enlaces.push({ href: '/ventas', label: 'Ventas' });
    enlaces.push({ href: '/ventas/rendimiento', label: 'Rendimiento' });
    enlaces.push({ href: '/ventas/deudas', label: 'Deudas' });
  }

  const esRutaActiva = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  const claseEnlace = (href: string) =>
    `inline-flex items-center rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors ${
      esRutaActiva(href)
        ? 'bg-prolimal-ink-900 text-prolimal-sand-50 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
        : 'text-prolimal-ink-600 hover:bg-prolimal-teal-50 hover:text-prolimal-teal-800 dark:text-prolimal-ink-200 dark:hover:bg-prolimal-teal-900/25 dark:hover:text-prolimal-teal-200'
    }`;

  return (
    <>
      <div className="bg-prolimal-ink-900 text-prolimal-sand-100">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between gap-4 px-4 text-[9px] font-bold uppercase tracking-[0.22em] sm:px-6 lg:px-8">
          <span className="hidden sm:inline">Cochabamba · Bolivia</span>
          <a
            href={`https://wa.me/${WHATSAPP_NUMERO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-prolimal-teal-300"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-prolimal-teal-400" aria-hidden="true" />
            Pedidos por WhatsApp
          </a>
          <span className="hidden md:inline">Limpieza para hogar, oficina y empresa</span>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-prolimal-ink-900/10 bg-[#F7F5EF]/85 backdrop-blur-xl supports-[backdrop-filter]:bg-[#F7F5EF]/72 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-900/88 dark:supports-[backdrop-filter]:bg-prolimal-ink-900/78">
        <div className="mx-auto flex h-[5.5rem] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3" onClick={cerrarMenu}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-prolimal-sand-50 p-1.5 dark:bg-prolimal-ink-900/30 shadow-[0_10px_30px_-20px_rgba(11,37,32,0.8)] ring-1 ring-prolimal-ink-900/10 dark:bg-prolimal-sand-50 dark:ring-prolimal-sand-100/15">
              <img src="/logo.png" alt="Logo PROLIMAC" className="h-full w-full object-contain" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-lg font-extrabold tracking-[-0.045em] text-prolimal-ink-900 transition-colors hover:text-prolimal-teal-700 dark:text-prolimal-sand-50 dark:hover:text-prolimal-teal-300">
                PROLIMAC
              </span>
              <span className="prolimal-display hidden truncate text-[13px] italic leading-none text-prolimal-ink-500 dark:text-prolimal-ink-300 sm:block">
                limpieza que respira
              </span>
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
            {enlaces.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                aria-current={esRutaActiva(enlace.href) ? 'page' : undefined}
                className={claseEnlace(enlace.href)}
              >
                {enlace.label}
              </Link>
            ))}
          </nav>

          <form onSubmit={buscar} className="ml-auto hidden min-w-0 md:block" role="search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400 dark:text-prolimal-ink-300" />
              <input
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar en el catálogo"
                aria-label="Buscar productos"
                className="prolimal-search-input md:w-48 xl:w-64"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <DarkModeToggle />

            {puedeComprar && (
              <button
                type="button"
                onClick={abrirCarrito}
                aria-label={`Abrir carrito${cantidadItems > 0 ? `, ${cantidadItems} artículos` : ''}`}
                className="prolimal-icon-btn"
              >
                <ShoppingCart className="h-5 w-5" />
                {cantidadItems > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-prolimal-teal-700 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#F7F5EF] dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900 dark:ring-prolimal-ink-900">
                    {cantidadItems > 99 ? '99+' : cantidadItems}
                  </span>
                )}
              </button>
            )}

            <div className="hidden items-center gap-1 lg:flex">
              {usuario ? (
                <>
                  <Link
                    href="/cuenta"
                    className="flex items-center gap-2 rounded-full px-2 py-1.5 transition-colors hover:bg-prolimal-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prolimal-teal-500 dark:hover:bg-prolimal-ink-800"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-prolimal-ink-900 text-sm font-bold text-prolimal-sand-50 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900">
                      {inicialUsuario}
                    </span>
                    <span className="hidden max-w-32 flex-col text-left xl:flex">
                      <span className="truncate text-sm font-bold text-prolimal-ink-800 dark:text-prolimal-sand-50">
                        {usuario.nombre}
                      </span>
                      <span className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                        {etiquetaRol(usuario.rol)}
                      </span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={salir}
                    aria-label="Cerrar sesión"
                    title="Cerrar sesión"
                    className="rounded-full p-2.5 text-prolimal-ink-500 transition-colors hover:bg-prolimal-red-50 hover:text-prolimal-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prolimal-red-400 dark:text-prolimal-ink-300 dark:hover:bg-prolimal-red-900/30 dark:hover:text-prolimal-red-400"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <Link href="/auth" className="prolimal-btn-primary whitespace-nowrap px-5 py-2.5">
                  <User className="h-4 w-4" />
                  Ingresar
                </Link>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen((abierto) => !abierto)}
              aria-expanded={menuOpen}
              aria-controls="menu-movil"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="prolimal-icon-btn lg:hidden"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      <MenuMovil
        abierto={menuOpen}
        onCerrar={cerrarMenu}
        usuario={usuario}
        enlaces={enlaces}
        cantidadItems={cantidadItems}
        onAbrirCarrito={abrirCarrito}
        onSalir={salir}
      />

      <CarritoDrawer abierto={carritoAbierto} onCerrar={cerrarCarrito} />
    </>
  );
}
