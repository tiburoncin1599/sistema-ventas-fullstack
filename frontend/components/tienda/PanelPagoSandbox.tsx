'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  QrCode,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useValidacionFormulario } from '@/lib/hooks/use-validacion-formulario';
import {
  longitudMinima,
  mensajeGeneral,
  primero,
  requerido,
  type ErroresFormulario,
} from '@/lib/validacion';
import { AvisoErrorFormulario, CampoError, claseCampo } from '@/components/ui/CampoError';

type PestañaSandbox = 'QR' | 'TARJETA';

type FormularioTarjeta = {
  numero: string;
  titular: string;
  expiracion: string;
  cvv: string;
};

export type ResultadoPagoSandbox = {
  pedidoId: number;
  referencia_transaccion: string;
  monto_pagado: number;
  total: number;
  saldo: number;
  estado: string;
  tipo_pago: string;
  metodo_pago: string;
};

const TARJETA_VACIA: FormularioTarjeta = {
  numero: '',
  titular: '',
  expiracion: '',
  cvv: '',
};

const TARJETA_PRUEBA: FormularioTarjeta = {
  numero: '4242 4242 4242 4242',
  titular: 'CLIENTE PRUEBA',
  expiracion: '12/30',
  cvv: '123',
};

const validarTarjeta = (
  form: FormularioTarjeta,
): ErroresFormulario<FormularioTarjeta> => {
  const errores: ErroresFormulario<FormularioTarjeta> = {};
  errores.numero = primero(
    requerido(form.numero, 'Ingresá el número de la tarjeta de prueba.'),
    /^\d{16}$/.test(form.numero.replace(/\s/g, ''))
      ? undefined
      : 'El número de tarjeta debe tener 16 dígitos.',
  );
  errores.titular = primero(
    requerido(form.titular, 'Ingresá el nombre del titular.'),
    longitudMinima(
      form.titular.trim(),
      3,
      'El titular debe tener al menos 3 caracteres.',
    ),
  );
  errores.expiracion = primero(
    requerido(form.expiracion, 'Ingresá la expiración de la tarjeta.'),
    /^(0[1-9]|1[0-2])\/\d{2}$/.test(form.expiracion.trim())
      ? undefined
      : 'Usá el formato MM/AA (por ejemplo, 12/30).',
  );
  errores.cvv = primero(
    requerido(form.cvv, 'Ingresá el CVV de la tarjeta.'),
    /^\d{3,4}$/.test(form.cvv.trim())
      ? undefined
      : 'El CVV debe tener 3 o 4 dígitos.',
  );
  return errores;
};

/** Panel de pasarela simulada: nunca se conecta a un cobro real. */
export function PanelPagoSandbox({
  pedidoId,
  monto,
  referencia,
  onAprobado,
}: {
  pedidoId: number;
  monto: number;
  referencia: string;
  onAprobado: (resultado: ResultadoPagoSandbox) => void;
}) {
  const [pestaña, setPestaña] = useState<PestañaSandbox>('QR');
  const [tarjeta, setTarjeta] = useState<FormularioTarjeta>(TARJETA_VACIA);
  const [qrImg, setQrImg] = useState('');
  const [errorQr, setErrorQr] = useState('');
  const [errorPago, setErrorPago] = useState('');
  const [rechazado, setRechazado] = useState('');
  const [cargando, setCargando] = useState(false);

  const montoTexto = `Bs. ${Number(monto || 0).toFixed(2)}`;

  const {
    errores,
    tocados,
    enviado,
    validarCampo,
    validarTodo,
    reiniciar,
  } = useValidacionFormulario<FormularioTarjeta>(validarTarjeta);

  const errorDe = (campo: keyof FormularioTarjeta) =>
    enviado || tocados[campo] ? errores[campo] : undefined;

  useEffect(() => {
    let activo = true;
    const contenido = `PROLIMAC-SANDBOX|${referencia}|${montoTexto}|Pedido ${pedidoId}`;
    void (async () => {
      try {
        const modulo = await import('qrcode');
        const generar = modulo.default?.toDataURL ?? modulo.toDataURL;
        const dataUrl = await generar(contenido, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 256,
          color: { dark: '#0b3b2e', light: '#ffffffff' },
        });
        if (activo) setQrImg(dataUrl);
      } catch {
        if (activo) {
          setErrorQr(
            'No se pudo generar el QR de prueba. Podés continuar con la tarjeta de prueba.',
          );
        }
      }
    })();
    return () => {
      activo = false;
    };
  }, [referencia, montoTexto, pedidoId]);

  const actualizarCampo = (campo: keyof FormularioTarjeta, valor: string) => {
    const siguiente = { ...tarjeta, [campo]: valor };
    setTarjeta(siguiente);
    validarCampo(campo, siguiente);
  };

  const rellenarTarjeta = () => {
    setTarjeta(TARJETA_PRUEBA);
    reiniciar();
  };

  const simularRechazo = () => {
    setErrorPago('');
    setRechazado(
      'Pago rechazado por la pasarela de prueba. No se registró ningún cobro; revisá los datos e intentá nuevamente.',
    );
  };

  const simularAprobacion = async () => {
    setRechazado('');
    setErrorPago('');
    if (pestaña === 'TARJETA' && !validarTodo(tarjeta)) return;

    setCargando(true);
    try {
      const res = await api.post(
        `/pedidos/${pedidoId}/confirmar-pago-sandbox`,
        {
          referencia_transaccion: referencia,
          metodo_pago: pestaña === 'QR' ? 'QR_SIMPLE' : 'TARJETA',
          avanzar_estado: true,
        },
      );
      onAprobado(res.data as ResultadoPagoSandbox);
    } catch (err: unknown) {
      setErrorPago(
        mensajeGeneral(
          err,
          'No se pudo confirmar el pago de prueba. Intentá nuevamente.',
        ),
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <section className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="prolimal-eyebrow">Pago digital</p>
          <h2 className="mt-2 text-xl font-extrabold tracking-tight text-prolimal-ink-900 dark:text-prolimal-sand-50">
            Pasarela de prueba
          </h2>
        </div>
        <span className="rounded-full border border-amber-400/60 bg-amber-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200">
          Entorno de Prueba / Sandbox
        </span>
      </div>

      <p className="mt-3 text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
        Pedido <strong>#{pedidoId}</strong> · Monto exacto{' '}
        <strong className="text-prolimal-ink-900 dark:text-prolimal-sand-50">
          {montoTexto}
        </strong>
      </p>

      <div
        role="tablist"
        aria-label="Método de pago digital de prueba"
        className="mt-5 grid grid-cols-2 gap-1 rounded-full border border-prolimal-ink-900/10 bg-prolimal-sand-50 p-1 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800"
      >
        <button
          type="button"
          role="tab"
          aria-selected={pestaña === 'QR'}
          onClick={() => { setPestaña('QR'); setErrorPago(''); }}
          className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-full px-2 py-2 text-[9px] font-bold uppercase leading-tight tracking-[0.06em] transition-colors sm:min-h-10 sm:flex-row sm:gap-1.5 sm:px-3 sm:text-[11px] sm:tracking-[0.08em] ${
            pestaña === 'QR'
              ? 'bg-prolimal-ink-900 text-prolimal-sand-50 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
              : 'text-prolimal-ink-500 dark:text-prolimal-ink-200'
          }`}
        >
          <QrCode className="h-3.5 w-3.5" />
          QR Simple Bolivia
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pestaña === 'TARJETA'}
          onClick={() => { setPestaña('TARJETA'); setErrorPago(''); }}
          className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-full px-2 py-2 text-[9px] font-bold uppercase leading-tight tracking-[0.06em] transition-colors sm:min-h-10 sm:flex-row sm:gap-1.5 sm:px-3 sm:text-[11px] sm:tracking-[0.08em] ${
            pestaña === 'TARJETA'
              ? 'bg-prolimal-ink-900 text-prolimal-sand-50 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
              : 'text-prolimal-ink-500 dark:text-prolimal-ink-200'
          }`}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Tarjeta Débito / Crédito
        </button>
      </div>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void simularAprobacion();
        }}
        className="mt-5"
      >
        {pestaña === 'QR' ? (
          <div className="rounded-2xl border border-prolimal-ink-900/10 bg-white p-4 text-center dark:border-prolimal-sand-100/10">
            {qrImg ? (
              <img
                src={qrImg}
                alt="QR de pago Sandbox"
                className="mx-auto aspect-square h-auto w-full max-w-[192px] rounded-2xl bg-white p-2 object-contain"
              />
            ) : (
              <div className="mx-auto flex aspect-square w-full max-w-[192px] items-center justify-center rounded-2xl bg-prolimal-sand-100 text-xs font-semibold text-prolimal-ink-400 dark:bg-prolimal-ink-800">
                Generando QR de prueba...
              </div>
            )}
            <CampoError mensaje={errorQr} />
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
              QR Simple Bolivia · Sandbox
            </p>
            <p className="mt-1 text-sm font-bold text-prolimal-ink-900 dark:text-prolimal-sand-50">
              {montoTexto}
            </p>
            <p className="mt-2 break-all text-[11px] font-mono text-prolimal-ink-500 dark:text-prolimal-ink-200">
              Referencia: {referencia}
            </p>
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-prolimal-ink-900/10 bg-prolimal-sand-50/70 p-4 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/50">
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                Datos de la tarjeta de prueba
              </p>
              <button
                type="button"
                onClick={rellenarTarjeta}
                className="text-xs font-bold text-prolimal-teal-700 underline underline-offset-4 hover:text-prolimal-teal-500 dark:text-prolimal-teal-300"
              >
                Rellenar tarjeta de prueba
              </button>
            </div>

            <div>
              <label htmlFor="sandbox-numero" className="text-xs font-bold text-prolimal-ink-700 dark:text-prolimal-sand-100">
                Número de tarjeta
              </label>
              <input
                id="sandbox-numero"
                value={tarjeta.numero}
                onChange={(e) => actualizarCampo('numero', e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                placeholder="4242 4242 4242 4242"
                aria-invalid={Boolean(errorDe('numero'))}
                aria-describedby={errorDe('numero') ? 'sandbox-numero-error' : undefined}
                className={claseCampo(
                  Boolean(errorDe('numero')),
                  'prolimal-input mt-1.5 w-full',
                )}
              />
              <CampoError id="sandbox-numero-error" mensaje={errorDe('numero')} />
            </div>

            <div>
              <label htmlFor="sandbox-titular" className="text-xs font-bold text-prolimal-ink-700 dark:text-prolimal-sand-100">
                Titular
              </label>
              <input
                id="sandbox-titular"
                value={tarjeta.titular}
                onChange={(e) => actualizarCampo('titular', e.target.value)}
                autoComplete="off"
                placeholder="CLIENTE PRUEBA"
                aria-invalid={Boolean(errorDe('titular'))}
                aria-describedby={errorDe('titular') ? 'sandbox-titular-error' : undefined}
                className={claseCampo(
                  Boolean(errorDe('titular')),
                  'prolimal-input mt-1.5 w-full',
                )}
              />
              <CampoError id="sandbox-titular-error" mensaje={errorDe('titular')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sandbox-expiracion" className="text-xs font-bold text-prolimal-ink-700 dark:text-prolimal-sand-100">
                  Expiración
                </label>
                <input
                  id="sandbox-expiracion"
                  value={tarjeta.expiracion}
                  onChange={(e) => actualizarCampo('expiracion', e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="MM/AA"
                  aria-invalid={Boolean(errorDe('expiracion'))}
                  aria-describedby={errorDe('expiracion') ? 'sandbox-expiracion-error' : undefined}
                  className={claseCampo(
                    Boolean(errorDe('expiracion')),
                    'prolimal-input mt-1.5 w-full',
                  )}
                />
                <CampoError id="sandbox-expiracion-error" mensaje={errorDe('expiracion')} />
              </div>
              <div>
                <label htmlFor="sandbox-cvv" className="text-xs font-bold text-prolimal-ink-700 dark:text-prolimal-sand-100">
                  CVV
                </label>
                <input
                  id="sandbox-cvv"
                  value={tarjeta.cvv}
                  onChange={(e) => actualizarCampo('cvv', e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="123"
                  aria-invalid={Boolean(errorDe('cvv'))}
                  aria-describedby={errorDe('cvv') ? 'sandbox-cvv-error' : undefined}
                  className={claseCampo(
                    Boolean(errorDe('cvv')),
                    'prolimal-input mt-1.5 w-full',
                  )}
                />
                <CampoError id="sandbox-cvv-error" mensaje={errorDe('cvv')} />
              </div>
            </div>
            <p className="break-all text-[11px] font-mono text-prolimal-ink-500 dark:text-prolimal-ink-200">
              Referencia: {referencia}
            </p>
          </div>
        )}

        <div className="mt-5 space-y-3">
          <AvisoErrorFormulario mensaje={errorPago || rechazado} />

          <button
            type="submit"
            disabled={cargando}
            className="prolimal-btn-primary w-full disabled:pointer-events-none disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {cargando ? 'Confirmando pago...' : 'Simular Pago Aprobado'}
          </button>
          <button
            type="button"
            onClick={simularRechazo}
            disabled={cargando}
            className="prolimal-btn-ghost-danger w-full disabled:pointer-events-none disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Simular Pago Rechazado
          </button>
          <p className="flex items-center justify-center gap-2 text-[11px] font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
            <ShieldCheck className="h-4 w-4 text-prolimal-teal-600 dark:text-prolimal-teal-300" />
            Entorno de Prueba / Sandbox: no se realiza ningún cobro real.
          </p>
        </div>
      </form>
    </section>
  );
}
