'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

function getUsuarioFromStorage(): { nombre: string; rol: string } | null {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('usuario');
  return u ? JSON.parse(u) : null;
}

const seccionesAdmin = [
  { href: '/admin/productos', titulo: 'Productos', desc: 'Crear, editar y desactivar productos del catálogo', roles: ['admin', 'inventario'] },
  { href: '/admin/inventario', titulo: 'Inventario', desc: 'Controlar stock y cantidades mínimas', roles: ['admin', 'inventario'] },
  { href: '/admin/pedidos', titulo: 'Pedidos', desc: 'Administrar pedidos de clientes', roles: ['admin', 'inventario'] },
  { href: '/admin/ventas', titulo: 'Ventas', desc: 'Historial de ventas del personal', roles: ['admin', 'inventario', 'ventas'] },
  { href: '/admin/deudas', titulo: 'Deudas', desc: 'Deudas del personal y generación de facturas', roles: ['admin', 'inventario', 'ventas'] },
  { href: '/admin/usuarios', titulo: 'Usuarios', desc: 'Gestionar empleados y asignar roles (ventas, inventario)', roles: ['admin'] },
  { href: '/admin/clientes', titulo: 'Clientes', desc: 'Registrar y administrar clientes', roles: ['admin'] },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    productos: 0,
    pedidos: 0,
    alertas: 0,
    usuarios: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState<{ nombre: string; rol: string } | null>(null);
  const esAdmin = usuario?.rol === 'admin';

  useEffect(() => {
    const u = getUsuarioFromStorage();
    setUsuario(u);
    const peticiones: Promise<any>[] = [
      api.get('/productos'),
      api.get('/pedidos'),
      api.get('/inventario/alertas'),
    ];
    if (u?.rol === 'admin') {
      peticiones.push(api.get('/usuarios'));
    }
    Promise.all(peticiones).then(([productos, pedidos, alertas, usuarios]) => {
      setStats({
        productos: productos.data.length,
        pedidos: pedidos.data.length,
        alertas: alertas.data.length,
        usuarios: usuarios ? usuarios.data.length : 0,
      });
    }).finally(() => setCargando(false));
  }, []);

  const secciones = seccionesAdmin.filter(s => usuario && s.roles.includes(usuario.rol));

  if (cargando) return <p className="text-center py-20 text-gray-500 dark:text-gray-400">Cargando panel...</p>;

  return (
    <main className="max-w-6xl mx-auto px-8 py-12">
      <h1 className="text-3xl font-bold mb-8 dark:text-white">Panel de Administración</h1>

      <div className={`grid grid-cols-1 ${esAdmin ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6 mb-12`}>
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
          <p className="text-blue-600 dark:text-blue-400 font-medium mb-1">Productos activos</p>
          <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">{stats.productos}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-2xl p-6">
          <p className="text-green-600 dark:text-green-400 font-medium mb-1">Pedidos totales</p>
          <p className="text-4xl font-bold text-green-700 dark:text-green-300">{stats.pedidos}</p>
        </div>
        <div className={`rounded-2xl p-6 border ${stats.alertas > 0 ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
          <p className={`font-medium mb-1 ${stats.alertas > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
            Alertas de stock
          </p>
          <p className={`text-4xl font-bold ${stats.alertas > 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
            {stats.alertas}
          </p>
        </div>
        {esAdmin && (
          <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-2xl p-6">
            <p className="text-purple-600 dark:text-purple-400 font-medium mb-1">Usuarios registrados</p>
            <p className="text-4xl font-bold text-purple-700 dark:text-purple-300">{stats.usuarios}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {secciones.map(s => (
          <Link key={s.href} href={s.href}
            className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
            <h2 className="text-xl font-bold mb-2 dark:text-white">{s.titulo}</h2>
            <p className="text-gray-500 dark:text-gray-400">{s.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
