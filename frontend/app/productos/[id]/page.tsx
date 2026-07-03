'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useCarrito } from '@/store/carrito';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-c811d.up.railway.app';

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen_url: string;
  categoria: { nombre: string };
}

export default function DetalleProducto() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [agregado, setAgregado] = useState(false);
  const [cantidadSel, setCantidadSel] = useState(3);
  const { agregar } = useCarrito();

  useEffect(() => {
    if (!id) return;
    api.get(`/productos/${id}`)
      .then(res => setProducto(res.data))
      .finally(() => setCargando(false));
  }, [id]);

  const handleAgregar = (cantidad?: number) => {
    if (!producto) return;
    const q = cantidad ?? cantidadSel;
    agregar({ ...producto, cantidad: q });
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2000);
  };

  if (cargando) return <p className="text-center py-20 dark:text-gray-400 dark:bg-gray-900 min-h-screen">Cargando...</p>;
  if (!producto) return <p className="text-center py-20 dark:text-gray-400 dark:bg-gray-900 min-h-screen">Producto no encontrado</p>;

  return (
    <main className="max-w-5xl mx-auto px-8 py-12 dark:bg-gray-900 dark:text-gray-100 min-h-screen">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

        <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl h-96 flex items-center justify-center p-4">
          {producto.imagen_url
            ? <img src={`${API_URL}${producto.imagen_url}`} alt={producto.nombre} className="w-full h-full object-contain"/>
            : <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">Sin imagen</div>
          }
        </div>

        <div className="flex flex-col justify-center">
          {producto.categoria && (
            <span className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-2">
              {producto.categoria.nombre}
            </span>
          )}
          <h1 className="text-3xl font-bold mb-4">{producto.nombre}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{producto.descripcion}</p>
          <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-6">
            {formatCurrency(producto.precio)}
          </p>

          <div className="flex gap-3 mb-6">
            {[3, 6, 12].map(q => (
              <button key={q} onClick={() => setCantidadSel(q)}
                className={`flex-1 py-3 rounded-xl font-bold text-lg transition-colors ${
                  cantidadSel === q
                    ? 'bg-green-700 text-white ring-2 ring-green-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}>
                {q === 12 ? 'Docena' : `+${q}`}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleAgregar()}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-colors ${
              agregado
                ? 'bg-green-500 text-white'
                : 'bg-green-700 text-white hover:bg-green-800'
            }`}>
            {agregado ? '¡Agregado al carrito!' : `Agregar ${cantidadSel === 12 ? 'docena' : cantidadSel} al carrito`}
          </button>
        </div>
      </div>
    </main>
  );
}
