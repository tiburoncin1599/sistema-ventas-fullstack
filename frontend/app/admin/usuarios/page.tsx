'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Search, X } from 'lucide-react';

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
    admin: 'bg-prolimal-coral-100 text-prolimal-coral-700 dark:bg-prolimal-coral-900/25 dark:text-prolimal-coral-300',
    ventas: 'bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300',
    inventario: 'bg-prolimal-sand-200 text-prolimal-sand-800 dark:bg-prolimal-sand-900/30 dark:text-prolimal-sand-200',
    cliente: 'bg-prolimal-ink-100 text-prolimal-ink-700 dark:bg-prolimal-ink-800 dark:text-prolimal-ink-200',
  };
  return colores[rol] || 'bg-prolimal-ink-100 text-prolimal-ink-700 dark:bg-prolimal-ink-800 dark:text-prolimal-ink-200';
};

const avatarColor = (rol: string) => {
  const colores: Record<string, string> = {
    admin: 'bg-prolimal-coral-500',
    ventas: 'bg-prolimal-teal-600',
    inventario: 'bg-prolimal-sand-600',
    cliente: 'bg-prolimal-ink-500',
  };
  return colores[rol] || 'bg-prolimal-ink-500';
};

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalUsuario, setModalUsuario] = useState<Usuario | null>(null);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'inventario' });
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');

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

  if (cargando) {
    return (
      <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
        Cargando usuarios...
      </div>
    );
  }

  const activos = usuarios.filter(u => u.activo);
  const inactivos = usuarios.filter(u => !u.activo);

  const qUsuarios = busqueda.trim().toLowerCase();
  const visibles = usuarios.filter(u =>
    (!filtroRol || u.rol === filtroRol) &&
    (!qUsuarios ||
      u.nombre.toLowerCase().includes(qUsuarios) ||
      u.email.toLowerCase().includes(qUsuarios) ||
      u.rol.toLowerCase().includes(qUsuarios)),
  );

  return (
    <div className="pb-10">
      <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="prolimal-eyebrow">Equipo</p>
          <h2 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
            Usuarios
          </h2>
          <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200">
            {activos.length} activos · {inactivos.length} inactivos
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="prolimal-input sm:w-40"
          >
            <option value="">Todos los roles</option>
            {['admin', 'ventas', 'inventario', 'cliente'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400 dark:text-prolimal-ink-300" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, email o rol"
              className="prolimal-search-input"
            />
          </div>
          <button onClick={abrirNuevo} className="prolimal-btn-primary whitespace-nowrap">
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </button>
        </div>
      </section>

      {error && (
        <div className="mb-6 rounded-2xl border border-prolimal-red-300/60 bg-prolimal-red-50 px-5 py-3 text-sm font-semibold text-prolimal-red-700 dark:border-prolimal-red-700/40 dark:bg-prolimal-red-900/20 dark:text-prolimal-red-300">
          {error}
        </div>
      )}

      {activos.length === 0 && inactivos.length === 0 ? (
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          No hay usuarios registrados
        </div>
      ) : visibles.length === 0 ? (
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          Sin resultados para tu búsqueda.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map(u => (
            <div
              key={u.id}
              onClick={() => abrirEditar(u)}
              className={`cursor-pointer rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-50px_rgba(11,37,32,0.4)] transition-all hover:-translate-y-1 hover:border-prolimal-teal-500/40 hover:shadow-[0_30px_70px_-45px_rgba(11,37,32,0.5)] dark:border-prolimal-sand-100/10 dark:bg-card-dark dark:hover:border-prolimal-teal-500/30 ${u.activo ? '' : 'opacity-60'}`}
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white ${avatarColor(u.rol)}`}>
                    {u.nombre.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-prolimal-ink-800 dark:text-prolimal-sand-50">{u.nombre}</p>
                    <p className="truncate text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">{u.email}</p>
                  </div>
                </div>
                {!u.activo && (
                  <span className="shrink-0 rounded-full bg-prolimal-red-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-prolimal-red-700 dark:bg-prolimal-red-900/30 dark:text-prolimal-red-300">
                    Inactivo
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-prolimal-ink-900/5 pt-4 dark:border-prolimal-sand-100/10">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${rolColor(u.rol)}`}>
                  {u.rol}
                </span>
                {u.email === ADMIN_EMAIL ? (
                  <span className="text-[11px] font-semibold italic text-prolimal-ink-400 dark:text-prolimal-ink-300">Admin principal</span>
                ) : u.activo ? (
                  <button onClick={e => { e.stopPropagation(); toggleActivo(u); }}
                    className="prolimal-btn-ghost-danger px-3 py-2 text-xs">
                    Desactivar
                  </button>
                ) : (
                  <button onClick={e => { e.stopPropagation(); eliminarUsuario(u.id); }}
                    className="prolimal-btn-ghost-danger px-3 py-2 text-xs">
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {creando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-prolimal-ink-900/50 p-4 backdrop-blur-sm" onClick={() => setCreando(false)}>
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_40px_90px_-40px_rgba(11,37,32,0.6)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="prolimal-eyebrow">Nuevo registro</p>
                <h2 className="prolimal-display mt-2 text-2xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">Nuevo usuario</h2>
              </div>
              <button onClick={() => setCreando(false)} aria-label="Cerrar" className="prolimal-icon-btn h-9 w-9">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Nombre" value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="prolimal-input" required />
              <input type="email" placeholder="Email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="prolimal-input" required />
              <input type="password" placeholder="Contraseña" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="prolimal-input" required />
              <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}
                className="prolimal-input">
                {ROLES_SIN_ADMIN.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button onClick={() => setCreando(false)} className="prolimal-btn-secondary sm:w-auto">
                Cancelar
              </button>
              <button onClick={crearUsuario} className="prolimal-btn-primary flex-1">
                Crear usuario
              </button>
            </div>
          </div>
        </div>
      )}

      {modalUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-prolimal-ink-900/50 p-4 backdrop-blur-sm" onClick={() => setModalUsuario(null)}>
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_40px_90px_-40px_rgba(11,37,32,0.6)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-extrabold text-white ${avatarColor(modalUsuario.rol)}`}>
                  {modalUsuario.nombre.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-extrabold tracking-[-0.02em] text-prolimal-ink-800 dark:text-prolimal-sand-50">{modalUsuario.nombre}</h2>
                  <p className="truncate text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">{modalUsuario.email}</p>
                </div>
              </div>
              <button onClick={() => setModalUsuario(null)} aria-label="Cerrar" className="prolimal-icon-btn h-9 w-9">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input type="text" placeholder="Nombre" value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="prolimal-input" />
              <input type="password" placeholder="Nueva contraseña (dejar vacío para no cambiar)" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="prolimal-input" />
              {modalUsuario.email === ADMIN_EMAIL ? (
                <input value="admin" disabled
                  className="prolimal-input cursor-not-allowed opacity-70" />
              ) : (
                <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}
                  className="prolimal-input">
                  {ROLES_SIN_ADMIN.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              )}
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button onClick={() => setModalUsuario(null)} className="prolimal-btn-secondary sm:w-auto">
                  Cancelar
                </button>
                <button onClick={actualizarUsuario} className="prolimal-btn-primary flex-1">
                  Guardar cambios
                </button>
              </div>
              {modalUsuario.email !== ADMIN_EMAIL && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button onClick={() => { toggleActivo(modalUsuario); setModalUsuario(null); }}
                    className={`flex-1 ${modalUsuario.activo ? 'prolimal-btn-ghost-danger' : 'prolimal-btn-secondary'}`}>
                    {modalUsuario.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button onClick={() => eliminarUsuario(modalUsuario.id)}
                    className="prolimal-btn-ghost-danger flex-1">
                    Eliminar usuario
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
