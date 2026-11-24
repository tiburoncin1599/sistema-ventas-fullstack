/**
 * Validación explícita compartida por los formularios PROLIMAC.
 *
 * Objetivo: que el navegador no decida silenciosamente qué está mal (`:invalid`
 * nativo) y que siempre tengamos un mensaje en castellano para pintar debajo
 * del campo, tanto en errores locales como en respuestas 400/422 del backend.
 */

export type ErroresFormulario<T> = Partial<Record<keyof T | '_general', string>>;
export type CamposTocados<T> = Partial<Record<keyof T, boolean>>;

const esVacio = (valor: unknown): boolean =>
  valor === null ||
  valor === undefined ||
  (typeof valor === 'string' && valor.trim() === '');

export function requerido(valor: unknown, mensaje = 'Este campo es obligatorio'): string | undefined {
  return esVacio(valor) ? mensaje : undefined;
}

export function email(valor: unknown, mensaje = 'Ingresá un correo electrónico válido'): string | undefined {
  if (esVacio(valor)) return undefined;
  const texto = String(valor).trim();
  // Expresión deliberadamente simple: coincide con IsEmail de class-validator
  // para los casos que maneja la app (usuario@dominio.com).
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto) ? undefined : mensaje;
}

export function longitudMinima(
  valor: unknown,
  minimo: number,
  mensaje = `Debe tener al menos ${minimo} caracteres`,
): string | undefined {
  if (esVacio(valor)) return undefined;
  return String(valor).length >= minimo ? undefined : mensaje;
}

export function longitudMaxima(
  valor: unknown,
  maximo: number,
  mensaje = `No puede superar los ${maximo} caracteres`,
): string | undefined {
  if (esVacio(valor)) return undefined;
  return String(valor).length <= maximo ? undefined : mensaje;
}

export function numero(
  valor: unknown,
  mensaje = 'Ingresá un número válido',
): string | undefined {
  if (esVacio(valor)) return undefined;
  const texto = typeof valor === 'string' ? valor.trim() : valor;
  if (texto === '' || !Number.isFinite(Number(texto))) return mensaje;
  return undefined;
}

export function numeroMinimo(
  valor: unknown,
  minimo: number,
  mensaje = `El valor debe ser mayor o igual a ${minimo}`,
): string | undefined {
  if (esVacio(valor)) return undefined;
  if (numero(valor)) return mensaje;
  return Number(valor) >= minimo ? undefined : mensaje;
}

export function enteroMinimo(
  valor: unknown,
  minimo: number,
  mensaje = `Ingresá un número entero mayor o igual a ${minimo}`,
): string | undefined {
  if (esVacio(valor)) return undefined;
  if (numero(valor)) return mensaje;
  const n = Number(valor);
  return Number.isInteger(n) && n >= minimo ? undefined : mensaje;
}

export function primero(...reglas: Array<string | undefined>): string | undefined {
  return reglas.find((regla): regla is string => Boolean(regla));
}

/**
 * Normaliza el `message` de una respuesta 400/422 de NestJS.
 * Puede venir como string, string[] o como objeto con `message` anidado.
 */
export function mensajesBackend(error: unknown): string[] {
  const data = (error as { response?: { data?: unknown } } | null)?.response?.data;
  if (!data) return [];
  if (typeof data === 'string') return [data];
  if (Array.isArray(data)) return data.map(String);
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.message === 'string') return [obj.message];
    if (Array.isArray(obj.message)) return obj.message.map(String);
    if (typeof obj.error === 'string') return [obj.error];
  }
  return [];
}

/** Traduce mensajes de class-validator (que pueden venir en inglés) a campos del formulario. */
export function mapearErroresBackend<T>(
  error: unknown,
  campos: Array<keyof T | '_general'>,
  alias: Partial<Record<string, keyof T | '_general'>> = {},
): ErroresFormulario<T> {
  const resultado: ErroresFormulario<T> = {};
  const mensajes = mensajesBackend(error);
  if (mensajes.length === 0) return resultado;

  const normalizar = (texto: string) => texto.toLowerCase();
  for (const mensaje of mensajes) {
    const texto = normalizar(mensaje);
    let destino: keyof T | '_general' | undefined;
    for (const [palabra, campo] of Object.entries(alias)) {
      if (texto.includes(normalizar(palabra))) {
        destino = campo;
        break;
      }
    }
    if (!destino) {
      destino = campos.find((campo) => campo !== '_general' && texto.includes(normalizar(String(campo))));
    }
    const clave = destino ?? '_general';
    if (!resultado[clave]) resultado[clave] = mensaje;
  }
  return resultado;
}

export function mensajeGeneral(error: unknown, fallback: string): string {
  return mensajesBackend(error)[0] ?? fallback;
}

/** Conveniencia: aplica el mensaje de error del campo si el campo fue tocado o enviado. */
export function errorVisible<T>(
  errores: ErroresFormulario<T>,
  campo: keyof T,
  tocado: boolean,
  enviado = false,
): string | undefined {
  return enviado || tocado ? errores[campo] : undefined;
}
