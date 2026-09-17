'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cerrarSesion } from '@/lib/api';

const tabs = [
  { href: '/ventas', label: 'Dashboard', exact: true },
  { href: '/ventas/clientes', label: 'Clientes' },
  { href: '/ventas/nuevo-pedido', label: 'Nuevo Pedido' },
  { href: '/ventas/pedidos', label: 'Pedidos' },
  { href: '/ventas/deudas', label: 'Deudas' },
  { href: '/ventas/rendimiento', label: 'Mi Rendimiento' },
];

export default function VentasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    try {
      const u = localStorage.getItem('usuario');
      setNombre(u ? JSON.parse(u)?.nombre || '' : ''); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {}
  }, []);

  if (pathname === '/ventas/login') {
    return <>{children}</>;
  }

  const cerrarSesionHandler = async () => {
    await cerrarSesion();
    router.push('/ventas/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl font-bold text-[#005a24] dark:text-green-400">
                Portal de Ventas
              </span>
              {nombre && (
                <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                  · {nombre}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <nav className="flex items-center gap-1 overflow-x-auto min-w-0">
                {tabs.map(t => {
                  const activo = t.exact
                    ? pathname === t.href
                    : pathname.startsWith(t.href);
                  return (
                    <Link
                      key={t.href}
                      href={t.href}
                      className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activo
                          ? 'bg-[#005a24] text-white'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {t.label}
                    </Link>
                  );
                })}
              </nav>
              <button
                onClick={cerrarSesionHandler}
                className="shrink-0 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
