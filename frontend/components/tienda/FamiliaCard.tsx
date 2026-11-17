import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

interface FamiliaCardProps {
  nombre: string;
  imagen: string;
  indice: number;
}

const tonos = [
  {
    fondo: 'bg-prolimal-teal-100 dark:bg-prolimal-teal-900/35',
    halo: 'bg-prolimal-teal-300/55 dark:bg-prolimal-teal-500/20',
    texto: 'text-prolimal-teal-900 dark:text-prolimal-teal-100',
    numero: 'text-prolimal-teal-700/55 dark:text-prolimal-teal-300/60',
  },
  {
    fondo: 'bg-prolimal-coral-100 dark:bg-prolimal-coral-900/30',
    halo: 'bg-prolimal-coral-300/60 dark:bg-prolimal-coral-500/20',
    texto: 'text-prolimal-coral-900 dark:text-prolimal-coral-100',
    numero: 'text-prolimal-coral-700/55 dark:text-prolimal-coral-300/60',
  },
  {
    fondo: 'bg-prolimal-sand-200 dark:bg-prolimal-sand-800/30',
    halo: 'bg-prolimal-sand-400/50 dark:bg-prolimal-sand-600/20',
    texto: 'text-prolimal-sand-900 dark:text-prolimal-sand-100',
    numero: 'text-prolimal-sand-700/55 dark:text-prolimal-sand-300/60',
  },
  {
    fondo: 'bg-prolimal-blue-100 dark:bg-prolimal-blue-900/35',
    halo: 'bg-prolimal-blue-300/55 dark:bg-prolimal-blue-500/20',
    texto: 'text-prolimal-blue-900 dark:text-prolimal-blue-100',
    numero: 'text-prolimal-blue-700/55 dark:text-prolimal-blue-300/60',
  },
];

export default function FamiliaCard({ nombre, imagen, indice }: FamiliaCardProps) {
  const tono = tonos[(indice - 1) % tonos.length];

  return (
    <Link
      href="/productos"
      aria-label={`Ver catálogo: ${nombre}`}
      className={`group relative flex min-h-[23rem] flex-col overflow-hidden rounded-[2.25rem] border border-prolimal-ink-900/10 p-6 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_34px_80px_-46px_rgba(11,37,32,0.5)] dark:border-prolimal-sand-100/10 ${tono.fondo}`}
    >
      <span className={`absolute -right-10 top-6 h-40 w-40 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-125 ${tono.halo}`} />

      <div className="relative flex items-start justify-between">
        <span className={`text-[10px] font-bold uppercase tracking-[0.22em] ${tono.numero}`}>
          {String(indice).padStart(2, '0')}
        </span>
        <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/55 backdrop-blur transition-all duration-300 group-hover:bg-white/90 dark:bg-white/10 dark:group-hover:bg-white/20 ${tono.texto}`}>
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
        </span>
      </div>

      <div className="relative my-3 flex flex-1 items-center justify-center">
        <img
          src={imagen}
          alt={nombre}
          loading="lazy"
          decoding="async"
          className="h-48 w-full object-contain drop-shadow-[0_30px_24px_rgba(11,37,32,0.15)] transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-2"
        />
      </div>

      <div className="relative">
        <h3 className={`prolimal-display text-[2rem] leading-none tracking-[-0.035em] ${tono.texto}`}>
          {nombre}
        </h3>
        <p className={`mt-2 text-[11px] font-bold uppercase tracking-[0.18em] ${tono.numero}`}>
          Ver productos
        </p>
      </div>
    </Link>
  );
}
