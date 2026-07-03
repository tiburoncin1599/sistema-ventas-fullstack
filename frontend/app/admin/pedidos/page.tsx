'use client';
import { useEffect, useState } from 'react';
import { api, apiFetchBlob, API_URL } from '@/lib/api';
import { formatCurrency, parseCurrency } from '@/lib/utils';

interface Pedido {
  id: number;
  total: number;
  estado: string;
  creado_en: string;
  direccion_entrega: string;
  usuario: { nombre: string; email: string };
  detalles?: Detalle[];
}

interface Detalle {
  id: number;
  cantidad: number;
  precio_unitario: number;
  producto: { id: number; nombre: string; imagen_url: string };
}

const getColorEstado = (estado: string) => {
  const colores: Record<string, string> = {
    pendiente: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
    confirmado: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    enviado: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
    entregado: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    cancelado: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  };
  return colores[estado] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
};

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoSel, setPedidoSel] = useState<Pedido | null>(null);
  const [qrImg, setQrImg] = useState('');

  useEffect(() => {
    api.get('/pedidos').then(res => setPedidos(res.data)).catch(() => {});
  }, []);

  const cambiarEstado = async (id: number, estado: string) => {
    await api.put(`/pedidos/${id}/estado`, { estado });
    const res = await api.get('/pedidos');
    setPedidos(res.data);
    if (pedidoSel?.id === id) {
      setPedidoSel({ ...pedidoSel, estado });
    }
  };

  const abrirDetalle = async (id: number) => {
    setQrImg('');
    try {
      const res = await api.get(`/pedidos/${id}`);
      setPedidoSel(res.data);
    } catch {}
  };

  const generarQR = async (id: number) => {
    try {
      const res = await api.get(`/pedidos/${id}/factura/qr`);
      setQrImg(res.data.qr);
    } catch {
      alert('Error al generar el QR. Verificá que el pedido tenga datos válidos.');
    }
  };

  const eliminarPedido = async (id: number) => {
    if (!confirm('¿Eliminar este pedido?')) return;
    try {
      await api.delete(`/pedidos/${id}`);
      setPedidoSel(null);
      const res = await api.get('/pedidos');
      setPedidos(res.data);
    } catch {}
  };

  return (
    <main className="max-w-6xl mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold dark:text-white">Pedidos</h1>
        <div className="flex gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400 self-center">
            {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {pedidos.length === 0 ? (
        <p className="text-center py-20 text-gray-500 dark:text-gray-400">No hay pedidos todavía</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {pedidos.map(pedido => (
            <div
              key={pedido.id}
              onClick={() => abrirDetalle(pedido.id)}
              className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 hover:shadow-lg dark:hover:shadow-gray-900/50 transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-lg dark:text-white">#{pedido.id}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">{pedido.usuario?.nombre}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getColorEstado(pedido.estado)}`}>
                  {pedido.estado}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(pedido.creado_en).toLocaleDateString()}
                </div>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(pedido.total)}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t dark:border-gray-700 flex gap-2" onClick={e => e.stopPropagation()}>
                <select
                  value={pedido.estado}
                  onChange={e => cambiarEstado(pedido.id, e.target.value)}
                  className="flex-1 border dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs dark:bg-gray-700 dark:text-white"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="enviado">Enviado</option>
                  <option value="entregado">Entregado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <button
                  onClick={() => abrirDetalle(pedido.id)}
                  className="text-xs text-green-600 dark:text-green-400 font-medium border border-green-200 dark:border-green-800 rounded-lg px-2.5 py-1.5 hover:bg-green-50 dark:hover:bg-green-900/30"
                >
                  QR
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pedidoSel && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-50" onClick={() => setPedidoSel(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold dark:text-white">Pedido #{pedidoSel.id}</h2>
              <div className="flex gap-2">
                <button onClick={() => eliminarPedido(pedidoSel.id)}
                  className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium border border-red-200 dark:border-red-800 rounded-lg px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/30">
                  Eliminar
                </button>
                <button onClick={() => setPedidoSel(null)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl">&times;</button>
              </div>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-1">Cliente: {pedidoSel.usuario?.nombre} ({pedidoSel.usuario?.email})</p>
            <p className="text-gray-500 dark:text-gray-400 mb-1">Dirección: {pedidoSel.direccion_entrega}</p>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Fecha: {new Date(pedidoSel.creado_en).toLocaleDateString()}</p>

            <div className="flex gap-2 mb-6">
              <select
                value={pedidoSel.estado}
                onChange={e => cambiarEstado(pedidoSel.id, e.target.value)}
                className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              >
                <option value="pendiente">Pendiente</option>
                <option value="confirmado">Confirmado</option>
                <option value="enviado">Enviado</option>
                <option value="entregado">Entregado</option>
                <option value="cancelado">Cancelado</option>
              </select>
              <button
                onClick={() => generarQR(pedidoSel.id)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
              >
                {qrImg ? 'Regenerar QR' : 'Generar Factura QR'}
              </button>
            </div>

            <h3 className="font-bold text-lg mb-3 dark:text-white">Productos</h3>
            <div className="space-y-3 mb-6">
              {pedidoSel.detalles?.map(d => (
                <div key={d.id} className="flex items-center gap-4 border dark:border-gray-700 rounded-xl p-3">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden shrink-0 flex items-center justify-center p-1">
                    {d.producto?.imagen_url
                      ? <img src={`${API_URL}${d.producto.imagen_url}`} alt={d.producto.nombre} className="w-full h-full object-contain" />
                      : <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs">Sin img</div>
                    }
                  </div>
                  <div className="flex-1">
                    <p className="font-medium dark:text-white">{d.producto?.nombre}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">x{d.cantidad} @ {formatCurrency(d.precio_unitario)}</p>
                  </div>
                  <p className="font-bold dark:text-white">{formatCurrency(d.cantidad * parseCurrency(d.precio_unitario))}</p>
                </div>
              ))}
            </div>

            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-6">Total: {formatCurrency(pedidoSel.total)}</p>

            {qrImg && (
              <div className="border-t dark:border-gray-700 pt-4 text-center">
                <h3 className="font-bold mb-3 dark:text-white">Factura QR</h3>
                <img src={qrImg} alt="Factura QR" className="mx-auto w-48 h-48" />
                <div className="flex gap-3 mt-4 justify-center">
                  <button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = qrImg;
                      a.download = `factura-${pedidoSel.id}.png`;
                      a.click();
                    }}
                    className="bg-gray-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-700">
                    Descargar QR
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const blob = await apiFetchBlob(`/pedidos/${pedidoSel.id}/factura/pdf`);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `factura-${pedidoSel.id}.pdf`;
                        a.click();
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                      } catch {
                        alert('Error al descargar el PDF. Revisá que el pedido tenga datos de facturación.');
                      }
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
                    Descargar PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
