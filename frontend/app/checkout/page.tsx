'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCarrito } from '@/store/carrito';
import { api } from '@/lib/api';
import { formatCurrency, parseCurrency } from '@/lib/utils';

const WHATSAPP_NUMERO = process.env.NEXT_PUBLIC_WHATSAPP || '59170000000';

export default function CheckoutPage() {
  const { items, total, vaciar } = useCarrito();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [pedidoCreado, setPedidoCreado] = useState(false);
  const [pedidoId, setPedidoId] = useState<number | null>(null);
  const router = useRouter();

  const confirmar = async () => {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!usuario.id) {
      router.push('/auth');
      return;
    }

    setCargando(true);
    setError('');

    try {
      const res = await api.post('/pedidos', {
        usuarioId: usuario.id,
        direccion: '',
        items: items.map(i => ({
          producto_id: i.id,
          cantidad: i.cantidad,
          precio: parseCurrency(i.precio),
        })),
      });
      setPedidoId(res.data.id || res.data.pedido?.id);
      vaciar();
      setPedidoCreado(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al confirmar el pedido';
      setError(msg);
    } finally {
      setCargando(false);
    }
  };

  if (items.length === 0 && !pedidoCreado) {
    return (
      <main className="max-w-2xl mx-auto px-8 py-20 text-center dark:bg-gray-900 dark:text-gray-100 min-h-screen">
        <h1 className="text-3xl font-bold mb-4">No hay productos en el carrito</h1>
      </main>
    );
  }

  if (pedidoCreado) {
    const mensaje = encodeURIComponent(
      `¡Hola! Quiero consultar sobre mi pedido #${pedidoId || ''} que realicé en la tienda.`
    );
    return (
      <main className="max-w-xl mx-auto px-8 py-20 text-center dark:bg-gray-900 dark:text-gray-100 min-h-screen">
        <div className="text-5xl mb-6">✅</div>
        <h1 className="text-3xl font-bold mb-2">Pedido confirmado</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Tu pedido #<strong>{pedidoId || '-'}</strong> fue registrado. En breve el personal de inventario se comunicará con vos.
        </p>


        <a href={`https://wa.me/${WHATSAPP_NUMERO}?text=${mensaje}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-colors shadow-lg">
          <span className="text-2xl">💬</span>
          Contactar por WhatsApp
        </a>

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">El personal de inventario te atenderá a la brevedad.</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-8 py-12 dark:bg-gray-900 dark:text-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Confirmar Pedido</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Resumen del pedido */}
        <div>
          <h2 className="text-xl font-bold mb-4">Tu pedido</h2>
          <div className="border dark:border-gray-700 rounded-2xl overflow-hidden">
            {items.map(item => (
              <div key={item.id} className="flex justify-between items-center px-6 py-4 border-b dark:border-gray-700 last:border-0">
                <div>
                  <p className="font-medium">{item.nombre}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">x{item.cantidad}</p>
                </div>
                <p className="font-bold">{formatCurrency(parseCurrency(item.precio) * item.cantidad)}</p>
              </div>
            ))}
            <div className="flex justify-between items-center px-6 py-4 bg-gray-50 dark:bg-gray-800">
              <p className="font-bold text-lg">Total</p>
              <p className="font-bold text-xl text-blue-600 dark:text-blue-400">{formatCurrency(total())}</p>
            </div>
          </div>
        </div>

        {/* WhatsApp */}
        <div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 text-center mb-6">
            <p className="text-gray-600 dark:text-gray-300 mb-4">¿Tenés dudas? Contactanos por WhatsApp</p>
            <a href={`https://wa.me/${WHATSAPP_NUMERO}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-colors shadow-lg">
              <span className="text-2xl">💬</span>
              Contactar por WhatsApp
            </a>
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <button
            onClick={confirmar}
            disabled={cargando}
            className="w-full bg-[#005a24] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#003e19] disabled:opacity-50 transition-colors">
            {cargando ? 'Procesando...' : 'Confirmar Pedido'}
          </button>

          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-3">
            Al confirmar, el personal de inventario te contactará por WhatsApp para coordinar la entrega.
          </p>
        </div>
      </div>
    </main>
  );
}
