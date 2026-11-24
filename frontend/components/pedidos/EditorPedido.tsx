'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, API_URL } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  CANTIDAD_MINIMA,
  factorConversion,
  presentacionDe,
  topePorStock,
  type TipoPresentacion,
} from '@/lib/conversion';
import type { ProductoCatalogo } from '@/lib/productos';
import type { DetallePedidoEditable, PedidoEditable } from '@/lib/pedidos';
import {
  enteroMinimo,
  errorVisible,
  mensajeGeneral,
  numeroMinimo,
  primero,
  requerido,
  type ErroresFormulario,
} from '@/lib/validacion';
import { useValidacionFormulario } from '@/lib/hooks/use-validacion-formulario';
import {
  AvisoErrorFormulario,
  CampoError,
  claseCampo,
} from '@/components/ui/CampoError';
import ToastNotificacion, {
  type ToastDatos,
} from '@/components/ui/ToastNotificacion';
import { AlertTriangle, Check, Package, Plus, Trash2, UserCheck } from 'lucide-react';

type TipoToast = ToastDatos['tipo'];
type Notificar = (tipo: TipoToast, mensaje: string) => void;

interface EditorPedidoProps {
  pedido: PedidoEditable;
  /** Vendedores pueden usar el catálogo público; admin/inventario, el de `/admin`. */
  urlProductos?: string;
  /** Sólo admin e inventario pueden asignar vendedores (regla del backend). */
  permitirAsignar?: boolean;
  onActualizado: () => Promise<void> | void;
}

interface Vendedor {
  id: number;
  nombre: string;
  activo?: boolean;
  rol?: string;
}

interface FormaAgregar {
  producto_id: string;
  cantidad: string;
  tipo_presentacion: TipoPresentacion;
}

interface FormaVendedor {
  vendedorId: string;
}

interface FormaCantidad {
  cantidad: string;
}

const FORMA_AGREGAR_VACIA: FormaAgregar = {
  producto_id: '',
  cantidad: '',
  tipo_presentacion: 'UNIDAD',
};

const etiquetaCantidad = (tipo: TipoPresentacion) =>
  tipo === 'PAQUETE' ? 'paquete(s)' : 'unidad(es)';

const etiquetaPresentacion = (tipo: TipoPresentacion) =>
  tipo === 'PAQUETE' ? 'Paquete' : 'Unidad';

/** Envía el alta y delega en el padre la recarga del detalle y del listado. */
async function ejecutarMutacion(
  peticion: () => Promise<unknown>,
  onActualizado: () => Promise<void> | void,
  notificar: Notificar,
  mensaje: string,
) {
  await peticion();
  try {
    await onActualizado();
  } catch {
    // La mutación ya se guardó: no se informa un fallo falso, pero se avisa.
    notificar('exito', `${mensaje} (no se pudo refrescar la vista)`);
    return;
  }
  notificar('exito', mensaje);
}

function FilaItem({
  pedidoId,
  detalle,
  onActualizado,
  notificar,
}: {
  pedidoId: number;
  detalle: DetallePedidoEditable;
  onActualizado: () => Promise<void> | void;
  notificar: Notificar;
}) {
  const presentacion = presentacionDe(detalle);
  const minimo = CANTIDAD_MINIMA[presentacion];
  const [cantidad, setCantidad] = useState(String(detalle.cantidad));
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const validar = useCallback(
    (form: FormaCantidad): ErroresFormulario<FormaCantidad> => ({
      cantidad: primero(
        requerido(form.cantidad, 'Ingresá la cantidad'),
        enteroMinimo(
          form.cantidad,
          minimo,
          `Ingresá un número entero mayor o igual a ${minimo}`,
        ),
      ),
    }),
    [minimo],
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
  } = useValidacionFormulario<FormaCantidad>(validar);

  const errorCantidad = errorVisible(
    errores,
    'cantidad',
    tocados.cantidad ?? false,
    enviado,
  );

  const cambiarCantidad = (valor: string) => {
    const forma = { cantidad: valor };
    setCantidad(valor);
    marcarTocado('cantidad');
    validarCampo('cantidad', forma);
    setErrorGeneral('');
  };

  const guardarCantidad = async () => {
    const forma = { cantidad };
    if (!validarTodo(forma) || guardando || eliminando) return;

    setGuardando(true);
    setErrorGeneral('');
    try {
      await ejecutarMutacion(
        () =>
          api.put(`/pedidos/${pedidoId}/items/${detalle.id}`, {
            cantidad: Number(forma.cantidad),
          }),
        onActualizado,
        notificar,
        'Cantidad actualizada',
      );
      reiniciar();
    } catch (err: unknown) {
      aplicarErroresBackend(
        err,
        ['cantidad', '_general'],
        {
          'pedido mínimo': 'cantidad',
          cantidad: 'cantidad',
          mínimo: 'cantidad',
        },
        'No se pudo actualizar la cantidad.',
      );
    } finally {
      setGuardando(false);
    }
  };

  const quitarItem = async () => {
    const nombre = detalle.producto?.nombre ?? `ítem #${detalle.id}`;
    if (!window.confirm(`¿Quitar ${nombre} de este pedido?`)) return;
    if (guardando || eliminando) return;

    setEliminando(true);
    setErrorGeneral('');
    try {
      await ejecutarMutacion(
        () => api.delete(`/pedidos/${pedidoId}/items/${detalle.id}`),
        onActualizado,
        notificar,
        'Ítem quitado del pedido',
      );
    } catch (err: unknown) {
      const mensaje = mensajeGeneral(err, 'No se pudo quitar el ítem.');
      setErrorGeneral(mensaje);
      notificar('error', mensaje);
    } finally {
      setEliminando(false);
    }
  };

  const unidades = detalle.unidades ?? detalle.cantidad;
  const factor = detalle.factor_conversion ?? 1;

  return (
    <div className="rounded-2xl border border-prolimal-ink-900/5 bg-prolimal-sand-100/60 p-3 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 dark:bg-prolimal-ink-900">
          {detalle.producto?.imagen_url ? (
            <img
              src={`${API_URL}${detalle.producto.imagen_url}`}
              alt={detalle.producto.nombre}
              className="h-full w-full object-contain"
            />
          ) : (
            <Package className="h-5 w-5 text-prolimal-ink-300" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-bold text-prolimal-ink-800 dark:text-prolimal-sand-50">
            {detalle.producto?.nombre ?? `Producto #${detalle.id}`}
          </p>
          <p className="mt-0.5 text-xs font-medium text-prolimal-ink-500 dark:text-prolimal-ink-300">
            {etiquetaPresentacion(presentacion)} · {unidades} uds.{' '}
            {factor !== 1 ? `(factor ${factor}) ` : ''}· @{' '}
            {formatCurrency(detalle.precio_unitario)}
          </p>
          <p className="mt-1 text-sm font-extrabold text-prolimal-teal-700 dark:text-prolimal-teal-300">
            {formatCurrency(unidades * detalle.precio_unitario)}
          </p>
        </div>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            guardarCantidad();
          }}
          className="flex flex-col gap-1 sm:w-40"
        >
          <label
            htmlFor={`cantidad-item-${detalle.id}`}
            className="text-[10px] font-bold uppercase tracking-[0.12em] text-prolimal-ink-400 dark:text-prolimal-ink-300"
          >
            Cantidad ({etiquetaCantidad(presentacion)})
          </label>
          <input
            id={`cantidad-item-${detalle.id}`}
            type="text"
            inputMode="numeric"
            value={cantidad}
            onChange={(e) => cambiarCantidad(e.target.value)}
            onBlur={() => validarCampo('cantidad', { cantidad })}
            aria-invalid={Boolean(errorCantidad)}
            aria-describedby={errorCantidad ? `error-cantidad-item-${detalle.id}` : undefined}
            className={claseCampo(
              Boolean(errorCantidad),
              'prolimal-input py-2 text-sm tabular-nums',
            )}
          />
          <CampoError
            id={`error-cantidad-item-${detalle.id}`}
            mensaje={errorCantidad}
          />
          <div className="mt-1 flex gap-2">
            <button
              type="submit"
              disabled={guardando || eliminando}
              className="prolimal-btn-secondary flex-1 px-2 py-2 text-xs disabled:opacity-60"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={quitarItem}
              disabled={guardando || eliminando}
              aria-label={`Quitar ${detalle.producto?.nombre ?? `ítem ${detalle.id}`}`}
              className="prolimal-btn-ghost-danger px-2 py-2 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
      <AvisoErrorFormulario mensaje={errorGeneral} />
    </div>
  );
}

function FormularioAgregar({
  pedidoId,
  productos,
  onActualizado,
  notificar,
}: {
  pedidoId: number;
  productos: ProductoCatalogo[];
  onActualizado: () => Promise<void> | void;
  notificar: Notificar;
}) {
  const [forma, setForma] = useState<FormaAgregar>(FORMA_AGREGAR_VACIA);
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState(false);

  const producto = useMemo(
    () => productos.find((p) => String(p.id) === forma.producto_id),
    [productos, forma.producto_id],
  );
  const minimo = CANTIDAD_MINIMA[forma.tipo_presentacion];
  const etiqueta = etiquetaCantidad(forma.tipo_presentacion);
  const tope = topePorStock(producto?.stock, {
    nombre: producto?.nombre ?? '',
    factor_paquete: producto?.factor_paquete,
    tipo_presentacion: forma.tipo_presentacion,
  });
  const factor = producto
    ? factorConversion({
        nombre: producto.nombre,
        factor_paquete: producto.factor_paquete,
      })
    : 1;

  const validar = useCallback(
    (form: FormaAgregar): ErroresFormulario<FormaAgregar> => ({
      producto_id: primero(
        requerido(form.producto_id, 'Elegí un producto'),
        numeroMinimo(form.producto_id, 1, 'Elegí un producto válido'),
      ),
      tipo_presentacion: requerido(
        form.tipo_presentacion,
        'Elegí una presentación',
      ),
      cantidad: primero(
        requerido(form.cantidad, 'Ingresá la cantidad'),
        enteroMinimo(
          form.cantidad,
          minimo,
          `Ingresá un número entero mayor o igual a ${minimo}`,
        ),
        tope !== undefined && Number(form.cantidad) > tope
          ? `No hay stock suficiente: máximo ${tope} ${etiqueta}`
          : undefined,
      ),
    }),
    [minimo, tope, etiqueta],
  );

  const {
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
  } = useValidacionFormulario<FormaAgregar>(validar);

  const visible = (campo: keyof FormaAgregar) =>
    errorVisible(errores, campo, tocados[campo] ?? false, enviado);

  const actualizar = <K extends keyof FormaAgregar>(
    campo: K,
    valor: FormaAgregar[K],
  ) => {
    const siguiente = { ...forma, [campo]: valor };
    setForma(siguiente);
    marcarTocado(campo);
    validarCampo(campo, siguiente);
    setErrorGeneral('');
  };

  const agregar = async () => {
    if (!validarTodo(forma) || !producto || guardando) return;

    setGuardando(true);
    setErrorGeneral('');
    try {
      await ejecutarMutacion(
        () =>
          api.post(`/pedidos/${pedidoId}/items`, {
            items: [
              {
                producto_id: Number(forma.producto_id),
                cantidad: Number(forma.cantidad),
                tipo_presentacion: forma.tipo_presentacion,
                // El backend recalcula precio y total desde el catálogo.
                precio: Number(producto.precio),
              },
            ],
          }),
        onActualizado,
        notificar,
        'Ítem agregado al pedido',
      );
      setForma(FORMA_AGREGAR_VACIA);
      setAbierto(false);
      reiniciar();
    } catch (err: unknown) {
      aplicarErroresBackend(
        err,
        ['producto_id', 'cantidad', 'tipo_presentacion', '_general'],
        {
          producto: 'producto_id',
          'tipo presentacion': 'tipo_presentacion',
        },
        'No se pudo agregar el ítem.',
      );
    } finally {
      setGuardando(false);
    }
  };

  if (productos.length === 0) {
    return (
      <p className="rounded-2xl border border-prolimal-ink-900/5 bg-prolimal-sand-100/50 p-4 text-sm font-medium text-prolimal-ink-500 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/50 dark:text-prolimal-ink-300">
        No hay productos activos disponibles para agregar.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-prolimal-ink-900/5 p-4 dark:border-prolimal-sand-100/10">
      {!abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="prolimal-btn-secondary w-full"
        >
          <Plus className="h-4 w-4" />
          Agregar ítem
        </button>
      ) : (
        <form noValidate onSubmit={(e) => { e.preventDefault(); agregar(); }}>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-prolimal-ink-500 dark:text-prolimal-ink-300">
            Nuevo ítem
          </p>
          <AvisoErrorFormulario mensaje={errorGeneral} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="agregar-producto"
                className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-prolimal-ink-400 dark:text-prolimal-ink-300"
              >
                Producto
              </label>
              <select
                id="agregar-producto"
                value={forma.producto_id}
                onChange={(e) => actualizar('producto_id', e.target.value)}
                onBlur={() => marcarTocado('producto_id')}
                aria-invalid={Boolean(visible('producto_id'))}
                className={claseCampo(
                  Boolean(visible('producto_id')),
                  'prolimal-input py-2 text-sm',
                )}
              >
                <option value="">Elegí un producto</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} · {formatCurrency(p.precio)} · stock {p.stock ?? 0}
                  </option>
                ))}
              </select>
              <CampoError mensaje={visible('producto_id')} />
            </div>
            <div>
              <label
                htmlFor="agregar-presentacion"
                className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-prolimal-ink-400 dark:text-prolimal-ink-300"
              >
                Presentación
              </label>
              <select
                id="agregar-presentacion"
                value={forma.tipo_presentacion}
                onChange={(e) => {
                  const siguiente = e.target.value as TipoPresentacion;
                  setForma((f) => ({ ...f, tipo_presentacion: siguiente }));
                  marcarTocado('tipo_presentacion');
                  limpiarError('cantidad');
                  setErrorGeneral('');
                }}
                aria-invalid={Boolean(visible('tipo_presentacion'))}
                className={claseCampo(
                  Boolean(visible('tipo_presentacion')),
                  'prolimal-input py-2 text-sm',
                )}
              >
                <option value="UNIDAD">Unidad (mín. 3)</option>
                <option value="PAQUETE">Paquete (mín. 1)</option>
              </select>
              <CampoError mensaje={visible('tipo_presentacion')} />
            </div>
            <div>
              <label
                htmlFor="agregar-cantidad"
                className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-prolimal-ink-400 dark:text-prolimal-ink-300"
              >
                Cantidad ({etiqueta})
              </label>
              <input
                id="agregar-cantidad"
                type="text"
                inputMode="numeric"
                value={forma.cantidad}
                onChange={(e) => actualizar('cantidad', e.target.value)}
                onBlur={() => marcarTocado('cantidad')}
                aria-invalid={Boolean(visible('cantidad'))}
                aria-describedby={visible('cantidad') ? 'error-agregar-cantidad' : undefined}
                className={claseCampo(
                  Boolean(visible('cantidad')),
                  'prolimal-input py-2 text-sm tabular-nums',
                )}
                placeholder={`Mín. ${minimo}`}
              />
              <CampoError id="error-agregar-cantidad" mensaje={visible('cantidad')} />
            </div>
          </div>

          {producto && (
            <p className="mt-3 text-xs font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-300">
              Stock disponible: {producto.stock ?? 0} uds. · Precio del catálogo:{' '}
              {formatCurrency(producto.precio)}
              {forma.tipo_presentacion === 'PAQUETE'
                ? ` · 1 paquete = ${factor} uds.`
                : ''}
              {tope !== undefined ? ` · Máximo ${tope} ${etiqueta}` : ''}. El total
              se recalcula desde el catálogo.
            </p>
          )}

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                setForma(FORMA_AGREGAR_VACIA);
                reiniciar();
              }}
              className="prolimal-btn-ghost px-4 py-2 text-xs"
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="prolimal-btn-primary px-4 py-2 text-xs"
              disabled={guardando}
            >
              <Check className="h-3.5 w-3.5" />
              {guardando ? 'Agregando…' : 'Agregar al pedido'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function AsignarVendedor({
  pedido,
  onActualizado,
  notificar,
}: {
  pedido: PedidoEditable;
  onActualizado: () => Promise<void> | void;
  notificar: Notificar;
}) {
  const asignado = pedido.procesado_por != null;
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [forma, setForma] = useState<FormaVendedor>({ vendedorId: '' });

  useEffect(() => {
    if (asignado) {
      setCargando(false);
      return;
    }
    let activo = true;
    setCargando(true);
    setErrorCatalogo('');
    api
      .get<Vendedor[]>('/usuarios/vendedores')
      .then((res) => {
        if (activo) setVendedores(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (activo) setErrorCatalogo('No se pudo cargar la lista de vendedores.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [asignado]);

  const validar = useCallback(
    (form: FormaVendedor): ErroresFormulario<FormaVendedor> => ({
      vendedorId: primero(
        requerido(form.vendedorId, 'Elegí un vendedor'),
        numeroMinimo(form.vendedorId, 1, 'Elegí un vendedor válido'),
      ),
    }),
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
  } = useValidacionFormulario<FormaVendedor>(validar);

  const errorVendedor = errorVisible(
    errores,
    'vendedorId',
    tocados.vendedorId ?? false,
    enviado,
  );

  const asignar = async () => {
    if (!validarTodo(forma) || guardando) return;
    setGuardando(true);
    setErrorGeneral('');
    try {
      await ejecutarMutacion(
        () =>
          api.put(`/pedidos/${pedido.id}/asignar-vendedor`, {
            vendedorId: Number(forma.vendedorId),
          }),
        onActualizado,
        notificar,
        'Vendedor asignado correctamente',
      );
      setForma({ vendedorId: '' });
    } catch (err: unknown) {
      aplicarErroresBackend(
        err,
        ['vendedorId', '_general'],
        {
          'ya tiene un vendedor': 'vendedorId',
          vendedor: 'vendedorId',
        },
        'No se pudo asignar el vendedor.',
      );
    } finally {
      setGuardando(false);
    }
  };

  if (asignado) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-prolimal-teal-500/20 bg-prolimal-teal-50 px-4 py-3 dark:border-prolimal-teal-400/20 dark:bg-prolimal-teal-900/20">
        <UserCheck className="h-5 w-5 shrink-0 text-prolimal-teal-700 dark:text-prolimal-teal-300" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-teal-700 dark:text-prolimal-teal-300">
            Vendedor asignado
          </p>
          <p className="mt-0.5 text-sm font-bold text-prolimal-ink-800 dark:text-prolimal-sand-50">
            {pedido.procesador?.nombre || `#${pedido.procesado_por}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-[1.5rem] border border-prolimal-ink-900/10 bg-prolimal-sand-50/60 p-4 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/40">
      <div className="mb-3 flex items-center gap-2">
        <UserCheck className="h-4 w-4 text-prolimal-teal-700 dark:text-prolimal-teal-300" />
        <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">
          Asignación de vendedor
        </h3>
      </div>
      <AvisoErrorFormulario mensaje={errorCatalogo || errorGeneral} />
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          asignar();
        }}
        className="flex flex-col gap-2 sm:flex-row sm:items-start"
      >
        <div className="min-w-0 flex-1">
          <label
            htmlFor="asignar-vendedor"
            className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-prolimal-ink-400 dark:text-prolimal-ink-300"
          >
            Vendedor
          </label>
          <select
            id="asignar-vendedor"
            value={forma.vendedorId}
            onChange={(e) => {
              const valor = e.target.value;
              setForma({ vendedorId: valor });
              marcarTocado('vendedorId');
              validarCampo('vendedorId', { vendedorId: valor });
              setErrorGeneral('');
            }}
            onBlur={() => marcarTocado('vendedorId')}
            disabled={cargando || vendedores.length === 0 || guardando}
            aria-invalid={Boolean(errorVendedor)}
            aria-describedby={errorVendedor ? 'error-asignar-vendedor' : undefined}
            className={claseCampo(
              Boolean(errorVendedor),
              'prolimal-input py-2 text-sm disabled:opacity-60',
            )}
          >
            <option value="">
              {cargando ? 'Cargando vendedores…' : 'Elegí un vendedor'}
            </option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre} · {v.rol || 'ventas'}
              </option>
            ))}
          </select>
          <CampoError id="error-asignar-vendedor" mensaje={errorVendedor} />
        </div>
        <button
          type="submit"
          disabled={cargando || vendedores.length === 0 || guardando}
          className="prolimal-btn-primary shrink-0 px-4 py-2 text-xs disabled:opacity-60 sm:mt-5"
        >
          {guardando ? 'Asignando…' : 'Asignar'}
        </button>
      </form>
      {!cargando && vendedores.length === 0 && !errorCatalogo && (
        <p className="mt-2 text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          No hay vendedores activos disponibles.
        </p>
      )}
    </section>
  );
}

export default function EditorPedido({
  pedido,
  urlProductos = '/productos/admin?limit=100',
  permitirAsignar = false,
  onActualizado,
}: EditorPedidoProps) {
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState('');
  const [toast, setToast] = useState<ToastDatos | null>(null);
  const editable = pedido.estado === 'pendiente';

  const notificar = useCallback<Notificar>((tipo, mensaje) => {
    setToast({ id: Date.now(), tipo, mensaje });
  }, []);

  useEffect(() => {
    let activo = true;
    setCargandoProductos(true);
    setErrorProductos('');
    api
      .get<ProductoCatalogo[]>(urlProductos)
      .then((res) => {
        if (!activo) return;
        setProductos(
          Array.isArray(res.data) ? res.data.filter((p) => p.activo !== false) : [],
        );
      })
      .catch(() => {
        if (activo) setErrorProductos('No se pudo cargar el catálogo de productos.');
      })
      .finally(() => {
        if (activo) setCargandoProductos(false);
      });
    return () => {
      activo = false;
    };
  }, [urlProductos]);

  return (
    <div className="space-y-5">
      {permitirAsignar && (
        <AsignarVendedor
          pedido={pedido}
          onActualizado={onActualizado}
          notificar={notificar}
        />
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-prolimal-ink-600 dark:text-prolimal-ink-200">
            Productos
          </h3>
          <span className="rounded-full bg-prolimal-sand-200 px-2.5 py-0.5 text-[10px] font-bold text-prolimal-ink-600 dark:bg-prolimal-ink-700 dark:text-prolimal-sand-100">
            {pedido.detalles.length} ítem{pedido.detalles.length === 1 ? '' : 's'}
          </span>
        </div>

        {!editable && (
          <p className="mb-3 flex items-start gap-2 rounded-xl border border-prolimal-sand-300 bg-prolimal-sand-100 px-3 py-2 text-xs font-medium text-prolimal-ink-600 dark:border-prolimal-sand-100/15 dark:bg-prolimal-ink-800/60 dark:text-prolimal-ink-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Los ítems sólo se pueden modificar mientras el pedido esté en estado
            “pendiente”. Ahora es <strong>{pedido.estado}</strong>.
          </p>
        )}

        {errorProductos && (
          <p className="mb-3 rounded-xl border border-prolimal-red-200 bg-prolimal-red-50 px-3 py-2 text-xs font-semibold text-prolimal-red-700 dark:border-prolimal-red-700/40 dark:bg-prolimal-red-900/20 dark:text-prolimal-red-300">
            {errorProductos}
          </p>
        )}

        <div className="mb-3 space-y-2">
          {pedido.detalles.map((detalle) => (
            <FilaItem
              key={`${detalle.id}-${detalle.cantidad}`}
              pedidoId={pedido.id}
              detalle={detalle}
              onActualizado={onActualizado}
              notificar={notificar}
            />
          ))}
          {pedido.detalles.length === 0 && (
            <p className="rounded-2xl border border-dashed border-prolimal-ink-900/10 p-6 text-center text-sm font-medium text-prolimal-ink-400 dark:border-prolimal-sand-100/10 dark:text-prolimal-ink-300">
              Este pedido aún no tiene ítems.
            </p>
          )}
        </div>

        {editable && !cargandoProductos && !errorProductos && (
          <FormularioAgregar
            pedidoId={pedido.id}
            productos={productos}
            onActualizado={onActualizado}
            notificar={notificar}
          />
        )}
      </section>

      <ToastNotificacion toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
