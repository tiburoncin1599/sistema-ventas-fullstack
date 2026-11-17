import Link from 'next/link';
import { ArrowUpRight, Mail, MapPin, MessageCircle } from 'lucide-react';

const enlacesProductos = [
  { href: '/productos', label: 'Catálogo completo' },
  { href: '/productos', label: 'Lavandinas' },
  { href: '/productos', label: 'Limpia pisos' },
  { href: '/productos', label: 'Limpia vidrios' },
];

const WHATSAPP_NUMERO = process.env.NEXT_PUBLIC_WHATSAPP || '59170000000';

export default function Footer() {
  const anio = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-prolimal-ink-900 text-prolimal-sand-50">
      <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-prolimal-teal-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-prolimal-coral-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="flex flex-col gap-8 border-b border-white/10 pb-12 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-prolimal-teal-300">
              PROLIMAC SRL · Cochabamba
            </p>
            <h2 className="prolimal-display mt-4 max-w-2xl text-4xl leading-[0.95] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              Menos ruido.
              {' '}<span className="block italic text-prolimal-coral-300">Más limpio.</span>
            </h2>
          </div>

          <a
            href={`https://wa.me/${WHATSAPP_NUMERO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex w-fit items-center gap-3 rounded-full bg-prolimal-sand-50 px-6 py-4 text-sm font-extrabold text-prolimal-ink-900 transition-all hover:-translate-y-0.5 hover:bg-white"
          >
            Hablemos de tu espacio
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
          </a>
        </div>

        <div className="grid grid-cols-1 gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-prolimal-sand-50 p-1.5">
                <img
                  src="/logo.png"
                  alt="Logo PROLIMAC SRL"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="flex flex-col">
                <span className="text-lg font-extrabold tracking-[-0.04em]">PROLIMAC</span>
                <span className="prolimal-display text-sm italic text-prolimal-teal-300">
                  limpieza que respira
                </span>
              </span>
            </div>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-prolimal-sand-100/70">
              Venta de productos de limpieza para el hogar, oficinas y empresas. Calidad y confianza desde
              Cochabamba, Bolivia.
            </p>
          </div>

          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.22em] text-prolimal-teal-300">
              Productos
            </h2>
            <div className="mt-4 space-y-2.5">
              {enlacesProductos.map((enlace) => (
                <Link
                  key={enlace.label}
                  href={enlace.href}
                  className="block text-sm font-medium text-prolimal-sand-100/70 transition-colors hover:text-prolimal-sand-50"
                >
                  {enlace.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.22em] text-prolimal-teal-300">
              Contacto
            </h2>
            <div className="mt-4 space-y-3 text-sm text-prolimal-sand-100/70">
              <a
                href={`https://wa.me/${WHATSAPP_NUMERO}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition-colors hover:text-prolimal-sand-50"
              >
                <MessageCircle className="h-4 w-4 text-prolimal-teal-300" />
                +591 700 00000
              </a>
              <a
                href="mailto:contacto@prolimac.com"
                className="flex items-center gap-2 transition-colors hover:text-prolimal-sand-50"
              >
                <Mail className="h-4 w-4 text-prolimal-teal-300" />
                contacto@prolimac.com
              </a>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-prolimal-teal-300" />
                Cochabamba, Bolivia
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 pt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-prolimal-sand-100/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {anio} PROLIMAC SRL</p>
          <p>Todos los derechos reservados</p>
        </div>
      </div>
    </footer>
  );
}
