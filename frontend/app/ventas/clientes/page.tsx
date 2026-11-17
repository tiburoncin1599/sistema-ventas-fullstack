'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { MapPin, Phone, Plus, Search, X } from 'lucide-react';

const MapaCliente = dynamic(() => import('@/components/MapaCliente'), {
  ssr: false,
  loading: () => (
    <p className="text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">Cargando mapa...</p>
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
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          Cargando clientes...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="prolimal-eyebrow">Cartera</p>
          <h1 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
            Mis clientes
          </h1>
          <p className="mt-2 text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
            {filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''} · ubicación GPS y días de visita
          </p>
        </div>
        <button onClick={abrirNuevo} className="prolimal-btn-primary">
          <Plus className="h-4 w-4" />
          Nuevo cliente con GPS
        </button>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400 dark:text-prolimal-ink-300" />
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="prolimal-search-input"
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          No hay clientes para mostrar.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map(c => (
            <article
              key={c.id}
              className="flex flex-col rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-prolimal-teal-100 text-sm font-extrabold text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300">
                  {c.nombre.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-prolimal-ink-900 dark:text-prolimal-sand-50">{c.nombre}</p>
                  <p className="truncate text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">{c.email}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-1 flex-col gap-1.5 text-xs font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
                {c.telefono && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-prolimal-ink-400 dark:text-prolimal-ink-300" />
                    {c.telefono}
                  </span>
                )}
                {c.ubicacion && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-prolimal-ink-400 dark:text-prolimal-ink-300" />
                    <span className="truncate">{c.ubicacion}</span>
                  </span>
                )}
              </div>
              <button
                onClick={() => abrirAsignarGps(c)}
                className="prolimal-btn-secondary mt-5 w-full px-4 py-2.5 text-xs"
              >
                <MapPin className="h-3.5 w-3.5" />
                Registrar punto GPS de visita
              </button>
            </article>
          ))}
        </div>
      )}

      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-prolimal-ink-900/50 p-4 backdrop-blur-sm"
          onClick={() => setModalAbierto(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="prolimal-display text-2xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                  {clienteExistente ? 'Registrar punto de visita' : 'Nuevo cliente'}
                </h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  {clienteExistente
                    ? `Asignale una ubicación GPS y días de visita a ${clienteExistente.nombre}.`
                    : 'Completá los datos y ubicá al cliente en el mapa.'}
                </p>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="prolimal-icon-btn shrink-0"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {!clienteExistente && (
                <>
                  <input
                    placeholder="Nombre del cliente *"
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                    className="prolimal-input"
                  />
                  <input
                    placeholder="Teléfono"
                    value={form.telefono}
                    onChange={e => setForm({ ...form, telefono: e.target.value })}
                    className="prolimal-input"
                  />
                  <input
                    placeholder="Dirección de referencia"
                    value={form.ubicacion}
                    onChange={e => setForm({ ...form, ubicacion: e.target.value })}
                    className="prolimal-input"
                  />
                </>
              )}

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
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
                        className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
                          activo
                            ? 'border-prolimal-ink-900 bg-prolimal-ink-900 text-white dark:border-prolimal-teal-400 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
                            : 'border-prolimal-ink-900/15 bg-transparent text-prolimal-ink-500 hover:bg-prolimal-sand-100 dark:border-prolimal-sand-100/15 dark:text-prolimal-ink-200 dark:hover:bg-prolimal-ink-800'
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
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    Pedido asociado (opcional)
                  </label>
                  <select
                    value={pedidoId}
                    onChange={e => setPedidoId(e.target.value)}
                    className="prolimal-input"
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

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={guardar}
                disabled={guardando}
                className="prolimal-btn-primary flex-1"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setModalAbierto(false)}
                className="prolimal-btn-secondary flex-1"
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
