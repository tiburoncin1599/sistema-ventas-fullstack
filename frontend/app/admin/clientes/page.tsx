'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Cliente {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
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

  const cargar = async () => {
    const res = await api.get('/clientes');
    setClientes(res.data);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar().finally(() => setCargando(false));
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

  if (cargando) return <p className="text-center py-20 text-gray-500 dark:text-gray-400">Cargando clientes...</p>;

  const activos = clientes.filter(c => c.activo);
  const inactivos = clientes.filter(c => !c.activo);

  return (
    <main className="max-w-6xl mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Clientes</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{activos.length} activos, {inactivos.length} inactivos</p>
        </div>
        <button onClick={abrirNuevo}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700">
          + Nuevo
        </button>
      </div>

      {activos.length === 0 ? (
        <p className="text-center py-20 text-gray-500 dark:text-gray-400">No hay clientes registrados</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {activos.map(c => (
            <div
              key={c.id}
              onClick={() => { abrirEditar(c); setCreando(false); }}
              className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 hover:shadow-lg dark:hover:shadow-gray-900/50 transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold shrink-0">
                  {c.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{c.nombre}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{c.email}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                {c.telefono && <span>{'\uD83D\uDCDE'} {c.telefono}</span>}
                {c.carnet && <span>{'\uD83D\uDD11'} {c.carnet}</span>}
              </div>
              {c.ubicacion && (
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 truncate">{'\uD83D\uDCCD'} {c.ubicacion}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {inactivos.length > 0 && (
        <details className="mt-8">
          <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer font-medium">
            Clientes inactivos ({inactivos.length})
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            {inactivos.map(c => (
              <div key={c.id} className="bg-gray-50 dark:bg-gray-800/50 border dark:border-gray-700 rounded-2xl p-5 opacity-60">
                <p className="font-medium text-gray-500 dark:text-gray-400">{c.nombre}</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">{c.email}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {creando && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-50" onClick={() => setCreando(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6 dark:text-white">Nuevo cliente</h2>
            <div className="space-y-4">
              <input placeholder="Nombre completo" value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Carnet / CI" value={form.carnet}
                  onChange={e => setForm({ ...form, carnet: e.target.value })}
                  className="border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white" />
                <input placeholder="Teléfono" value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })}
                  className="border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white" />
              </div>
              <input placeholder="Ubicación / Dirección" value={form.ubicacion}
                onChange={e => setForm({ ...form, ubicacion: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white" />
              <p className="text-xs text-gray-400 dark:text-gray-500">Contraseña generada autom\u00E1ticamente: cliente123</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={guardar}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700">
                Guardar cliente
              </button>
              <button onClick={() => setCreando(false)}
                className="flex-1 border dark:border-gray-600 py-3 rounded-xl font-medium dark:text-white">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCliente && !editando && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-50" onClick={() => setModalCliente(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-lg">
                  {modalCliente.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold dark:text-white">{modalCliente.nombre}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{modalCliente.email}</p>
                </div>
              </div>
              <button onClick={() => setModalCliente(null)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl">&times;</button>
            </div>
            <div className="space-y-3">
              {modalCliente.carnet && (
                <div className="flex justify-between py-2 border-b dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">Carnet</span>
                  <span className="font-medium dark:text-white">{modalCliente.carnet}</span>
                </div>
              )}
              {modalCliente.telefono && (
                <div className="flex justify-between py-2 border-b dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">Teléfono</span>
                  <span className="font-medium dark:text-white">{modalCliente.telefono}</span>
                </div>
              )}
              {modalCliente.ubicacion && (
                <div className="flex justify-between py-2 border-b dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">Ubicación</span>
                  <span className="font-medium dark:text-white">{modalCliente.ubicacion}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Registrado</span>
                <span className="font-medium dark:text-white">{new Date(modalCliente.creado_en).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => abrirEditar(modalCliente)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700">
                Editar
              </button>
              <button onClick={() => desactivar(modalCliente.id)}
                className="flex-1 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 py-3 rounded-xl font-medium hover:bg-red-50 dark:hover:bg-red-900/30">
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCliente && editando && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-50" onClick={() => { setModalCliente(null); setEditando(false); }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-lg">
                {modalCliente.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold dark:text-white">Editar cliente</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{modalCliente.email}</p>
              </div>
            </div>
            <div className="space-y-4">
              <input placeholder="Nombre completo" value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Carnet / CI" value={form.carnet}
                  onChange={e => setForm({ ...form, carnet: e.target.value })}
                  className="border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white" />
                <input placeholder="Teléfono" value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })}
                  className="border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white" />
              </div>
              <input placeholder="Ubicación / Dirección" value={form.ubicacion}
                onChange={e => setForm({ ...form, ubicacion: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={actualizarCliente}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700">
                Guardar cambios
              </button>
              <button onClick={() => { setModalCliente(null); setEditando(false); }}
                className="flex-1 border dark:border-gray-600 py-3 rounded-xl font-medium dark:text-white">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
