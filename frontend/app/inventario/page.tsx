'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Plus, Minus, AlertCircle, CheckCircle, Truck, Search } from 'lucide-react';

interface ProductoStock {
  id: number;
  nombre: string;
  codigo?: string;
  categoria?: string;
  cantidad: number;
  cantidad_minima: number;
  ubicacion?: string;
  activo: boolean;
}

interface AlertaStock {
  producto_id: number;
  nombre: string;
  codigo?: string;
  cantidad_actual: number;
  cantidad_minima: number;
  déficit: number;
}

export default function InventarioPage() {
  const [items, setItems] = useState<ProductoStock[]>([]);
  const [alertas, setAlertas] = useState<AlertaStock[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState<string>('');
  const [modal, setModal] = useState<{ aberto: boolean; modo: 'actualizar' | 'agregar'; producto?: ProductoStock; cantidad?: number } | null>(null);

  const cargar = async () => {
    try {
      const [resItems, resAlertas] = await Promise.all([
        api.get('/inventario'),
        api.get('/inventario/alertas'),
      ]);
      setItems(resItems.data || []);
      setAlertas(resAlertas.data || []);
    } catch { setError('Error al cargar inventario'); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const abrirModal = (modo: 'actualizar' | 'agregar', producto?: ProductoStock, cantidad?: number) => {
    setModal({ aberto: true, modo, producto, cantidad: cantidad ?? 0 });
  };

  const cerrarModal = () => setModal(null);

  const guardar = async () => {
    if (!modal?.producto) return;
    try {
      if (modal.modo === 'actualizar') {
        await api.put(`/inventario/${modal.producto.id}`, { cantidad: modal.cantidad });
      } else {
        // Agregar stock inicial para un nuevo producto (si no tiene registro en inventario)
        await api.post(`/inventario`, { producto_id: modal.producto.id, cantidad: modal.cantidad });
      }
      cerrarModal();
      cargar();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar';
      alert(msg);
    }
  };

  if (cargando) {
    return (
      <main className="prolimal-page mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-12">
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          Cargando inventario...
        </div>
      </main>
    );
  }

  return (
    <main className="prolimal-page mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-12">
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <h1 className="prolimal-display text-2xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
          Inventario
        </h1>
        <p className="text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
          Control de existencias y movimientos de stock
        </p>
      </div>

      <div className="mb-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400 dark:text-prolimal-ink-300" />
        <input
          type="text"
          placeholder="Buscar producto o código..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="prolimal-search-input w-full"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-[2rem] border p-4 transition-colors ${
              item.activo
                ? 'border-prolimal-ink-900/10 bg-card sm:hover:bg-prolimal-sand-50/50 dark:border-prolimal-sand-100/10 dark:hover:bg-prolimal-ink-800/40'
                : 'border-prolimal-ink-900/15 bg-prolimal-sand-50/30 dark:border-prolimal-sand-100/15 dark:bg-prolimal-ink-800/40'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="prolimal-display text-sm font-bold text-prolimal-ink-900 dark:text-prolimal-sand-50 truncate">
                  {item.nombre}
                </p>
                {item.codigo && <p className="text-xs text-prolimal-ink-400 dark:text-prolimal-ink-300">Código: {item.codigo}</p>}
                {item.categoria && <p className="text-xs text-prolimal-ink-400 dark:text-prolimal-ink-300">Cat.: {item.categoria}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  Stock: {item.cantidad}
                </span>
                {item.cantidad_minima > 0 && (
                  <span className="text-[10px] font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    mín.: {item.cantidad_minima}
                  </span>
                )}
              </div>
            </div>
            {item.cantidad <= item.cantidad_minima && item.activo && (
              <AlertCircle className="h-4 w-4 text-prolimal-red-500 dark:text-prolimal-red-400" />
            )}
            {!item.activo && (
              <CheckCircle className="h-4 w-4 text-prolimal-green-500 dark:text-prolimal-green-400" />
            )}
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => abrirModal('actualizar', item, item.cantidad)}
                className="prolimal-btn-secondary text-[10px] px-3 py-1.5"
                title="Ajustar stock"
              >
                Ajustar
              </button>
              <button
                onClick={() => abrirModal('agregar', item, 0)}
                className="prolimal-btn-primary text-[10px] px-3 py-1.5"
                title="Incrementar stock"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {alertas.length > 0 && (
        <div className="mt-6 rounded-[2rem] border border-prolimal-red-100 bg-prolimal-red-50 p-4 dark:border-prolimal-red-700/40 dark:bg-prolimal-red-900/25 dark:text-prolimal-red-300">
          <AlertCircle className="h-4 w-4 text-prolimal-red-500 mr-3" />
          <p className="text-sm font-medium text-prolimal-red-700 dark:text-prolimal-red-300">
            {alertas.length} producto(s) con stock mínimo
          </p>
        </div>
      )}

      {modal?.aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-prolimal-ink-900/50 p-4 backdrop-blur-sm"
          onClick={() => cerrarModal()}
        >
          <div
            className="max-w-md w-full max-h-[90vh] overflow-y-auto rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="prolimal-eyebrow">{modal.modo === 'actualizar' ? 'Ajustar stock' : 'Agregar stock inicial'}</p>
                <h2 className="prolimal-display mt-2 text-xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                  {modal.modo === 'actualizar' ? 'Ajustar stock de' : 'Agregar stock inicial para'} {modal.producto?.nombre}
                </h2>
              </div>
              <button onClick={cerrarModal} aria-label="Cerrar" className="prolimal-icon-btn h-6 w-6">
                <Minus className="h-3 w-3" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <input
                type="number"
                min={0}
                value={modal.cantidad ?? 0}
                onChange={e => setModal(m => m ? { ...m, cantidad: Number(e.target.value), aberto: m.aberto, modo: m.modo } : null)}
                className="prolimal-input"
                placeholder="Cantidad"
                required
              />
              {modal.modo === 'actualizar' && (
                <p className="text-xs text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  Stock actual: {modal.producto?.cantidad}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button onClick={cerrarModal} className="prolimal-btn-secondary flex-1">
                Cancelar
              </button>
              <button onClick={guardar} className="prolimal-btn-primary flex-1">
                {modal.modo === 'actualizar' ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}