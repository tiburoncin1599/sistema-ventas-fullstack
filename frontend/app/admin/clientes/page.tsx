'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ChevronRight, IdCard, MapPin, Phone, Plus, Search, X } from 'lucide-react';

interface Cliente {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;
  carnet?: string;
  ubicacion?: string;
  activo: boolean;
  creado_en: string;
}

export default function AdminClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalCliente, setModalCliente] = useState<Cliente | null>(null);
  const [editando, setEditando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState({ nombre: '', telefono: '', carnet: '', ubicacion: '' });
  const [busqueda, setBusqueda] = useState('');

  const cargar = async () => {
    const res = await api.get('/clientes');
    setClientes(res.data);
  };

  useEffect(() => {
    let activo = true;
    api.get('/clientes')
      .then((res) => {
        if (activo) setClientes(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const abrirNuevo = () => {
    setCreando(true);
    setModalCliente(null);
    setForm({ nombre: '', telefono: '', carnet: '', ubicacion: '' });
  };

  const guardar = async () => {
    try {
      await api.post('/clientes', form);
      setCreando(false);
      setForm({ nombre: '', telefono: '', carnet: '', ubicacion: '' });
      await cargar();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar';
      alert(msg);
    }
  };

  const actualizarCliente = async () => {
    if (!modalCliente) return;
    try {
      await api.put(`/clientes/${modalCliente.id}`, form);
      setModalCliente(null);
      setEditando(false);
      setForm({ nombre: '', telefono: '', carnet: '', ubicacion: '' });
      await cargar();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al actualizar';
      alert(msg);
    }
  };

  const abrirEditar = (c: Cliente) => {
    setModalCliente(c);
    setEditando(true);
    setForm({ nombre: c.nombre || '', telefono: c.telefono || '', carnet: c.carnet || '', ubicacion: c.ubicacion || '' });
  };

  const desactivar = async (id: number) => {
    await api.delete(`/clientes/${id}`);
    await cargar();
    setModalCliente(null);
    setEditando(false);
  };

  const q = busqueda.trim().toLowerCase();
  const todos = q
    ? clientes.filter(c =>
        c.nombre.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.telefono || '').includes(q) ||
        (c.carnet || '').toLowerCase().includes(q),
      )
    : clientes;
  const activos = todos.filter(c => c.activo);
  const inactivos = todos.filter(c => !c.activo);

  return (
    <div className="pb-10">
      <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="prolimal-eyebrow">Relaciones</p>
          <h2 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
            Clientes
          </h2>
          <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200">
            {activos.length} activos · {inactivos.length} inactivos
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400 dark:text-prolimal-ink-300" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, email, teléfono o CI"
              className="prolimal-search-input"
            />
          </div>
          <button onClick={abrirNuevo} className="prolimal-btn-primary whitespace-nowrap">
            <Plus className="h-4 w-4" />
            Nuevo cliente
          </button>
        </div>
      </section>

      {cargando ? (
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          Cargando clientes...
        </div>
      ) : activos.length === 0 ? (
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          {q ? 'Sin resultados para tu búsqueda.' : 'No hay clientes registrados'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {activos.map(c => (
            <div
              key={c.id}
              onClick={() => setModalCliente(c)}
              className="group cursor-pointer rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-50px_rgba(11,37,32,0.4)] transition-all hover:-translate-y-1 hover:border-prolimal-teal-500/40 hover:shadow-[0_30px_70px_-45px_rgba(11,37,32,0.5)] dark:border-prolimal-sand-100/10 dark:bg-card-dark dark:hover:border-prolimal-teal-500/30"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-prolimal-teal-100 text-base font-extrabold text-prolimal-teal-800 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-200">
                  {c.nombre.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-extrabold tracking-[-0.02em] text-prolimal-ink-800 dark:text-prolimal-sand-50">{c.nombre}</p>
                  <p className="truncate text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">{c.email}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-prolimal-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-prolimal-teal-600 dark:text-prolimal-ink-500 dark:group-hover:text-prolimal-teal-300" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {c.telefono && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-prolimal-sand-100 px-2.5 py-1 text-[11px] font-semibold text-prolimal-ink-600 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100">
                    <Phone className="h-3 w-3" /> {c.telefono}
                  </span>
                )}
                {c.carnet && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-prolimal-sand-100 px-2.5 py-1 text-[11px] font-semibold text-prolimal-ink-600 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100">
                    <IdCard className="h-3 w-3" /> {c.carnet}
                  </span>
                )}
              </div>
              {c.ubicacion && (
                <p className="mt-2.5 flex items-center gap-1.5 truncate text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  <MapPin className="h-3 w-3 shrink-0" /> {c.ubicacion}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {inactivos.length > 0 && (
        <div className="mt-8 rounded-[2rem] border border-prolimal-ink-900/10 bg-prolimal-sand-100/50 p-6 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/40">
          <div className="mb-4 cursor-pointer text-sm font-bold text-prolimal-ink-500 dark:text-prolimal-ink-200" onClick={() => window.location.reload()}>
            <span className="underline decoration-prolimal-ink-300 underline-offset-4">Clientes inactivos ({inactivos.length})</span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {inactivos.map(c => (
              <div key={c.id} className="rounded-2xl border border-prolimal-ink-900/5 bg-card p-4 dark:border-prolimal-sand-100/10 dark:bg-card-dark">
                <p className="truncate text-sm font-bold text-prolimal-ink-700 dark:text-prolimal-sand-50">{c.nombre}</p>
                <p className="truncate text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">{c.email}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {creando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-prolimal-ink-900/50 p-4 backdrop-blur-sm"
          onClick={() => setCreando(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_40px_90px_-40px_rgba(11,37,32,0.6)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-6">
              <p className="prolimal-eyebrow">Nuevo registro</p>
              <h2 className="prolimal-display mt-2 text-2xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">Nuevo cliente</h2>
            </div>
            <div className="space-y-3">
              <input placeholder="Nombre completo" value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="prolimal-input" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Carnet / CI" value={form.carnet}
                  onChange={e => setForm({ ...form, carnet: e.target.value })}
                  className="prolimal-input" />
                <input placeholder="Teléfono" value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })}
                  className="prolimal-input" />
              </div>
              <input placeholder="Ubicación / Dirección" value={form.ubicacion}
                onChange={e => setForm({ ...form, ubicacion: e.target.value })}
                className="prolimal-input" />
              <p className="text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">Se generará una contraseña automática de acceso</p>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button onClick={() => setCreando(false)} className="prolimal-btn-secondary sm:w-auto">
                Cancelar
              </button>
              <button onClick={guardar} className="prolimal-btn-primary flex-1">
                Guardar cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCliente && !editando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-prolimal-ink-900/50 p-4 backdrop-blur-sm"
          onClick={() => setModalCliente(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_40px_90px_-40px_rgba(11,37,32,0.6)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-prolimal-teal-100 text-lg font-extrabold text-prolimal-teal-800 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-200">
                  {modalCliente.nombre.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-extrabold tracking-[-0.02em] text-prolimal-ink-800 dark:text-prolimal-sand-50">{modalCliente.nombre}</h2>
                  <p className="truncate text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">{modalCliente.email}</p>
                </div>
              </div>
              <button onClick={() => setModalCliente(null)} aria-label="Cerrar" className="prolimal-icon-btn h-9 w-9">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1">
              {modalCliente.carnet && (
                <div className="flex justify-between gap-4 border-b border-prolimal-ink-900/5 py-3 dark:border-prolimal-sand-100/10">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Carnet</span>
                  <span className="text-sm font-semibold text-prolimal-ink-700 dark:text-prolimal-sand-100">{modalCliente.carnet}</span>
                </div>
              )}
              {modalCliente.telefono && (
                <div className="flex justify-between gap-4 border-b border-prolimal-ink-900/5 py-3 dark:border-prolimal-sand-100/10">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Teléfono</span>
                  <span className="text-sm font-semibold text-prolimal-ink-700 dark:text-prolimal-sand-100">{modalCliente.telefono}</span>
                </div>
              )}
              {modalCliente.ubicacion && (
                <div className="flex justify-between gap-4 border-b border-prolimal-ink-900/5 py-3 dark:border-prolimal-sand-100/10">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Ubicación</span>
                  <span className="text-right text-sm font-semibold text-prolimal-ink-700 dark:text-prolimal-sand-100">{modalCliente.ubicacion}</span>
                </div>
              )}
              <div className="flex justify-between gap-4 border-b border-prolimal-ink-900/5 py-3 dark:border-prolimal-sand-100/10">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Registrado</span>
                <span className="text-sm font-semibold text-prolimal-ink-700 dark:text-prolimal-sand-100">{new Date(modalCliente.creado_en).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => abrirEditar(modalCliente)} className="prolimal-btn-primary flex-1">
                Editar
              </button>
              <button onClick={() => desactivar(modalCliente.id)} className="prolimal-btn-ghost-danger flex-1">
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCliente && editando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-prolimal-ink-900/50 p-4 backdrop-blur-sm"
          onClick={() => { setModalCliente(null); setEditando(false); }}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_40px_90px_-40px_rgba(11,37,32,0.6)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-prolimal-teal-100 text-lg font-extrabold text-prolimal-teal-800 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-200">
                  {modalCliente.nombre.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h2 className="prolimal-display truncate text-xl tracking-[-0.03em] text-prolimal-ink-900 dark:text-prolimal-sand-50">Editar cliente</h2>
                  <p className="truncate text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">{modalCliente.email}</p>
                </div>
              </div>
              <button onClick={() => { setModalCliente(null); setEditando(false); }} aria-label="Cerrar" className="prolimal-icon-btn h-9 w-9">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input placeholder="Nombre completo" value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="prolimal-input" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Carnet / CI" value={form.carnet}
                  onChange={e => setForm({ ...form, carnet: e.target.value })}
                  className="prolimal-input" />
                <input placeholder="Teléfono" value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })}
                  className="prolimal-input" />
              </div>
              <input placeholder="Ubicación / Dirección" value={form.ubicacion}
                onChange={e => setForm({ ...form, ubicacion: e.target.value })}
                className="prolimal-input" />
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button onClick={() => { setModalCliente(null); setEditando(false); }} className="prolimal-btn-secondary sm:w-auto">
                Cancelar
              </button>
              <button onClick={actualizarCliente} className="prolimal-btn-primary flex-1">
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}