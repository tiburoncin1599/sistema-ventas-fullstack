'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { normalizarRol } from '@/lib/roles';
import { useValidacionFormulario } from '@/lib/hooks/use-validacion-formulario';
import {
  email,
  mapearErroresBackend,
  mensajeGeneral,
  primero,
  requerido,
  type ErroresFormulario,
} from '@/lib/validacion';
import { AvisoErrorFormulario, CampoError, claseCampo } from '@/components/ui/CampoError';
import { Store } from 'lucide-react';

type FormularioVentas = { email: string; password: string };

const aliasErroresVentas: Partial<Record<string, keyof FormularioVentas | '_general'>> = {
  'correo electrónico': 'email',
  correo: 'email',
  email: 'email',
  contraseña: 'password',
  password: 'password',
};

export default function VentasLoginPage() {
  const [form, setForm] = useState<FormularioVentas>({ email: '', password: '' });
  const [cargando, setCargando] = useState(false);

  const validar = useCallback(
    (valores: FormularioVentas): ErroresFormulario<FormularioVentas> => {
      const errores: ErroresFormulario<FormularioVentas> = {};

      const mensajeEmail = primero(
        requerido(valores.email, 'Ingresá tu correo electrónico'),
        email(valores.email),
      );
      if (mensajeEmail) errores.email = mensajeEmail;

      const mensajePassword = requerido(valores.password, 'Ingresá tu contraseña');
      if (mensajePassword) errores.password = mensajePassword;

      return errores;
    },
    [],
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
  } = useValidacionFormulario<FormularioVentas>(validar);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // LoginDto: sin validación explícita no se puede llegar al api.post.
    if (!validarTodo(form)) return;

    setCargando(true);
    try {
      const res = await api.post('/auth/login', {
        email: form.email,
        password: form.password,
      });
      const usuario = {
        ...res.data.usuario,
        rol: normalizarRol(res.data.usuario?.rol),
      };
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
      document.cookie = `token=${res.data.token}; path=/; max-age=604800`;
      document.cookie = `usuario=${encodeURIComponent(JSON.stringify(usuario))}; path=/; max-age=604800`;
      window.dispatchEvent(new Event('auth-change'));
      const rol = usuario?.rol;
      // Navegación completa: el proxy debe evaluar las cookies recién
      // escritas; un router.push puede reutilizar un RSC prefetcheado
      // antes del login (sin sesión) y redirigir de vuelta al formulario.
      const destino =
        rol === 'ventas'
          ? '/ventas'
          : rol === 'admin'
            ? '/admin'
            : rol === 'inventario'
              ? '/admin/inventario'
              : '/';
      window.location.assign(destino);
    } catch (err: unknown) {
      const mapeados = mapearErroresBackend<FormularioVentas>(
        err,
        ['email', 'password'],
        aliasErroresVentas,
      );
      aplicarErroresBackend(err, ['email', 'password'], aliasErroresVentas);
      // Si viene un error de campo, el banner conserva el texto genérico del
      // hook para no repetir el mismo mensaje debajo del input y arriba.
      if (!Object.keys(mapeados).some((campo) => campo !== '_general')) {
        setErrorGeneral(mensajeGeneral(err, 'Credenciales incorrectas'));
      }
    } finally {
      setCargando(false);
    }
  };

  const errorEmail = enviado || tocados.email ? errores.email : undefined;
  const errorPassword = enviado || tocados.password ? errores.password : undefined;

  return (
    <main className="prolimal-page flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-8 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-10">
          <div className="mb-8 text-center">
            <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-prolimal-ink-900 text-prolimal-sand-50 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900">
              <Store className="h-6 w-6" />
            </span>
            <p className="prolimal-eyebrow">Acceso interno</p>
            <h1 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
              Portal de Ventas
            </h1>
            <p className="mt-2 text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
              Acceso exclusivo para vendedores
            </p>
          </div>

          <AvisoErrorFormulario mensaje={errorGeneral} />

          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block" htmlFor="ventas-email">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  Email corporativo
                </span>
                <input
                  id="ventas-email"
                  type="email"
                  autoComplete="email"
                  placeholder="vendedor@prolimac.com"
                  value={form.email}
                  onChange={e => {
                    const nuevo = { ...form, email: e.target.value };
                    setForm(nuevo);
                    validarCampo('email', nuevo);
                  }}
                  onBlur={() => marcarTocado('email')}
                  required
                  className={claseCampo(Boolean(errorEmail), 'prolimal-input')}
                  aria-invalid={Boolean(errorEmail)}
                  aria-describedby={errorEmail ? 'ventas-email-error' : undefined}
                />
              </label>
              <CampoError mensaje={errorEmail} id="ventas-email-error" />
            </div>
            <div>
              <label className="block" htmlFor="ventas-password">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  Contraseña
                </span>
                <input
                  id="ventas-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  value={form.password}
                  onChange={e => {
                    const nuevo = { ...form, password: e.target.value };
                    setForm(nuevo);
                    validarCampo('password', nuevo);
                  }}
                  onBlur={() => marcarTocado('password')}
                  required
                  className={claseCampo(Boolean(errorPassword), 'prolimal-input')}
                  aria-invalid={Boolean(errorPassword)}
                  aria-describedby={errorPassword ? 'ventas-password-error' : undefined}
                />
              </label>
              <CampoError mensaje={errorPassword} id="ventas-password-error" />
            </div>

            <button type="submit" disabled={cargando} className="prolimal-btn-primary w-full">
              {cargando ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
            ¿No tenés cuenta de vendedor? Solicitala al administrador.
          </p>
        </div>

        <p className="mt-6 text-center text-xs font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
          <Link href="/" className="text-prolimal-teal-700 hover:underline dark:text-prolimal-teal-300">
            ← Volver a la tienda
          </Link>
        </p>
      </div>
    </main>
  );
}
