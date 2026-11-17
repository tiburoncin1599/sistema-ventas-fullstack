'use client';
import { useEffect, useState } from 'react';
import { api, apiFetchBlob } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Plus, Wallet } from 'lucide-react';

interface Deuda {
  id: number;
  usuario_id: number;
  monto: number;
  monto_pagado: number;
  descripcion: string;
  estado: string;
  fecha_creacion: string;
  fecha_pago: string | null;
  usuario: { nombre: string; email: string; carnet: string };
  vendedor?: { id: number; nombre: string } | null;
}

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

export default function AdminDeudas() {
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [resumen, setResumen] = useState<{
    total_deudas: number;
    deudas_pendientes: number;
    total_pendiente: number;
    total_pagado: number;
    deudas_pagadas: number;
  } | null>(null);

  const [showCrear, setShowCrear] = useState(false);
  const [formDeuda, setFormDeuda] = useState({ usuarioId: 0, monto: '', descripcion: '', vendedorId: 0 });
  const [vendedores, setVendedores] = useState<Usuario[]>([]);

  const [showPagar, setShowPagar] = useState<Deuda | null>(null);
  const [montoPago, setMontoPago] = useState('');

  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [rolActual] = useState(() =>
    typeof window !== 'undefined'
      ? (JSON.parse(localStorage.getItem('usuario') || 'null') as { rol?: string } | null)?.rol
      : undefined,
  );
  const puedeEditar = rolActual === 'admin' || rolActual === 'inventario';

  const cargar = async (filtroDesde?: string, filtroHasta?: string) => {
    const params: Record<string, string> = {};
    const d = filtroDesde || desde;
    const h = filtroHasta || hasta;
    if (d) params.desde = d;
    if (h) params.hasta = h;
    const [deudasRes, r] = await Promise.all([
      api.get('/deudas', { params }),
      api.get('/deudas/resumen'),
    ]);
    setDeudas(deudasRes.data);
    setResumen(r.data);
    try {
      const u = await api.get('/usuarios');
      setUsuarios(u.data.filter((usr: Usuario) => usr.rol === 'admin' || usr.rol === 'ventas' || usr.rol === 'inventario'));
    } catch {} // solo admin puede listar usuarios
    try {
      const v = await api.get('/usuarios/vendedores');
      setVendedores(v.data || []);
    } catch {}
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar(undefined, undefined).finally(() => setCargando(false));
  }, []);

  const crearDeuda = async () => {
    if (!formDeuda.usuarioId || !formDeuda.monto) return;
    try {
      await api.post('/deudas', {
        usuarioId: formDeuda.usuarioId,
        monto: parseFloat(formDeuda.monto),
        descripcion: formDeuda.descripcion,
        ...(formDeuda.vendedorId ? { vendedorId: formDeuda.vendedorId } : {}),
      });
      setShowCrear(false);
      setFormDeuda({ usuarioId: 0, monto: '', descripcion: '', vendedorId: 0 });
      cargar(desde, hasta);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al crear la deuda';
      alert(msg);
    }
  };

  const pagarDeuda = async () => {
    if (!showPagar || !montoPago) return;
    try {
      await api.put(`/deudas/${showPagar.id}/pagar`, { monto: parseFloat(montoPago) });
      setShowPagar(null);
      setMontoPago('');
      cargar(desde, hasta);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al registrar el pago';
      alert(msg);
    }
  };

  const eliminarDeuda = async (id: number) => {
    if (!confirm('¿Eliminar esta deuda?')) return;
    try {
      await api.delete(`/deudas/${id}`);
      cargar(desde, hasta);
    } catch { alert('Error al eliminar la deuda'); }
  };

  const descargarFactura = async (id: number) => {
    try {
      const blob = await apiFetchBlob(`/deudas/${id}/factura/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-deuda-${id}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      alert('Error al descargar la factura');
    }
  };

  const getColorEstado = (estado: string) => {
    const colores: Record<string, string> = {
      pendiente: 'bg-prolimal-coral-100 text-prolimal-coral-700 dark:bg-prolimal-coral-900/25 dark:text-prolimal-coral-300',
      parcial: 'bg-prolimal-orange-100 text-prolimal-orange-700 dark:bg-prolimal-orange-900/30 dark:text-prolimal-orange-300',
      pagado: 'bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300',
    };
    return colores[estado] || 'bg-prolimal-ink-100 text-prolimal-ink-700 dark:bg-prolimal-ink-800 dark:text-prolimal-ink-200';
  };

  if (cargando) {
    return (
      <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
        Cargando deudas...
      </div>
    );
  }

  const saldoPendiente = (d: Deuda) => d.monto - d.monto_pagado;

  return (
    <div className="pb-10">
      <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="prolimal-eyebrow">Finanzas</p>
          <h2 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
            Gestión de deudas
          </h2>
          <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200">
            Registro de deudas del personal con la empresa.
          </p>
        </div>
        {puedeEditar && (
          <button onClick={() => setShowCrear(true)} className="prolimal-btn-primary w-fit whitespace-nowrap">
            <Plus className="h-4 w-4" />
            Nueva deuda
          </button>
        )}
      </section>

      <div className="mb-8 rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
              className="prolimal-input" />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
              className="prolimal-input" />
          </div>
          <button onClick={() => cargar(desde, hasta)} className="prolimal-btn-primary">
            Filtrar
          </button>
          {(desde || hasta) && (
            <button onClick={() => { setDesde(''); setHasta(''); cargar('', ''); }}
              className="prolimal-btn-ghost px-3 py-2 text-sm">
              Limpiar filtro
            </button>
          )}
        </div>
      </div>

      {resumen && (
        <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[
            { label: 'Total deudas', value: resumen.total_deudas, Icono: Wallet, tono: 'ink' },
            { label: 'Pendientes', value: resumen.deudas_pendientes, Icono: AlertTriangle, tono: 'coral' },
            { label: 'Saldo pendiente', value: formatCurrency(resumen.total_pendiente), Icono: Wallet, tono: 'sand' },
            { label: 'Pagado', value: formatCurrency(resumen.total_pagado), Icono: CheckCircle2, tono: 'teal' },
          ].map(({ label, value, Icono, tono }) => (
            <div
              key={label}
              className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark"
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                  tono === 'teal'
                    ? 'bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300'
                    : tono === 'coral'
                      ? 'bg-prolimal-coral-100 text-prolimal-coral-700 dark:bg-prolimal-coral-900/25 dark:text-prolimal-coral-300'
                      : tono === 'sand'
                        ? 'bg-prolimal-sand-200 text-prolimal-sand-800 dark:bg-prolimal-sand-900/30 dark:text-prolimal-sand-200'
                        : 'bg-prolimal-ink-100 text-prolimal-ink-700 dark:bg-prolimal-ink-800 dark:text-prolimal-ink-200'
                }`}
              >
                <Icono className="h-4 w-4" />
              </span>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">{label}</p>
              <p className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">{value}</p>
            </div>
          ))}
        </div>
      )}

      {deudas.length === 0 ? (
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          No hay deudas registradas
        </div>
      ) : (
        <div className="space-y-6">
          {(() => {
            const agrupado = new Map<string, { usuario: Deuda['usuario']; deudas: Deuda[] }>();
            for (const d of deudas) {
              const nombre = d.usuario?.nombre || 'Sin asignar';
              if (!agrupado.has(nombre)) agrupado.set(nombre, { usuario: d.usuario, deudas: [] });
              agrupado.get(nombre)!.deudas.push(d);
            }
            const ordenado = Array.from(agrupado.entries()).sort(([a], [b]) => a.localeCompare(b));
            return ordenado.map(([nombre, grupo]) => {
              const totalDeuda = grupo.deudas.reduce((s, d) => s + Number(d.monto), 0);
              const totalPagado = grupo.deudas.reduce((s, d) => s + Number(d.monto_pagado), 0);
              const saldo = totalDeuda - totalPagado;
              const pendientes = grupo.deudas.filter(d => d.estado !== 'pagado').length;
              return (
                <details key={nombre} className="overflow-hidden rounded-[2rem] border border-prolimal-ink-900/10 bg-card shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark" open>
                  <summary className="cursor-pointer bg-prolimal-sand-100/60 px-6 py-4 transition-colors hover:bg-prolimal-sand-100 dark:bg-prolimal-ink-800/60 dark:hover:bg-prolimal-ink-700">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-prolimal-teal-100 font-extrabold text-prolimal-teal-800 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-200">
                          {nombre.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <span className="text-lg font-extrabold tracking-[-0.02em] text-prolimal-ink-900 dark:text-prolimal-sand-50">{nombre}</span>
                          <span className="ml-3 text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">{grupo.deudas.length} deuda{grupo.deudas.length !== 1 ? 's' : ''}</span>
                          {pendientes > 0 && (
                            <span className="ml-2 text-xs font-bold text-prolimal-coral-600 dark:text-prolimal-coral-300">{pendientes} pendiente{pendientes !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Saldo pendiente</p>
                        <p className={`text-xl font-extrabold tracking-[-0.03em] ${saldo > 0 ? 'text-prolimal-coral-600 dark:text-prolimal-coral-300' : 'text-prolimal-teal-700 dark:text-prolimal-teal-300'}`}>
                          {formatCurrency(saldo)}
                        </p>
                      </div>
                    </div>
                  </summary>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                      <thead>
                        <tr className="border-b border-prolimal-ink-900/5 dark:border-prolimal-sand-100/10">
                          {['ID', 'Descripción', 'Vendedor', 'Monto', 'Pagado', 'Saldo', 'Estado', 'Acciones'].map((h) => (
                            <th key={h} className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-prolimal-ink-400 dark:text-prolimal-ink-300">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.deudas.map(d => (
                          <tr key={d.id} className="border-b border-prolimal-ink-900/5 last:border-0 dark:border-prolimal-sand-100/5">
                            <td className="px-6 py-4 text-sm font-bold text-prolimal-ink-700 dark:text-prolimal-sand-100">#{d.id}</td>
                            <td className="max-w-xs truncate px-6 py-4 text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">{d.descripcion || '\u2014'}</td>
                            <td className="px-6 py-4 text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">{d.vendedor?.nombre || '—'}</td>
                            <td className="px-6 py-4 text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">{formatCurrency(d.monto)}</td>
                            <td className="px-6 py-4 text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">{formatCurrency(d.monto_pagado)}</td>
                            <td className="px-6 py-4 text-sm font-extrabold text-prolimal-ink-900 dark:text-prolimal-sand-50">{formatCurrency(saldoPendiente(d))}</td>
                            <td className="px-6 py-4">
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${getColorEstado(d.estado)}`}>
                                {d.estado}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-2">
                                {puedeEditar && d.estado !== 'pagado' && (
                                  <button onClick={() => { setShowPagar(d); setMontoPago(String(saldoPendiente(d))); }} className="text-xs font-bold text-prolimal-teal-700 underline-offset-4 hover:underline dark:text-prolimal-teal-300">
                                    Pagar
                                  </button>
                                )}
                                {d.estado === 'pagado' && (
                                  <button onClick={() => descargarFactura(d.id)} className="text-xs font-bold text-prolimal-ink-600 underline-offset-4 hover:underline dark:text-prolimal-sand-100">
                                    Factura
                                  </button>
                                )}
                                {puedeEditar && (
                                  <button onClick={() => eliminarDeuda(d.id)} className="text-xs font-bold text-prolimal-red-600 underline-offset-4 hover:underline dark:text-prolimal-red-400">
                                    Eliminar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-prolimal-ink-900/10 bg-prolimal-sand-100/40 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/40">
                          <td colSpan={2} className="px-6 py-3 text-sm font-extrabold text-prolimal-ink-900 dark:text-prolimal-sand-50">Total {nombre}</td>
                          <td className="px-6 py-3 text-sm font-bold text-prolimal-ink-700 dark:text-prolimal-sand-100"></td>
                          <td className="px-6 py-3 text-sm font-bold text-prolimal-ink-700 dark:text-prolimal-sand-100">{formatCurrency(totalDeuda)}</td>
                          <td className="px-6 py-3 text-sm font-bold text-prolimal-ink-700 dark:text-prolimal-sand-100">{formatCurrency(totalPagado)}</td>
                          <td className="px-6 py-3 text-sm font-extrabold text-prolimal-ink-900 dark:text-prolimal-sand-50">{formatCurrency(saldo)}</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </details>
              );
            });
          })()}
        </div>
      )}

      {/* Modal Crear Deuda */}
      {showCrear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-prolimal-ink-900/50 dark:bg-prolimal-ink-900/50 p-4 backdrop-blur-sm" onClick={() => setShowCrear(false)}>
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_40px_90px_-40px_rgba(11,37,32,0.6)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-6">
              <p className="prolimal-eyebrow">Nuevo registro</p>
              <h2 className="prolimal-display mt-2 text-2xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">Nueva deuda</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Personal *</label>
                <select
                  value={formDeuda.usuarioId}
                  onChange={e => setFormDeuda({ ...formDeuda, usuarioId: +e.target.value })}
                  className="prolimal-input">
                  <option value={0}>Seleccionar...</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Vendedor responsable</label>
                <select
                  value={formDeuda.vendedorId}
                  onChange={e => setFormDeuda({ ...formDeuda, vendedorId: +e.target.value })}
                  className="prolimal-input">
                  <option value={0}>— Por defecto: quien registra —</option>
                  {vendedores.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Monto *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formDeuda.monto}
                  onChange={e => setFormDeuda({ ...formDeuda, monto: e.target.value })}
                  className="prolimal-input"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Descripción</label>
                <textarea
                  value={formDeuda.descripcion}
                  onChange={e => setFormDeuda({ ...formDeuda, descripcion: e.target.value })}
                  className="prolimal-input"
                  placeholder="Motivo de la deuda..."
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button onClick={() => setShowCrear(false)} className="prolimal-btn-secondary sm:w-auto">Cancelar</button>
              <button onClick={crearDeuda} className="prolimal-btn-primary flex-1">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagar Deuda */}
      {showPagar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-prolimal-ink-900/50 dark:bg-prolimal-ink-900/50 p-4 backdrop-blur-sm" onClick={() => setShowPagar(null)}>
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_40px_90px_-40px_rgba(11,37,32,0.6)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-6">
              <p className="prolimal-eyebrow">Movimiento</p>
              <h2 className="prolimal-display mt-2 text-2xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">Registrar pago</h2>
              <p className="mt-1 text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">Deuda #{showPagar.id} · {showPagar.usuario?.nombre}</p>
            </div>
            <div className="mb-6 space-y-2 rounded-2xl bg-prolimal-sand-100/70 p-4 dark:bg-prolimal-ink-800/60">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">Monto total</span>
                <span className="font-bold text-prolimal-ink-800 dark:text-prolimal-sand-50">{formatCurrency(showPagar.monto)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">Ya pagado</span>
                <span className="font-bold text-prolimal-ink-800 dark:text-prolimal-sand-50">{formatCurrency(showPagar.monto_pagado)}</span>
              </div>
              <div className="flex justify-between border-t border-prolimal-ink-900/5 pt-2 dark:border-prolimal-sand-100/10">
                <span className="text-sm font-extrabold text-prolimal-ink-900 dark:text-prolimal-sand-50">Saldo pendiente</span>
                <span className="text-lg font-extrabold text-prolimal-coral-600 dark:text-prolimal-coral-300">{formatCurrency(saldoPendiente(showPagar))}</span>
              </div>
            </div>
            <div className="mb-6">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">Monto a pagar</label>
              <input
                type="number"
                step="0.01"
                value={montoPago}
                onChange={e => setMontoPago(e.target.value)}
                className="prolimal-input text-lg font-bold"
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button onClick={() => setShowPagar(null)} className="prolimal-btn-secondary sm:w-auto">Cancelar</button>
              <button
                onClick={pagarDeuda}
                disabled={!montoPago || parseFloat(montoPago) <= 0}
                className="prolimal-btn-primary flex-1">
                Registrar pago
              </button>
            </div>
            <p className="mt-4 text-center text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
              Al pagar se generará un comprobante descargable en PDF
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
