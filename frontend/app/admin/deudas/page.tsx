'use client';
import { useEffect, useState, useMemo } from 'react';
import { api, apiFetchBlob } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

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
  const [formDeuda, setFormDeuda] = useState({ usuarioId: 0, monto: '', descripcion: '' });

  const [showPagar, setShowPagar] = useState<Deuda | null>(null);
  const [montoPago, setMontoPago] = useState('');

  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const cargar = async (filtroDesde?: string, filtroHasta?: string) => {
    const params: any = {};
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
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar(undefined, undefined).finally(() => setCargando(false));
  }, []);

  const crearDeuda = async () => {
    if (!formDeuda.usuarioId || !formDeuda.monto) return;
    await api.post('/deudas', {
      usuarioId: formDeuda.usuarioId,
      monto: parseFloat(formDeuda.monto),
      descripcion: formDeuda.descripcion,
    });
    setShowCrear(false);
    setFormDeuda({ usuarioId: 0, monto: '', descripcion: '' });
    cargar(desde, hasta);
  };

  const pagarDeuda = async () => {
    if (!showPagar || !montoPago) return;
    await api.put(`/deudas/${showPagar.id}/pagar`, { monto: parseFloat(montoPago) });
    setShowPagar(null);
    setMontoPago('');
    cargar(desde, hasta);
  };

  const eliminarDeuda = async (id: number) => {
    if (!confirm('¿Eliminar esta deuda?')) return;
    await api.delete(`/deudas/${id}`);
    cargar(desde, hasta);
  };

  const descargarFactura = async (id: number) => {
    try {
      const blob = await apiFetchBlob(`/deudas/${id}/factura/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-deuda-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Error al descargar la factura');
    }
  };

  const getColorEstado = (estado: string) => {
    const colores: Record<string, string> = {
      pendiente: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
      parcial: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
      pagado: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    };
    return colores[estado] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  };

  if (cargando) return <p className="text-center py-20 text-gray-500 dark:text-gray-400">Cargando...</p>;

  const saldoPendiente = (d: Deuda) => d.monto - d.monto_pagado;

  return (
    <main className="max-w-6xl mx-auto px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Gestión de Deudas</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Registro de deudas del personal con la empresa</p>
        </div>
        <button onClick={() => setShowCrear(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700">
          + Nueva deuda
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="border dark:border-gray-600 rounded-xl px-4 py-2.5 dark:bg-gray-700 dark:text-white text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="border dark:border-gray-600 rounded-xl px-4 py-2.5 dark:bg-gray-700 dark:text-white text-sm" />
        </div>
        <button onClick={() => cargar(desde, hasta)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 text-sm mt-4">
          Filtrar
        </button>
        {(desde || hasta) && (
          <button onClick={() => { setDesde(''); setHasta(''); cargar('', ''); }}
            className="text-gray-500 dark:text-gray-400 hover:underline text-sm mt-4">
            Limpiar filtro
          </button>
        )}
      </div>

      {resumen && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
            <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Total deudas</p>
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{resumen.total_deudas}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl p-5">
            <p className="text-red-600 dark:text-red-400 text-sm font-medium">Pendientes</p>
            <p className="text-3xl font-bold text-red-700 dark:text-red-300">{resumen.deudas_pendientes}</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-2xl p-5">
            <p className="text-orange-600 dark:text-orange-400 text-sm font-medium">Saldo pendiente</p>
            <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{formatCurrency(resumen.total_pendiente)}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-2xl p-5">
            <p className="text-green-600 dark:text-green-400 text-sm font-medium">Pagado</p>
            <p className="text-3xl font-bold text-green-700 dark:text-green-300">{formatCurrency(resumen.total_pagado)}</p>
          </div>
        </div>
      )}

      {deudas.length === 0 ? (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">No hay deudas registradas</div>
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
                <details key={nombre} className="border dark:border-gray-700 rounded-2xl overflow-hidden" open>
                  <summary className="bg-gray-50 dark:bg-gray-800 px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                          {nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-lg dark:text-white">{nombre}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400 ml-3">{grupo.deudas.length} deuda{grupo.deudas.length !== 1 ? 's' : ''}</span>
                          {pendientes > 0 && (
                            <span className="text-xs text-red-500 dark:text-red-400 ml-2 font-medium">{pendientes} pendiente{pendientes !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Saldo pendiente</p>
                        <p className={`text-xl font-bold ${saldo > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {formatCurrency(saldo)}
                        </p>
                      </div>
                    </div>
                  </summary>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-t dark:border-gray-700">
                          <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">ID</th>
                          <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Descripción</th>
                          <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Monto</th>
                          <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Pagado</th>
                          <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Saldo</th>
                          <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Estado</th>
                          <th className="text-left px-6 py-3 font-semibold text-sm dark:text-white">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.deudas.map(d => (
                          <tr key={d.id} className="border-t dark:border-gray-700 dark:text-white">
                            <td className="px-6 py-4 font-medium text-sm">#{d.id}</td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400 max-w-xs truncate text-sm">{d.descripcion || '\u2014'}</td>
                            <td className="px-6 py-4 text-sm">{formatCurrency(d.monto)}</td>
                            <td className="px-6 py-4 text-sm">{formatCurrency(d.monto_pagado)}</td>
                            <td className="px-6 py-4 font-bold text-sm">{formatCurrency(saldoPendiente(d))}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getColorEstado(d.estado)}`}>
                                {d.estado}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                {d.estado !== 'pagado' && (
                                  <button onClick={() => { setShowPagar(d); setMontoPago(String(saldoPendiente(d))); }} className="text-green-600 dark:text-green-400 hover:underline text-xs font-medium">
                                    Pagar
                                  </button>
                                )}
                                {d.estado === 'pagado' && (
                                  <button onClick={() => descargarFactura(d.id)} className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium">
                                    Factura
                                  </button>
                                )}
                                <button onClick={() => eliminarDeuda(d.id)} className="text-red-600 dark:text-red-400 hover:underline text-xs font-medium">
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                          <td colSpan={2} className="px-6 py-3 font-bold text-sm dark:text-white">Total {nombre}</td>
                          <td className="px-6 py-3 font-bold text-sm dark:text-white">{formatCurrency(totalDeuda)}</td>
                          <td className="px-6 py-3 font-bold text-sm dark:text-white">{formatCurrency(totalPagado)}</td>
                          <td className="px-6 py-3 font-bold text-sm dark:text-white">{formatCurrency(saldo)}</td>
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
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCrear(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6 dark:text-white">Nueva Deuda</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Personal *</label>
                <select
                  value={formDeuda.usuarioId}
                  onChange={e => setFormDeuda({ ...formDeuda, usuarioId: +e.target.value })}
                  className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white">
                  <option value={0}>Seleccionar...</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formDeuda.monto}
                  onChange={e => setFormDeuda({ ...formDeuda, monto: e.target.value })}
                  className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                <textarea
                  value={formDeuda.descripcion}
                  onChange={e => setFormDeuda({ ...formDeuda, descripcion: e.target.value })}
                  className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 dark:bg-gray-700 dark:text-white"
                  placeholder="Motivo de la deuda..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCrear(false)} className="flex-1 border dark:border-gray-600 rounded-xl py-3 font-medium dark:text-white">Cancelar</button>
                <button onClick={crearDeuda} className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-medium hover:bg-blue-700">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagar Deuda */}
      {showPagar && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-50" onClick={() => setShowPagar(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-2 dark:text-white">Registrar Pago</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Deuda #{showPagar.id} \u2014 {showPagar.usuario?.nombre}</p>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Monto total:</span>
                <span className="font-bold">{formatCurrency(showPagar.monto)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Ya pagado:</span>
                <span className="font-medium dark:text-white">{formatCurrency(showPagar.monto_pagado)}</span>
              </div>
              <div className="flex justify-between text-lg border-t dark:border-gray-700 pt-3">
                <span className="font-bold dark:text-white">Saldo pendiente:</span>
                <span className="font-bold text-orange-600 dark:text-orange-400">{formatCurrency(saldoPendiente(showPagar))}</span>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto a pagar</label>
              <input
                type="number"
                step="0.01"
                value={montoPago}
                onChange={e => setMontoPago(e.target.value)}
                className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 text-lg font-bold dark:bg-gray-700 dark:text-white"
                placeholder="0.00"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPagar(null)} className="flex-1 border dark:border-gray-600 rounded-xl py-3 font-medium dark:text-white">Cancelar</button>
              <button
                onClick={pagarDeuda}
                disabled={!montoPago || parseFloat(montoPago) <= 0}
                className="flex-1 bg-green-600 text-white rounded-xl py-3 font-medium hover:bg-green-700 disabled:opacity-50">
                Registrar pago
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
              Al pagar se generará un comprobante descargable en PDF
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
