'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Pedido {
  id: number;
  total: number;
  estado: string;
  creado_en: string;
  direccion_entrega: string;
}

export default function MisPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!usuario.id) {
      router.push('/auth');
      return;
    }
    api.get(`/pedidos/usuario/${usuario.id}`)
      .then(res => setPedidos(res.data))
      .catch(() => setPedidos([]))
      .finally(() => setCargando(false));
  }, [router]);

  const descargarFactura = async (id: number) => {
    try {
      const res = await api.get(`/pedidos/${id}/factura/pdf`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Error al descargar la factura');
    }
  };

  const getColorEstado = (estado: string) => {
    const colores: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-700',
      confirmado: 'bg-blue-100 text-blue-700',
      enviado: 'bg-purple-100 text-purple-700',
      entregado: 'bg-green-100 text-green-700',
      cancelado: 'bg-red-100 text-red-700',
    };
    return colores[estado] || 'bg-gray-100 text-gray-700';
  };

  if (cargando) return <p className="text-center py-20">Cargando...</p>;

  return (
    <main className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Mis Pedidos</h1>

      {pedidos.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No tenés pedidos todavía</p>
      ) : (
        <div className="space-y-4">
          {pedidos.map(pedido => (
            <div key={pedido.id} className="border rounded-2xl p-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-lg">Pedido #{pedido.id}</p>
                  <p className="text-gray-500 text-sm">
                    {new Date(pedido.creado_en).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getColorEstado(pedido.estado)}`}>
                  {pedido.estado}
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-2">{pedido.direccion_entrega}</p>
              <p className="font-bold text-blue-600 text-xl">{formatCurrency(pedido.total)}</p>
              <button
                onClick={() => descargarFactura(pedido.id)}
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-xl transition-colors"
              >
                Descargar Factura
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
