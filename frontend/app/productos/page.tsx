'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useCarrito } from '@/store/carrito';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-c811d.up.railway.app';

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  imagen_url: string;
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

  return (
    <main className="max-w-6xl mx-auto px-8 py-12 dark:bg-gray-900 dark:text-gray-100 min-h-screen">
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
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={(e) => { e.stopPropagation(); agregar({ ...producto, cantidad: 3 }); setMensaje({ id: producto.id, texto: '¡+3 agregado!' }); setTimeout(() => setMensaje(null), 1500); }}
                    className="flex-1 bg-green-700 text-white text-sm font-bold py-2 rounded-lg hover:bg-green-800 transition-colors">
                    +3
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); agregar({ ...producto, cantidad: 6 }); setMensaje({ id: producto.id, texto: '¡+6 agregado!' }); setTimeout(() => setMensaje(null), 1500); }}
                    className="flex-1 bg-green-700 text-white text-sm font-bold py-2 rounded-lg hover:bg-green-800 transition-colors">
                    +6
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); agregar({ ...producto, cantidad: 12 }); setMensaje({ id: producto.id, texto: '¡Docena agregada!' }); setTimeout(() => setMensaje(null), 2000); }}
                    className="flex-1 bg-yellow-500 text-black text-sm font-bold py-2 rounded-lg hover:bg-yellow-600 transition-colors">
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
