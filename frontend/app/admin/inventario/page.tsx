'use client';
import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, parseCurrency } from '@/lib/utils';

interface ItemInventario {
  id: number;
  producto_id: number;
  cantidad: number;
  cantidad_minima: number;
  producto: {
    nombre: string;
    precio: number;
    precio_costo?: number;
    precio_por_docena?: number;
    tamano?: string;
    categoria?: { id: number; nombre: string };
  };
}

const getColor = (cantidad: number, minimo: number) => {
  if (cantidad <= minimo)
    return { bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300', label: 'Stock bajo', dot: 'bg-red-500' };
  if (cantidad <= minimo * 2)
    return { bg: 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300', label: 'Stock medio', dot: 'bg-orange-500' };
  return { bg: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300', label: 'Stock OK', dot: 'bg-green-500' };
};

interface Deuda {
  id: number;
  usuario_id: number;
  monto: number;
  monto_pagado: number;
  descripcion: string;
  estado: string;
  usuario: { nombre: string; email: string; rol: string };
}

interface Pedido {
  id: number;
  total: number;
  estado: string;
  creado_en: string;
  usuario: { nombre: string };
}

export default function AdminInventario() {
  const [inventario, setInventario] = useState<ItemInventario[]>([]);
  const [modalItem, setModalItem] = useState<ItemInventario | null>(null);
  const [nuevaCantidad, setNuevaCantidad] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  useEffect(() => {
    api.get('/inventario').then(res => setInventario(res.data)).catch(() => {});
    api.get('/deudas').then(res => setDeudas(res.data)).catch(() => {});
    api.get('/pedidos').then(res => setPedidos(res.data)).catch(() => {});
  }, []);

  const actualizar = async (productoId: number) => {
    await api.put(`/inventario/${productoId}`, { cantidad: +nuevaCantidad });
    const res = await api.get('/inventario');
    setInventario(res.data);
    setEditandoId(null);
    setNuevaCantidad('');
    if (modalItem?.producto_id === productoId) {
      setModalItem(res.data.find((i: ItemInventario) => i.producto_id === productoId) || null);
    }
  };

  const alertas = inventario.filter(i => i.cantidad <= i.cantidad_minima);

  const agrupado = useMemo(() => {
    const map = new Map<string, ItemInventario[]>();
    const sinCat: ItemInventario[] = [];
    for (const item of inventario) {
      const cat = item.producto?.categoria?.nombre;
      if (cat) {
        const arr = map.get(cat) || [];
        arr.push(item);
        map.set(cat, arr);
      } else {
        sinCat.push(item);
      }
    }
    const ordenado = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    return { categorias: ordenado, sinCategoria: sinCat };
  }, [inventario]);

  return (
    <main className="max-w-6xl mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Inventario</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{inventario.length} productos en stock</p>
        </div>
        {alertas.length > 0 && (
          <span className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-4 py-2 rounded-xl text-sm font-bold">
            {alertas.length} alerta{alertas.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Deudas por empleado ventas */}
      <details className="mb-6 border dark:border-gray-700 rounded-2xl overflow-hidden" open>
        <summary className="bg-gray-50 dark:bg-gray-800 px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <span className="font-bold text-lg dark:text-white">Deudas del personal de ventas</span>
          </div>
          <span className="text-sm text-gray-400">{deudas.filter(d => d.usuario?.rol === 'ventas').length} deudas</span>
        </summary>
        <div className="overflow-x-auto">
          {deudas.filter(d => d.usuario?.rol === 'ventas').length === 0 ? (
            <p className="text-center py-8 text-gray-500 dark:text-gray-400">No hay deudas registradas para el personal de ventas</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-t dark:border-gray-700">
                  <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Empleado</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Descripción</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Monto</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Pagado</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Saldo</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Estado</th>
                </tr>
              </thead>
              <tbody>
                {deudas.filter(d => d.usuario?.rol === 'ventas').map(d => {
                  const saldo = d.monto - d.monto_pagado;
                  const colorEstado: Record<string, string> = {
                    pendiente: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
                    parcial: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
                    pagado: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
                  };
                  return (
                    <tr key={d.id} className="border-t dark:border-gray-700 dark:text-white">
                      <td className="px-6 py-4 font-medium text-sm">{d.usuario?.nombre || '—'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">{d.descripcion || '—'}</td>
                      <td className="px-6 py-4 text-sm">{formatCurrency(d.monto)}</td>
                      <td className="px-6 py-4 text-sm">{formatCurrency(d.monto_pagado)}</td>
                      <td className={`px-6 py-4 font-bold text-sm ${saldo > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {formatCurrency(saldo)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${colorEstado[d.estado] || ''}`}>{d.estado}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </details>

      {/* Últimos pedidos */}
      <details className="mb-6 border dark:border-gray-700 rounded-2xl overflow-hidden" open>
        <summary className="bg-gray-50 dark:bg-gray-800 px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <span className="font-bold text-lg dark:text-white">Últimos pedidos registrados</span>
          </div>
          <span className="text-sm text-gray-400">{pedidos.length} total</span>
        </summary>
        <div className="overflow-x-auto">
          {pedidos.length === 0 ? (
            <p className="text-center py-8 text-gray-500 dark:text-gray-400">No hay pedidos registrados</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-t dark:border-gray-700">
                  <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">#</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Cliente</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Total</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Estado</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.slice(0, 10).map(p => {
                  const color: Record<string, string> = {
                    pendiente: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
                    confirmado: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
                    enviado: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
                    entregado: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
                    cancelado: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
                  };
                  return (
                    <tr key={p.id} className="border-t dark:border-gray-700 dark:text-white">
                      <td className="px-6 py-4 font-bold text-sm">#{p.id}</td>
                      <td className="px-6 py-4 text-sm">{p.usuario?.nombre}</td>
                      <td className="px-6 py-4 text-sm font-medium">{formatCurrency(p.total)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${color[p.estado] || ''}`}>{p.estado}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(p.creado_en).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {pedidos.length > 10 && (
            <p className="text-center py-3 text-sm text-blue-600 dark:text-blue-400">
              Mostrando 10 de {pedidos.length} pedidos
            </p>
          )}
        </div>
      </details>

      {inventario.length === 0 ? (
        <p className="text-center py-20 text-gray-500 dark:text-gray-400">Cargando inventario...</p>
      ) : (
        <div className="space-y-8">
          {agrupado.categorias.map(([cat, items]) => {
            const totalItems = items.reduce((s, i) => s + i.cantidad, 0);
            const alertasCat = items.filter(i => i.cantidad <= i.cantidad_minima).length;
            return (
              <section key={cat}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold dark:text-white">{cat}</h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {items.length} producto{items.length !== 1 ? 's' : ''} &middot; {totalItems} u.
                    </span>
                  </div>
                  {alertasCat > 0 && (
                    <span className="text-xs text-red-500 dark:text-red-400 font-medium">{alertasCat} alerta{alertasCat !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map(item => {
                    const estilo = getColor(item.cantidad, item.cantidad_minima);
                    return (
                      <div
                        key={item.id}
                        onClick={() => { setModalItem(item); setNuevaCantidad(String(item.cantidad)); }}
                        className={`bg-white dark:bg-gray-800 border rounded-2xl p-5 hover:shadow-lg dark:hover:shadow-gray-900/50 transition-shadow cursor-pointer ${estilo.bg}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white truncate">{item.producto?.nombre}</p>
                            {item.producto?.tamano && (
                              <p className="text-xs text-gray-400 dark:text-gray-500">{item.producto.tamano}</p>
                            )}
                          </div>
                          <span className={`w-3 h-3 rounded-full ${estilo.dot} shrink-0 ml-2`} />
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className={`text-3xl font-bold ${estilo.text}`}>{item.cantidad}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Mín: {item.cantidad_minima}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(item.producto?.precio)}</p>
                            {item.producto?.precio_por_docena && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">Docena: {formatCurrency(item.producto.precio_por_docena)}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t dark:border-gray-700 flex justify-between items-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${estilo.text} ${estilo.bg}`}>
                            {estilo.label}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {formatCurrency(item.cantidad * parseCurrency(item.producto?.precio))} en stock
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {agrupado.sinCategoria.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4 dark:text-white">Sin categoría</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {agrupado.sinCategoria.map(item => {
                  const estilo = getColor(item.cantidad, item.cantidad_minima);
                  return (
                    <div key={item.id} onClick={() => { setModalItem(item); setNuevaCantidad(String(item.cantidad)); }}
                      className={`bg-white dark:bg-gray-800 border rounded-2xl p-5 hover:shadow-lg dark:hover:shadow-gray-900/50 transition-shadow cursor-pointer ${estilo.bg}`}>
                      <p className="font-bold text-gray-900 dark:text-white truncate">{item.producto?.nombre}</p>
                      <p className={`text-3xl font-bold ${estilo.text}`}>{item.cantidad}</p>
                      <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(item.producto?.precio)}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {modalItem && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-50" onClick={() => { setModalItem(null); setEditandoId(null); }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold dark:text-white">{modalItem.producto?.nombre}</h2>
                {modalItem.producto?.categoria && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{modalItem.producto.categoria.nombre}</p>
                )}
              </div>
              <button onClick={() => { setModalItem(null); setEditandoId(null); }} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl">&times;</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Stock actual</p>
                  <p className="text-3xl font-bold dark:text-white">{modalItem.cantidad}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Stock mínimo</p>
                  <p className="text-xl font-bold dark:text-white">{modalItem.cantidad_minima}</p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Precio venta</span>
                  <span className="font-bold dark:text-white">{formatCurrency(modalItem.producto?.precio)}</span>
                </div>
                {modalItem.producto?.precio_costo && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Precio costo</span>
                    <span className="font-medium dark:text-white">{formatCurrency(modalItem.producto.precio_costo)}</span>
                  </div>
                )}
                {modalItem.producto?.precio_por_docena && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Precio por docena</span>
                    <span className="font-medium dark:text-white">{formatCurrency(modalItem.producto.precio_por_docena)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1 border-t dark:border-gray-600 mt-1 pt-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Valor total stock</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(modalItem.cantidad * parseCurrency(modalItem.producto?.precio))}</span>
                </div>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 dark:text-gray-400">Estado</span>
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${getColor(modalItem.cantidad, modalItem.cantidad_minima).text} ${getColor(modalItem.cantidad, modalItem.cantidad_minima).bg}`}>
                  {getColor(modalItem.cantidad, modalItem.cantidad_minima).label}
                </span>
              </div>

              <div className="pt-4 border-t dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Actualizar stock</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={editandoId === modalItem.producto_id ? nuevaCantidad : modalItem.cantidad}
                    onChange={e => { setNuevaCantidad(e.target.value); setEditandoId(modalItem.producto_id); }}
                    onFocus={() => setEditandoId(modalItem.producto_id)}
                    className="flex-1 border dark:border-gray-600 rounded-xl px-4 py-3 text-lg font-bold dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    onClick={() => actualizar(modalItem.producto_id)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
