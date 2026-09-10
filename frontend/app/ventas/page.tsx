'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface RutaCliente {
  id: number;
  nombre_cliente: string;
  cliente_id?: number | null;
  latitud: number;
  longitud: number;
  precision?: number | null;
  dias_visita: string[];
}

interface Cliente {
  id: number;
  nombre: string;
  telefono?: string;
}

const DIAS_SEMANA = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
];

export default function VentasDashboard() {
  const [stats, setStats] = useState({
    rutahoy: 0,
    pedidosPendientes: 0,
    montoPendiente: 0,
  });
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ruta, setRuta] = useState<RutaCliente[]>([]);
  const [hoyDia] = useState(() => DIAS_SEMANA[new Date().getDay()]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [tracking, setTracking] = useState<boolean | null>(null);

  useEffect(() => {
    api
      .get('/ubicaciones/mi-estado')
      .then(res => setTracking(!!res.data?.activo))
      .catch(() => setTracking(false));

    Promise.all([
      api.get('/clientes').catch(() => ({ data: [] })),
      api.get(`/ubicaciones/vendedores/${getUsuarioId()}/clientes-visitas`).catch(() => ({ data: [] })),
      api.get('/pedidos?estado=pendiente').catch(() => ({ data: [] })),
    ])
      .then(([clientesRes, rutaRes, pedidos]) => {
        const listaClientes = Array.isArray(clientesRes.data) ? clientesRes.data : [];
        const listaRuta = Array.isArray(rutaRes.data) ? rutaRes.data : [];
        const pendientes = Array.isArray(pedidos.data) ? pedidos.data : [];
        setClientes(listaClientes);
        setRuta(listaRuta);
        setStats({
          rutahoy: listaRuta.filter(c => (c.dias_visita || []).includes(hoyDia)).length,
          pedidosPendientes: pendientes.length,
          montoPendiente: pendientes.reduce((s: number, p: { total?: number }) => s + Number(p.total || 0), 0),
        });
      })
      .finally(() => setCargando(false));
  }, [hoyDia]);

  const rutaHoy = ruta.filter(c => (c.dias_visita || []).includes(hoyDia));

  const alternarTracking = async () => {
    const nuevo = !tracking;
    try {
      await api.post('/ubicaciones/tracking', { activo: nuevo });
      setTracking(nuevo);
    } catch {
      alert('No se pudo cambiar el seguimiento de ubicación.');
    }
  };

  const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  if (cargando) {
    return (
      <p className="text-center py-20 text-gray-500 dark:text-gray-400">
        Cargando panel...
      </p>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Mi jornada</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Resumen de tu actividad comercial de hoy
          </p>
        </div>
        <button
          onClick={alternarTracking}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
            tracking
              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-800'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border dark:border-gray-600'
          }`}
        >
          {tracking ? '📍 Compartiendo ubicación' : '📍 Ubicación pausada'}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
          <p className="text-blue-600 dark:text-blue-400 font-medium mb-1 text-sm">Clientes registrados</p>
          <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">{clientes.length}</p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-2xl p-6 text-left hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
        >
          <p className="text-purple-600 dark:text-purple-400 font-medium mb-1 text-sm">
            Visitas con GPS hoy
          </p>
          <p className="text-4xl font-bold text-purple-700 dark:text-purple-300">{stats.rutahoy}</p>
          <p className="text-xs text-purple-500 dark:text-purple-400 mt-2">
            Ver tu ruta de {capitalizar(hoyDia)} →
          </p>
        </button>
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6">
          <p className="text-yellow-600 dark:text-yellow-400 font-medium mb-1 text-sm">Pedidos pendientes</p>
          <p className="text-4xl font-bold text-yellow-700 dark:text-yellow-300">{stats.pedidosPendientes}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-2xl p-6">
          <p className="text-green-600 dark:text-green-400 font-medium mb-1 text-sm">Monto por cobrar</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-2">
            {formatCurrency(stats.montoPendiente)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/ventas/clientes"
          className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow"
        >
          <h2 className="text-xl font-bold mb-2 dark:text-white">🧑‍🤝‍🧑 Clientes</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Registrá clientes con su ubicación GPS y días de visita.
          </p>
        </Link>
        <Link
          href="/ventas/pedidos"
          className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow"
        >
          <h2 className="text-xl font-bold mb-2 dark:text-white">📦 Pedidos</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Consultá y actualizá el estado de los pedidos.
          </p>
        </Link>
        <Link
          href="/ventas/rendimiento"
          className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow"
        >
          <h2 className="text-xl font-bold mb-2 dark:text-white">📊 Mi Rendimiento</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Visualizá tus ventas de la semana y el mes con gráficas.
          </p>
        </Link>
      </div>

      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setModalAbierto(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold dark:text-white">
                  Ruta de hoy · {capitalizar(hoyDia)}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {rutaHoy.length} cliente{rutaHoy.length !== 1 ? 's' : ''} que te toca visitar
                </p>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="w-9 h-9 rounded-lg text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xl leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {rutaHoy.length === 0 ? (
                <p className="text-center py-14 text-gray-400 dark:text-gray-500">
                  Hoy no tenés clientes asignados en tu ruta.
                </p>
              ) : (
                <ul className="space-y-3">
                  {rutaHoy.map(v => {
                    const c = clientes.find(x => x.id === v.cliente_id);
                    return (
                      <li
                        key={v.id}
                        className="border dark:border-gray-600 rounded-2xl p-4 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold dark:text-white truncate">
                            📍 {v.nombre_cliente}
                          </p>
                          {c?.telefono && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              📞 {c.telefono}
                            </p>
                          )}
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 truncate">
                            Días: {v.dias_visita.map(capitalizar).join(', ')}
                          </p>
                        </div>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${v.latitud},${v.longitud}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 bg-[#005a24] text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-[#003e19]"
                        >
                          🗺️ Cómo llegar
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function getUsuarioId(): string {
  if (typeof window === 'undefined') return '0';
  try {
    const u = localStorage.getItem('usuario');
    return u ? String(JSON.parse(u)?.id ?? 0) : '0';
  } catch {
    return '0';
  }
}