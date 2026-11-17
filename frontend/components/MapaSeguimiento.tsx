'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '@/lib/api';
import { conectarSSE } from '@/lib/sse';

const UMBRAL_INACTIVO_MS = 5 * 60 * 1000;

interface VendedorUbicacion {
  usuario_id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  iniciado_en: string | null;
  ultima_actualizacion_en: string | null;
  latitud: number | null;
  longitud: number | null;
  precision?: number | null;
}

interface EventoSSE {
  type?: string;
  data?: Partial<VendedorUbicacion> & {
    activo?: boolean;
    usuario_id?: number;
  };
}

function escaparHTML(texto: string): string {
  const mapa: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return texto.replace(/[&<>"']/g, (c) => mapa[c]);
}

function obtenerUsuario(): { nombre: string; rol: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const u = localStorage.getItem('usuario');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

function hace(iso: string | null): string {
  if (!iso) return 'Sin datos';
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 0) return 'ahora';
    const min = Math.floor(ms / 60000);
    if (min < 1) return 'hace <1 min';
    if (min < 60) return `hace ${min} min`;
    const horas = Math.floor(min / 60);
    return `hace ${horas} h ${min % 60} min`;
  } catch {
    return '—';
  }
}

function estadoVendedor(v: VendedorUbicacion): 'activo' | 'sin_señal' {
  if (!v.ultima_actualizacion_en) return 'sin_señal';
  const ms = Date.now() - new Date(v.ultima_actualizacion_en).getTime();
  return ms <= UMBRAL_INACTIVO_MS ? 'activo' : 'sin_señal';
}

function iconoVendedor(v: VendedorUbicacion): L.DivIcon {
  const estado = estadoVendedor(v);
  const color = estado === 'activo' ? '#1A3C6E' : '#DC2626';
  const inicial = escaparHTML((v.nombre || 'V').charAt(0).toUpperCase());
  const html = [
    '<div style="width:34px;height:34px;border-radius:50%;background:',
    color,
    ';display:flex;align-items:center;justify-content:center;',
    'box-shadow:0 2px 6px rgba(0,0,0,0.3);">',
    '<span style="color:#fff;font-weight:700;font-size:15px;font-family:sans-serif;">',
    inicial,
    '</span></div>',
  ].join('');
  return L.divIcon({
    html,
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  });
}

function popupVendedor(v: VendedorUbicacion): string {
  const estado = estadoVendedor(v);
  const etiqueta = estado === 'activo' ? 'Activo' : 'Sin señal reciente';
  const color = estado === 'activo' ? '#1A3C6E' : '#DC2626';
  const nombre = escaparHTML(v.nombre);
  const email = escaparHTML(v.email || '');
  const precisionHtml = v.precision
    ? '<p style="margin:2px 0 0;font-size:12px;color:#777;">Precisión: ' + Math.round(v.precision) + ' m</p>'
    : '';
  return (
    '<div style="font-family:sans-serif;min-width:200px;">' +
    '<p style="margin:0 0 4px;font-weight:700;font-size:15px;color:#111;">' + nombre + '</p>' +
    '<p style="margin:0 0 6px;font-size:12px;color:#555;">' + email + '</p>' +
    '<p style="margin:0 0 4px;font-size:13px;">' +
    '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + color + ';margin-right:6px;"></span>' +
    '<b style="color:' + color + ';">' + etiqueta + '</b></p>' +
    '<p style="margin:0;font-size:12px;color:#777;">Última actualización: ' + hace(v.ultima_actualizacion_en) + '</p>' +
    precisionHtml +
    '</div>'
  );
}

export default function MapaSeguimiento() {
  const [usuario] = useState<{ nombre: string; rol: string } | null>(obtenerUsuario);
  const [vendedores, setVendedores] = useState<VendedorUbicacion[]>([]);
  const [conectado, setConectado] = useState<'conectando' | 'en_vivo' | 'desconectado'>('conectando');
  const [cargando, setCargando] = useState(true);

  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const marcadoresRef = useRef<Map<number, L.Marker>>(new Map());
  const vendedoresRef = useRef<VendedorUbicacion[]>([]);

  const syncMarcadores = useCallback((lista: VendedorUbicacion[]) => {
    const mapa = mapaRef.current;
    if (!mapa) return;

    const vigentes = new Set<number>();

    for (const v of lista) {
      if (v.latitud == null || v.longitud == null) continue;
      vigentes.add(v.usuario_id);

      const existente = marcadoresRef.current.get(v.usuario_id);
      if (existente) {
        existente.setLatLng([v.latitud, v.longitud]);
        existente.setIcon(iconoVendedor(v));
        existente.bindPopup(popupVendedor(v));
      } else {
        const marcador = L.marker([v.latitud, v.longitud], {
          icon: iconoVendedor(v),
        }).addTo(mapa);
        marcador.bindPopup(popupVendedor(v));
        marcadoresRef.current.set(v.usuario_id, marcador);
      }
    }

    for (const [id, marcador] of marcadoresRef.current) {
      if (!vigentes.has(id)) {
        mapa.removeLayer(marcador);
        marcadoresRef.current.delete(id);
      }
    }
  }, []);

  const manejarEvento = useCallback((evt: unknown) => {
    const evento = evt as EventoSSE;
    if (evento.type === 'heartbeat') {
      setConectado('en_vivo');
      return;
    }
    if (evento.type === 'ubicacion' && evento.data) {
      const v = evento.data as VendedorUbicacion;
      setVendedores((prev) => {
        const idx = prev.findIndex((p) => p.usuario_id === v.usuario_id);
        if (idx === -1) return [...prev, v];
        const next = [...prev];
        next[idx] = v;
        return next;
      });
      return;
    }
    if (evento.type === 'tracking' && evento.data) {
      if (evento.data.activo === false && evento.data.usuario_id != null) {
        const id = evento.data.usuario_id;
        setVendedores((prev) => prev.filter((p) => p.usuario_id !== id));
        return;
      }
      const v = evento.data as VendedorUbicacion;
      if (v.latitud != null) {
        setVendedores((prev) => {
          const idx = prev.findIndex((p) => p.usuario_id === v.usuario_id);
          if (idx === -1) return [...prev, v];
          const next = [...prev];
          next[idx] = v;
          return next;
        });
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !contenedorRef.current) return;
    if (mapaRef.current) return;

    const marcadores = marcadoresRef.current;

    const mapa = L.map(contenedorRef.current, {
      center: [-17.7833, -63.1821],
      zoom: 13,
      worldCopyJump: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(mapa);
    mapaRef.current = mapa;

    return () => {
      mapa.remove();
      mapaRef.current = null;
      marcadores.clear();
    };
  }, []);

  useEffect(() => {
    vendedoresRef.current = vendedores;
  }, [vendedores]);

  useEffect(() => {
    if (!usuario || !['admin', 'inventario'].includes(usuario.rol)) {
      return;
    }

    api
      .get('/ubicaciones/vendedores')
      .then((res) => {
        setVendedores(res.data || []);
        setCargando(false);
      })
      .catch(() => setCargando(false));

    const desconectar = conectarSSE('/ubicaciones/stream', {
      onData: manejarEvento,
      onError: () => setConectado('desconectado'),
    });

    return () => desconectar();
  }, [usuario, manejarEvento]);

  useEffect(() => {
    const tick = setInterval(() => {
      if (mapaRef.current) {
        syncMarcadores(vendedoresRef.current);
      }
    }, 30000);
    return () => clearInterval(tick);
  }, [syncMarcadores]);

  useEffect(() => {
    if (!cargando && mapaRef.current) {
      syncMarcadores(vendedores);
    }
  }, [vendedores, cargando, syncMarcadores]);

  function centrarEn(v: VendedorUbicacion) {
    const mapa = mapaRef.current;
    if (!mapa || v.latitud == null || v.longitud == null) return;
    mapa.setView([v.latitud, v.longitud], 16);
    const marcador = marcadoresRef.current.get(v.usuario_id);
    if (marcador) marcador.openPopup();
  }

  if (!usuario) {
    return <p className="text-center py-20 text-prolimal-muted/80 dark:text-prolimal-muted/60">Cargando panel...</p>;
  }

  if (!['admin', 'inventario'].includes(usuario.rol)) {
    return (
      <main className="max-w-6xl mx-auto px-8 py-20 text-center">
        <h1 className="text-3xl font-bold mb-4 dark:text-prolimal-light">Acceso restringido</h1>
        <p className="text-prolimal-muted/60 dark:text-prolimal-muted/40">
          El seguimiento en tiempo real está disponible solo para Administrador e Inventario.
        </p>
      </main>
    );
  }

  const estadosConexion = {
    conectando: {
      texto: 'Conectando…',
      clases: 'bg-prolimal-primary/10 dark:bg-prolimal-primary/20 text-prolimal-primary/70 dark:text-prolimal-primary/90',
      dot: 'bg-prolimal-primary-500',
    },
    en_vivo: {
      texto: 'En vivo',
      clases: 'bg-prolimal-green-100 dark:bg-prolimal-green-900/40 text-prolimal-green-700 dark:text-prolimal-green-300',
      dot: 'bg-prolimal-green-500',
    },
    desconectado: {
      texto: 'Desconectado',
      clases: 'bg-prolimal-red-100 dark:bg-prolimal-red-900/40 text-prolimal-red-700 dark:text-prolimal-red-300',
      dot: 'bg-prolimal-red-500',
    },
  };
  const estadoConexion = estadosConexion[conectado];

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 dark:text-prolimal-light">
            Seguimiento en Tiempo Real
          </h1>
          <p className="text-prolimal-muted/60 dark:text-prolimal-muted/40 mt-1">
            Última posición de los vendedores con jornada activa
          </p>
        </div>
        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${estadoConexion.clases}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${estadoConexion.dot}`} />
          {estadoConexion.texto}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="bg-prolimal-card dark:bg-prolimal-card-dark border dark:border-prolimal-border/50 rounded-2xl overflow-hidden max-h-[280px] lg:max-h-[75vh] flex flex-col">
          <div className="px-4 py-3 bg-prolimal-card/50 dark:bg-prolimal-card/50 border-b dark:border-prolimal-border/50 flex items-center justify-between">
            <span className="font-bold text-sm dark:text-prolimal-light">Vendedores</span>
            <span className="text-xs text-prolimal-muted/60 dark:text-prolimal-muted/40">
              {vendedores.length} activo{vendedores.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="overflow-y-auto flex-1 divide-y dark:divide-prolimal-border/50">
            {cargando ? (
              <p className="px-4 py-8 text-sm text-prolimal-muted/60 dark:text-prolimal-muted/40 text-center">
                Cargando vendedores...
              </p>
            ) : vendedores.length === 0 ? (
              <p className="px-4 py-8 text-sm text-prolimal-muted/60 dark:text-prolimal-muted/40 text-center">
                No hay vendedores compartiendo ubicación.
              </p>
            ) : (
              vendedores.map((v) => {
                const estado = estadoVendedor(v);
                const tienePosicion = v.latitud != null && v.longitud != null;
                return (
                  <button
                    key={v.usuario_id}
                    onClick={() => centrarEn(v)}
                    disabled={!tienePosicion}
                    className="w-full text-left px-4 py-3 hover:bg-prolimal-card/30 dark:hover:bg-prolimal-card/50 transition-colors disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm dark:text-prolimal-light truncate">
                        {v.nombre}
                      </span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ml-2 ${
                          estado === 'activo' ? 'bg-prolimal-green-500' : 'bg-prolimal-red-500'
                        }`}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-xs text-prolimal-muted/60 dark:text-prolimal-muted/40">
                        {tienePosicion ? `Actualizado ${hace(v.ultima_actualizacion_en)}` : 'Sin posición aún'}
                      </span>
                      {estado === 'sin_señal' && tienePosicion && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-prolimal-red-100 dark:bg-prolimal-red-900/40 text-prolimal-red-700 dark:text-prolimal-red-300 shrink-0">
                          Sin señal
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="lg:col-span-3">
          <div
            ref={contenedorRef}
            className="h-[55vh] lg:h-[75vh] w-full rounded-2xl border dark:border-prolimal-border/50 z-0"
          />
          <p className="mt-3 text-xs text-prolimal-muted/60 dark:text-prolimal-muted/40">
            Un vendedor desaparece del mapa al detener el compartido de ubicación (fin de jornada).
            Los vendedores con más de 5 minutos sin actualizar se marcan en rojo.
          </p>
        </div>
      </div>
    </main>
  );
}