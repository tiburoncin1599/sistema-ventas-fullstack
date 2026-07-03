'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { api, API_URL } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  imagen_url: string;
}

export default function Home() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [error, setError] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    api.get('/productos')
      .then(res => setProductos((res.data || []).slice(0, 8)))
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || productos.length === 0) return;

    let animationId: number;
    let startTime: number | null = null;
    const duration = 40000;
    const totalWidth = track.scrollWidth / 2;

    function step(timestamp: number) {
      if (!pausedRef.current) {
        if (startTime === null) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = (elapsed % duration) / duration;
        track!.style.transform = `translateX(-${progress * totalWidth}px)`;
      } else {
        startTime = null;
      }
      animationId = requestAnimationFrame(step);
    }

    animationId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationId);
  }, [productos]);

  return (
    <main className="dark:bg-gray-900 dark:text-gray-100 min-h-screen">
      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-[#005a24] via-[#008f39] to-[#00b84c] text-white">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-20 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
              Productos de limpieza para tu hogar
            </h1>
            <p className="text-base md:text-lg text-white/90 mb-8 max-w-lg font-medium">
              La mejor calidad en lavandinas, desinfectantes, limpia vidrios y más. Precios directos de fábrica.
            </p>
            <div className="flex gap-3 justify-center md:justify-start">
              <Link href="/productos"
                className="bg-[#ffd600] text-[#005a24] px-8 py-3.5 rounded-full font-bold hover:bg-yellow-400 transition-colors shadow-lg">
                Ver catálogo
              </Link>
              <Link href="/auth"
                className="bg-white/20 text-white px-8 py-3.5 rounded-full font-medium hover:bg-white/30 transition-colors border border-white/30">
                Registrarse
              </Link>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <img src="/logo.png" alt="Logo" className="w-52 h-52 rounded-2xl shadow-2xl object-contain bg-gray-100" />
          </div>
        </div>
      </section>

      {/* Productos destacados */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-[#005a24] dark:text-green-400">Productos destacados</h2>
          <Link href="/productos" className="text-[#008f39] font-medium hover:underline text-sm">
            Ver todos →
          </Link>
        </div>

        {error ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-5xl mb-4">🧴</p>
            <p>No se pudieron cargar los productos. Verificá que el servidor esté corriendo.</p>
          </div>
        ) : productos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-5xl mb-4">🧴</p>
            <p>Cargando productos...</p>
          </div>
        ) : (
          <div style={{ overflow: 'hidden', maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}>
            <div ref={trackRef} style={{ display: 'flex', gap: '1rem', width: 'max-content', willChange: 'transform' }}
              onMouseEnter={() => { pausedRef.current = true; }}
              onMouseLeave={() => { pausedRef.current = false; }}>
              {[...productos, ...productos].map((p, i) => (
                <Link key={`${p.id}-${i}`} href={`/productos/${p.id}`}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow group min-w-[180px] md:min-w-[220px] w-[180px] md:w-[220px] flex-shrink-0">
                  <div className="aspect-square bg-gray-50 dark:bg-gray-700 flex items-center justify-center p-4">
                    {p.imagen_url
                      ? <img src={`${API_URL}${p.imagen_url}`} alt={p.nombre}
                          className="object-contain w-full h-full group-hover:scale-105 transition-transform"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class=text-5xl>🧴</span>'; }} />
                      : <span className="text-5xl">🧴</span>
                    }
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-800 dark:text-gray-200 font-medium line-clamp-2 mb-2">{p.nombre}</p>
                    <p className="text-xl font-bold text-[#005a24] dark:text-green-400">{formatCurrency(p.precio)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Ubicación */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <h2 className="text-2xl font-bold text-[#005a24] dark:text-green-400 mb-8 text-center">Encuéntranos</h2>
        <div className="rounded-2xl overflow-hidden shadow-lg border dark:border-gray-700">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3899.7317999999997!2d-66.1568!3d-17.3934!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTfCsDIzJzM2LjIiUyA2NsKwMDknMjQuNSJX!5e0!3m2!1ses!2sbo!4v1"
            width="100%"
            height="350"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Ubicación de la empresa"
          />
        </div>
        <p className="text-center text-gray-500 dark:text-gray-400 mt-3 text-sm">
          Cochabamba, Bolivia
        </p>
      </section>

      {/* Footer */}
      <footer className="bg-[#005a24] text-gray-100 text-sm">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-lg mb-3 bg-white p-1" />
              <p className="text-gray-200">Venta de productos de limpieza para el hogar. Calidad y confianza.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3">Productos</h4>
              <div className="space-y-2">
                <Link href="/productos" className="block text-gray-200 hover:text-white">Catálogo completo</Link>
                <Link href="/productos" className="block text-gray-200 hover:text-white">Lavandinas</Link>
                <Link href="/productos" className="block text-gray-200 hover:text-white">Limpia pisos</Link>
                <Link href="/productos" className="block text-gray-200 hover:text-white">Limpia vidrios</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3">Contacto</h4>
              <div className="space-y-2 text-gray-200">
                <p>WhatsApp: +591 700 00000</p>
                <p>contacto@limpiezahogar.com</p>
              </div>
              <div className="flex gap-3 mt-4">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                  title="Facebook">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="https://wa.me/59170000000" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                  title="WhatsApp">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                  title="TikTok">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-green-700 pt-6 text-center text-xs text-gray-300">
            © 2026 — Todos los derechos reservados — PROLIMAC SRL.
          </div>
        </div>
      </footer>
    </main>
  );
}
