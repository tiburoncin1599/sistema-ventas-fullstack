'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Heart, Mail, MapPin, MessageCircle, Shield, ShoppingCart, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import Hero from '@/components/tienda/Hero';
import FamiliaCard from '@/components/tienda/FamiliaCard';
import ProductCard from '@/components/tienda/ProductCard';
import type { ProductoCardData } from '@/components/tienda/ProductCard';

const familias = [
  { nombre: 'Lavandinas', imagen: '/productos/lavandina-1lt.png' },
  { nombre: 'Limpia Pisos', imagen: '/productos/piso-lavanda.png' },
  { nombre: 'Limpia Vidrios', imagen: '/productos/vidrios-gatillo.png' },
  { nombre: 'Desinfectantes', imagen: '/productos/alcohol.png' },
];

const beneficios = [
  { titulo: 'Variedad real', descripcion: 'Un catálogo amplio para cada rincón, tarea y necesidad.', Icono: ShoppingCart },
  { titulo: 'Compra simple', descripcion: 'Elegí, sumá al carrito y coordinamos la entrega con vos.', Icono: Truck },
  { titulo: 'Calidad que queda', descripcion: 'Productos confiables para el uso diario, sin complicaciones.', Icono: Shield },
  { titulo: 'Atención cercana', descripcion: 'Seguimiento humano de tu pedido, de principio a fin.', Icono: Heart },
];

const WHATSAPP_NUMERO = process.env.NEXT_PUBLIC_WHATSAPP || '59170000000';

export default function Home() {
  const [productos, setProductos] = useState<ProductoCardData[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get('/productos')
      .then(res => setProductos((res.data || []).slice(0, 8)))
      .catch(() => setError(true));
  }, []);

  return (
    <main className="prolimal-page min-h-screen">
      <Hero />

      <section id="colecciones" className="scroll-mt-28 border-b border-prolimal-ink-900/10 py-16 dark:border-prolimal-sand-100/10 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="prolimal-eyebrow">Colecciones</p>
              <h2 className="prolimal-display mt-4 text-4xl leading-[0.98] tracking-[-0.045em] text-prolimal-ink-900 dark:text-prolimal-sand-50 sm:text-5xl lg:text-6xl">
                Una línea para{' '}
                <span className="block italic text-prolimal-teal-700 dark:text-prolimal-teal-300">cada espacio.</span>
              </h2>
            </div>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between lg:justify-end">
              <p className="max-w-md text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200 sm:text-base">
                Del piso de la cocina al vidrio de la oficina. Encontrá la familia indicada y llevá una
                limpieza más simple a tu rutina.
              </p>
              <Link
                href="/productos"
                className="group inline-flex shrink-0 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-800 transition-colors hover:text-prolimal-teal-700 dark:text-prolimal-sand-100 dark:hover:text-prolimal-teal-300"
              >
                Ver todo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4 lg:gap-5">
            {familias.map((familia, index) => (
              <FamiliaCard
                key={familia.nombre}
                nombre={familia.nombre}
                imagen={familia.imagen}
                indice={index + 1}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-prolimal-ink-900/10 bg-prolimal-sand-50/55 py-16 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/25 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="prolimal-eyebrow">Selección</p>
              <h2 className="prolimal-display mt-4 text-4xl leading-[0.98] tracking-[-0.045em] text-prolimal-ink-900 dark:text-prolimal-sand-50 sm:text-5xl">
                Favoritos de la casa.
              </h2>
              <p className="mt-3 text-sm font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200 sm:text-base">
                Algunos imprescindibles que ya forman parte de la rutina.
              </p>
            </div>
            <Link
              href="/productos"
              className="group hidden shrink-0 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-800 transition-colors hover:text-prolimal-teal-700 dark:text-prolimal-sand-100 dark:hover:text-prolimal-teal-300 sm:inline-flex"
            >
              Catálogo completo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {error ? (
            <div className="mt-10 rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-10 text-center dark:border-prolimal-sand-100/10 dark:bg-card-dark">
              <ShoppingCart className="mx-auto h-10 w-10 text-prolimal-ink-300 dark:text-prolimal-ink-500" />
              <p className="mt-4 font-extrabold text-prolimal-ink-800 dark:text-prolimal-sand-50">
                No se pudieron cargar los productos
              </p>
              <p className="mt-1 text-sm text-prolimal-ink-500 dark:text-prolimal-ink-200">
                Intentá recargar la página o volvé al catálogo.
              </p>
            </div>
          ) : productos.length === 0 ? (
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-3 dark:border-prolimal-sand-100/10 dark:bg-card-dark"
                >
                  <div className="aspect-[5/4] animate-pulse rounded-[1.55rem] bg-prolimal-sand-100 dark:bg-prolimal-ink-800" />
                  <div className="space-y-3 px-3 pb-3 pt-5">
                    <div className="h-4 w-3/4 animate-pulse rounded-full bg-prolimal-sand-100 dark:bg-prolimal-ink-800" />
                    <div className="h-4 w-1/2 animate-pulse rounded-full bg-prolimal-sand-100 dark:bg-prolimal-ink-800" />
                    <div className="h-6 w-1/3 animate-pulse rounded-full bg-prolimal-sand-100 dark:bg-prolimal-ink-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {productos.map((producto) => (
                <ProductCard key={producto.id} producto={producto} />
              ))}
            </div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/productos"
              className="group inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-800 transition-colors hover:text-prolimal-teal-700 dark:text-prolimal-sand-100 dark:hover:text-prolimal-teal-300"
            >
              Ver todos los productos
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-prolimal-ink-900/10 bg-prolimal-teal-100/70 py-16 dark:border-prolimal-sand-100/10 dark:bg-prolimal-teal-900/25 lg:py-24">
        <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-white/40 blur-3xl dark:bg-prolimal-teal-500/10" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-64 w-64 rounded-full bg-prolimal-coral-200/60 blur-3xl dark:bg-prolimal-coral-500/10" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
          <div>
            <p className="prolimal-eyebrow">La diferencia</p>
            <h2 className="prolimal-display mt-4 max-w-xl text-4xl leading-[0.98] tracking-[-0.045em] text-prolimal-ink-900 dark:text-prolimal-sand-50 sm:text-5xl">
              La limpieza no tiene por qué sentirse
              <span className="italic text-prolimal-teal-800 dark:text-prolimal-teal-300"> industrial.</span>
            </h2>
            <p className="mt-5 max-w-lg text-sm font-medium leading-relaxed text-prolimal-ink-600 dark:text-prolimal-ink-200 sm:text-base">
              Creemos en productos que cumplen, en una atención que responde y en una compra que no te
              hace perder tiempo. Simple, cercano, bien hecho.
            </p>
            <Link href="/productos" className="prolimal-btn-primary group mt-8">
              Encontrar mi producto
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
            {beneficios.map(({ titulo, descripcion, Icono }) => (
              <div
                key={titulo}
                className="group border-t border-prolimal-ink-900/15 pt-5 transition-colors hover:border-prolimal-ink-900/40 dark:border-prolimal-sand-100/15 dark:hover:border-prolimal-sand-100/35"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70 text-prolimal-teal-700 shadow-sm transition-transform duration-300 group-hover:-rotate-6 dark:bg-prolimal-ink-800/70 dark:text-prolimal-teal-300">
                  <Icono className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-extrabold tracking-[-0.02em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                  {titulo}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-prolimal-ink-600 dark:text-prolimal-ink-200">
                  {descripcion}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="prolimal-page py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-stretch lg:px-8">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-prolimal-ink-900/10 shadow-[0_34px_90px_-56px_rgba(11,37,32,0.55)] dark:border-prolimal-sand-100/10">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3899.7317999999997!2d-66.1568!3d-17.3934!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTfCsDIzJzM2LjIiUyA2NsKwMDknMjQuNSJX!5e0!3m2!1ses!2sbo!4v1"
              title="Ubicación de PROLIMAC SRL"
              className="h-[360px] w-full lg:h-full lg:min-h-[420px]"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div className="flex flex-col justify-center rounded-[2.5rem] border border-prolimal-ink-900/10 bg-card p-8 dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-10">
            <p className="prolimal-eyebrow">Ubicación</p>
            <h2 className="prolimal-display mt-4 text-4xl leading-none tracking-[-0.045em] text-prolimal-ink-900 dark:text-prolimal-sand-50 sm:text-5xl">
              Encontranos.
            </h2>
            <p className="mt-4 text-sm font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200 sm:text-base">
              Estamos en Cochabamba, Bolivia. Coordinamos pedidos y consultas de forma directa.
            </p>

            <div className="mt-7 space-y-3 text-sm text-prolimal-ink-600 dark:text-prolimal-ink-200">
              <a
                href={`https://wa.me/${WHATSAPP_NUMERO}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-prolimal-ink-900/10 px-4 py-3 transition-colors hover:border-prolimal-teal-500/40 hover:bg-prolimal-teal-50 dark:border-prolimal-sand-100/10 dark:hover:bg-prolimal-teal-900/20"
              >
                <MessageCircle className="h-4 w-4 text-prolimal-teal-600 dark:text-prolimal-teal-300" />
                <span>
                  <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    WhatsApp
                  </span>
                  +591 700 00000
                </span>
              </a>
              <a
                href="mailto:contacto@prolimac.com"
                className="flex items-center gap-3 rounded-2xl border border-prolimal-ink-900/10 px-4 py-3 transition-colors hover:border-prolimal-teal-500/40 hover:bg-prolimal-teal-50 dark:border-prolimal-sand-100/10 dark:hover:bg-prolimal-teal-900/20"
              >
                <Mail className="h-4 w-4 text-prolimal-teal-600 dark:text-prolimal-teal-300" />
                <span>
                  <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    Correo
                  </span>
                  contacto@prolimac.com
                </span>
              </a>
              <p className="flex items-center gap-3 px-4 py-2">
                <MapPin className="h-4 w-4 text-prolimal-teal-600 dark:text-prolimal-teal-300" />
                Cochabamba, Bolivia
              </p>
            </div>

            <Link href="/productos" className="prolimal-btn-secondary group mt-8 w-fit">
              Explorar catálogo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
