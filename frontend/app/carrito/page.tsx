'use client';
import { useCarrito } from '@/store/carrito';
import { formatCurrency, parseCurrency } from '@/lib/utils';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-c811d.up.railway.app';

export default function CarritoPage() {
  const { items, quitar, cambiarCantidad, total } = useCarrito();

  if (items.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-8 py-20 text-center dark:bg-gray-900 dark:text-gray-100 min-h-screen">
        <h1 className="text-3xl font-bold mb-4">Tu carrito está vacío</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Agregá productos para continuar</p>
        <Link href="/productos"
          className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700">
          Ver productos
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-8 py-12 dark:bg-gray-900 dark:text-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Tu carrito</h1>

      <div className="space-y-4 mb-8">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-4 border dark:border-gray-700 rounded-xl p-4">

            {/* Imagen */}
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden shrink-0 flex items-center justify-center p-1">
              {item.imagen_url
                ? <img src={`${API_URL}${item.imagen_url}`} alt={item.nombre} className="w-full h-full object-contain"/>
                : <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs">Sin imagen</div>
              }
            </div>

            {/* Info */}
            <div className="flex-1">
              <h3 className="font-semibold">{item.nombre}</h3>
              <p className="text-blue-600 dark:text-blue-400 font-bold">{formatCurrency(item.precio)}</p>
            </div>

            {/* Cantidad */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <button onClick={() => cambiarCantidad(item.id, Math.max(0, item.cantidad - 3))}
                  className="w-7 h-7 rounded-full border dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-sm">-3</button>
                <button onClick={() => cambiarCantidad(item.id, Math.max(0, item.cantidad - 6))}
                  className="w-7 h-7 rounded-full border dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-sm">-6</button>
                <button onClick={() => cambiarCantidad(item.id, Math.max(0, item.cantidad - 12))}
                  className="w-7 h-7 rounded-full border dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-sm">-12</button>
              </div>
              <span className="w-12 text-center font-bold">{item.cantidad}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => cambiarCantidad(item.id, item.cantidad + 3)}
                  className="w-7 h-7 rounded-full border dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-sm">+3</button>
                <button onClick={() => cambiarCantidad(item.id, item.cantidad + 6)}
                  className="w-7 h-7 rounded-full border dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-sm">+6</button>
                <button onClick={() => cambiarCantidad(item.id, item.cantidad + 12)}
                  className="w-7 h-7 rounded-full border dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-sm">+12</button>
              </div>
            </div>

            {/* Subtotal */}
            <p className="font-bold w-24 text-right">
              {formatCurrency(parseCurrency(item.precio) * item.cantidad)}
            </p>

            {/* Quitar */}
            <button
              onClick={() => quitar(item.id)}
              className="text-red-400 hover:text-red-600 font-medium text-sm">
              Quitar
            </button>
          </div>
        ))}
      </div>

      {/* Total y checkout */}
      <div className="border-t dark:border-gray-700 pt-6 flex justify-between items-center">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-3xl font-bold">{formatCurrency(total())}</p>
        </div>
        <Link href="/checkout"
          className="bg-blue-600 text-white px-10 py-4 rounded-xl font-bold hover:bg-blue-700 text-lg">
          Confirmar pedido
        </Link>
      </div>
    </main>
  );
}
