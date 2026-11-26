'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  Categoria,
  ProductoCatalogo,
  SIN_CATEGORIA,
  TODAS_CATEGORIAS,
  idCategoriaProducto,
} from '@/lib/productos';
import { formatCurrency } from '@/lib/utils';
import {
  CANTIDAD_MINIMA,
  claveLinea,
  esPaquete,
  factorConversion,
  unidadesDe,
  type TipoPresentacion,
} from '@/lib/conversion';
import { Minus, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import BotonComprobantePdf from '@/components/ui/BotonComprobantePdf';
import { useValidacionFormulario } from '@/lib/hooks/use-validacion-formulario';
import {
  enteroMinimo,
  mensajeGeneral,
  primero,
  requerido,
  type ErroresFormulario,
} from '@/lib/validacion';
import {
  AvisoErrorFormulario,
  CampoError,
  claseCampo,
} from '@/components/ui/CampoError';

interface Cliente {
  id: number;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  carnet?: string | null;
  ubicacion?: string | null;
}

type Producto = ProductoCatalogo;

interface Linea {
  producto_id: number;
  cantidad: number;
  tipo_presentacion: TipoPresentacion;
}

type TipoPago = 'CONTADO' | 'CREDITO';

/** Claves dinámicas para los mensajes de cada línea del carrito. */
type ClaveErrorLinea = `linea:${string}`;
type FormularioPedido = {
  clienteId: string;
  lineas: Linea[];
  tipoPago: TipoPago;
} & Partial<Record<ClaveErrorLinea, Linea>>;

const CAMPOS_PEDIDO: Array<keyof FormularioPedido | '_general'> = [
  'clienteId',
  'lineas',
  'tipoPago',
  '_general',
];

const ALIAS_PEDIDO: Partial<Record<string, keyof FormularioPedido | '_general'>> = {
  usuarioId: 'clienteId',
  cliente: 'clienteId',
  items: 'lineas',
  productos: 'lineas',
  tipo_pago: 'tipoPago',
  'tipo de pago': 'tipoPago',
};

const OPCIONES_PRESENTACION: { valor: TipoPresentacion; titulo: string }[] = [
  { valor: 'UNIDAD', titulo: 'Unidades' },
  { valor: 'PAQUETE', titulo: 'Paquetes' },
];

const etiquetaPresentacion = (tipo: TipoPresentacion, cantidad = 2) =>
  tipo === 'UNIDAD'
    ? cantidad === 1 ? 'unidad' : 'unidades'
    : cantidad === 1 ? 'paquete' : 'paquetes';

const OPCIONES_PAGO: { valor: TipoPago; titulo: string; detalle: string }[] = [
  { valor: 'CONTADO', titulo: 'Al Contado', detalle: 'Pago total inmediato' },
  {
    valor: 'CREDITO',
    titulo: 'A Crédito',
    detalle: 'Genera saldo pendiente por cobrar',
  },
];

export default function VentasNuevoPedidoPage() {
  const [cargando, setCargando] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState<
    number | typeof TODAS_CATEGORIAS | typeof SIN_CATEGORIA
  >(TODAS_CATEGORIAS);
  const [stock, setStock] = useState<Record<number, number>>({});
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [presentaciones, setPresentaciones] = useState<
    Record<number, TipoPresentacion>
  >({});
  const [clienteId, setClienteId] = useState('');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState('');
  const [tipoPago, setTipoPago] = useState<TipoPago>('CONTADO');
  const [stockMsg, setStockMsg] = useState('');
  const [pedidoExitosoId, setPedidoExitosoId] = useState<number | null>(null);

  const claveErrorDe = (id: number, tipo: TipoPresentacion): ClaveErrorLinea =>
    `linea:${claveLinea(id, tipo)}`;

  const claveErrorLinea = (l: Linea): ClaveErrorLinea =>
    claveErrorDe(l.producto_id, l.tipo_presentacion);

  const formPedido = (
    lineasActuales: Linea[],
    cliente = clienteId,
    pago = tipoPago,
  ): FormularioPedido => {
    const form: FormularioPedido = {
      clienteId: cliente,
      lineas: lineasActuales,
      tipoPago: pago,
    };
    for (const l of lineasActuales) form[claveErrorLinea(l)] = l;
    return form;
  };

  const validar = useCallback(
    (form: FormularioPedido): ErroresFormulario<FormularioPedido> => {
      const errores: ErroresFormulario<FormularioPedido> = {};

      const errorCliente = requerido(
        form.clienteId,
        'Seleccioná un cliente para el pedido.',
      );
      if (errorCliente) errores.clienteId = errorCliente;

      if (form.lineas.length === 0) {
        errores.lineas = 'Agregá al menos un producto al pedido.';
      } else {
        for (const l of form.lineas) {
          const minimo = CANTIDAD_MINIMA[l.tipo_presentacion];
          const nombre =
            productos.find(p => p.id === l.producto_id)?.nombre ?? 'producto';
          const errorCantidad = enteroMinimo(
            l.cantidad,
            minimo,
            `"${nombre}": el pedido mínimo es de ${minimo} ${etiquetaPresentacion(l.tipo_presentacion, minimo)}. Ajustá la cantidad antes de continuar.`,
          );
          if (errorCantidad) errores[claveErrorLinea(l)] = errorCantidad;
        }

        // El stock está en unidades físicas y se reparte entre las líneas
        // UNIDAD y PAQUETE del mismo producto: se agrupa antes de comparar.
        const unidadesDeValidacion = (l: Linea) => {
          const p = productos.find(x => x.id === l.producto_id);
          return p
            ? unidadesDe({
                ...p,
                cantidad: l.cantidad,
                tipo_presentacion: l.tipo_presentacion,
              })
            : l.cantidad;
        };
        const porProducto = new Map<number, number>();
        for (const l of form.lineas) {
          porProducto.set(
            l.producto_id,
            (porProducto.get(l.producto_id) ?? 0) + unidadesDeValidacion(l),
          );
        }
        for (const [id, unidades] of porProducto.entries()) {
          const disponible = stock[id] ?? 0;
          if (unidades <= disponible) continue;
          const nombre =
            productos.find(p => p.id === id)?.nombre ?? 'el producto';
          errores.lineas = `Stock insuficiente para ${nombre}. Ajustá las cantidades antes de continuar.`;
          const mensajeLinea = `Stock insuficiente para ${nombre}: se necesitan ${unidades} unidades en total y solo hay ${disponible} disponibles.`;
          for (const l of form.lineas.filter(linea => linea.producto_id === id)) {
            if (!errores[claveErrorLinea(l)]) {
              errores[claveErrorLinea(l)] = mensajeLinea;
            }
          }
        }
      }

      const errorPago = primero(
        requerido(form.tipoPago, 'Seleccioná un tipo de pago.'),
        OPCIONES_PAGO.some(opcion => opcion.valor === form.tipoPago)
          ? undefined
          : 'Seleccioná un tipo de pago válido.',
      );
      if (errorPago) errores.tipoPago = errorPago;

      return errores;
    },
    [productos, stock],
  );

  const {
    errores,
    errorGeneral,
    setErrorGeneral,
    validarCampo,
    validarTodo,
    aplicarErroresBackend,
    reiniciar,
  } = useValidacionFormulario<FormularioPedido>(validar);

  /** Recalcula los mensajes afectados al cambiar una cantidad o un campo. */
  const revalidar = (
    lineasActuales: Linea[],
    cliente = clienteId,
    pago = tipoPago,
  ) => {
    const form = formPedido(lineasActuales, cliente, pago);
    const campos = new Set<keyof FormularioPedido>([
      'clienteId',
      'lineas',
      'tipoPago',
      ...lineasActuales.map(claveErrorLinea),
    ]);
    for (const campo of campos) validarCampo(campo, form);
    setErrorGeneral('');
  };

  const cargarDatos = async () => {
    try {
      const [resClientes, resProductos, resCategorias, resInventario] =
        await Promise.all([
          api.get('/clientes'),
          api.get('/productos', { params: { limit: 100 } }),
          api.get('/categorias', { params: { limit: 100 } }),
          api.get('/inventario', { params: { limit: 100 } }),
        ]);
      setClientes(Array.isArray(resClientes.data) ? resClientes.data : []);
      setProductos(Array.isArray(resProductos.data) ? resProductos.data : []);
      setCategorias(Array.isArray(resCategorias.data) ? resCategorias.data : []);
      const mapaStock: Record<number, number> = {};
      for (const item of Array.isArray(resInventario.data)
        ? resInventario.data
        : []) {
        mapaStock[item.producto_id] = Number(item.cantidad) || 0;
      }
      setStock(mapaStock);
    } catch {
      setClientes([]);
      setProductos([]);
      setCategorias([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(cargarDatos);
  }, []);

  useEffect(() => {
    if (!exito) return;
    const t = setTimeout(() => setExito(''), 6000);
    return () => clearTimeout(t);
  }, [exito]);

  /** Cantidad de una línea concreta: producto + presentación. */
  const cantidadDe = (id: number, tipo: TipoPresentacion) =>
    lineas.find(
      l => l.producto_id === id && l.tipo_presentacion === tipo,
    )?.cantidad ?? 0;

  const presentacionDe = (id: number): TipoPresentacion =>
    presentaciones[id] ?? 'UNIDAD';

  const minimoDe = (id: number) => CANTIDAD_MINIMA[presentacionDe(id)];

  const factorDe = (p: Producto, tipo: TipoPresentacion) =>
    esPaquete(tipo) ? factorConversion(p) : 1;

  const unidadesDeLinea = (l: Linea) => {
    const p = productos.find(x => x.id === l.producto_id);
    return p ? unidadesDe({ ...p, cantidad: l.cantidad, tipo_presentacion: l.tipo_presentacion }) : l.cantidad;
  };

  /** Tope de la línea activo descontando lo ya comprometido por la otra presentación. */
  const topeDe = (
    id: number,
    tipo: TipoPresentacion,
    factor: number,
    s: number,
  ) => {
    const ocupadas = lineas
      .filter(l => l.producto_id === id && l.tipo_presentacion !== tipo)
      .reduce((sum, l) => sum + unidadesDeLinea(l), 0);
    return Math.max(0, Math.floor((s - ocupadas) / factor));
  };

  /**
   * El selector elige qué presentación se está editando; NO convierte la
   * línea existente. Así un mismo producto puede tener simultáneamente una
   * línea de Unidades (mín. 3) y otra de Paquetes (mín. 1).
   */
  const setPresentacion = (id: number, tipo: TipoPresentacion) => {
    setPresentaciones(prev => ({ ...prev, [id]: tipo }));
    setStockMsg('');
    revalidar(lineas);
  };

  const setCantidad = (id: number, tipo: TipoPresentacion, n: number) => {
    const minimo = CANTIDAD_MINIMA[tipo];
    const cantidad = Math.max(minimo, n);
    const lineasNuevas =
      n <= 0
        ? lineas.filter(
            l => !(l.producto_id === id && l.tipo_presentacion === tipo),
          )
        : lineas.some(
            l => l.producto_id === id && l.tipo_presentacion === tipo,
          )
          ? lineas.map(l =>
              l.producto_id === id && l.tipo_presentacion === tipo
                ? { ...l, cantidad }
                : l,
            )
          : [...lineas, { producto_id: id, cantidad, tipo_presentacion: tipo }];

    setLineas(lineasNuevas);
    revalidar(lineasNuevas);
  };

  const manejarCantidad = (
    id: number,
    tipo: TipoPresentacion,
    v: number,
    s: number,
    factor: number,
  ) => {
    const minimo = CANTIDAD_MINIMA[tipo];
    if (Number.isNaN(v) || v <= 0) {
      setCantidad(id, tipo, 0);
      setStockMsg('');
      return;
    }
    // El stock está en unidades físicas y se reparte entre las dos líneas.
    const tope = topeDe(id, tipo, factor, s);
    if (tope < minimo) {
      setCantidad(id, tipo, 0);
      setStockMsg(
        `Stock insuficiente. Se necesitan ${minimo} ${
          minimo === 1 ? (factor > 1 ? 'paquete' : 'unidad') : 'unidades'
        } (stock disponible: ${s} unid.).`,
      );
      return;
    }
    if (v > tope) {
      setCantidad(id, tipo, tope);
      setStockMsg(
        `Stock insuficiente. Stock disponible: ${s} unid. (${tope} ${factor > 1 ? 'paq.' : 'un.'})`,
      );
      return;
    }
    setCantidad(id, tipo, Math.max(minimo, v));
    setStockMsg('');
  };

  const total = useMemo(
    () =>
      lineas.reduce((sum, l) => {
        const p = productos.find(x => x.id === l.producto_id);
        return sum + (p ? Number(p.precio) : 0) * unidadesDeLinea(l);
      }, 0),
    [lineas, productos],
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter(p => {
      const coincideBusqueda =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        (p.categoria?.nombre || '').toLowerCase().includes(q);
      const idCategoria = idCategoriaProducto(p);
      const coincideCategoria =
        categoriaFiltro === TODAS_CATEGORIAS ||
        (categoriaFiltro === SIN_CATEGORIA
          ? idCategoria === null
          : idCategoria === categoriaFiltro);
      return coincideBusqueda && coincideCategoria;
    });
  }, [productos, busqueda, categoriaFiltro]);

  const clienteSeleccionado = clientes.find(c => c.id === Number(clienteId));

  const guardar = async () => {
    // La validación corre ANTES de cargando/api.post/navegación: cualquier
    // problema deja mensajes rojos en el campo o en la línea correspondiente.
    if (!validarTodo(formPedido(lineas))) return;

    setGuardando(true);
    try {
      const res = await api.post('/pedidos', {
        usuarioId: Number(clienteId),
        direccion: direccion.trim() || undefined,
        notas: notas.trim() || undefined,
        tipo_pago: tipoPago,
        items: lineas.map(l => ({
          producto_id: l.producto_id,
          cantidad: l.cantidad,
          tipo_presentacion: l.tipo_presentacion,
          precio:
            Number(productos.find(p => p.id === l.producto_id)?.precio) || 0,
        })),
      });
      const pedidoId = Number(res.data?.pedidoId ?? res.data?.id);
      if (Number.isFinite(pedidoId) && pedidoId > 0) {
        setPedidoExitosoId(pedidoId);
      }
      setExito(
        tipoPago === 'CREDITO'
          ? '✅ Pedido creado y deuda registrada a crédito.'
          : '✅ Pedido creado y registrado como pagado (contado).',
      );
      setLineas([]);
      setPresentaciones({});
      setClienteId('');
      setDireccion('');
      setNotas('');
      setStockMsg('');
      reiniciar();
      await cargarDatos();
    } catch (err: unknown) {
      aplicarErroresBackend(err, CAMPOS_PEDIDO, ALIAS_PEDIDO);
      setErrorGeneral(mensajeGeneral(err, 'No se pudo crear el pedido.'));
    } finally {
      setGuardando(false);
    }
  };

  if (cargando && clientes.length === 0 && productos.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          Cargando catálogo...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-12">
      <div className="mb-6">
        <p className="prolimal-eyebrow">Punto de venta</p>
        <h1 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
          Nuevo Pedido
        </h1>
        <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200">
          Elegí el cliente y agregá los productos a vender.
        </p>
      </div>

      {exito && (
        <div className="mb-6 rounded-2xl border border-prolimal-green-200 bg-prolimal-green-50 px-4 py-3 text-sm font-semibold text-prolimal-green-700 dark:border-prolimal-green-900/40 dark:bg-prolimal-green-900/25 dark:text-prolimal-green-300">
          {exito}
        </div>
      )}
      <AvisoErrorFormulario mensaje={errorGeneral} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
        <section className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-6 lg:col-span-3">
          <h2 className="flex items-center gap-2.5 text-sm font-extrabold text-prolimal-ink-900 dark:text-prolimal-sand-50">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-prolimal-ink-900 text-[10px] font-bold text-prolimal-sand-50 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900">1</span>
            Cliente
          </h2>
          <select
            value={clienteId}
            onChange={e => {
              const valor = e.target.value;
              setClienteId(valor);
              revalidar(lineas, valor);
            }}
            className={claseCampo(
              Boolean(errores.clienteId),
              `prolimal-input mt-4 ${errores.clienteId ? 'mb-2' : 'mb-7'}`,
            )}
            aria-label="Cliente"
            aria-invalid={Boolean(errores.clienteId)}
            required
          >
            <option value="">— Seleccioná un cliente —</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>
                {c.nombre}
                {c.carnet ? ` · CI ${c.carnet}` : ''}
                {c.telefono ? ` · ${c.telefono}` : ''}
              </option>
            ))}
          </select>
          <CampoError mensaje={errores.clienteId} />

          {clienteSeleccionado && (
            <div className={`mb-7 rounded-2xl border border-prolimal-ink-900/10 bg-prolimal-sand-50/60 p-4 text-xs text-prolimal-ink-600 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/40 dark:text-prolimal-sand-200 ${errores.clienteId ? 'mt-2' : '-mt-4'}`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                Datos del cliente
              </p>
              <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                <span>CI / Documento: {clienteSeleccionado.carnet || '—'}</span>
                <span>Teléfono: {clienteSeleccionado.telefono || '—'}</span>
                <span>Email: {clienteSeleccionado.email || '—'}</span>
                <span>Ubicación: {clienteSeleccionado.ubicacion || '—'}</span>
              </div>
            </div>
          )}

          <h2 className="flex items-center gap-2.5 text-sm font-extrabold text-prolimal-ink-900 dark:text-prolimal-sand-50">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-prolimal-ink-900 text-[10px] font-bold text-prolimal-sand-50 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900">2</span>
            Productos
          </h2>
          <div className="relative mb-4 mt-4">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400 dark:text-prolimal-ink-300" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="prolimal-search-input"
            />
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoriaFiltro(TODAS_CATEGORIAS)}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors sm:min-h-0 sm:px-3 sm:py-1.5 ${
                categoriaFiltro === TODAS_CATEGORIAS
                  ? 'border-prolimal-ink-900 bg-prolimal-ink-900 text-prolimal-sand-50 dark:border-prolimal-teal-400 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
                  : 'border-prolimal-ink-900/10 text-prolimal-ink-500 dark:text-prolimal-ink-200'
              }`}
            >
              Todas
            </button>
            {categorias.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoriaFiltro(cat.id)}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors sm:min-h-0 sm:px-3 sm:py-1.5 ${
                  categoriaFiltro === cat.id
                    ? 'border-prolimal-ink-900 bg-prolimal-ink-900 text-prolimal-sand-50 dark:border-prolimal-teal-400 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
                    : 'border-prolimal-ink-900/10 text-prolimal-ink-500 dark:text-prolimal-ink-200'
                }`}
              >
                {cat.nombre}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCategoriaFiltro(SIN_CATEGORIA)}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors sm:min-h-0 sm:px-3 sm:py-1.5 ${
                categoriaFiltro === SIN_CATEGORIA
                  ? 'border-prolimal-ink-900 bg-prolimal-ink-900 text-prolimal-sand-50 dark:border-prolimal-teal-400 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
                  : 'border-prolimal-ink-900/10 text-prolimal-ink-500 dark:text-prolimal-ink-200'
              }`}
            >
              Sin categoría
            </button>
          </div>

          {stockMsg && (
            <div className="mb-4 rounded-2xl border border-prolimal-orange-200 bg-prolimal-orange-50 px-4 py-3 text-sm font-semibold text-prolimal-orange-700 dark:border-prolimal-orange-900/40 dark:bg-prolimal-orange-900/25 dark:text-prolimal-orange-300">
              {stockMsg}
            </div>
          )}

          {visibles.length === 0 ? (
            <p className="py-14 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
              No hay productos que coincidan.
            </p>
          ) : (
            <div className="scrollbar-hide grid max-h-[55vh] grid-cols-1 gap-3 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-2 lg:max-h-none">
              {visibles.map(p => {
                const s = stock[p.id] ?? 0;
                const tipo = presentacionDe(p.id);
                const minimo = minimoDe(p.id);
                const c = cantidadDe(p.id, tipo);
                const factor = factorDe(p, tipo);
                const tope = topeDe(p.id, tipo, factor, s);
                const errorLinea = errores[claveErrorDe(p.id, tipo)];
                return (
                  <div
                    key={p.id}
                    className={`flex flex-col gap-3 rounded-2xl border p-4 transition-colors ${
                      errorLinea
                        ? 'border-red-500 bg-red-50/60 dark:border-red-500/60 dark:bg-red-500/10'
                        : c > 0
                          ? 'border-prolimal-teal-500/40 bg-prolimal-teal-50/50 dark:border-prolimal-teal-400/30 dark:bg-prolimal-teal-900/15'
                          : 'border-prolimal-ink-900/10 bg-prolimal-sand-50/50 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-prolimal-ink-900 dark:text-prolimal-sand-50">
                          {p.nombre}
                        </p>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-prolimal-teal-700 dark:text-prolimal-teal-300">
                          {p.categoria?.nombre || 'Sin categoría'}
                          {p.tamano ? ` · ${p.tamano}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-prolimal-teal-700 dark:text-prolimal-teal-300">
                        {formatCurrency(p.precio)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                        Presentación
                      </span>
                      <div className="inline-flex rounded-full border border-prolimal-ink-900/10 bg-prolimal-sand-50/60 p-0.5 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/60">
                        {OPCIONES_PRESENTACION.map(opcion => {
                          const activo = tipo === opcion.valor;
                          return (
                            <button
                              key={opcion.valor}
                              type="button"
                              onClick={() => setPresentacion(p.id, opcion.valor)}
                              aria-pressed={activo}
                              aria-label={`${opcion.titulo} de ${p.nombre}`}
                              className={`min-h-10 rounded-full px-3.5 py-2 text-[10px] font-bold transition-colors sm:min-h-0 sm:px-2.5 sm:py-1 ${
                                activo
                                  ? 'bg-prolimal-teal-700 text-white dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
                                  : 'text-prolimal-ink-500 hover:text-prolimal-teal-700 dark:text-prolimal-ink-200'
                              }`}
                            >
                              {opcion.titulo}
                            </button>
                          );
                        })}
                      </div>
                      {esPaquete(tipo) && (
                        <span className="rounded-full bg-prolimal-teal-50 px-2 py-0.5 text-[10px] font-extrabold text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300">
                          1 paq = {factor} unid.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
                            s === 0
                              ? 'text-prolimal-coral-600 dark:text-prolimal-coral-400'
                              : 'text-prolimal-ink-400 dark:text-prolimal-ink-300'
                          }`}
                        >
                          {s === 0 ? 'Sin stock' : `Stock: ${s}`}
                        </span>
                        {s > 0 && s <= 10 && (
                          <span
                            role="status"
                            className="text-[10px] font-bold uppercase tracking-[0.12em] text-prolimal-coral-600 dark:text-prolimal-coral-400"
                          >
                            ⚠️ Stock bajo · quedan {s}
                          </span>
                        )}
                      </div>
                      <div
                        className={`flex items-center gap-1 rounded-full px-0.5 py-0.5 ${
                          errorLinea
                            ? 'border border-red-500 bg-red-50 dark:bg-red-500/10'
                            : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            manejarCantidad(
                              p.id,
                              tipo,
                              c - minimo,
                              s,
                              factor,
                            )
                          }
                          disabled={c === 0}
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-prolimal-ink-900/15 text-prolimal-ink-600 transition-colors hover:bg-white disabled:pointer-events-none disabled:opacity-30 sm:h-8 sm:w-8 dark:border-prolimal-sand-100/15 dark:text-prolimal-ink-200 dark:hover:bg-prolimal-ink-700"
                          aria-label="Restar"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          min={minimo}
                          max={tope || undefined}
                          value={c > 0 ? c : minimo}
                          onChange={e => {
                            manejarCantidad(
                              p.id,
                              tipo,
                              parseInt(e.target.value, 10),
                              s,
                              factor,
                            );
                          }}
                          className={`w-10 border-0 bg-transparent text-center text-sm font-bold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                            errorLinea
                              ? 'text-red-700 dark:text-red-300'
                              : 'text-prolimal-ink-900 dark:text-prolimal-sand-50'
                          }`}
                          aria-label={`Cantidad de ${p.nombre}`}
                          aria-invalid={Boolean(errorLinea)}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            manejarCantidad(
                              p.id,
                              tipo,
                              c + minimo,
                              s,
                              factor,
                            )
                          }
                          disabled={s === 0 || tope < minimo || c >= tope}
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-prolimal-ink-900/15 text-prolimal-ink-600 transition-colors hover:bg-white disabled:pointer-events-none disabled:opacity-30 sm:h-8 sm:w-8 dark:border-prolimal-sand-100/15 dark:text-prolimal-ink-200 dark:hover:bg-prolimal-ink-700"
                          aria-label="Sumar"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <CampoError mensaje={errorLinea} />

                    {c > 0 && factor > 1 && (
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-prolimal-teal-700 dark:text-prolimal-teal-300">
                        {c} paq. = {c * factor} unid.
                      </p>
                    )}

                    {s > 0 && tope < minimo && (
                      <p
                        role="alert"
                        className="text-[10px] font-bold text-prolimal-coral-600 dark:text-prolimal-coral-400"
                      >
                        Stock insuficiente para el mínimo de {minimo}{' '}
                        {etiquetaPresentacion(tipo, minimo)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-6 lg:sticky lg:top-36 lg:col-span-2">
          <h2 className="flex items-center gap-2.5 text-sm font-extrabold text-prolimal-ink-900 dark:text-prolimal-sand-50">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-prolimal-ink-900 text-[10px] font-bold text-prolimal-sand-50 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900">3</span>
            Resumen del pedido
          </h2>

          {lineas.length === 0 ? (
            <>
              <div className="mb-4 mt-4 rounded-2xl border border-dashed border-prolimal-ink-900/15 px-5 py-8 text-center dark:border-prolimal-sand-100/15">
                <ShoppingBag className="mx-auto h-5 w-5 text-prolimal-ink-300 dark:text-prolimal-ink-300" />
                <p className="mt-2 text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  El pedido está vacío. Sumá cantidades en el catálogo.
                </p>
              </div>
              <CampoError mensaje={errores.lineas} />
            </>
          ) : (
            <ul className="scrollbar-hide mb-4 mt-4 max-h-48 space-y-3 overflow-y-auto pr-1 lg:max-h-64">
              {lineas.map(l => {
                const p = productos.find(x => x.id === l.producto_id);
                if (!p) return null;
                const factor = factorDe(p, l.tipo_presentacion);
                const unidades = unidadesDeLinea(l);
                return (
                  <li
                    key={claveLinea(l.producto_id, l.tipo_presentacion)}
                    className={`flex flex-col gap-1 ${
                      errores[claveErrorLinea(l)]
                        ? 'rounded-xl border border-red-500 bg-red-50/50 px-2 py-2 dark:bg-red-500/10'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-prolimal-ink-900 dark:text-prolimal-sand-50">
                          {p.nombre}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                          {esPaquete(l.tipo_presentacion) ? 'Paquete' : 'Unidad'} ·{' '}
                          {l.cantidad} {esPaquete(l.tipo_presentacion) ? 'paq.' : 'un.'} ×{' '}
                          {formatCurrency(p.precio)}
                          {factor > 1 && ` · ${unidades} unid.`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-bold text-prolimal-ink-900 dark:text-prolimal-sand-50">
                          {formatCurrency(Number(p.precio) * unidades)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCantidad(l.producto_id, l.tipo_presentacion, 0)
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-full text-prolimal-coral-600 transition-colors hover:bg-prolimal-coral-50 sm:h-8 sm:w-8 dark:text-prolimal-coral-400 dark:hover:bg-prolimal-coral-900/25"
                          aria-label="Quitar producto"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <CampoError mensaje={errores[claveErrorLinea(l)]} />
                  </li>
                );
              })}
            </ul>
          )}

          <label className="mt-5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
            Dirección de entrega
          </label>
          <input
            type="text"
            placeholder="Ej: Av. Banzer #123"
            value={direccion}
            onChange={e => setDireccion(e.target.value)}
            className="prolimal-input mb-4 mt-1.5"
          />

          <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
            Notas (opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Instrucciones para el pedido"
            value={notas}
            onChange={e => setNotas(e.target.value)}
            className="prolimal-input mb-4 mt-1.5 resize-none"
          />

          <fieldset className="mb-4 mt-5">
            <legend className="text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
              Tipo de pago
            </legend>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {OPCIONES_PAGO.map(opcion => {
                const seleccionado = tipoPago === opcion.valor;
                return (
                  <label
                    key={opcion.valor}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors ${
                      errores.tipoPago
                        ? 'border-red-500 bg-red-50/60 dark:bg-red-500/10'
                        : seleccionado
                          ? 'border-prolimal-teal-500/50 bg-prolimal-teal-50/60 dark:border-prolimal-teal-400/40 dark:bg-prolimal-teal-900/20'
                          : 'border-prolimal-ink-900/10 bg-prolimal-sand-50/40 hover:border-prolimal-teal-500/30 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo_pago"
                      value={opcion.valor}
                      checked={seleccionado}
                      onChange={() => {
                        setTipoPago(opcion.valor);
                        revalidar(lineas, clienteId, opcion.valor);
                      }}
                      aria-invalid={Boolean(errores.tipoPago)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-prolimal-teal-700"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-prolimal-ink-900 dark:text-prolimal-sand-50">
                        {opcion.titulo}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-medium leading-snug text-prolimal-ink-400 dark:text-prolimal-ink-300">
                        {opcion.detalle}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <CampoError mensaje={errores.tipoPago} />
          </fieldset>

          <div className="mt-5 flex items-end justify-between border-t border-prolimal-ink-900/10 pt-4 dark:border-prolimal-sand-100/10">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Total</span>
            <span className="prolimal-display text-2xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
              {formatCurrency(total)}
            </span>
          </div>

          <div className="sticky bottom-0 z-10 -mx-5 mt-5 bg-card px-5 pb-1 pt-3 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:p-0 dark:bg-card-dark">
            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="prolimal-btn-primary w-full"
            >
              {guardando ? 'Guardando...' : 'Guardar Pedido'}
            </button>
            {lineas.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setLineas([]);
                  setPresentaciones({});
                  setStockMsg('');
                  reiniciar();
                }}
                className="prolimal-btn-ghost-danger mt-2 w-full"
              >
                <Trash2 className="h-4 w-4" />
                Vaciar carrito
              </button>
            )}
          </div>
        </section>
      </div>

      {pedidoExitosoId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-prolimal-ink-900/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-comprobante"
        >
          <div className="prolimal-surface max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] p-7 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-prolimal-green-100 text-2xl dark:bg-prolimal-green-900/40">
              ✅
            </div>
            <h2
              id="titulo-comprobante"
              className="prolimal-display mt-4 text-2xl tracking-[-0.03em] text-prolimal-ink-900 dark:text-prolimal-sand-50"
            >
              ¡Pedido #{pedidoExitosoId} registrado!
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200">
              El stock, el kardex y el saldo ya fueron actualizados. Descargá o
              imprimí el comprobante comercial interno.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <BotonComprobantePdf pedidoId={pedidoExitosoId} />
              <button
                type="button"
                onClick={() => setPedidoExitosoId(null)}
                className="prolimal-btn-secondary"
              >
                <X className="h-4 w-4" />
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}