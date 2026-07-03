'use client';
import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, parseCurrency } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-c811d.up.railway.app';

interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  precio_costo?: number;
  imagen_url?: string;
  activo: boolean;
  categoria: { id: number; nombre: string };
  categoria_id?: number;
}

export default function AdminProductos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [modalProducto, setModalProducto] = useState<Producto | null>(null);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState({ nombre: '', descripcion: '', precio: '', precio_costo: '', categoria_id: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  const cargarDatos = async () => {
    const [prods, cats] = await Promise.all([
      api.get('/productos/admin'),
      api.get('/categorias'),
    ]);
    setProductos(prods.data);
    setCategorias(cats.data);
  };

  useEffect(() => { cargarDatos(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const abrirNuevo = () => {
    setCreando(true);
    setModalProducto(null);
    setForm({ nombre: '', descripcion: '', precio: '', precio_costo: '', categoria_id: '' });
  };

  const abrirEditar = (p: Producto) => {
    setCreando(false);
    setModalProducto(p);
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      precio: String(parseCurrency(p.precio)),
      precio_costo: p.precio_costo ? String(parseCurrency(p.precio_costo)) : '',
      categoria_id: String(p.categoria_id || ''),
    });
  };

  const guardar = async () => {
    try {
      const payload = {
        ...form,
        precio: parseCurrency(form.precio),
        precio_costo: form.precio_costo ? parseCurrency(form.precio_costo) : undefined,
        categoria_id: +form.categoria_id || undefined,
      };

      if (!creando && modalProducto) {
        await api.put(`/productos/${modalProducto.id}`, payload);
        if (fileRef.current?.files?.[0]) {
          const fd = new FormData();
          fd.append('imagen', fileRef.current.files[0]);
          await api.post(`/productos/upload/${modalProducto.id}`, fd);
        }
      } else {
        const res = await api.post('/productos', payload);
        if (fileRef.current?.files?.[0]) {
          const fd = new FormData();
          fd.append('imagen', fileRef.current.files[0]);
          await api.post(`/productos/upload/${res.data.id}`, fd);
        }
      }

      setModalProducto(null);
      setCreando(false);
      if (fileRef.current) fileRef.current.value = '';
      await cargarDatos();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar';
      alert(msg);
    }
  };

  const desactivar = async (id: number) => {
    if (!confirm('¿Desactivar este producto?')) return;
    await api.delete(`/productos/${id}`);
    await cargarDatos();
  };

  const activar = async (id: number) => {
    await api.put(`/productos/${id}`, { activo: true });
    await cargarDatos();
  };

  const abiertos = productos.filter(p => p.activo);
  const inactivos = productos.filter(p => !p.activo);

  return (
    <main className="max-w-6xl mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Productos</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{abiertos.length} activos, {inactivos.length} inactivos</p>
        </div>
        <button onClick={abrirNuevo}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700">
          + Nuevo
        </button>
      </div>

      {productos.length === 0 ? (
        <p className="text-center py-20 text-gray-500 dark:text-gray-400">Cargando productos...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {productos.map(p => (
              <div
                key={p.id}
                onClick={() => abrirEditar(p)}
                className={`bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl overflow-hidden hover:shadow-lg dark:hover:shadow-gray-900/50 transition-shadow cursor-pointer ${!p.activo ? 'opacity-40' : ''}`}
              >
              <div className="h-36 bg-gray-50 dark:bg-gray-700 flex items-center justify-center p-4">
                {p.imagen_url
                  ? <img src={`${API_URL}${p.imagen_url}`} alt={p.nombre} className="w-full h-full object-contain" />
                  : <div className="text-gray-300 dark:text-gray-600 text-4xl">{'\uD83D\uDCE6'}</div>
                }
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-gray-900 dark:text-white truncate flex-1">{p.nombre}</p>
                  <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${p.activo ? 'bg-green-500' : 'bg-red-400'}`} />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{p.categoria?.nombre}</p>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(p.precio)}</p>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {p.activo ? (
                      <button onClick={() => desactivar(p.id)}
                        className="text-xs text-red-500 dark:text-red-400 hover:underline px-1">Desactivar</button>
                    ) : (
                      <button onClick={() => activar(p.id)}
                        className="text-xs text-green-500 dark:text-green-400 hover:underline px-1">Activar</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(modalProducto || creando) && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-50" onClick={() => { setModalProducto(null); setCreando(false); }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6 dark:text-white">{creando ? 'Nuevo producto' : 'Editar producto'}</h2>
            <div className="space-y-4">
              <input placeholder="Nombre" value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Precio venta" type="number" step="0.01" value={form.precio}
                  onChange={e => setForm({ ...form, precio: e.target.value })}
                  className="border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white" />
                <input placeholder="Precio costo" type="number" step="0.01" value={form.precio_costo}
                  onChange={e => setForm({ ...form, precio_costo: e.target.value })}
                  className="border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white" />
              </div>
              <select value={form.categoria_id}
                onChange={e => setForm({ ...form, categoria_id: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white">
                <option value="">Sin categoría</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
              <textarea placeholder="Descripción" value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white" rows={3} />
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Imagen</label>
                <input ref={fileRef} type="file" accept="image/*" className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={guardar}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700">
                {creando ? 'Crear producto' : 'Guardar cambios'}
              </button>
              <button onClick={() => { setModalProducto(null); setCreando(false); }}
                className="flex-1 border dark:border-gray-600 py-3 rounded-xl font-medium dark:text-white">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
