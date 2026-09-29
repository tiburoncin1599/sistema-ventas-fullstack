'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, API_URL } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useCarrito } from '@/store/carrito';

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  imagen_url: string;
  stock: number;
  disponible: boolean;
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ id: number; texto: string } | null>(null);
  const { agregar } = useCarrito();

  useEffect(() => {
    api.get('/productos')
      .then(res => setProductos(res.data))
      .catch(err => console.error(err))
      .finally(() => setCargando(false));
  }, []);

  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const stockDe = (producto: Producto) =>
    typeof producto.stock === 'number' ? producto.stock : 0;

  const agregarRapido = (producto: Producto, cantidad: number, texto: string) => {
    agregar({ ...producto, cantidad });
    setMensaje({ id: producto.id, texto });
    setTimeout(() => setMensaje(null), 1500);
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-12 dark:bg-gray-900 dark:text-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Productos</h1>

      <input
        type="text"
        placeholder="Buscar productos..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="w-full border rounded-xl px-4 py-3 mb-8 text-lg text-gray-900 dark:text-white dark:bg-gray-800 dark:border-gray-600"
      />

      {cargando ? (
        <p className="text-center text-gray-500 dark:text-gray-400">Cargando productos...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtrados.map(producto => (
            <div key={producto.id}
              className="border rounded-xl overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 dark:border-gray-700 flex flex-col">
              <Link href={`/productos/${producto.id}`}>
                <div className="bg-gray-100 dark:bg-gray-700 h-48 flex items-center justify-center p-2">
                  {producto.imagen_url
                    ? <img src={`${API_URL}${producto.imagen_url}`} alt={producto.nombre} className="w-full h-full object-contain"/>
                    : <span className="text-gray-400 dark:text-gray-500">Sin imagen</span>
                  }
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <div className="no-underline">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-tight">{producto.nombre}</h3>
                    <p className="text-blue-700 dark:text-blue-400 font-extrabold text-2xl mt-1">
                      {formatCurrency(producto.precio)}
                    </p>
                    {stockDe(producto) === 0
                      ? <span className="inline-block mt-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full">Agotado</span>
                      : <span className="inline-block mt-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">{stockDe(producto)} en stock</span>
                    }
                </div>
                <div className="mt-3 flex gap-2">
                  {([3, 6] as const).map(cant => (
                    <button key={cant} type="button" disabled={stockDe(producto) < cant} onClick={(e) => { e.preventDefault(); e.stopPropagation(); agregarRapido(producto, cant, `¡+${cant} agregado!`); }}
                      className="flex-1 bg-green-700 text-white text-sm font-bold py-2 rounded-lg hover:bg-green-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      +{cant}
                    </button>
                  ))}
                  <button type="button" disabled={stockDe(producto) < 12} onClick={(e) => { e.preventDefault(); e.stopPropagation(); agregarRapido(producto, 12, '¡Docena agregada!'); }}
                    className="flex-1 bg-yellow-500 text-black text-sm font-bold py-2 rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    Docena
                  </button>
                </div>
                {mensaje?.id === producto.id && (
                  <p className="text-green-600 dark:text-green-400 text-xs font-bold text-center mt-2 animate-pulse">{mensaje.texto}</p>
                )}
              </div>
            </Link>
          </div>
          ))}
        </div>
      )}
    </main>
  );
}
