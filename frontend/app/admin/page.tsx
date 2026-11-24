'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  BellRing,
  Boxes,
  ClipboardList,
  List,
  MapPin,
  Package,
  Store,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { esRol, etiquetaRol, normalizarRol } from '@/lib/roles';

interface UsuarioAdmin {
  nombre: string;
  rol: string;
}

interface SeccionAdmin {
  href: string;
  titulo: string;
  desc: string;
  roles: string[];
  Icono: LucideIcon;
}

function parseUsuario(raw: string | null): UsuarioAdmin | null {
  if (!raw) return null;
  try {
    const datos = JSON.parse(raw) as UsuarioAdmin;
    return { ...datos, rol: normalizarRol(datos.rol) };
  } catch {
    return null;
  }
}

function suscribirUsuario(onChange: () => void) {
  window.addEventListener('auth-change', onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener('auth-change', onChange);
    window.removeEventListener('storage', onChange);
  };
}

function obtenerUsuarioRaw() {
  return localStorage.getItem('usuario');
}

function obtenerUsuarioServidor() {
  return null;
}

const seccionesAdmin: SeccionAdmin[] = [
  { href: '/admin/productos', titulo: 'Productos', desc: 'Crear, editar y desactivar productos del catálogo', roles: ['admin', 'inventario'], Icono: Package },
  { href: '/admin/inventario', titulo: 'Inventario', desc: 'Controlar stock y cantidades mínimas', roles: ['admin', 'inventario'], Icono: Boxes },
  { href: '/admin/kardex', titulo: 'Kardex', desc: 'Entradas, salidas y saldos de inventario', roles: ['admin', 'inventario'], Icono: ArrowLeftRight },
  { href: '/admin/notificaciones', titulo: 'Notificaciones', desc: 'Avisos activos e historial de envíos', roles: ['admin', 'inventario', 'ventas'], Icono: BellRing },
  { href: '/admin/pedidos', titulo: 'Pedidos', desc: 'Administrar pedidos de clientes', roles: ['admin', 'inventario'], Icono: ClipboardList },
  { href: '/admin/listado-pedidos', titulo: 'Listado de pedidos', desc: 'Ver fecha, monto y estado de todos los pedidos', roles: ['admin', 'inventario'], Icono: List },
  { href: '/admin/ubicaciones', titulo: 'Ubicaciones', desc: 'Seguimiento de vendedores en el mapa', roles: ['admin', 'inventario'], Icono: MapPin },
  { href: '/admin/clientes', titulo: 'Clientes', desc: 'Registrar y administrar clientes', roles: ['admin'], Icono: Users },
  { href: '/admin/usuarios', titulo: 'Usuarios', desc: 'Gestionar empleados y asignar roles', roles: ['admin'], Icono: UserCog },
  { href: '/admin/ventas', titulo: 'Ventas', desc: 'Ventas y comprobantes del equipo', roles: ['admin', 'inventario', 'ventas'], Icono: Store },
  { href: '/admin/deudas', titulo: 'Deudas', desc: 'Deudas del personal y generación de facturas', roles: ['admin', 'inventario', 'ventas'], Icono: Wallet },
  { href: '/admin/reportes', titulo: 'Reportes', desc: 'Ventas, ganancias e inventario con exportación', roles: ['admin'], Icono: BarChart3 },
  { href: '/admin/rendimiento', titulo: 'Rendimiento', desc: 'Gráficas semanales y mensuales de ventas por vendedor', roles: ['admin'], Icono: BarChart3 },
];

export default function AdminDashboard() {
  const usuarioRaw = useSyncExternalStore(
    suscribirUsuario,
    obtenerUsuarioRaw,
    obtenerUsuarioServidor,
  );
  const usuario = parseUsuario(usuarioRaw);
  const rol = usuario?.rol;
  const esAdmin = esRol(rol, 'admin');
  const [stats, setStats] = useState({
    productos: 0,
    pedidos: 0,
    alertas: 0,
    usuarios: 0,
  });
  const [errorConexion, setErrorConexion] = useState(false);

  useEffect(() => {
    if (!rol) return;

    let activo = true;
    const peticiones = [
      api.get<unknown[]>('/productos'),
      api.get<unknown[]>('/pedidos'),
    ];
    if (esRol(rol, 'admin', 'inventario')) {
      peticiones.push(api.get<unknown[]>('/inventario/alertas'));
    }
    if (esRol(rol, 'admin')) {
      peticiones.push(api.get<unknown[]>('/usuarios'));
    }

    Promise.all(peticiones)
      .then(([productos, pedidos, alertas, usuarios]) => {
        if (!activo) return;
        setStats({
          productos: productos.data.length,
          pedidos: pedidos.data.length,
          alertas: alertas ? alertas.data.length : 0,
          usuarios: usuarios ? usuarios.data.length : 0,
        });
        setErrorConexion(false);
      })
      .catch(() => {
        if (activo) setErrorConexion(true);
      });

    return () => {
      activo = false;
    };
  }, [rol]);

  const tarjetas = [
    { label: 'Productos activos', value: stats.productos, Icono: Package, tono: 'teal' },
    { label: 'Pedidos totales', value: stats.pedidos, Icono: ClipboardList, tono: 'sand' },
    { label: 'Alertas de stock', value: stats.alertas, Icono: AlertTriangle, tono: 'coral' },
    ...(esAdmin ? [{ label: 'Usuarios registrados', value: stats.usuarios, Icono: Users, tono: 'ink' }] : []),
  ];

  return (
    <div className="pb-10">
      <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="prolimal-eyebrow">Resumen operativo</p>
          <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200">
            Todo lo que necesitás para gestionar productos, pedidos y personas desde un solo lugar.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-prolimal-ink-900/10 bg-card px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-500 dark:border-prolimal-sand-100/10 dark:bg-card-dark dark:text-prolimal-ink-200">
          <span className="h-1.5 w-1.5 rounded-full bg-prolimal-teal-500" />
          {etiquetaRol(rol)}
        </span>
      </section>

      {errorConexion && (
        <div className="mb-8 rounded-[2rem] border border-prolimal-red-300/60 bg-prolimal-red-50 p-5 dark:border-prolimal-red-700/40 dark:bg-prolimal-red-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-prolimal-red-600 dark:text-prolimal-red-300" />
            <div>
              <p className="font-extrabold text-prolimal-red-800 dark:text-prolimal-red-100">
                No se pudo conectar con el servidor
              </p>
              <p className="mt-1 text-sm font-medium text-prolimal-red-700/80 dark:text-prolimal-red-200/80">
                Verificá que el backend esté corriendo y refrescá esta página.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map(({ label, value, Icono, tono }, index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.05 }}
            className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                tono === 'teal'
                  ? 'bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300'
                  : tono === 'coral'
                    ? 'bg-prolimal-coral-100 text-prolimal-coral-700 dark:bg-prolimal-coral-900/25 dark:text-prolimal-coral-300'
                    : tono === 'sand'
                      ? 'bg-prolimal-sand-200 text-prolimal-sand-800 dark:bg-prolimal-sand-900/30 dark:text-prolimal-sand-200'
                      : 'bg-prolimal-ink-100 text-prolimal-ink-700 dark:bg-prolimal-ink-800 dark:text-prolimal-ink-200'
              }`}
            >
              <Icono className="h-5 w-5" />
            </span>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
              {label}
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-[-0.05em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
              {value}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="prolimal-eyebrow">Accesos rápidos</p>
          <h2 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
            ¿Qué querés gestionar?
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {seccionesAdmin
          .filter((seccion) => esRol(rol, ...seccion.roles))
          .map(({ href, titulo, desc, Icono }, index) => (
            <motion.div
              key={href}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
            >
              <Link
                href={href}
                className="group flex h-full flex-col rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-50px_rgba(11,37,32,0.4)] transition-all duration-300 hover:-translate-y-1 hover:border-prolimal-teal-500/40 hover:shadow-[0_30px_70px_-45px_rgba(11,37,32,0.5)] dark:border-prolimal-sand-100/10 dark:bg-card-dark dark:hover:border-prolimal-teal-500/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-prolimal-sand-100 text-prolimal-ink-600 transition-colors group-hover:bg-prolimal-teal-100 group-hover:text-prolimal-teal-700 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100 dark:group-hover:bg-prolimal-teal-900/30 dark:group-hover:text-prolimal-teal-300">
                    <Icono className="h-4 w-4" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-prolimal-ink-300 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-prolimal-teal-600 dark:text-prolimal-ink-500 dark:group-hover:text-prolimal-teal-300" />
                </div>
                <h3 className="mt-5 text-base font-extrabold tracking-[-0.02em] text-prolimal-ink-800 transition-colors group-hover:text-prolimal-teal-700 dark:text-prolimal-sand-50 dark:group-hover:text-prolimal-teal-300">
                  {titulo}
                </h3>
                <p className="mt-1 text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200">
                  {desc}
                </p>
              </Link>
            </motion.div>
          ))}
      </div>
    </div>
  );
}
