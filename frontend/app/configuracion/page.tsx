'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Save, Edit, Settings, X } from 'lucide-react';

interface Configuracion {
  id: number;
  nombre_empresa?: string;
  logo_url?: string;
  moneda: string;
  moneda_simbolo?: string;
  impuesto_porcentaje: number;
  nit?: string;
  direccion?: string;
  telefono?: string;
  whatsapp?: string;
  email_empresa?: string;
  qr_bancario_url?: string;
  terminos_condiciones?: string;
  notificaciones_stock: boolean;
  stock_minimo_alerta: number;
  modo_oscuro: boolean;
}

interface FormValues {
  nombre_empresa?: string;
  logo_url?: string;
  moneda?: string;
  moneda_simbolo?: string;
  impuesto_porcentaje?: number;
  nit?: string;
  direccion?: string;
  telefono?: string;
  whatsapp?: string;
  email_empresa?: string;
  qr_bancario_url?: string;
  terminos_condiciones?: string;
  notificaciones_stock: boolean;
  stock_minimo_alerta: number;
  modo_oscuro: boolean;
}

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<Configuracion>({
    id: 1,
    moneda: 'Bs',
    impuesto_porcentaje: 0,
    stock_minimo_alerta: 5,
    notificaciones_stock: false,
    modo_oscuro: false,
  });
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/configuracion').then(res => {
      setConfig(res.data || {
        id: 1, moneda: 'Bs', impuesto_porcentaje: 0, stock_minimo_alerta: 5,
        notificaciones_stock: false, modo_oscuro: false,
      });
    }).finally(() => setCargando(false));
  }, []);

  const guardar = async () => {
    try {
      setError('');
      await api.put('/configuracion', config);
      setEditando(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar configuración';
      setError(msg);
    }
  };

  return (
    <main className="prolimal-page mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-12">
      <div className="mb-6">
        <h1 className="prolimal-display text-2xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
          Configuración de empresa
        </h1>
        <p className="mt-2 text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
          Datos corporativos, moneda, impuestos y configuración del sistema.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-prolimal-red-300/60 bg-prolimal-red-50 px-5 py-3 text-sm font-semibold text-prolimal-red-700 dark:border-prolimal-red-700/40 dark:bg-prolimal-red-900/20 dark:text-prolimal-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
          <h2 className="prolimal-display text-xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50 mb-4">Datos de la empresa</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300 mb-2">
                Nombre de la empresa
              </label>
              <input
                value={config.nombre_empresa || ''}
                onChange={e => setConfig(m => ({ ...m, nombre_empresa: e.target.value }))}
                className="prolimal-input"
                placeholder="Prolimac SRL"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300 mb-2">
                Moneda
              </label>
              <input
                value={config.moneda || 'Bs'}
                onChange={e => setConfig(m => ({ ...m, moneda: e.target.value }))}
                className="prolimal-input"
                placeholder="Bs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300 mb-2">
                Porcentaje de impuesto
              </label>
              <input
                type="number"
                min={0}
                value={config.impuesto_porcentaje ?? 0}
                onChange={e => setConfig(m => ({ ...m, impuesto_porcentaje: Number(e.target.value) }))}
                className="prolimal-input"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300 mb-2">
                NIT/Rif
              </label>
              <input
                value={config.nit || ''}
                onChange={e => setConfig(m => ({ ...m, nit: e.target.value }))}
                className="prolimal-input"
                placeholder="NIT/Rif"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300 mb-2">
                Dirección
              </label>
              <input
                value={config.direccion || ''}
                onChange={e => setConfig(m => ({ ...m, direccion: e.target.value }))}
                className="prolimal-input"
                placeholder="Dirección de la empresa"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300 mb-2">
                Teléfono
              </label>
              <input
                value={config.telefono || ''}
                onChange={e => setConfig(m => ({ ...m, telefono: e.target.value }))}
                className="prolimal-input"
                placeholder="Teléfono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300 mb-2">
                WhatsApp
              </label>
              <input
                value={config.whatsapp || ''}
                onChange={e => setConfig(m => ({ ...m, whatsapp: e.target.value }))}
                className="prolimal-input"
                placeholder="WhatsApp"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300 mb-2">
                Email corporativo
              </label>
              <input
                value={config.email_empresa || ''}
                onChange={e => setConfig(m => ({ ...m, email_empresa: e.target.value }))}
                className="prolimal-input"
                placeholder="contacto@prolimac.com"
              />
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
          <h2 className="prolimal-display text-xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50 mb-4">Configuración técnica</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300 mb-2">
                QR bancario
              </label>
              <input
                value={config.qr_bancario_url || ''}
                onChange={e => setConfig(m => ({ ...m, qr_bancario_url: e.target.value }))}
                className="prolimal-input"
                placeholder="URL del QR bancario"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300 mb-2">
                Términos y condiciones
              </label>
              <textarea
                rows={3}
                value={config.terminos_condiciones || ''}
                onChange={e => setConfig(m => ({ ...m, terminos_condiciones: e.target.value }))}
                className="prolimal-input resize-none"
                placeholder="Términos y condiciones"
              />
            </div>
            <div className="flex items-start gap-3">
              <label className="flex-1 text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300 mb-0">
                Notificaciones de stock bajo
              </label>
              <label className="flex-1 relative">
                <input
                  type="checkbox"
                  checked={config.notificaciones_stock}
                  onChange={e => setConfig(m => ({ ...m, notificaciones_stock: e.target.checked }))}
                  className="prolimal-checkbox"
                />
                <span className="text-[10px] text-prolimal-ink-400 dark:text-prolimal-ink-300">Activar</span>
              </label>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300 mb-2">
                Stock mínimo de alerta
              </label>
              <input
                type="number"
                min={1}
                value={config.stock_minimo_alerta ?? 5}
                onChange={e => setConfig(m => ({ ...m, stock_minimo_alerta: Number(e.target.value) }))}
                className="prolimal-input"
                placeholder="5"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300 mb-2">
                Modo oscuro
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={config.modo_oscuro}
                  onChange={e => setConfig(m => ({ ...m, modo_oscuro: e.target.checked }))}
                  className="prolimal-checkbox"
                />
                <span className="text-[10px] text-prolimal-ink-400 dark:text-prolimal-ink-300">Activar modo oscuro</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-prolimal-ink-900/50 p-4 backdrop-blur-sm" onClick={() => setEditando(false)}>
          <div className="max-w-md w-full max-h-[90vh] overflow-y-auto rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="prolimal-eyebrow">Guardar cambios</p>
                <h2 className="prolimal-display mt-2 text-xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">Guardar configuración</h2>
              </div>
              <button onClick={() => setEditando(false)} aria-label="Cerrar" className="prolimal-icon-btn h-6 w-6">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 space-y-3">
              <button onClick={() => { setEditando(false); guardar(); }} className="prolimal-btn-primary w-full">
                Guardar cambios
              </button>
              <button onClick={() => setEditando(false)} className="prolimal-btn-secondary w-full">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <button onClick={() => setEditando(true)} className="prolimal-btn-primary w-full">
          <Save className="h-4 w-4 mr-2" />
          Guardar configuración
        </button>
      </div>
    </main>
  );
}
