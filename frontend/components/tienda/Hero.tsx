import Link from 'next/link';
import { ArrowRight, Droplets, MapPin, ShieldCheck, Sparkles, Truck } from 'lucide-react';

const categorias = [
  'Lavandinas',
  'Limpia pisos',
  'Limpia vidrios',
  'Desinfectantes',
  'Hogar',
  'Oficina',
  'Empresa',
];

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden prolimal-page">
      <div className="pointer-events-none absolute -left-40 top-20 h-[28rem] w-[28rem] rounded-full bg-prolimal-teal-200/50 blur-3xl dark:bg-prolimal-teal-800/20" />
      <div className="pointer-events-none absolute -right-32 top-0 h-[26rem] w-[26rem] rounded-full bg-prolimal-coral-200/45 blur-3xl dark:bg-prolimal-coral-900/15" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-prolimal-sand-300/40 blur-3xl dark:bg-prolimal-sand-700/15" />

      <div className="relative mx-auto grid max-w-7xl gap-14 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16 lg:px-8 lg:pb-24 lg:pt-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-prolimal-ink-900/10 bg-white/55 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-prolimal-ink-600 backdrop-blur dark:border-prolimal-sand-100/15 dark:bg-prolimal-ink-800/55 dark:text-prolimal-sand-100">
            <span className="h-1.5 w-1.5 rounded-full bg-prolimal-teal-500" aria-hidden="true" />
            Limpieza consciente · Cochabamba
          </span>

          <h1 className="prolimal-display mt-7 max-w-2xl text-[3.4rem] font-medium leading-[0.92] tracking-[-0.06em] text-prolimal-ink-900 dark:text-prolimal-sand-50 sm:text-6xl lg:text-[5.3rem]">
            Espacios que{' '}
            <span className="block italic text-prolimal-teal-700 dark:text-prolimal-teal-300">respiran.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base font-medium leading-relaxed text-prolimal-ink-500 dark:text-prolimal-ink-200 sm:text-lg">
            Productos de limpieza pensados para acompañar tu día. Fórmulas confiables, aromas que quedan y
            una compra simple desde el corazón de Cochabamba.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/productos" className="prolimal-btn-primary group px-7 py-4 text-base">
              Explorar catálogo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="#colecciones" className="prolimal-btn-secondary px-7 py-4 text-base">
              Conocer las líneas
            </Link>
          </div>

          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-prolimal-ink-500 dark:text-prolimal-ink-200">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-prolimal-teal-600 dark:text-prolimal-teal-300" />
              Calidad comprobada
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-prolimal-teal-600 dark:text-prolimal-teal-300" />
              Hecho en Bolivia
            </span>
            <span className="inline-flex items-center gap-2">
              <Truck className="h-4 w-4 text-prolimal-teal-600 dark:text-prolimal-teal-300" />
              Entrega coordinada
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <div className="prolimal-float absolute -left-4 top-4 z-10 hidden rounded-[1.5rem] border border-white/60 bg-white/85 px-5 py-4 shadow-[0_24px_60px_-32px_rgba(11,37,32,0.5)] backdrop-blur-md dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/85 sm:block">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
              Colección
            </p>
            <p className="mt-1 text-sm font-extrabold text-prolimal-ink-900 dark:text-prolimal-sand-50">
              Hogar · Oficina · Empresa
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[3rem] border border-white/70 bg-prolimal-sand-200/60 p-3 shadow-[0_40px_100px_-50px_rgba(11,37,32,0.7)] dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/60 sm:p-4">
            <div className="relative overflow-hidden rounded-[2.4rem]">
              <img
                src="/images/productos.jpg"
                alt="Productos de limpieza PROLIMAC SRL"
                className="h-[390px] w-full object-cover sm:h-[470px] lg:h-[560px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-prolimal-ink-900/55 via-transparent to-transparent" />

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white sm:p-7">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/70">
                    Tu espacio, más liviano
                  </p>
                  <p className="prolimal-display mt-1 text-2xl italic sm:text-3xl">
                    limpio, fresco, tuyo.
                  </p>
                </div>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-md">
                  <Droplets className="h-5 w-5" />
                </span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 z-10 flex items-center gap-3 rounded-full border border-white/70 bg-white/90 py-2 pl-2 pr-5 shadow-[0_24px_60px_-32px_rgba(11,37,32,0.5)] backdrop-blur-md dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-800/90 sm:-bottom-5 sm:-right-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-prolimal-coral-100 text-prolimal-coral-700 dark:bg-prolimal-coral-900/30 dark:text-prolimal-coral-300">
              <Sparkles className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                Selección
              </span>
              <span className="block text-sm font-extrabold text-prolimal-ink-900 dark:text-prolimal-sand-50">
                Calidad PROLIMAC
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="relative border-y border-prolimal-ink-900/10 bg-white/35 dark:border-prolimal-sand-100/10 dark:bg-prolimal-ink-900/35">
        <div className="flex overflow-hidden py-4">
          <div className="prolimal-marquee flex min-w-max items-center gap-8 pr-8">
            {[...categorias, ...categorias].map((categoria, index) => (
              <span
                key={`${categoria}-${index}`}
                className="inline-flex items-center gap-8 text-[10px] font-bold uppercase tracking-[0.24em] text-prolimal-ink-500 dark:text-prolimal-ink-200"
              >
                {categoria}
                <span className="h-1 w-1 rounded-full bg-prolimal-coral-400" aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
