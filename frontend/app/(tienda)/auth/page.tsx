'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, MapPin, Phone, ShieldCheck, Sparkles, User } from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { normalizarRol } from '@/lib/roles';
import { useValidacionFormulario } from '@/lib/hooks/use-validacion-formulario';
import {
  email,
  longitudMaxima,
  longitudMinima,
  mapearErroresBackend,
  mensajeGeneral,
  primero,
  requerido,
  type ErroresFormulario,
} from '@/lib/validacion';
import { AvisoErrorFormulario, CampoError, claseCampo } from '@/components/ui/CampoError';

type FormularioAuth = {
  nombre: string;
  email: string;
  password: string;
  telefono: string;
  ubicacion: string;
};

const aliasErroresAuth: Partial<Record<string, keyof FormularioAuth | '_general'>> = {
  'correo electrónico': 'email',
  correo: 'email',
  email: 'email',
  contraseña: 'password',
  password: 'password',
  nombre: 'nombre',
  'teléfono': 'telefono',
  telefono: 'telefono',
  'ubicación': 'ubicacion',
  ubicacion: 'ubicacion',
};

const CORREO_DUPLICADO = /ya está registrado|already (registered|exists)/i;

function AuthContent() {
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [form, setForm] = useState<FormularioAuth>({
    nombre: '',
    email: '',
    password: '',
    telefono: '',
    ubicacion: '',
  });
  const [cargando, setCargando] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const params = useSearchParams();

  const validar = useCallback(
    (valores: FormularioAuth): ErroresFormulario<FormularioAuth> => {
      const errores: ErroresFormulario<FormularioAuth> = {};

      const mensajeEmail = primero(
        requerido(valores.email, 'Ingresá tu correo electrónico'),
        email(valores.email),
      );
      if (mensajeEmail) errores.email = mensajeEmail;

      const mensajePassword = modo === 'registro'
        ? primero(
            requerido(valores.password, 'La contraseña es obligatoria'),
            longitudMinima(valores.password, 6, 'La contraseña debe tener al menos 6 caracteres'),
          )
        : requerido(valores.password, 'Ingresá tu contraseña');
      if (mensajePassword) errores.password = mensajePassword;

      // En login el DTO no incluye estos campos: no deben generar errores ni bloquear el POST.
      if (modo === 'registro') {
        const mensajeNombre = requerido(valores.nombre, 'Ingresá tu nombre completo');
        if (mensajeNombre) errores.nombre = mensajeNombre;

        const mensajeTelefono = primero(
          requerido(valores.telefono, 'Ingresá tu número de teléfono'),
          valores.telefono.trim().replace(/\D/g, '').length < 7
            ? 'Ingresá un teléfono válido (al menos 7 dígitos)'
            : undefined,
          longitudMaxima(valores.telefono, 255, 'El teléfono es demasiado largo'),
        );
        if (mensajeTelefono) errores.telefono = mensajeTelefono;

        const mensajeUbicacion = primero(
          requerido(valores.ubicacion, 'Ingresá tu ubicación para la entrega'),
          longitudMinima(valores.ubicacion, 3, 'Ingresá una ubicación más precisa'),
          longitudMaxima(valores.ubicacion, 255, 'La ubicación es demasiado larga'),
        );
        if (mensajeUbicacion) errores.ubicacion = mensajeUbicacion;
      }

      return errores;
    },
    [modo],
  );

  const {
    errores,
    tocados,
    enviado,
    errorGeneral,
    setErrorGeneral,
    marcarTocado,
    validarCampo,
    validarTodo,
    aplicarErroresBackend,
    reiniciar,
  } = useValidacionFormulario<FormularioAuth>(validar);

  useEffect(() => {
    const err = params.get('error');
    if (err) setErrorGeneral(decodeURIComponent(err)); // eslint-disable-line react-hooks/set-state-in-effect
  }, [params, setErrorGeneral]);

  const cambiarModo = (nuevoModo: 'login' | 'registro') => {
    if (nuevoModo === modo) return;
    setModo(nuevoModo);
    reiniciar();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Validación explícita: sin esto el POST se dispararía con campos vacíos.
    if (!validarTodo(form)) return;

    setCargando(true);
    try {
      const data = modo === 'login'
        ? { email: form.email.trim(), password: form.password }
        : {
            nombre: form.nombre.trim(),
            email: form.email.trim(),
            password: form.password,
            telefono: form.telefono.trim(),
            ubicacion: form.ubicacion.trim(),
          };
      const url = modo === 'login' ? '/auth/login' : '/auth/registro';
      const res = await api.post(url, data);
      const usuario = {
        ...res.data.usuario,
        rol: normalizarRol(res.data.usuario?.rol),
      };
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
      document.cookie = `token=${res.data.token}; path=/; max-age=604800`;
      document.cookie = `usuario=${encodeURIComponent(JSON.stringify(usuario))}; path=/; max-age=604800`;
      window.dispatchEvent(new Event('auth-change'));
      // Navegación completa para que el proxy lea las cookies recién escritas.
      const destino =
        usuario.rol === 'admin'
          ? '/admin'
          : usuario.rol === 'inventario'
            ? '/admin/inventario'
            : usuario.rol === 'ventas'
              ? '/ventas'
              : '/';
      window.location.assign(destino);
    } catch (err: unknown) {
      const mensajeBackend = mensajeGeneral(err, '');
      const campos = ['nombre', 'email', 'password', 'telefono', 'ubicacion'] as const;
      const mapeados = mapearErroresBackend<FormularioAuth>(err, [...campos], aliasErroresAuth);
      aplicarErroresBackend(err, [...campos], aliasErroresAuth);

      if (CORREO_DUPLICADO.test(mensajeBackend)) {
        setErrorGeneral('Este correo electrónico ya está registrado. Ingresá con él o usá otro correo.');
      } else if (!Object.keys(mapeados).some((campo) => campo !== '_general')) {
        setErrorGeneral(
          mensajeGeneral(
            err,
            modo === 'registro'
              ? 'No se pudo completar el registro. Revisá tus datos.'
              : 'No se pudo iniciar sesión. Revisá tus datos.',
          ),
        );
      }
    } finally {
      setCargando(false);
    }
  };

  const errorNombre = modo === 'registro' && (enviado || tocados.nombre) ? errores.nombre : undefined;
  const errorTelefono = modo === 'registro' && (enviado || tocados.telefono) ? errores.telefono : undefined;
  const errorUbicacion = modo === 'registro' && (enviado || tocados.ubicacion) ? errores.ubicacion : undefined;
  const errorEmail = enviado || tocados.email ? errores.email : undefined;
  const errorPassword = enviado || tocados.password ? errores.password : undefined;

  return (
    <main className="prolimal-page min-h-[calc(100vh-5.5rem)] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2.5rem] border border-prolimal-ink-900/10 bg-card shadow-[0_40px_100px_-60px_rgba(11,37,32,0.55)] dark:border-prolimal-sand-100/10 dark:bg-card-dark lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative hidden overflow-hidden bg-prolimal-ink-900 p-10 text-prolimal-sand-50 lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-prolimal-teal-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-80 w-80 rounded-full bg-prolimal-coral-500/15 blur-3xl" />

          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-prolimal-sand-50 p-1.5">
                <img src="/logo.png" alt="Logo PROLIMAC" className="h-full w-full object-contain" />
              </span>
              <span className="flex flex-col">
                <span className="text-lg font-extrabold tracking-[-0.04em]">PROLIMAC</span>
                <span className="prolimal-display text-sm italic text-prolimal-teal-300">limpieza que respira</span>
              </span>
            </Link>
          </div>

          <div className="relative my-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.22em] text-prolimal-teal-200">
              <Sparkles className="h-3.5 w-3.5" />
              Tu espacio, tu ritmo
            </span>
            <h1 className="prolimal-display mt-6 text-[3.4rem] leading-[0.92] tracking-[-0.055em]">
              Una compra simple.
              {' '}<span className="block italic text-prolimal-coral-300">Un espacio mejor.</span>
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-prolimal-sand-100/70">
              Ingresá para guardar tus productos, seguir tus pedidos y coordinar la entrega de forma directa.
            </p>
          </div>

          <div className="relative space-y-3 text-sm text-prolimal-sand-100/75">
            <p className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-prolimal-teal-300" />
              Seguimiento de tus pedidos
            </p>
            <p className="flex items-center gap-3">
              <ArrowRight className="h-4 w-4 text-prolimal-teal-300" />
              Compra coordinada por WhatsApp
            </p>
            <p className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-prolimal-teal-300" />
              Atención cercana en Cochabamba
            </p>
          </div>
        </section>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <Link
              href="/"
              className="group mb-8 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-400 transition-colors hover:text-prolimal-teal-700 dark:text-prolimal-ink-300 dark:hover:text-prolimal-teal-300 lg:hidden"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Volver al inicio
            </Link>

            <p className="prolimal-eyebrow">{modo === 'login' ? 'Bienvenido de nuevo' : 'Creá tu cuenta'}</p>
            <h2 className="prolimal-display mt-3 text-4xl leading-none tracking-[-0.045em] text-prolimal-ink-900 dark:text-prolimal-sand-50 sm:text-5xl">
              {modo === 'login' ? 'Ingresá a tu cuenta.' : 'Empezá hoy.'}
            </h2>
            <p className="mt-3 text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
              {modo === 'login'
                ? 'Tus productos y pedidos, siempre a mano.'
                : 'Creá tu cuenta para comprar y seguir tus pedidos.'}
            </p>

            <div className="mt-7 grid grid-cols-2 rounded-full border border-prolimal-ink-900/10 bg-prolimal-sand-50 p-1 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800">
              <button
                type="button"
                onClick={() => cambiarModo('login')}
                className={`rounded-full py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
                  modo === 'login'
                    ? 'bg-prolimal-ink-900 text-prolimal-sand-50 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
                    : 'text-prolimal-ink-500 dark:text-prolimal-ink-200'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => cambiarModo('registro')}
                className={`rounded-full py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
                  modo === 'registro'
                    ? 'bg-prolimal-ink-900 text-prolimal-sand-50 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
                    : 'text-prolimal-ink-500 dark:text-prolimal-ink-200'
                }`}
              >
                Registrarse
              </button>
            </div>

            <AvisoErrorFormulario mensaje={errorGeneral} />

            <form noValidate onSubmit={handleSubmit} className="mt-7 space-y-4">
              {modo === 'registro' && (
                <div>
                  <label className="block" htmlFor="auth-nombre">
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                      Nombre completo
                    </span>
                    <span className="relative block">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400" />
                      <input
                        id="auth-nombre"
                        type="text"
                        name="nombre"
                        autoComplete="name"
                        placeholder="Tu nombre"
                        value={form.nombre}
                        onChange={e => {
                          const nuevo = { ...form, nombre: e.target.value };
                          setForm(nuevo);
                          validarCampo('nombre', nuevo);
                        }}
                        onBlur={() => marcarTocado('nombre')}
                        className={claseCampo(Boolean(errorNombre), 'prolimal-input pl-11')}
                        aria-invalid={Boolean(errorNombre)}
                        aria-describedby={errorNombre ? 'auth-nombre-error' : undefined}
                        required
                      />
                    </span>
                  </label>
                  <CampoError mensaje={errorNombre} id="auth-nombre-error" />
                </div>
              )}

              {modo === 'registro' && (
                <div>
                  <label className="block" htmlFor="auth-telefono">
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                      Número de teléfono
                    </span>
                    <span className="relative block">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400" />
                      <input
                        id="auth-telefono"
                        type="tel"
                        name="telefono"
                        autoComplete="tel"
                        placeholder="Ej. 77012345"
                        value={form.telefono}
                        onChange={e => {
                          const nuevo = { ...form, telefono: e.target.value };
                          setForm(nuevo);
                          validarCampo('telefono', nuevo);
                        }}
                        onBlur={() => marcarTocado('telefono')}
                        className={claseCampo(Boolean(errorTelefono), 'prolimal-input pl-11')}
                        aria-invalid={Boolean(errorTelefono)}
                        aria-describedby={errorTelefono ? 'auth-telefono-error' : undefined}
                        required
                      />
                    </span>
                  </label>
                  <CampoError mensaje={errorTelefono} id="auth-telefono-error" />
                </div>
              )}

              {modo === 'registro' && (
                <div>
                  <label className="block" htmlFor="auth-ubicacion">
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                      Ubicación para la entrega
                    </span>
                    <span className="relative block">
                      <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400" />
                      <input
                        id="auth-ubicacion"
                        type="text"
                        name="ubicacion"
                        autoComplete="street-address"
                        placeholder="Barrio, calle y número"
                        value={form.ubicacion}
                        onChange={e => {
                          const nuevo = { ...form, ubicacion: e.target.value };
                          setForm(nuevo);
                          validarCampo('ubicacion', nuevo);
                        }}
                        onBlur={() => marcarTocado('ubicacion')}
                        className={claseCampo(Boolean(errorUbicacion), 'prolimal-input pl-11')}
                        aria-invalid={Boolean(errorUbicacion)}
                        aria-describedby={errorUbicacion ? 'auth-ubicacion-error' : undefined}
                        required
                      />
                    </span>
                  </label>
                  <CampoError mensaje={errorUbicacion} id="auth-ubicacion-error" />
                </div>
              )}

              <div>
                <label className="block" htmlFor="auth-email">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    Correo electrónico
                  </span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400" />
                    <input
                      id="auth-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="vos@correo.com"
                      value={form.email}
                      onChange={e => {
                        const nuevo = { ...form, email: e.target.value };
                        setForm(nuevo);
                        validarCampo('email', nuevo);
                      }}
                      onBlur={() => marcarTocado('email')}
                      className={claseCampo(Boolean(errorEmail), 'prolimal-input pl-11')}
                      aria-invalid={Boolean(errorEmail)}
                      aria-describedby={errorEmail ? 'auth-email-error' : undefined}
                      required
                    />
                  </span>
                </label>
                <CampoError mensaje={errorEmail} id="auth-email-error" />
              </div>

              <div>
                <label className="block" htmlFor="auth-password">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    Contraseña
                  </span>
                  <span className="relative block">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400" />
                    <input
                      id="auth-password"
                      type={verPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                      placeholder="Tu contraseña"
                      value={form.password}
                      onChange={e => {
                        const nuevo = { ...form, password: e.target.value };
                        setForm(nuevo);
                        validarCampo('password', nuevo);
                      }}
                      onBlur={() => marcarTocado('password')}
                      className={claseCampo(Boolean(errorPassword), 'prolimal-input pl-11 pr-12')}
                      aria-invalid={Boolean(errorPassword)}
                      aria-describedby={errorPassword ? 'auth-password-error' : undefined}
                      minLength={modo === 'registro' ? 6 : undefined}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setVerPassword(!verPassword)}
                      aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-prolimal-ink-400 transition-colors hover:bg-prolimal-sand-100 hover:text-prolimal-ink-700 dark:hover:bg-prolimal-ink-700 dark:hover:text-prolimal-sand-100"
                    >
                      {verPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </span>
                </label>
                <CampoError mensaje={errorPassword} id="auth-password-error" />
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="prolimal-btn-primary w-full py-3.5"
              >
                {cargando ? 'Cargando...' : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
                {!cargando && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-prolimal-ink-900/10 dark:border-prolimal-sand-100/10" />
              </div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-[0.16em]">
                <span className="bg-card px-3 text-prolimal-ink-400 dark:bg-card-dark dark:text-prolimal-ink-300">
                  O continuá con
                </span>
              </div>
            </div>

            <a
              href={`${API_URL}/auth/google`}
              className="prolimal-btn-secondary w-full py-3"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className="prolimal-page flex min-h-screen items-center justify-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-prolimal-ink-400">Cargando...</p>
        </main>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
