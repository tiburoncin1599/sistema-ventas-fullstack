'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { Categoria } from '@/lib/productos';
import { useValidacionFormulario } from '@/lib/hooks/use-validacion-formulario';
import {
  enteroMinimo,
  mensajeGeneral,
  numero,
  numeroMinimo,
  primero,
  requerido,
  type ErroresFormulario,
} from '@/lib/validacion';
import { AvisoErrorFormulario, CampoError, claseCampo } from '@/components/ui/CampoError';
import { Minus, AlertCircle, CheckCircle, Search } from 'lucide-react';

interface FilaInventario {
  id: number;
  producto_id: number;
  cantidad: number;
  cantidad_minima: number;
  producto?: {
    nombre?: string;
    codigo?: string | null;
    categoria?: { nombre: string } | null;
    activo?: boolean;
  } | null;
}

interface ProductoStock {
  /** Es el `producto_id`, que es lo que espera `PUT /inventario/:productoId`. */
  id: number;
  nombre: string;
  codigo?: string | null;
  categoria?: string | null;
  cantidad: number;
  cantidad_minima: number;
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

interface FormStock {
  producto_id: number;
  cantidad: string;
}

const STOCK_INICIAL: FormStock = { producto_id: 0, cantidad: '0' };
const CAMPOS_STOCK: Array<keyof FormStock | '_general'> = ['producto_id', 'cantidad', '_general'];
const ALIAS_STOCK = {
  productoid: 'producto_id',
  producto_id: 'producto_id',
  producto: 'producto_id',
  cantidad: 'cantidad',
} as const;

/** Espejo de `ActualizarInventarioDto` (cantidad numérica ≥ 0) + producto_id ≥ 1. */
function validarStock(form: FormStock): ErroresFormulario<FormStock> {
  const errores: ErroresFormulario<FormStock> = {};
  const productoId = primero(
    requerido(form.producto_id || '', 'Seleccioná un producto'),
    enteroMinimo(form.producto_id, 1, 'El producto debe ser un entero mayor o igual a 1'),
  );
  if (productoId) errores.producto_id = productoId;

  const cantidad = primero(
    requerido(form.cantidad, 'Ingresá la cantidad'),
    numero(form.cantidad, 'Ingresá una cantidad válida'),
    numeroMinimo(form.cantidad, 0, 'La cantidad no puede ser negativa'),
  );
  if (cantidad) errores.cantidad = cantidad;

  return errores;
}

export default function InventarioPage() {
  const [items, setItems] = useState<ProductoStock[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [alertas, setAlertas] = useState<AlertaStock[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('all');
  const [error, setError] = useState<string>('');
  const [modal, setModal] = useState<{ aberto: boolean; modo: 'actualizar' | 'agregar'; producto?: ProductoStock } | null>(null);
  const [form, setForm] = useState<FormStock>(STOCK_INICIAL);

  const {
    errores,
    tocados,
    enviado,
    errorGeneral,
    setErrorGeneral,
    validarCampo,
    validarTodo,
    aplicarErroresBackend,
    reiniciar,
  } = useValidacionFormulario<FormStock>(validarStock);

  const errorDe = (campo: keyof FormStock) =>
    enviado || tocados[campo] ? errores[campo] : undefined;

  const cargar = async () => {
    try {
      const [resItems, resAlertas, resCategorias] = await Promise.all([
        api.get('/inventario', { params: { limit: 100 } }),
        api.get('/inventario/alertas'),
        api.get('/categorias', { params: { limit: 100 } }),
      ]);
      const filas: FilaInventario[] = Array.isArray(resItems.data)
        ? resItems.data
        : [];
      setItems(
        filas.map((f) => ({
          id: f.producto_id,
          nombre: f.producto?.nombre || `Producto #${f.producto_id}`,
          codigo: f.producto?.codigo ?? null,
          categoria: f.producto?.categoria?.nombre ?? null,
          cantidad: Number(f.cantidad) || 0,
          cantidad_minima: Number(f.cantidad_minima) || 0,
          activo: f.producto?.activo ?? true,
        })),
      );
      setAlertas(resAlertas.data || []);
      setCategorias(Array.isArray(resCategorias.data) ? resCategorias.data : []);
    } catch { setError('Error al cargar inventario'); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const abrirModal = (modo: 'actualizar' | 'agregar', producto?: ProductoStock, cantidad?: number) => {
    reiniciar();
    setForm({ producto_id: producto?.id ?? 0, cantidad: String(cantidad ?? 0) });
    setModal({ aberto: true, modo, producto });
  };

  const cerrarModal = () => {
    reiniciar();
    setModal(null);
  };

  // El backend ya aplica `cantidad <= cantidad_minima` al construir las alertas.
  const idsAlerta = useMemo(
    () => new Set(alertas.map((a) => a.producto_id)),
    [alertas],
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const nombreCategoria = categorias.find(
      (c) => c.id === Number(categoriaFiltro),
    )?.nombre;
    return items.filter((item) => {
      const coincideTexto =
        !q ||
        item.nombre.toLowerCase().includes(q) ||
        (item.codigo || '').toLowerCase().includes(q) ||
        (item.categoria || '').toLowerCase().includes(q);
      const coincideCategoria =
        categoriaFiltro === 'all' ||
        (categoriaFiltro === 'sin'
          ? !item.categoria
          : item.categoria === nombreCategoria);
      return coincideTexto && coincideCategoria;
    });
  }, [items, categorias, busqueda, categoriaFiltro]);

  const guardar = async () => {
    if (!modal?.producto) return;
    if (!validarTodo(form)) return;
    try {
      if (modal.modo === 'actualizar') {
        await api.put(`/inventario/${form.producto_id}`, { cantidad: Number(form.cantidad) });
      } else {
        // Agregar stock inicial para un nuevo producto (si no tiene registro en inventario)
        await api.post('/inventario', { producto_id: form.producto_id, cantidad: Number(form.cantidad) });
      }
      cerrarModal();
      cargar();
    } catch (err: unknown) {
      aplicarErroresBackend(err, CAMPOS_STOCK, ALIAS_STOCK);
      setErrorGeneral(mensajeGeneral(err, 'No se pudo guardar el stock. Revisá los datos e intentá nuevamente.'));
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

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <select
          aria-label="Filtrar por categoría"
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="prolimal-input sm:w-56"
        >
          <option value="all">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
          <option value="sin">Sin categoría</option>
        </select>
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
          {visibles.length} de {items.length} productos
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map((item) => (
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
            {idsAlerta.has(item.id) && item.activo && (
              <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-prolimal-red-600 dark:text-prolimal-red-300">
                <AlertCircle className="h-4 w-4" />
                Stock bajo
              </span>
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

            <AvisoErrorFormulario mensaje={errorGeneral} />
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="stock-producto" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  Producto
                </label>
                <input
                  id="stock-producto"
                  type="text"
                  readOnly
                  value={form.producto_id ? `${modal.producto?.nombre ?? ''} (#${form.producto_id})` : ''}
                  aria-invalid={Boolean(errorDe('producto_id'))}
                  aria-describedby={errorDe('producto_id') ? 'stock-producto-error' : undefined}
                  className={claseCampo(Boolean(errorDe('producto_id')), 'prolimal-input')}
                />
                <CampoError id="stock-producto-error" mensaje={errorDe('producto_id')} />
              </div>
              <div>
                <label htmlFor="stock-cantidad" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  Cantidad *
                </label>
                <input
                  id="stock-cantidad"
                  type="number"
                  min={0}
                  value={form.cantidad}
                  onChange={e => {
                    const nuevo = { ...form, cantidad: e.target.value };
                    setForm(nuevo);
                    validarCampo('cantidad', nuevo);
                  }}
                  aria-invalid={Boolean(errorDe('cantidad'))}
                  aria-describedby={errorDe('cantidad') ? 'stock-cantidad-error' : undefined}
                  className={claseCampo(Boolean(errorDe('cantidad')), 'prolimal-input')}
                  placeholder="Cantidad"
                />
                <CampoError id="stock-cantidad-error" mensaje={errorDe('cantidad')} />
              </div>
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