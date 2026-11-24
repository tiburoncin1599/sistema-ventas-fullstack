'use client';

import { useCallback, useState } from 'react';
import {
  mapearErroresBackend,
  type CamposTocados,
  type ErroresFormulario,
} from '@/lib/validacion';

/**
 * Estado de validación compartido por todos los formularios PROLIMAC.
 *
 * - `errores` se calcula con la función `validar` que recibe el valor actual
 *   del formulario (así no hay closures con estados viejos).
 * - `tocados`/`enviado` controlan cuándo se muestra cada mensaje: al escribir
 *   se limpia/actualiza el error de ese campo; al enviar se marcan todos.
 */
export function useValidacionFormulario<T extends object>(
  validar: (form: T) => ErroresFormulario<T>,
) {
  const [errores, setErrores] = useState<ErroresFormulario<T>>({});
  const [tocados, setTocados] = useState<CamposTocados<T>>({});
  const [enviado, setEnviado] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');

  const marcarTocado = useCallback((campo: keyof T) => {
    setTocados((prev) => ({ ...prev, [campo]: true }));
  }, []);

  const validarCampo = useCallback(
    (campo: keyof T, form: T) => {
      const mensaje = validar(form)[campo];
      setErrores((prev) => ({ ...prev, [campo]: mensaje }));
    },
    [validar],
  );

  const limpiarError = useCallback((campo: keyof T) => {
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
  }, []);

  /** Valida todo y deja los mensajes listos para mostrarse. Devuelve si es válido. */
  const validarTodo = useCallback(
    (form: T): boolean => {
      const nuevos = validar(form);
      setErrores(nuevos);
      setTocados(
        Object.keys(form).reduce<CamposTocados<T>>((acc, campo) => {
          acc[campo as keyof T] = true;
          return acc;
        }, {}),
      );
      setEnviado(true);
      setErrorGeneral('');
      return Object.values(nuevos).every((mensaje) => !mensaje);
    },
    [validar],
  );

  /** Mapea errores 400/422 del backend a campos concretos o al aviso general. */
  const aplicarErroresBackend = useCallback(
    (
      error: unknown,
      campos: Array<keyof T | '_general'>,
      alias: Partial<Record<string, keyof T | '_general'>> = {},
      fallback = 'Revisá los datos e intentá nuevamente.',
    ) => {
      const mapeados = mapearErroresBackend<T>(error, campos, alias);
      setErrores((prev) => ({ ...prev, ...mapeados }));
      setEnviado(true);
      setErrorGeneral(mapeados._general ?? fallback);
    },
    [],
  );

  const reiniciar = useCallback(() => {
    setErrores({});
    setTocados({});
    setEnviado(false);
    setErrorGeneral('');
  }, []);

  return {
    errores,
    tocados,
    enviado,
    errorGeneral,
    setErrorGeneral,
    marcarTocado,
    validarCampo,
    limpiarError,
    validarTodo,
    aplicarErroresBackend,
    reiniciar,
  };
}
