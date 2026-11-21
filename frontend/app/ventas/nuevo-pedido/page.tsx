'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
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

interface Cliente {
  id: number;
  nombre: string;
  email?: string;
  telefono?: string;
}

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  tamano?: string;
  factor_paquete?: number | null;
}

interface Linea {
  producto_id: number;
  cantidad: number;
  tipo_presentacion: TipoPresentacion;
}

type TipoPago = 'CONTADO' | 'CREDITO';

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
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [tipoPago, setTipoPago] = useState<TipoPago>('CONTADO');
  const [stockMsg, setStockMsg] = useState('');
  const [pedidoExitosoId, setPedidoExitosoId] = useState<number | null>(null);

  const cargarDatos = async () => {
    try {
      const [resClientes, resProductos, resInventario] = await Promise.all([
        api.get('/clientes'),
        api.get('/productos?limit=100'),
        api.get('/inventario?limit=100'),
      ]);
      setClientes(Array.isArray(resClientes.data) ? resClientes.data : []);
      setProductos(Array.isArray(resProductos.data) ? resProductos.data : []);
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
  };

  const setCantidad = (id: number, tipo: TipoPresentacion, n: number) => {
    const minimo = CANTIDAD_MINIMA[tipo];
    if (n <= 0) {
      setLineas(prev =>
        prev.filter(
          l => !(l.producto_id === id && l.tipo_presentacion === tipo),
        ),
      );
      return;
    }
    const cantidad = Math.max(minimo, n);
    setLineas(prev => {
      const existe = prev.some(
        l => l.producto_id === id && l.tipo_presentacion === tipo,
      );
      if (existe) {
        return prev.map(l =>
          l.producto_id === id && l.tipo_presentacion === tipo
            ? { ...l, cantidad }
            : l,
        );
      }
      return [...prev, { producto_id: id, cantidad, tipo_presentacion: tipo }];
    });
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
    return q
      ? productos.filter(p => p.nombre.toLowerCase().includes(q))
      : productos;
  }, [productos, busqueda]);

  const guardar = async () => {
    if (!clienteId) {
      setError('Seleccioná un cliente para el pedido.');
      return;
    }
    if (lineas.length === 0) {
      setError('Agregá al menos un producto al pedido.');
      return;
    }
    const lineaInvalida = lineas.find(
      l => l.cantidad < CANTIDAD_MINIMA[l.tipo_presentacion],
    );
    if (lineaInvalida) {
      const nombre =
        productos.find(p => p.id === lineaInvalida.producto_id)?.nombre ??
        'producto';
      const min = CANTIDAD_MINIMA[lineaInvalida.tipo_presentacion];
      setError(
        `"${nombre}": el pedido mínimo es de ${min} ${etiquetaPresentacion(lineaInvalida.tipo_presentacion, min)}. Ajustá la cantidad antes de continuar.`,
      );
      return;
    }

    // El stock se comparte entre las líneas UNIDAD y PAQUETE del mismo
    // producto: la suma de unidades físicas no puede superar el disponible.
    const productoExcedido = [...new Set(lineas.map(l => l.producto_id))].find(
      id =>
        lineas
          .filter(l => l.producto_id === id)
          .reduce((sum, l) => sum + unidadesDeLinea(l), 0) > (stock[id] ?? 0),
    );
    if (productoExcedido !== undefined) {
      const nombre =
        productos.find(p => p.id === productoExcedido)?.nombre ?? 'el producto';
      setError(`Stock insuficiente para ${nombre}. Ajustá las cantidades antes de continuar.`);
      return;
    }

    setGuardando(true);
    setError('');
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
      await cargarDatos();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'No se pudo crear el pedido.',
      );
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
      {error && (
        <div className="mb-6 rounded-2xl border border-prolimal-coral-200 bg-prolimal-coral-50 px-4 py-3 text-sm font-semibold text-prolimal-coral-700 dark:border-prolimal-coral-900/40 dark:bg-prolimal-coral-900/25 dark:text-prolimal-coral-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
        <section className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-6 lg:col-span-3">
          <h2 className="flex items-center gap-2.5 text-sm font-extrabold text-prolimal-ink-900 dark:text-prolimal-sand-50">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-prolimal-ink-900 text-[10px] font-bold text-prolimal-sand-50 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900">1</span>
            Cliente
          </h2>
          <select
            value={clienteId}
            onChange={e => setClienteId(e.target.value)}
            className="prolimal-input mb-7 mt-4"
            aria-label="Cliente"
          >
            <option value="">— Seleccioná un cliente —</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>
                {c.nombre}
                {c.telefono ? ` · ${c.telefono}` : ''}
              </option>
            ))}
          </select>

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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {visibles.map(p => {
                const s = stock[p.id] ?? 0;
                const tipo = presentacionDe(p.id);
                const minimo = minimoDe(p.id);
                const c = cantidadDe(p.id, tipo);
                const factor = factorDe(p, tipo);
                const tope = topeDe(p.id, tipo, factor, s);
                return (
                  <div
                    key={p.id}
                    className={`flex flex-col gap-3 rounded-2xl border p-4 transition-colors ${
                      c > 0
                        ? 'border-prolimal-teal-500/40 bg-prolimal-teal-50/50 dark:border-prolimal-teal-400/30 dark:bg-prolimal-teal-900/15'
                        : 'border-prolimal-ink-900/10 bg-prolimal-sand-50/50 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-prolimal-ink-900 dark:text-prolimal-sand-50">
                          {p.nombre}
                        </p>
                        {p.tamano && (
                          <p className="text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                            {p.tamano}
                          </p>
                        )}
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
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors ${
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
                      <div className="flex items-center gap-1">
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
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-prolimal-ink-900/15 text-prolimal-ink-600 transition-colors hover:bg-white disabled:pointer-events-none disabled:opacity-30 dark:border-prolimal-sand-100/15 dark:text-prolimal-ink-200 dark:hover:bg-prolimal-ink-700"
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
                          className="w-10 border-0 bg-transparent text-center text-sm font-bold text-prolimal-ink-900 outline-none [appearance:textfield] dark:text-prolimal-sand-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          aria-label={`Cantidad de ${p.nombre}`}
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
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-prolimal-ink-900/15 text-prolimal-ink-600 transition-colors hover:bg-white disabled:pointer-events-none disabled:opacity-30 dark:border-prolimal-sand-100/15 dark:text-prolimal-ink-200 dark:hover:bg-prolimal-ink-700"
                          aria-label="Sumar"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

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
            <div className="mb-4 mt-4 rounded-2xl border border-dashed border-prolimal-ink-900/15 px-5 py-8 text-center dark:border-prolimal-sand-100/15">
              <ShoppingBag className="mx-auto h-5 w-5 text-prolimal-ink-300 dark:text-prolimal-ink-300" />
              <p className="mt-2 text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                El pedido está vacío. Sumá cantidades en el catálogo.
              </p>
            </div>
          ) : (
            <ul className="mb-4 mt-4 space-y-3">
              {lineas.map(l => {
                const p = productos.find(x => x.id === l.producto_id);
                if (!p) return null;
                const factor = factorDe(p, l.tipo_presentacion);
                const unidades = unidadesDeLinea(l);
                return (
                  <li
                    key={claveLinea(l.producto_id, l.tipo_presentacion)}
                    className="flex items-center justify-between gap-2"
                  >
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
                        className="flex h-7 w-7 items-center justify-center rounded-full text-prolimal-coral-600 transition-colors hover:bg-prolimal-coral-50 dark:text-prolimal-coral-400 dark:hover:bg-prolimal-coral-900/25"
                        aria-label="Quitar producto"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
                      seleccionado
                        ? 'border-prolimal-teal-500/50 bg-prolimal-teal-50/60 dark:border-prolimal-teal-400/40 dark:bg-prolimal-teal-900/20'
                        : 'border-prolimal-ink-900/10 bg-prolimal-sand-50/40 hover:border-prolimal-teal-500/30 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo_pago"
                      value={opcion.valor}
                      checked={seleccionado}
                      onChange={() => setTipoPago(opcion.valor)}
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
          </fieldset>

          <div className="mt-5 flex items-end justify-between border-t border-prolimal-ink-900/10 pt-4 dark:border-prolimal-sand-100/10">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Total</span>
            <span className="prolimal-display text-2xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
              {formatCurrency(total)}
            </span>
          </div>

          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="prolimal-btn-primary mt-5 w-full"
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
                setError('');
              }}
              className="prolimal-btn-ghost-danger mt-2 w-full"
            >
              <Trash2 className="h-4 w-4" />
              Vaciar carrito
            </button>
          )}
        </section>
      </div>

      {pedidoExitosoId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-prolimal-ink-900/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-comprobante"
        >
          <div className="prolimal-surface w-full max-w-md rounded-[2rem] p-7 text-center shadow-2xl">
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