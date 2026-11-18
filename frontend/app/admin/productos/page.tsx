'use client';

import { useEffect, useState, useRef } from 'react';
import { api, API_URL } from '@/lib/api';
import { formatCurrency, parseCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Search } from 'lucide-react';

interface Producto {
  id: number;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  precio_costo?: number;
  imagen_url?: string;
  activo: boolean;
  stock: number;
  categoria: { id: number; nombre: string };
  categoria_id?: number;
}

/** Orden alfabético determinista e insensible a mayúsculas/minúsculas (es). */
function ordenarProductos(lista: Producto[]): Producto[] {
  return [...lista].sort(
    (a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }) ||
      a.id - b.id,
  );
}

export default function AdminProductos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [modalProducto, setModalProducto] = useState<Producto | null>(null);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState({ codigo: '', nombre: '', descripcion: '', precio: '', precio_costo: '', categoria_id: '', stock: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  const cargarDatos = async () => {
    const [prods, cats] = await Promise.all([
      api.get('/productos/admin'),
      api.get('/categorias'),
    ]);
    setProductos(ordenarProductos(prods.data));
    setCategorias(cats.data);
  };

  useEffect(() => {
    let activo = true;
    Promise.all([
      api.get('/productos/admin'),
      api.get('/categorias'),
    ])
      .then(([prods, cats]) => {
        if (!activo) return;
        setProductos(ordenarProductos(prods.data));
        setCategorias(cats.data);
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  const limpiarArchivo = () => {
    if (fileRef.current) fileRef.current.value = '';
  };

  const cerrarModal = () => {
    setModalProducto(null);
    setCreando(false);
    limpiarArchivo();
  };

  const abrirNuevo = () => {
    setCreando(true);
    setModalProducto(null);
    setForm({ codigo: '', nombre: '', descripcion: '', precio: '', precio_costo: '', categoria_id: '', stock: '' });
    limpiarArchivo();
  };

  const abrirEditar = (p: Producto) => {
    setCreando(false);
    setModalProducto(p);
    setForm({
      codigo: p.codigo || '',
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      precio: String(parseCurrency(p.precio)),
      precio_costo: p.precio_costo ? String(parseCurrency(p.precio_costo)) : '',
      categoria_id: String(p.categoria_id || ''),
      stock: String(p.stock ?? 0),
    });
    limpiarArchivo();
  };

  const guardar = async () => {
    try {
      const { stock, ...campos } = form;
      const payload: Record<string, unknown> = {
        ...campos,
        codigo: campos.codigo.trim() || undefined,
        precio: parseCurrency(campos.precio),
        precio_costo: campos.precio_costo ? parseCurrency(campos.precio_costo) : undefined,
        categoria_id: +campos.categoria_id || undefined,
      };

      if (!creando && modalProducto) {
        const stockNuevo = Number(stock);
        if (!Number.isInteger(stockNuevo) || stockNuevo < 0) {
          alert('El stock debe ser un número entero mayor o igual a 0.');
          return;
        }
        // El backend valida, ajusta inventario y escribe el Kardex en una transacción.
        payload.stock = stockNuevo;
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
      limpiarArchivo();
      await cargarDatos();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar';
      alert(msg);
    }
  };

  const desactivar = async (id: number) => {
    if (!confirm('¿Desactivar este producto?')) return;
    try {
      await api.delete(`/productos/${id}`);
      await cargarDatos();
    } catch { alert('Error al desactivar el producto'); }
  };

  const activar = async (id: number) => {
    try {
      await api.put(`/productos/${id}`, { activo: true });
      await cargarDatos();
    } catch { alert('Error al activar el producto'); }
  };

  const q = busqueda.trim().toLowerCase();
  const visibles = ordenarProductos(
    q
      ? productos.filter(p =>
          p.nombre.toLowerCase().includes(q) ||
          (p.codigo || '').toLowerCase().includes(q) ||
          (p.categoria?.nombre || '').toLowerCase().includes(q),
        )
      : productos,
  );

  return (
    <div className="pb-10">
      <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="prolimal-eyebrow">Catálogo</p>
          <h2 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
            Productos
          </h2>
          <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200">
            {visibles.length} de {productos.length} productos visibles en el catálogo.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400 dark:text-prolimal-ink-300" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, código o categoría"
              className="prolimal-search-input"
            />
          </div>
          <button onClick={abrirNuevo} className="prolimal-btn-primary whitespace-nowrap">
            <Plus className="h-4 w-4" />
            Nuevo producto
          </button>
        </div>
      </section>

      {productos.length === 0 ? (
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          Cargando productos...
        </div>
      ) : visibles.length === 0 ? (
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          Sin resultados para tu búsqueda.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibles.map(p => (
            <motion.div
              key={p.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => abrirEditar(p)}
              className="group cursor-pointer overflow-hidden rounded-[2rem] border border-prolimal-ink-900/10 bg-card shadow-[0_24px_60px_-50px_rgba(11,37,32,0.4)] transition-all hover:border-prolimal-teal-500/40 hover:shadow-[0_30px_70px_-45px_rgba(11,37,32,0.5)] dark:border-prolimal-sand-100/10 dark:bg-card-dark dark:hover:border-prolimal-teal-500/30"
            >
              <div className="flex h-40 items-center justify-center bg-prolimal-sand-100 p-4 dark:bg-prolimal-ink-800">
                {p.imagen_url
                  ? <img src={`${API_URL}${p.imagen_url}`} alt={p.nombre} className="h-full w-full object-contain" />
                  : <Package className="h-10 w-10 text-prolimal-ink-300 dark:text-prolimal-ink-500" />
                }
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-extrabold tracking-[-0.02em] text-prolimal-ink-800 dark:text-prolimal-sand-50">{p.nombre}</p>
                    {p.codigo && <p className="mt-0.5 font-mono text-[11px] font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">Cód. {p.codigo}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${p.activo ? 'bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300' : 'bg-prolimal-red-100 text-prolimal-red-700 dark:bg-prolimal-red-900/30 dark:text-prolimal-red-300'}`}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    {p.categoria?.nombre || 'Sin categoría'}
                  </p>
                  <span
                    aria-label={`Stock actual: ${p.stock}`}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      p.stock <= 10
                        ? 'bg-prolimal-red-100 text-prolimal-red-700 dark:bg-prolimal-red-900/30 dark:text-prolimal-red-300'
                        : 'bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300'
                    }`}
                  >
                    {p.stock <= 10 ? `⚠️ Stock bajo · quedan ${p.stock}` : `Stock: ${p.stock}`}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-prolimal-ink-900/5 pt-4 dark:border-prolimal-sand-100/10">
                  <p className="text-lg font-extrabold tracking-[-0.03em] text-prolimal-teal-700 dark:text-prolimal-teal-300">{formatCurrency(p.precio)}</p>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {p.activo ? (
                      <button onClick={() => desactivar(p.id)}
                        className="prolimal-btn-ghost-danger px-3 py-2 text-xs">Desactivar</button>
                    ) : (
                      <button onClick={() => activar(p.id)}
                        className="rounded-full px-3 py-2 text-xs font-bold text-prolimal-teal-700 transition-colors hover:bg-prolimal-teal-50 dark:text-prolimal-teal-300 dark:hover:bg-prolimal-teal-900/30">Activar</button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {(modalProducto || creando) && (
          <motion.div
            key="modal-producto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-prolimal-ink-900/50 p-4 backdrop-blur-sm"
            onClick={cerrarModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.22 }}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_40px_90px_-40px_rgba(11,37,32,0.6)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="mb-6">
                <p className="prolimal-eyebrow">{creando ? 'Nuevo registro' : 'Editar registro'}</p>
                <h2 className="prolimal-display mt-2 text-2xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                  {creando ? 'Nuevo producto' : 'Editar producto'}
                </h2>
              </div>
              <div className="space-y-3">
                <input placeholder="Código (opcional, se usa en el POS)" value={form.codigo}
                  onChange={e => setForm({ ...form, codigo: e.target.value })}
                  className="prolimal-input" />
                <input placeholder="Nombre" value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className="prolimal-input" />
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Precio venta" type="number" step="0.01" value={form.precio}
                    onChange={e => setForm({ ...form, precio: e.target.value })}
                    className="prolimal-input" />
                  <input placeholder="Precio costo" type="number" step="0.01" value={form.precio_costo}
                    onChange={e => setForm({ ...form, precio_costo: e.target.value })}
                    className="prolimal-input" />
                </div>
                {!creando && (
                  <div>
                    <label htmlFor="stock-producto" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                      Stock Actual
                    </label>
                    <input
                      id="stock-producto"
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Stock actual"
                      value={form.stock}
                      onChange={e => setForm({ ...form, stock: e.target.value })}
                      className="prolimal-input"
                    />
                    <p className="mt-1 text-[11px] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                      Al guardar un valor distinto se registra un ajuste en el Kardex.
                    </p>
                  </div>
                )}
                <select value={form.categoria_id}
                  onChange={e => setForm({ ...form, categoria_id: e.target.value })}
                  className="prolimal-input">
                  <option value="">Sin categoría</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
                <textarea placeholder="Descripción" value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  className="prolimal-input" rows={3} />
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Imagen</label>
                  <input ref={fileRef} type="file" accept="image/*" className="prolimal-input file:mr-3 file:rounded-full file:border-0 file:bg-prolimal-teal-100 file:px-4 file:py-1.5 file:text-xs file:font-bold file:text-prolimal-teal-800 dark:file:bg-prolimal-teal-900/30 dark:file:text-prolimal-teal-200" />
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button onClick={cerrarModal}
                  className="prolimal-btn-secondary sm:w-auto">
                  Cancelar
                </button>
                <button onClick={guardar}
                  className="prolimal-btn-primary flex-1">
                  {creando ? 'Crear producto' : 'Guardar cambios'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}