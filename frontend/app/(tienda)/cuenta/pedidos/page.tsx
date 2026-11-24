'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Package } from 'lucide-react';
import { api, apiFetchBlob } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import BotonComprobantePdf from '@/components/ui/BotonComprobantePdf';

interface Pedido {
  id: number;
  total: number;
  estado: string;
  creado_en: string;
  direccion_entrega?: string | null;
  notas?: string | null;
  tipo_pago?: string | null;
  usuario?: {
    nombre?: string;
    email?: string | null;
    telefono?: string | null;
    carnet?: string | null;
    ubicacion?: string | null;
  } | null;
  procesador?: { nombre?: string } | null;
}

export default function MisPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let usuario: { id?: number } = {};
    try {
      usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    } catch {}
    if (!usuario.id) {
      router.push('/auth');
      return;
    }
    api.get(`/pedidos/usuario/${usuario.id}`)
      .then(res => setPedidos(res.data))
      .catch(() => setPedidos([]))
      .finally(() => setCargando(false));
  }, [router]);

  const descargarFactura = async (id: number) => {
    try {
      // Hereda el refresh de `api` y valida que el blob sea un PDF real.
      const blob = await apiFetchBlob(`/pedidos/${id}/factura/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: unknown) {
      const mensaje =
        err instanceof Error ? err.message : 'Error al descargar la factura';
      alert(mensaje);
    }
  };

  const getColorEstado = (estado: string) => {
    const colores: Record<string, string> = {
      pendiente: 'bg-prolimal-yellow-100 text-prolimal-yellow-800 dark:bg-prolimal-yellow-900/25 dark:text-prolimal-yellow-300',
      confirmado: 'bg-prolimal-blue-100 text-prolimal-blue-800 dark:bg-prolimal-blue-900/25 dark:text-prolimal-blue-300',
      enviado: 'bg-prolimal-purple-100 text-prolimal-purple-800 dark:bg-prolimal-purple-900/25 dark:text-prolimal-purple-300',
      entregado: 'bg-prolimal-green-100 text-prolimal-green-800 dark:bg-prolimal-green-900/25 dark:text-prolimal-green-300',
      cancelado: 'bg-prolimal-red-100 text-prolimal-red-800 dark:bg-prolimal-red-900/25 dark:text-prolimal-red-300',
    };
    return colores[estado] || 'bg-prolimal-sand-100 text-prolimal-ink-700 dark:bg-prolimal-ink-800 dark:text-prolimal-sand-100';
  };

  return (
    <main className="prolimal-page min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-500 transition-colors hover:text-prolimal-teal-700 dark:text-prolimal-ink-200 dark:hover:text-prolimal-teal-300"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Volver al inicio
        </Link>

        <p className="prolimal-eyebrow mt-6">Tu cuenta</p>
        <h1 className="prolimal-display mt-3 text-4xl leading-none tracking-[-0.045em] text-prolimal-ink-900 dark:text-prolimal-sand-50 sm:text-5xl">
          Mis pedidos.
        </h1>
        <p className="mt-3 text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
          Historial de compras y facturas disponibles.
        </p>

        {cargando ? (
          <div className="mt-8 space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-40 animate-pulse rounded-[2rem] border border-prolimal-ink-900/10 bg-card dark:border-prolimal-sand-100/10 dark:bg-card-dark"
              />
            ))}
          </div>
        ) : pedidos.length === 0 ? (
          <div className="mt-8 rounded-[2rem] border border-prolimal-ink-900/10 bg-card py-16 text-center dark:border-prolimal-sand-100/10 dark:bg-card-dark">
            <Package className="mx-auto h-14 w-14 text-prolimal-ink-300 dark:text-prolimal-ink-500" />
            <p className="mt-4 text-lg font-extrabold text-prolimal-ink-800 dark:text-prolimal-sand-50">
              Todavía no tenés pedidos
            </p>
            <p className="mt-1 text-sm text-prolimal-ink-500 dark:text-prolimal-ink-200">
              Cuando confirmes tu primera compra, aparecerá acá.
            </p>
            <Link href="/productos" className="prolimal-btn-primary mt-6">
              Explorar catálogo
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {pedidos.map(pedido => (
              <article
                key={pedido.id}
                className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                      Pedido
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                      #{pedido.id}
                    </h2>
                    <p className="mt-1 text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                      {new Date(pedido.creado_en).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${getColorEstado(pedido.estado)}`}>
                    {pedido.estado}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-1 rounded-2xl bg-prolimal-sand-100/60 p-4 text-xs font-medium text-prolimal-ink-500 dark:bg-prolimal-ink-800/50 dark:text-prolimal-sand-200 sm:grid-cols-2">
                  <span>Cliente: {pedido.usuario?.nombre || '—'}</span>
                  <span>Email: {pedido.usuario?.email || '—'}</span>
                  <span>CI / Documento: {pedido.usuario?.carnet || '—'}</span>
                  <span>Teléfono: {pedido.usuario?.telefono || '—'}</span>
                  <span>Ubicación: {pedido.usuario?.ubicacion || '—'}</span>
                  <span>Pago: {pedido.tipo_pago || 'CONTADO'}</span>
                  <span>Atendido por: {pedido.procesador?.nombre || 'Sin asignar'}</span>
                </div>

                <p className="mt-4 text-sm text-prolimal-ink-500 dark:text-prolimal-ink-200">
                  Entrega: {pedido.direccion_entrega || pedido.usuario?.ubicacion || 'Entrega a coordinar'}
                </p>
                {pedido.notas && (
                  <p className="mt-1 break-words text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    Notas: {pedido.notas}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-prolimal-ink-900/10 pt-5 dark:border-prolimal-sand-100/10">
                  <p className="text-2xl font-extrabold tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                    {formatCurrency(pedido.total)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => descargarFactura(pedido.id)}
                      className="prolimal-btn-secondary px-5 py-2.5"
                    >
                      <Download className="h-4 w-4" />
                      Descargar factura
                    </button>
                    <BotonComprobantePdf pedidoId={pedido.id} label="Comprobante PDF" compacta />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
