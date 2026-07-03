'use client';
'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCarrito } from '@/store/carrito';
import DarkModeToggle from './DarkModeToggle';

function getUsuarioFromStorage(): { nombre: string; rol: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const u = localStorage.getItem('usuario');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
}

function useAuth() {
  const [usuario, setUsuario] = useState<{ nombre: string; rol: string } | null>(null);

  useEffect(() => {
    setUsuario(getUsuarioFromStorage());
    const onAuth = () => setUsuario(getUsuarioFromStorage());
    window.addEventListener('auth-change', onAuth);
    window.addEventListener('storage', onAuth);
    return () => {
      window.removeEventListener('auth-change', onAuth);
      window.removeEventListener('storage', onAuth);
    };
  }, []);

  return usuario;
}

export default function Navbar() {
  const router = useRouter();
  const { items } = useCarrito();
  const [mounted, setMounted] = useState(false);
  const usuario = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const cantidadItems = mounted ? items.reduce((sum, i) => sum + i.cantidad, 0) : 0;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    document.cookie = 'token=; path=/; max-age=0';
    document.cookie = 'usuario=; path=/; max-age=0';
    window.dispatchEvent(new Event('auth-change'));
    router.push('/');
  };

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    if (busqueda.trim()) router.push(`/productos?q=${encodeURIComponent(busqueda.trim())}`);
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Barra principal */}
      <div className="bg-[#005a24] px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="shrink-0">
            <img src="/logo.png" alt="Logo" className="w-11 h-11 rounded-lg object-contain bg-white p-1" />
          </Link>

          {/* Buscador */}
          <form onSubmit={buscar} className="flex-1 hidden sm:flex">
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar productos de limpieza..."
              className="w-full px-4 py-2.5 rounded-l-lg text-sm outline-none bg-white text-gray-900 placeholder-gray-500"
            />
            <button type="submit" className="bg-[#ffd600] text-[#005a24] px-5 py-2.5 rounded-r-lg font-bold text-sm hover:bg-yellow-400">
              Buscar
            </button>
          </form>

          {/* Modo oscuro */}
          <DarkModeToggle />

          {/* Acciones */}
          <div className="hidden md:flex items-center gap-4 text-white text-sm">
            {usuario ? (
              <>
                <Link href="/cuenta/pedidos" className="hover:text-yellow-300 flex items-center gap-1">
                  <span className="text-lg">👤</span>
                  <div className="text-left leading-tight">
                    <p className="text-[10px] text-gray-300">Hola,</p>
                    <p className="font-medium text-xs truncate max-w-28">{usuario.nombre}</p>
                  </div>
                </Link>
                {(usuario.rol === 'admin' || usuario.rol === 'inventario' || usuario.rol === 'ventas') && (
                  <Link href="/admin" className="bg-[#ffd600] text-[#005a24] px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-yellow-400">
                    {usuario.rol === 'admin' ? 'ADMIN' : 'PANEL'}
                  </Link>
                )}
                <button onClick={cerrarSesion} className="text-red-200 hover:text-red-100 text-xs font-semibold bg-red-800/30 px-2.5 py-1 rounded-lg">
                  Cerrar sesión
                </button>
              </>
            ) : (
              <Link href="/auth" className="hover:text-yellow-300 flex items-center gap-1">
                <span className="text-lg">👤</span>
                <div className="text-left leading-tight">
                  <p className="text-[10px] text-gray-300">Hola,</p>
                  <p className="font-medium text-xs">Ingresá</p>
                </div>
              </Link>
            )}

            <Link href="/carrito" className="relative hover:text-yellow-300 flex items-center gap-1">
              <span className="text-lg">🛒</span>
              <div className="text-left leading-tight">
                <p className="text-[10px] text-gray-300">Carrito</p>
                {cantidadItems > 0 && (
                  <p className="font-medium text-xs">{cantidadItems} {cantidadItems === 1 ? 'item' : 'items'}</p>
                )}
              </div>
              {cantidadItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#ffd600] text-[#005a24] text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cantidadItems}
                </span>
              )}
            </Link>
          </div>

          {/* Menú móvil */}
          <button className="md:hidden text-white text-2xl" onClick={() => setMenuOpen(!menuOpen)}>
            ☰
          </button>
        </div>
      </div>

      {/* Menú móvil desplegable */}
      {menuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-lg px-4 py-3 space-y-2 text-sm">
          <form onSubmit={buscar} className="flex sm:hidden mb-2">
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              className="flex-1 border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            />
          </form>
          <Link href="/productos" className="block py-2 text-gray-600 dark:text-gray-300 font-medium" onClick={() => setMenuOpen(false)}>Productos</Link>
          {usuario ? (
            <>
              <p className="font-bold text-gray-800 dark:text-gray-100">Hola, {usuario.nombre}</p>
              {(usuario.rol === 'admin' || usuario.rol === 'inventario' || usuario.rol === 'ventas') && (
                <Link href="/admin" className="block py-2 text-[#005a24] dark:text-green-400 font-medium" onClick={() => setMenuOpen(false)}>Panel Admin</Link>
              )}
              <Link href="/cuenta/pedidos" className="block py-2 text-gray-600 dark:text-gray-300" onClick={() => setMenuOpen(false)}>Mis pedidos</Link>
              <Link href="/carrito" className="block py-2 text-gray-600 dark:text-gray-300" onClick={() => setMenuOpen(false)}>Carrito ({cantidadItems})</Link>
              <button onClick={cerrarSesion} className="block py-2 text-red-600 dark:text-red-400 font-medium">Cerrar sesión</button>
            </>
          ) : (
            <>
              <Link href="/auth" className="block py-2 text-[#005a24] dark:text-green-400 font-medium" onClick={() => setMenuOpen(false)}>Iniciar sesión</Link>
              <Link href="/carrito" className="block py-2 text-gray-600 dark:text-gray-300" onClick={() => setMenuOpen(false)}>Carrito</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
