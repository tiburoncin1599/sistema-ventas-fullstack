'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  creado_en: string;
}

const ADMIN_EMAIL = 'aaas@gmail.com';
const ROLES_SIN_ADMIN = ['ventas', 'inventario', 'cliente'];

const rolColor = (rol: string) => {
  const colores: Record<string, string> = {
    admin: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    ventas: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    inventario: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    cliente: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  };
  return colores[rol] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
};

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalUsuario, setModalUsuario] = useState<Usuario | null>(null);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'inventario' });
  const [error, setError] = useState('');

  const cargar = async () => {
    try {
      const res = await api.get('/usuarios');
      setUsuarios(res.data);
    } catch { setError('Error al cargar usuarios'); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const abrirNuevo = () => {
    setCreando(true);
    setModalUsuario(null);
    setForm({ nombre: '', email: '', password: '', rol: 'inventario' });
    setError('');
  };

  const crearUsuario = async () => {
    setError('');
    try {
      await api.post('/usuarios', form);
      setCreando(false);
      setForm({ nombre: '', email: '', password: '', rol: 'inventario' });
      cargar();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al crear usuario';
      setError(msg);
    }
  };

  const abrirEditar = (u: Usuario) => {
    setCreando(false);
    setModalUsuario(u);
    setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol });
    setError('');
  };

  const actualizarUsuario = async () => {
    if (!modalUsuario) return;
    setError('');
    try {
      const data: Record<string, unknown> = {};
      if (form.nombre) data.nombre = form.nombre;
      if (form.password) data.password = form.password;
      data.rol = form.rol;
      await api.put(`/usuarios/${modalUsuario.id}`, data);
      setModalUsuario(null);
      setForm({ nombre: '', email: '', password: '', rol: 'inventario' });
      cargar();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al actualizar usuario';
      setError(msg);
    }
  };

  const toggleActivo = async (u: Usuario) => {
    try {
      await api.put(`/usuarios/${u.id}`, { activo: !u.activo });
      cargar();
    } catch { setError('Error al cambiar estado'); }
  };

  const eliminarUsuario = async (id: number) => {
    if (!confirm('¿Eliminar este usuario definitivamente?')) return;
    try {
      await api.delete(`/usuarios/${id}`);
      setModalUsuario(null);
      cargar();
    } catch { setError('Error al eliminar usuario'); }
  };

  if (cargando) return <p className="text-center py-20 text-gray-500 dark:text-gray-400">Cargando...</p>;

  const activos = usuarios.filter(u => u.activo);
  const inactivos = usuarios.filter(u => !u.activo);

  return (
    <main className="max-w-6xl mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Usuarios</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{activos.length} activos, {inactivos.length} inactivos</p>
        </div>
        <button onClick={abrirNuevo}
          className="bg-[#005a24] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#003e19]">
          + Nuevo usuario
        </button>
      </div>

      {error && <p className="text-red-500 dark:text-red-400 text-sm mb-4">{error}</p>}

      {activos.length === 0 && inactivos.length === 0 ? (
        <p className="text-center py-20 text-gray-500 dark:text-gray-400">No hay usuarios registrados</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {usuarios.map(u => (
            <div
              key={u.id}
              className={`bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 ${u.activo ? 'hover:shadow-lg dark:hover:shadow-gray-900/50 transition-shadow cursor-pointer' : 'opacity-50 cursor-pointer hover:shadow-lg dark:hover:shadow-gray-900/50 transition-shadow'}`}
              onClick={() => u.activo ? abrirEditar(u) : abrirEditar(u)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${
                    u.rol === 'admin' ? 'bg-red-500' :
                    u.rol === 'ventas' ? 'bg-blue-500' :
                    u.rol === 'inventario' ? 'bg-green-500' : 'bg-gray-400'
                  }`}>
                    {u.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white truncate">{u.nombre}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                  </div>
                </div>
                {!u.activo && <span className="text-xs text-red-500 dark:text-red-400 font-medium shrink-0">Inactivo</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${rolColor(u.rol)}`}>
                  {u.rol}
                </span>
                {u.email === ADMIN_EMAIL ? (
                  <span className="text-xs text-gray-400 dark:text-gray-500 italic">Admin principal</span>
                ) : u.activo ? (
                  <button onClick={e => { e.stopPropagation(); toggleActivo(u); }}
                    className="text-xs text-red-500 dark:text-red-400 hover:underline">
                    Desactivar
                  </button>
                ) : (
                  <button onClick={e => { e.stopPropagation(); eliminarUsuario(u.id); }}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium">
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {creando && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-50" onClick={() => setCreando(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6 dark:text-white">Nuevo usuario</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Nombre" value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white" required />
              <input type="email" placeholder="Email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white" required />
              <input type="password" placeholder="Contraseña" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white" required />
              <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white">
                {ROLES_SIN_ADMIN.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={crearUsuario}
                className="flex-1 bg-[#005a24] text-white py-3 rounded-xl font-bold hover:bg-[#003e19]">
                Crear usuario
              </button>
              <button onClick={() => setCreando(false)}
                className="flex-1 border dark:border-gray-600 py-3 rounded-xl font-bold dark:text-white">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalUsuario && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-50" onClick={() => setModalUsuario(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                  modalUsuario.rol === 'admin' ? 'bg-red-500' :
                  modalUsuario.rol === 'ventas' ? 'bg-blue-500' :
                  modalUsuario.rol === 'inventario' ? 'bg-green-500' : 'bg-gray-400'
                }`}>
                  {modalUsuario.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold dark:text-white">{modalUsuario.nombre}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{modalUsuario.email}</p>
                </div>
              </div>
              <button onClick={() => setModalUsuario(null)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl">&times;</button>
            </div>

            <div className="space-y-4">
              <input type="text" placeholder="Nombre" value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white" />
              <input type="password" placeholder="Nueva contrase\u00F1a (dejar vacío para no cambiar)" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white" />
              {modalUsuario.email === ADMIN_EMAIL ? (
                <input value="admin" disabled
                  className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-700 cursor-not-allowed" />
              ) : (
                <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}
                  className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white">
                  {ROLES_SIN_ADMIN.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              )}
            </div>
            <div className="flex flex-col gap-3 mt-6">
              <div className="flex gap-3">
                <button onClick={actualizarUsuario}
                  className="flex-1 bg-[#005a24] text-white py-3 rounded-xl font-bold hover:bg-[#003e19]">
                  Guardar cambios
                </button>
                {modalUsuario.email !== ADMIN_EMAIL && (
                  <button onClick={() => { toggleActivo(modalUsuario); setModalUsuario(null); }}
                    className={`flex-1 border py-3 rounded-xl font-bold ${
                      modalUsuario.activo
                        ? 'text-red-500 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30'
                        : 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/30'
                    }`}>
                    {modalUsuario.activo ? 'Desactivar' : 'Activar'}
                  </button>
                )}
                <button onClick={() => setModalUsuario(null)}
                  className="flex-1 border dark:border-gray-600 py-3 rounded-xl font-bold dark:text-white">
                  Cancelar
                </button>
              </div>
              {modalUsuario.email !== ADMIN_EMAIL && (
                <button onClick={() => eliminarUsuario(modalUsuario.id)}
                  className="w-full border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 py-3 rounded-xl font-bold hover:bg-red-50 dark:hover:bg-red-900/30">
                  Eliminar usuario
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
