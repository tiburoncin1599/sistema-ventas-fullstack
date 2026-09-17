'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

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
}

interface Linea {
  producto_id: number;
  cantidad: number;
}

export default function VentasNuevoPedidoPage() {
  const [cargando, setCargando] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [stock, setStock] = useState<Record<number, number>>({});
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [tipoPago, setTipoPago] = useState<'contado' | 'credito'>('contado');
  const [stockMsg, setStockMsg] = useState('');

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

  const cantidadDe = (id: number) =>
    lineas.find(l => l.producto_id === id)?.cantidad || 0;

  const setCantidad = (id: number, n: number) => {
    if (n <= 0) {
      setLineas(prev => prev.filter(l => l.producto_id !== id));
      return;
    }
    setLineas(prev => {
      const existente = prev.find(l => l.producto_id === id);
      if (existente) {
        return prev.map(l => (l.producto_id === id ? { ...l, cantidad: n } : l));
      }
      return [...prev, { producto_id: id, cantidad: n }];
    });
  };

  const manejarCantidad = (id: number, v: number, s: number) => {
    if (Number.isNaN(v) || v < 0 || v === 0) {
      setCantidad(id, 0);
      setStockMsg('');
      return;
    }
    if (s > 0 && v > s) {
      setCantidad(id, s);
      setStockMsg(`Stock insuficiente. Stock disponible: ${s} unidades.`);
      return;
    }
    if (s === 0) {
      setCantidad(id, 0);
      setStockMsg('Stock insuficiente. Stock disponible: 0 unidades.');
      return;
    }
    setCantidad(id, v);
    setStockMsg('');
  };

  const total = useMemo(
    () =>
      lineas.reduce((sum, l) => {
        const p = productos.find(x => x.id === l.producto_id);
        return sum + (p ? Number(p.precio) : 0) * l.cantidad;
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
    setGuardando(true);
    setError('');
    try {
      await api.post('/pedidos', {
        usuarioId: Number(clienteId),
        direccion: direccion.trim() || undefined,
        notas: notas.trim() || undefined,
        tipoPago,
        items: lineas.map(l => ({
          producto_id: l.producto_id,
          cantidad: l.cantidad,
          precio:
            Number(productos.find(p => p.id === l.producto_id)?.precio) || 0,
        })),
      });
      setExito(
        tipoPago === 'credito'
          ? '✅ Pedido creado y deuda registrada a crédito.'
          : '✅ Pedido creado y registrado como pagado (contado).',
      );
      setLineas([]);
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
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
        <p className="text-center py-20 text-gray-500 dark:text-gray-400">
          Cargando catálogo...
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold dark:text-white">Nuevo Pedido</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Elegí el cliente y agregá los productos a vender
        </p>
      </div>

      {exito && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-2xl px-4 py-3 text-green-700 dark:text-green-300 text-sm">
          {exito}
        </div>
      )}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <section className="lg:col-span-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5">
          <h2 className="font-bold mb-4 dark:text-white">1 · Cliente</h2>
          <select
            value={clienteId}
            onChange={e => setClienteId(e.target.value)}
            className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 dark:text-white mb-6"
          >
            <option value="">— Seleccioná un cliente —</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>
                {c.nombre}
                {c.telefono ? ` · ${c.telefono}` : ''}
              </option>
            ))}
          </select>

          <h2 className="font-bold mb-3 dark:text-white">2 · Productos</h2>
          <input
            type="text"
            placeholder="🔎 Buscar producto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 dark:text-white mb-4"
          />

          {stockMsg && (
            <div className="mb-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              {stockMsg}
            </div>
          )}

          {visibles.length === 0 ? (
            <p className="text-center py-14 text-gray-400 dark:text-gray-500 text-sm">
              No hay productos que coincidan.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibles.map(p => {
                const s = stock[p.id] ?? 0;
                const c = cantidadDe(p.id);
                return (
                  <div
                    key={p.id}
                    className="border dark:border-gray-600 rounded-2xl p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm dark:text-white truncate">
                          {p.nombre}
                        </p>
                        {p.tamano && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {p.tamano}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(p.precio)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs ${
                          s === 0
                            ? 'text-red-500 font-medium'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {s === 0 ? 'Sin stock' : `Stock: ${s}`}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setCantidad(p.id, c - 1)}
                          disabled={c === 0}
                          className="w-8 h-8 rounded-lg border dark:border-gray-600 text-lg font-bold leading-none hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={s || undefined}
                          value={c}
                          onChange={e => {
                            manejarCantidad(p.id, parseInt(e.target.value, 10), s);
                          }}
                          className="w-10 text-center text-sm font-bold dark:text-white bg-transparent border-0 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => setCantidad(p.id, c + 1)}
                          disabled={s === 0 || c >= s}
                          className="w-8 h-8 rounded-lg border dark:border-gray-600 text-lg font-bold leading-none hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="lg:col-span-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5">
          <h2 className="font-bold mb-4 dark:text-white">3 · Resumen del pedido</h2>

          {lineas.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center mb-2">
              El pedido está vacío. Sumá cantidades en el catálogo.
            </p>
          ) : (
            <ul className="mb-4 divide-y dark:divide-gray-700 space-y-2">
              {lineas.map(l => {
                const p = productos.find(x => x.id === l.producto_id);
                if (!p) return null;
                return (
                  <li key={l.producto_id} className="flex items-center justify-between gap-2 pt-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium dark:text-white truncate">
                        {p.nombre}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {l.cantidad} × {formatCurrency(p.precio)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold dark:text-white">
                        {formatCurrency(Number(p.precio) * l.cantidad)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCantidad(l.producto_id, 0)}
                        className="w-7 h-7 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 text-lg font-bold leading-none"
                        aria-label="Quitar producto"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <label className="block text-sm font-medium mb-1.5 dark:text-white">
            Dirección de entrega
          </label>
          <input
            type="text"
            placeholder="Ej: Av. Banzer #123"
            value={direccion}
            onChange={e => setDireccion(e.target.value)}
            className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 dark:text-white mb-4"
          />

          <label className="block text-sm font-medium mb-1.5 dark:text-white">
            Notas (opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Instrucciones para el pedido"
            value={notas}
            onChange={e => setNotas(e.target.value)}
            className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 dark:text-white resize-none"
          />

          <label className="block text-sm font-medium mb-1.5 dark:text-white">
            Tipo de pago
          </label>
          <select
            value={tipoPago}
            onChange={e => setTipoPago(e.target.value as 'contado' | 'credito')}
            className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 dark:text-white mb-4"
          >
            <option value="contado">Contado — pago inmediato</option>
            <option value="credito">Crédito — registra saldo pendiente</option>
          </select>

          <div className="flex items-center justify-between mt-5 mb-4">
            <span className="text-lg font-bold dark:text-white">Total</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(total)}
            </span>
          </div>

          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="w-full bg-[#005a24] text-white py-3 rounded-xl font-medium hover:bg-[#003e19] disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar Pedido'}
          </button>
          {lineas.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setLineas([]);
                setError('');
              }}
              className="w-full mt-2 border dark:border-gray-600 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Vaciar carrito
            </button>
          )}
        </section>
      </div>
    </main>
  );
}