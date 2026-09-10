'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';

const MapaCliente = dynamic(() => import('@/components/MapaCliente'), {
  ssr: false,
  loading: () => (
    <p className="text-sm text-gray-400 dark:text-gray-500">Cargando mapa...</p>
  ),
});

interface Cliente {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;
  ubicacion?: string;
  activo: boolean;
}

interface Pedido {
  id: number;
  estado: string;
  total: number;
  usuario?: { nombre?: string };
}

const DIAS = [
  { valor: 'lunes', etiqueta: 'Lun' },
  { valor: 'martes', etiqueta: 'Mar' },
  { valor: 'miercoles', etiqueta: 'Mié' },
  { valor: 'jueves', etiqueta: 'Jue' },
  { valor: 'viernes', etiqueta: 'Vie' },
  { valor: 'sabado', etiqueta: 'Sáb' },
  { valor: 'domingo', etiqueta: 'Dom' },
];

interface PuntoGps {
  latitud: number;
  longitud: number;
  precision: number | null;
}

export default function VentasClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteExistente, setClienteExistente] = useState<Cliente | null>(null);
  const [form, setForm] = useState({ nombre: '', telefono: '', ubicacion: '' });
  const [diasVisita, setDiasVisita] = useState<string[]>([]);
  const [pedidoId, setPedidoId] = useState('');
  const [gps, setGps] = useState<PuntoGps | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const [resC, resP] = await Promise.all([
        api.get('/clientes'),
        api.get('/pedidos').catch(() => ({ data: [] })),
      ]);
      setClientes(resC.data || []);
      const lista = Array.isArray(resP.data) ? resP.data : [];
      setPedidos(
        lista.filter((p: Pedido) => p.estado === 'pendiente' || p.estado === 'confirmado'),
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirNuevo = () => {
    setClienteExistente(null);
    setForm({ nombre: '', telefono: '', ubicacion: '' });
    resetearGps();
    setDiasVisita([]);
    setPedidoId('');
    setModalAbierto(true);
  };

  const abrirAsignarGps = (c: Cliente) => {
    setClienteExistente(c);
    setForm({
      nombre: c.nombre,
      telefono: c.telefono || '',
      ubicacion: c.ubicacion || '',
    });
    resetearGps();
    setDiasVisita([]);
    setPedidoId('');
    setModalAbierto(true);
  };

  const resetearGps = () => {
    setGps(null);
  };

  const toggleDia = (dia: string) => {
    setDiasVisita(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia],
    );
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return alert('Ingresá el nombre del cliente.');
    if (diasVisita.length === 0) return alert('Seleccioná al menos un día de visita.');
    if (!gps) return alert('Ubicá al cliente en el mapa o usá tu ubicación actual antes de guardar.');

    setGuardando(true);
    try {
      let clienteId = clienteExistente?.id;
      if (!clienteId) {
        const res = await api.post('/clientes', form);
        clienteId = res.data?.id;
      } else {
        await api.put(`/clientes/${clienteId}`, form);
      }

      await api.post('/ubicaciones/clientes-visitas', {
        nombreCliente: form.nombre.trim(),
        latitud: gps.latitud,
        longitud: gps.longitud,
        accuracy: gps.precision ?? undefined,
        clienteId: clienteId ?? undefined,
        pedidoId: pedidoId ? Number(pedidoId) : undefined,
        diasVisita,
      });

      setModalAbierto(false);
      await cargar();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Error al guardar.';
      alert(msg);
    } finally {
      setGuardando(false);
    }
  };

  const filtrados = clientes.filter(
    c =>
      !busqueda.trim() ||
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.telefono || '').includes(busqueda),
  );

  if (cargando) {
    return (
      <p className="text-center py-20 text-gray-500 dark:text-gray-400">
        Cargando clientes...
      </p>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Mis clientes</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''} · registrá
            nuevos con ubicación GPS y días de visita
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="bg-[#005a24] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#003e19]"
        >
          + Nuevo cliente con GPS
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar por nombre o teléfono..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="w-full max-w-md mb-6 border dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white"
      />

      {filtrados.length === 0 ? (
        <p className="text-center py-20 text-gray-500 dark:text-gray-400">
          No hay clientes para mostrar.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map(c => (
            <div
              key={c.id}
              className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold shrink-0">
                  {c.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">
                    {c.nombre}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {c.email}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                {c.telefono && <span>📞 {c.telefono}</span>}
                {c.ubicacion && <span className="truncate">📍 {c.ubicacion}</span>}
              </div>
              <button
                onClick={() => abrirAsignarGps(c)}
                className="mt-4 w-full border border-[#005a24]/30 dark:border-green-800 text-[#005a24] dark:text-green-400 rounded-xl py-2 text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/30"
              >
                📍 Registrar punto GPS de visita
              </button>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-50 px-4"
          onClick={() => setModalAbierto(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-1 dark:text-white">
              {clienteExistente ? 'Registrar punto de visita' : 'Nuevo cliente'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {clienteExistente
                ? `Asignale una ubicación GPS y días de visita a ${clienteExistente.nombre}.`
                : 'Completá los datos y ubicá al cliente en el mapa.'}
            </p>

            <div className="space-y-4">
              {!clienteExistente && (
                <>
                  <input
                    placeholder="Nombre del cliente *"
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                    className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      placeholder="Teléfono"
                      value={form.telefono}
                      onChange={e => setForm({ ...form, telefono: e.target.value })}
                      className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <input
                    placeholder="Dirección de referencia"
                    value={form.ubicacion}
                    onChange={e => setForm({ ...form, ubicacion: e.target.value })}
                    className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white"
                  />
                </>
              )}

              <div>
                <p className="text-sm font-medium mb-2 dark:text-white">
                  Días de visita *
                </p>
                <div className="flex flex-wrap gap-2">
                  {DIAS.map(d => {
                    const activo = diasVisita.includes(d.valor);
                    return (
                      <button
                        key={d.valor}
                        type="button"
                        onClick={() => toggleDia(d.valor)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                          activo
                            ? 'bg-[#005a24] text-white border-[#005a24]'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        {d.etiqueta}
                      </button>
                    );
                  })}
                </div>
              </div>

              <MapaCliente gps={gps} onChange={setGps} />

              {pedidos.length > 0 && (
                <div>
                  <label className="text-sm font-medium block mb-2 dark:text-white">
                    Pedido asociado (opcional)
                  </label>
                  <select
                    value={pedidoId}
                    onChange={e => setPedidoId(e.target.value)}
                    className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">— Sin pedido asociado —</option>
                    {pedidos.map(p => (
                      <option key={p.id} value={p.id}>
                        #{p.id} · {p.estado} · {p.usuario?.nombre || 'Cliente'} ·{' '}
                        Bs {Number(p.total).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex-1 bg-[#005a24] text-white py-3 rounded-xl font-medium hover:bg-[#003e19] disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setModalAbierto(false)}
                className="flex-1 border dark:border-gray-600 py-3 rounded-xl font-medium dark:text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
