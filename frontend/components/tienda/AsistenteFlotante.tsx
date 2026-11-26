'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot,
  ExternalLink,
  Headphones,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  consultarAsistente,
  MENSAJE_BIENVENIDA,
  OPCIONES_RAPIDAS,
  type AccionAsistente,
  type PedidoAsistente,
  type ProductoAsistente,
} from '@/lib/asistente';

type MensajeChat = {
  id: string;
  autor: 'asistente' | 'usuario';
  texto: string;
  opciones?: string[];
  acciones?: AccionAsistente[];
  productos?: ProductoAsistente[];
  pedidos?: PedidoAsistente[];
};

const LLAVE_SESION = 'prolimac:asistente:historial:v3';
const WHATSAPP_NUMERO = (
  process.env.NEXT_PUBLIC_WHATSAPP || '59170000000'
).replace(/\D/g, '') || '59170000000';

function crearMensaje(
  autor: MensajeChat['autor'],
  texto: string,
  extra: Partial<MensajeChat> = {},
): MensajeChat {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    autor,
    texto,
    ...extra,
  };
}

type BloqueMensaje =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'lista'; ordenada: boolean; items: string[] };

const NUMERADA = /^\s*\d+\.\s+(.*)$/;
const VINETA = /^\s*[•*\-]\s+(.*)$/;

/** Convierte las líneas `1. ...` y `• ...` del backend en bloques listos para renderizar. */
function parsearMensaje(texto: string): BloqueMensaje[] {
  const bloques: BloqueMensaje[] = [];
  let pendiente: string[] = [];

  const volcarTexto = () => {
    if (pendiente.length === 0) return;
    bloques.push({ tipo: 'texto', texto: pendiente.join('\n') });
    pendiente = [];
  };

  const lineas = texto.split('\n');
  let indice = 0;

  while (indice < lineas.length) {
    const linea = lineas[indice] ?? '';
    const esNumerada = NUMERADA.test(linea);
    const esVineta = VINETA.test(linea);

    if (esNumerada || esVineta) {
      volcarTexto();
      const ordenada = esNumerada;
      const items: string[] = [];

      while (indice < lineas.length) {
        const actual = lineas[indice] ?? '';
        const coincidencia = ordenada
          ? NUMERADA.exec(actual)
          : VINETA.exec(actual);
        if (!coincidencia) break;
        items.push(coincidencia[1] ?? '');
        indice += 1;
      }

      bloques.push({ tipo: 'lista', ordenada, items });
      continue;
    }

    if (linea.trim() === '') {
      volcarTexto();
      indice += 1;
      continue;
    }

    pendiente.push(linea);
    indice += 1;
  }

  volcarTexto();
  return bloques;
}

/** Resalta la etiqueta antes de los dos puntos, p. ej. "Crear cuenta:". */
function resaltarEtiqueta(item: string): ReactNode {
  const separador = item.indexOf(':');
  if (separador <= 0 || separador > 60) return item;
  return (
    <>
      <strong className="font-extrabold text-prolimal-ink-900 dark:text-prolimal-sand-50">
        {item.slice(0, separador + 1)}
      </strong>
      {item.slice(separador + 1)}
    </>
  );
}

function ContenidoMensaje({ texto }: { texto: string }) {
  const bloques = parsearMensaje(texto);

  return (
    <div className="space-y-2">
      {bloques.map((bloque, indice) => {
        if (bloque.tipo === 'texto') {
          return (
            <p key={`t-${indice}`} className="whitespace-pre-line">
              {bloque.texto}
            </p>
          );
        }

        const items = bloque.items.map((item, posicion) => (
          <li key={`${indice}-${posicion}`}>{resaltarEtiqueta(item)}</li>
        ));

        return bloque.ordenada ? (
          <ol
            key={`l-${indice}`}
            className="ml-4 list-decimal space-y-1.5 pl-1 marker:font-bold marker:text-prolimal-teal-700 dark:marker:text-prolimal-teal-300"
          >
            {items}
          </ol>
        ) : (
          <ul
            key={`l-${indice}`}
            className="ml-4 list-disc space-y-1 pl-1 marker:text-prolimal-teal-600 dark:marker:text-prolimal-teal-300"
          >
            {items}
          </ul>
        );
      })}
    </div>
  );
}

/**
 * Widget flotante del asistente. z-[55] queda por encima del header sticky
 * (z-50) pero debajo de toasts (z-60), menú móvil (z-70) y carrito (z-80).
 * En /checkout se oculta para no tapar los botones de pago.
 */
export default function AsistenteFlotante() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [entrada, setEntrada] = useState('');
  const [cargando, setCargando] = useState(false);
  const [hidratado, setHidratado] = useState(false);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([
    crearMensaje('asistente', MENSAJE_BIENVENIDA),
  ]);
  const finMensajesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const guardado = sessionStorage.getItem(LLAVE_SESION);
      if (guardado) {
        const parseado: unknown = JSON.parse(guardado);
        if (Array.isArray(parseado) && parseado.length > 0) {
          setMensajes(parseado as MensajeChat[]);
        }
      }
    } catch {
      // Historial inválido: se conserva el mensaje de bienvenida.
    }
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    try {
      sessionStorage.setItem(LLAVE_SESION, JSON.stringify(mensajes.slice(-40)));
    } catch {
      // Modo privado o sin espacio: el chat sigue funcionando en memoria.
    }
  }, [mensajes, hidratado]);

  useEffect(() => {
    if (!abierto) return;
    finMensajesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [abierto, mensajes, cargando]);

  async function enviar(texto: string) {
    const consulta = texto.trim();
    if (!consulta || cargando) return;

    setMensajes((prev) => [...prev, crearMensaje('usuario', consulta)]);
    setEntrada('');
    setCargando(true);

    try {
      const respuesta = await consultarAsistente(consulta);
      setMensajes((prev) => [
        ...prev,
        crearMensaje('asistente', respuesta.mensaje, {
          opciones: respuesta.opciones,
          acciones: respuesta.acciones,
          productos: respuesta.productos,
          pedidos: respuesta.pedidos,
        }),
      ]);
    } catch {
      setMensajes((prev) => [
        ...prev,
        crearMensaje(
          'asistente',
          'No pude completar tu consulta en este momento. Inténtalo de nuevo o escríbenos directamente y te atendemos.',
          {
            acciones: [
              {
                etiqueta: 'Contactar con ventas',
                url: `https://wa.me/${WHATSAPP_NUMERO}`,
                externa: true,
              },
            ],
          },
        ),
      ]);
    } finally {
      setCargando(false);
    }
  }

  function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    void enviar(entrada);
  }

  function limpiarChat() {
    setMensajes([crearMensaje('asistente', MENSAJE_BIENVENIDA)]);
    setEntrada('');
    try {
      sessionStorage.removeItem(LLAVE_SESION);
    } catch {
      // Nada que limpiar si el almacenamiento no está disponible.
    }
  }

  // En el checkout los botones de pago tienen prioridad sobre el widget.
  if (pathname.startsWith('/checkout')) return null;

  return (
    <>
      <AnimatePresence>
        {abierto && (
          <motion.section
            key="asistente-panel"
            role="dialog"
            aria-label="Asistente PROLIMAC SRL"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-[55] flex max-h-[min(75vh,calc(100dvh-8rem))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-[1.75rem] border border-prolimal-ink-900/10 bg-card shadow-[0_30px_80px_-30px_rgba(11,37,32,0.7)] dark:border-prolimal-sand-100/10 dark:bg-prolimal-dark-900 sm:left-auto sm:right-6 sm:max-h-[min(75vh,560px)] sm:w-[390px]"
          >
            <header className="flex items-start gap-3 bg-prolimal-ink-900 px-4 py-4 text-prolimal-sand-50 dark:bg-prolimal-teal-900">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-prolimal-teal-500/20 text-prolimal-teal-200">
                <Bot className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="prolimal-eyebrow text-prolimal-teal-200">
                  Atención inmediata
                </p>
                <h2 className="mt-0.5 truncate text-base font-extrabold tracking-tight">
                  Asistente PROLIMAC SRL
                </h2>
                <p className="mt-0.5 text-xs text-prolimal-sand-200/80">
                  Productos, paquetes, pagos y pedidos
                </p>
              </div>
              <button
                type="button"
                onClick={limpiarChat}
                aria-label="Limpiar conversación"
                title="Limpiar conversación"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-prolimal-sand-200/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Minimizar chat"
                title="Minimizar chat"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-prolimal-sand-200/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>

            <div
              className="flex-1 space-y-3 overflow-y-auto bg-prolimal-sand-50 px-4 py-4 dark:bg-prolimal-dark-900"
              aria-live="polite"
            >
              {mensajes.map((mensaje) => {
                const esUsuario = mensaje.autor === 'usuario';
                return (
                  <div
                    key={mensaje.id}
                    className={`flex ${esUsuario ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[88%] break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                        esUsuario
                          ? 'rounded-br-sm bg-prolimal-teal-700 text-white'
                          : 'rounded-bl-sm border border-prolimal-ink-900/10 bg-card text-prolimal-ink-700 dark:border-prolimal-sand-100/10 dark:bg-prolimal-dark-800 dark:text-prolimal-sand-100'
                      }`}
                    >
                      <ContenidoMensaje texto={mensaje.texto} />

                      {!esUsuario &&
                        mensaje.acciones &&
                        mensaje.acciones.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2 border-t border-prolimal-ink-900/10 pt-3 dark:border-prolimal-sand-100/10">
                            {mensaje.acciones.map((accion) =>
                              accion.externa ? (
                                <a
                                  key={accion.etiqueta}
                                  href={accion.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-full bg-prolimal-teal-700 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-prolimal-teal-800"
                                >
                                  <ExternalLink
                                    className="h-3 w-3"
                                    aria-hidden="true"
                                  />
                                  {accion.etiqueta}
                                </a>
                              ) : (
                                <Link
                                  key={accion.etiqueta}
                                  href={accion.url}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-prolimal-teal-600/30 px-3 py-1.5 text-xs font-bold text-prolimal-teal-700 transition-colors hover:bg-prolimal-teal-50 dark:text-prolimal-teal-300 dark:hover:bg-prolimal-teal-900/30"
                                >
                                  {accion.etiqueta}
                                </Link>
                              ),
                            )}
                          </div>
                        )}

                      {!esUsuario &&
                        mensaje.opciones &&
                        mensaje.opciones.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {mensaje.opciones.map((opcion) => (
                              <button
                                key={opcion}
                                type="button"
                                disabled={cargando}
                                onClick={() => void enviar(opcion)}
                                className="rounded-full border border-prolimal-ink-900/10 px-2.5 py-1 text-[11px] font-semibold text-prolimal-ink-600 transition-colors hover:border-prolimal-teal-500/40 hover:text-prolimal-teal-700 disabled:opacity-50 dark:border-prolimal-sand-100/10 dark:text-prolimal-sand-300"
                              >
                                {opcion}
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}

              {cargando && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-prolimal-ink-900/10 bg-card px-3.5 py-2 text-xs font-semibold text-prolimal-ink-500 dark:border-prolimal-sand-100/10 dark:bg-prolimal-dark-800 dark:text-prolimal-sand-300">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Consultando…
                  </div>
                </div>
              )}
              <div ref={finMensajesRef} />
            </div>

            <div className="border-t border-prolimal-ink-900/10 bg-card px-3 pb-3 pt-3 dark:border-prolimal-sand-100/10 dark:bg-prolimal-dark-800">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-500 dark:text-prolimal-sand-300">
                  Consultas rápidas
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-prolimal-teal-700 dark:text-prolimal-teal-300">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  En línea
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {OPCIONES_RAPIDAS.map((opcion) => (
                  <button
                    key={opcion}
                    type="button"
                    disabled={cargando}
                    onClick={() => void enviar(opcion)}
                    className="max-w-full whitespace-normal rounded-2xl border border-prolimal-teal-600/25 bg-prolimal-teal-50 px-3 py-2 text-left text-xs font-bold leading-snug text-prolimal-teal-800 transition-colors hover:bg-prolimal-teal-100 disabled:opacity-50 dark:border-prolimal-teal-400/20 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-200"
                  >
                    {opcion}
                  </button>
                ))}
              </div>

              <form onSubmit={manejarEnvio} className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={entrada}
                  onChange={(evento) => setEntrada(evento.target.value)}
                  placeholder="Escribe tu consulta…"
                  aria-label="Escribir consulta para el asistente"
                  autoComplete="off"
                  disabled={cargando}
                  className="min-w-0 flex-1 rounded-full border border-prolimal-ink-900/15 bg-prolimal-sand-50 px-4 py-2.5 text-sm font-medium text-prolimal-ink-800 outline-none transition-colors placeholder:text-prolimal-ink-400 focus:border-prolimal-teal-600 focus:ring-2 focus:ring-prolimal-teal-500/20 disabled:opacity-60 dark:border-prolimal-sand-100/15 dark:bg-prolimal-dark-900 dark:text-prolimal-sand-50 dark:placeholder:text-prolimal-ink-400"
                />
                <button
                  type="submit"
                  disabled={!entrada.trim() || cargando}
                  aria-label="Enviar consulta"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-prolimal-teal-700 text-white transition-colors hover:bg-prolimal-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cargando ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </form>

              <a
                href={`https://wa.me/${WHATSAPP_NUMERO}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-prolimal-ink-500 transition-colors hover:text-prolimal-teal-700 dark:text-prolimal-sand-300"
              >
                <Headphones className="h-3 w-3" aria-hidden="true" />
                ¿Prefieres hablar con una persona? Escribe a ventas
              </a>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        aria-label={abierto ? 'Minimizar asistente' : 'Abrir asistente'}
        aria-expanded={abierto}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-[55] flex h-14 w-14 items-center justify-center rounded-full bg-prolimal-ink-900 text-prolimal-sand-50 shadow-[0_18px_45px_-18px_rgba(11,37,32,0.9)] ring-1 ring-white/20 transition-colors hover:bg-prolimal-teal-800 dark:bg-prolimal-teal-700 sm:bottom-6 sm:right-6"
      >
        {abierto ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        )}
        {!abierto && (
          <span
            className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-prolimal-sand-50 bg-prolimal-coral-500 dark:border-prolimal-dark-900"
            aria-hidden="true"
          />
        )}
      </motion.button>
    </>
  );
}
