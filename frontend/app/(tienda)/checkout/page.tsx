'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, MessageCircle, Package, ShieldCheck } from 'lucide-react';
import {
  useCarrito,
  claveLinea,
  presentacionDe,
  CANTIDAD_MINIMA,
  type ProductoCarrito,
} from '@/store/carrito';
import { api } from '@/lib/api';
import { formatCurrency, parseCurrency } from '@/lib/utils';
import { unidadesDe } from '@/lib/conversion';
import { useValidacionFormulario } from '@/lib/hooks/use-validacion-formulario';
import {
  enteroMinimo,
  mensajeGeneral,
  type ErroresFormulario,
} from '@/lib/validacion';
import { AvisoErrorFormulario, CampoError } from '@/components/ui/CampoError';

const WHATSAPP_NUMERO = process.env.NEXT_PUBLIC_WHATSAPP || '59170000000';

const etiquetaPresentacion = (tipo: string, cantidad = 2) =>
  tipo === 'UNIDAD'
    ? cantidad === 1 ? 'unidad' : 'unidades'
    : cantidad === 1 ? 'paquete' : 'paquetes';

/** Claves dinámicas para los mensajes de cada línea del carrito. */
type ClaveErrorItem = `item:${string}`;
type ItemValidacion = ProductoCarrito & { cantidad: number };
type FormularioCheckout = {
  items: ItemValidacion[];
} & Partial<Record<ClaveErrorItem, ItemValidacion>>;

const CAMPOS_CHECKOUT: Array<keyof FormularioCheckout | '_general'> = [
  'items',
  '_general',
];

const ALIAS_CHECKOUT: Partial<Record<string, keyof FormularioCheckout | '_general'>> = {
  usuarioId: '_general',
  cliente: '_general',
  items: 'items',
  productos: 'items',
};

const claveErrorItem = (item: ItemValidacion): ClaveErrorItem =>
  `item:${claveLinea(item.id, presentacionDe(item))}`;

const formCheckout = (actuales: ItemValidacion[]): FormularioCheckout => {
  const form: FormularioCheckout = { items: actuales };
  for (const item of actuales) form[claveErrorItem(item)] = item;
  return form;
};

export default function CheckoutPage() {
  const { items, total, vaciar } = useCarrito();
  const [cargando, setCargando] = useState(false);
  const [pedidoCreado, setPedidoCreado] = useState(false);
  const [pedidoId, setPedidoId] = useState<number | null>(null);
  const router = useRouter();

  const validar = useCallback(
    (form: FormularioCheckout): ErroresFormulario<FormularioCheckout> => {
      const errores: ErroresFormulario<FormularioCheckout> = {};

      if (form.items.length === 0) {
        errores.items =
          'Agregá al menos un producto al carrito antes de confirmar el pedido.';
        return errores;
      }

      for (const item of form.items) {
        const tipo = presentacionDe(item);
        const minimo = CANTIDAD_MINIMA[tipo];
        const errorCantidad = enteroMinimo(
          item.cantidad,
          minimo,
          `"${item.nombre}": el pedido mínimo es de ${minimo} ${etiquetaPresentacion(tipo, minimo)}. Ajustá la cantidad en el carrito.`,
        );
        if (errorCantidad) errores[claveErrorItem(item)] = errorCantidad;
      }

      // El stock se mide en unidades físicas y se comparte entre las líneas
      // UNIDAD y PAQUETE del mismo producto, así que se agrupa por producto.
      const porProducto = new Map<
        number,
        { nombre: string; unidades: number; stock?: number }
      >();
      for (const item of form.items) {
        const grupo = porProducto.get(item.id) ?? {
          nombre: item.nombre,
          unidades: 0,
          stock: item.stock,
        };
        grupo.unidades += unidadesDe(item);
        if (typeof item.stock === 'number') grupo.stock = item.stock;
        porProducto.set(item.id, grupo);
      }
      for (const [id, grupo] of porProducto.entries()) {
        if (grupo.stock === undefined || grupo.unidades <= grupo.stock) continue;
        const mensaje = `"${grupo.nombre}": stock insuficiente. Se necesitan ${grupo.unidades} unidades en total y solo hay ${grupo.stock} disponibles.`;
        errores.items = mensaje;
        for (const item of form.items.filter(i => i.id === id)) {
          if (!errores[claveErrorItem(item)]) {
            errores[claveErrorItem(item)] = mensaje;
          }
        }
      }

      return errores;
    },
    [],
  );

  const {
    errores,
    enviado,
    errorGeneral,
    setErrorGeneral,
    validarCampo,
    validarTodo,
    aplicarErroresBackend,
  } = useValidacionFormulario<FormularioCheckout>(validar);

  // El carrito puede cambiar fuera de esta página (store persistido/otra
  // pestaña): cada cambio recalcula los mensajes en vivo.
  useEffect(() => {
    const form = formCheckout(items);
    validarCampo('items', form);
    for (const item of items) validarCampo(claveErrorItem(item), form);
    setErrorGeneral('');
  }, [items, validarCampo, setErrorGeneral]);

  const confirmar = async () => {
    let usuario: { id?: number } = {};
    try {
      usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    } catch {}
    if (!usuario.id) {
      router.push('/auth');
      return;
    }

    // Sin carrito, mínimo por presentación o stock: no se llama a api.post.
    if (!validarTodo(formCheckout(items))) return;

    setCargando(true);
    try {
      const res = await api.post('/pedidos', {
        usuarioId: usuario.id,
        direccion: '',
        tipo_pago: 'CONTADO',
        montoPagado: total(),
        items: items.map(i => ({
          producto_id: i.id,
          cantidad: i.cantidad,
          tipo_presentacion: presentacionDe(i),
          precio: parseCurrency(i.precio),
        })),
      });
      setPedidoId(res.data.pedidoId ?? res.data.id);
      vaciar();
      setPedidoCreado(true);
    } catch (err: unknown) {
      aplicarErroresBackend(err, CAMPOS_CHECKOUT, ALIAS_CHECKOUT);
      setErrorGeneral(mensajeGeneral(err, 'Error al confirmar el pedido.'));
    } finally {
      setCargando(false);
    }
  };

  if (items.length === 0 && !pedidoCreado) {
    return (
      <main className="prolimal-page flex min-h-[70vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <AvisoErrorFormulario mensaje={errorGeneral || (enviado ? errores.items : undefined)} />
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-prolimal-sand-200 dark:bg-prolimal-ink-800">
            <Package className="h-10 w-10 text-prolimal-ink-500 dark:text-prolimal-ink-300" />
          </div>
          <h1 className="prolimal-display mt-6 text-4xl tracking-[-0.045em] text-prolimal-ink-900 dark:text-prolimal-sand-50 sm:text-5xl">
            No hay productos.
          </h1>
          <p className="mt-3 text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
            Agregá productos al carrito para confirmar un pedido.
          </p>
          <Link href="/productos" className="prolimal-btn-primary mt-7">
            Explorar catálogo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    );
  }

  if (pedidoCreado) {
    const mensaje = encodeURIComponent(
      `¡Hola! Quiero consultar sobre mi pedido #${pedidoId || ''} que realicé en la tienda.`
    );
    return (
      <main className="prolimal-page flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="max-w-xl text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-prolimal-teal-100 dark:bg-prolimal-teal-900/30">
            <CheckCircle2 className="h-11 w-11 text-prolimal-teal-700 dark:text-prolimal-teal-300" />
          </div>
          <p className="prolimal-eyebrow mt-6">Pedido confirmado</p>
          <h1 className="prolimal-display mt-3 text-4xl leading-none tracking-[-0.045em] text-prolimal-ink-900 dark:text-prolimal-sand-50 sm:text-5xl">
            Listo. Ya es tuyo.
          </h1>
          <p className="mt-4 text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200 sm:text-base">
            Tu pedido <strong className="text-prolimal-ink-900 dark:text-prolimal-sand-50">#{pedidoId || '-'}</strong> fue registrado.
            En breve el personal de inventario se comunicará con vos.
          </p>

          <a
            href={`https://wa.me/${WHATSAPP_NUMERO}?text=${mensaje}`}
            target="_blank"
            rel="noopener noreferrer"
            className="prolimal-btn-primary mt-8 px-7 py-4 text-base"
          >
            <MessageCircle className="h-5 w-5" />
            Contactar por WhatsApp
          </a>

          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
            <ShieldCheck className="h-4 w-4 text-prolimal-teal-600 dark:text-prolimal-teal-300" />
            El personal de inventario te atenderá a la brevedad.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="prolimal-page min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <p className="prolimal-eyebrow">Último paso</p>
        <h1 className="prolimal-display mt-3 text-4xl leading-none tracking-[-0.045em] text-prolimal-ink-900 dark:text-prolimal-sand-50 sm:text-5xl">
          Confirmar pedido.
        </h1>
        <p className="mt-3 max-w-xl text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
          Revisá tu selección. Después de confirmar, coordinamos la entrega por WhatsApp.
        </p>

        <div className="mt-8">
          <AvisoErrorFormulario mensaje={errorGeneral || (enviado ? errores.items : undefined)} />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <section className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-6">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
              Tu selección
            </h2>
            <div className="mt-4 divide-y divide-prolimal-ink-900/10 dark:divide-prolimal-sand-100/10">
              {items.map(item => {
                const unidades = unidadesDe(item);
                const tipo = presentacionDe(item);
                const esPaquete = tipo === 'PAQUETE';
                const mensajeItem = enviado ? errores[claveErrorItem(item)] : undefined;
                return (
                  <div
                    key={claveLinea(item.id, tipo)}
                    className={`py-4 first:pt-0 ${
                      mensajeItem
                        ? 'rounded-2xl border border-red-500 bg-red-50/60 px-3 dark:border-red-500/60 dark:bg-red-500/10'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="break-words font-bold text-prolimal-ink-800 dark:text-prolimal-sand-50">
                          {item.nombre}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                          x{item.cantidad} · {esPaquete ? 'paquetes' : 'unidades'}
                          {esPaquete && ` · ${unidades} unid.`}
                        </p>
                      </div>
                      <p className="shrink-0 font-extrabold text-prolimal-ink-900 dark:text-prolimal-sand-50">
                        {formatCurrency(parseCurrency(item.precio) * unidades)}
                      </p>
                    </div>
                    <CampoError mensaje={mensajeItem} />
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-prolimal-sand-100 px-4 py-4 dark:bg-prolimal-ink-800">
              <span className="text-sm font-bold text-prolimal-ink-700 dark:text-prolimal-sand-100">Total</span>
              <span className="text-2xl font-extrabold tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                {formatCurrency(total())}
              </span>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 text-center dark:border-prolimal-sand-100/10 dark:bg-card-dark">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-prolimal-teal-100 text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300">
                <MessageCircle className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
                ¿Tenés dudas antes de confirmar?
              </p>
              <a
                href={`https://wa.me/${WHATSAPP_NUMERO}`}
                target="_blank"
                rel="noopener noreferrer"
                className="prolimal-btn-secondary mt-4 w-full"
              >
                <MessageCircle className="h-4 w-4" />
                Contactar por WhatsApp
              </a>
            </div>

            <div className="rounded-[2rem] border border-prolimal-ink-900/10 bg-prolimal-ink-900 p-6 text-prolimal-sand-50 dark:border-prolimal-sand-100/10">
              <button
                type="button"
                onClick={confirmar}
                disabled={cargando}
                className="group flex w-full items-center justify-center gap-2 rounded-full bg-prolimal-sand-50 py-4 text-base font-extrabold text-prolimal-ink-900 transition-all hover:-translate-y-0.5 hover:bg-white disabled:pointer-events-none disabled:opacity-50"
              >
                {cargando ? 'Procesando...' : 'Confirmar pedido'}
                {!cargando && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
              </button>

              <p className="mt-4 text-center text-[11px] leading-relaxed text-prolimal-sand-100/55">
                Al confirmar, el personal de inventario te contactará por WhatsApp para coordinar la entrega.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
