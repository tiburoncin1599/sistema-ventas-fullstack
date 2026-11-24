'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useValidacionFormulario } from '@/lib/hooks/use-validacion-formulario';
import {
  requerido,
  email,
  longitudMinima,
  mensajeGeneral,
  primero,
  type ErroresFormulario,
} from '@/lib/validacion';
import { AvisoErrorFormulario, CampoError, claseCampo } from '@/components/ui/CampoError';
import { Plus, Search, X } from 'lucide-react';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  creado_en: string;
}

type UsuarioForm = {
  nombre: string;
  email: string;
  password: string;
  rol: string;
};

const FORM_VACIO: UsuarioForm = { nombre: '', email: '', password: '', rol: 'inventario' };

const ADMIN_EMAIL = 'aaas@gmail.com';
const ROLES_SIN_ADMIN = ['ventas', 'inventario', 'cliente'];
// Los mismos roles que acepta ActualizarUsuarioDto/CrearUsuarioDto en el backend.
const ROLES_VALIDOS = ['admin', 'ventas', 'inventario', 'cliente'];
const CORREO_DUPLICADO = /ya está registrado|already (registered|exists)/i;

/** Deja sólo las claves con mensaje: `validarTodo` cuenta las claves, no los valores. */
function erroresNoVacios<T extends object>(
  pares: Array<[keyof T | '_general', string | undefined]>,
): ErroresFormulario<T> {
  return pares.reduce<ErroresFormulario<T>>((acc, [campo, mensaje]) => {
    if (mensaje) acc[campo] = mensaje;
    return acc;
  }, {});
}

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
  const [form, setForm] = useState<UsuarioForm>(FORM_VACIO);
  // `error` es para fallos de carga/estado; los del formulario van por `errorGeneral`.
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');

  const validarUsuario = useCallback(
    (valores: UsuarioForm): ErroresFormulario<UsuarioForm> => {
      const pares: Array<[keyof UsuarioForm | '_general', string | undefined]> = [
        ['nombre', requerido(valores.nombre, 'El nombre es obligatorio')],
        ['rol', ROLES_VALIDOS.includes(valores.rol) ? undefined : 'Rol inválido'],
      ];
      if (creando) {
        pares.push(
          [
            'email',
            primero(
              requerido(valores.email, 'El email es obligatorio'),
              email(valores.email, 'Ingresá un correo electrónico válido'),
            ),
          ],
          [
            'password',
            primero(
              requerido(valores.password, 'La contraseña es obligatoria'),
              longitudMinima(valores.password, 6, 'La contraseña debe tener al menos 6 caracteres'),
            ),
          ],
        );
      } else {
        // En edición, vacío significa "no cambiar la contraseña".
        pares.push([
          'password',
          longitudMinima(valores.password, 6, 'La contraseña debe tener al menos 6 caracteres'),
        ]);
      }
      return erroresNoVacios<UsuarioForm>(pares);
    },
    [creando],
  );

  const {
    errores,
    tocados,
    enviado,
    errorGeneral,
    setErrorGeneral,
    validarCampo,
    validarTodo,
    aplicarErroresBackend,
    reiniciar,
  } = useValidacionFormulario<UsuarioForm>(validarUsuario);

  const mensajeError = (campo: keyof UsuarioForm) =>
    enviado || tocados[campo] ? errores[campo] : undefined;

  const actualizarCampo = (campo: keyof UsuarioForm, valor: string) => {
    const nuevo: UsuarioForm = { ...form, [campo]: valor };
    setForm(nuevo);
    validarCampo(campo, nuevo);
  };

  const cargar = async () => {
    try {
      const res = await api.get('/usuarios');
      setUsuarios(res.data);
    } catch { setError('Error al cargar usuarios'); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const cerrarModal = () => {
    setCreando(false);
    setModalUsuario(null);
    setError('');
    reiniciar();
  };

  const abrirNuevo = () => {
    setCreando(true);
    setModalUsuario(null);
    setForm({ ...FORM_VACIO });
    setError('');
    reiniciar();
  };

  const crearUsuario = async () => {
    if (!validarTodo(form)) return;
    setError('');
    try {
      await api.post('/usuarios', form);
      cerrarModal();
      cargar();
    } catch (err: unknown) {
      aplicarErroresBackend(
        err,
        ['nombre', 'email', 'password', 'rol', '_general'],
        {
          nombre: 'nombre',
          email: 'email',
          correo: 'email',
          password: 'password',
          contraseña: 'password',
          rol: 'rol',
        },
        'No se pudo crear el usuario. Revisá los campos marcados.',
      );
      if (CORREO_DUPLICADO.test(mensajeGeneral(err, ''))) {
        setErrorGeneral(
          'Este correo electrónico ya está registrado. No se creó el usuario; usá otro correo.',
        );
      }
    }
  };

  const abrirEditar = (u: Usuario) => {
    setCreando(false);
    setModalUsuario(u);
    setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol });
    setError('');
    reiniciar();
  };

  const actualizarUsuario = async () => {
    if (!modalUsuario) return;
    if (!validarTodo(form)) return;
    setError('');
    try {
      const data: Record<string, unknown> = {};
      if (form.nombre) data.nombre = form.nombre;
      if (form.password) data.password = form.password;
      data.rol = form.rol;
      // ActualizarUsuarioDto no acepta `email`: sólo se muestra en el encabezado.
      await api.put(`/usuarios/${modalUsuario.id}`, data);
      cerrarModal();
      cargar();
    } catch (err: unknown) {
      aplicarErroresBackend(
        err,
        ['nombre', 'password', 'rol', '_general'],
        {
          nombre: 'nombre',
          password: 'password',
          contraseña: 'password',
          rol: 'rol',
        },
        'No se pudo actualizar el usuario. Revisá los campos marcados.',
      );
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
      cerrarModal();
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

  const errorNombre = mensajeError('nombre');
  const errorEmail = mensajeError('email');
  const errorPassword = mensajeError('password');
  const errorRol = mensajeError('rol');

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
              name="busqueda-usuarios"
              autoComplete="off"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-prolimal-ink-900/50 p-4 backdrop-blur-sm" onClick={cerrarModal}>
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_40px_90px_-40px_rgba(11,37,32,0.6)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="prolimal-eyebrow">Nuevo registro</p>
                <h2 className="prolimal-display mt-2 text-2xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">Nuevo usuario</h2>
              </div>
              <button onClick={cerrarModal} aria-label="Cerrar" className="prolimal-icon-btn h-9 w-9">
                <X className="h-4 w-4" />
              </button>
            </div>
            <AvisoErrorFormulario mensaje={errorGeneral} />
            <div className="space-y-3">
              <div>
                <input id="nombre-usuario-nuevo" type="text" name="nombre" autoComplete="off" placeholder="Nombre" value={form.nombre}
                  onChange={e => actualizarCampo('nombre', e.target.value)}
                  className={claseCampo(Boolean(errorNombre), 'prolimal-input')}
                  aria-invalid={Boolean(errorNombre)}
                  aria-describedby={errorNombre ? 'error-nombre-usuario-nuevo' : undefined} />
                <CampoError id="error-nombre-usuario-nuevo" mensaje={errorNombre} />
              </div>
              <div>
                <input id="email-usuario-nuevo" type="email" name="email" autoComplete="username" placeholder="Email" value={form.email}
                  onChange={e => actualizarCampo('email', e.target.value)}
                  className={claseCampo(Boolean(errorEmail), 'prolimal-input')}
                  aria-invalid={Boolean(errorEmail)}
                  aria-describedby={errorEmail ? 'error-email-usuario-nuevo' : undefined} />
                <CampoError id="error-email-usuario-nuevo" mensaje={errorEmail} />
              </div>
              <div>
                <input id="password-usuario-nuevo" type="password" name="password" autoComplete="new-password" placeholder="Contraseña" value={form.password}
                  onChange={e => actualizarCampo('password', e.target.value)}
                  className={claseCampo(Boolean(errorPassword), 'prolimal-input')}
                  aria-invalid={Boolean(errorPassword)}
                  aria-describedby={errorPassword ? 'error-password-usuario-nuevo' : undefined} />
                <CampoError id="error-password-usuario-nuevo" mensaje={errorPassword} />
              </div>
              <div>
                <select id="rol-usuario-nuevo" value={form.rol} onChange={e => actualizarCampo('rol', e.target.value)}
                  className={claseCampo(Boolean(errorRol), 'prolimal-input')}
                  aria-invalid={Boolean(errorRol)}
                  aria-describedby={errorRol ? 'error-rol-usuario-nuevo' : undefined}>
                  {ROLES_SIN_ADMIN.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <CampoError id="error-rol-usuario-nuevo" mensaje={errorRol} />
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button onClick={cerrarModal} className="prolimal-btn-secondary sm:w-auto">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-prolimal-ink-900/50 p-4 backdrop-blur-sm" onClick={cerrarModal}>
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
              <button onClick={cerrarModal} aria-label="Cerrar" className="prolimal-icon-btn h-9 w-9">
                <X className="h-4 w-4" />
              </button>
            </div>

            <AvisoErrorFormulario mensaje={errorGeneral} />

            <div className="space-y-3">
              <div>
                <input id="nombre-usuario-editar" type="text" name="nombre" autoComplete="off" placeholder="Nombre" value={form.nombre}
                  onChange={e => actualizarCampo('nombre', e.target.value)}
                  className={claseCampo(Boolean(errorNombre), 'prolimal-input')}
                  aria-invalid={Boolean(errorNombre)}
                  aria-describedby={errorNombre ? 'error-nombre-usuario-editar' : undefined} />
                <CampoError id="error-nombre-usuario-editar" mensaje={errorNombre} />
              </div>
              <div>
                <input id="password-usuario-editar" type="password" name="nueva-password" autoComplete="new-password" placeholder="Nueva contraseña (dejar vacío para no cambiar)" value={form.password}
                  onChange={e => actualizarCampo('password', e.target.value)}
                  className={claseCampo(Boolean(errorPassword), 'prolimal-input')}
                  aria-invalid={Boolean(errorPassword)}
                  aria-describedby={errorPassword ? 'error-password-usuario-editar' : undefined} />
                <CampoError id="error-password-usuario-editar" mensaje={errorPassword} />
              </div>
              {modalUsuario.email === ADMIN_EMAIL ? (
                <input value="admin" disabled
                  className="prolimal-input cursor-not-allowed opacity-70" />
              ) : (
                <div>
                  <select id="rol-usuario-editar" value={form.rol} onChange={e => actualizarCampo('rol', e.target.value)}
                    className={claseCampo(Boolean(errorRol), 'prolimal-input')}
                    aria-invalid={Boolean(errorRol)}
                    aria-describedby={errorRol ? 'error-rol-usuario-editar' : undefined}>
                    {ROLES_SIN_ADMIN.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <CampoError id="error-rol-usuario-editar" mensaje={errorRol} />
                </div>
              )}
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button onClick={cerrarModal} className="prolimal-btn-secondary sm:w-auto">
                  Cancelar
                </button>
                <button onClick={actualizarUsuario} className="prolimal-btn-primary flex-1">
                  Guardar cambios
                </button>
              </div>
              {modalUsuario.email !== ADMIN_EMAIL && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button onClick={() => { toggleActivo(modalUsuario); cerrarModal(); }}
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
