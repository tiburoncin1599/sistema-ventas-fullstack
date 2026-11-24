'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type MapaInterno = L.Map & { _mapPane?: HTMLElement | null };

const panByOriginal = (L.Map.prototype as unknown as {
  panBy: (offset: L.PointExpression, options?: L.PanOptions) => L.Map;
}).panBy;

(L.Map.prototype as unknown as {
  panBy: (offset: L.PointExpression, options?: L.PanOptions) => L.Map;
}).panBy = function (this: L.Map, offset, options) {
  if (!(this as MapaInterno)._mapPane) return this;
  return panByOriginal.call(this, offset, options);
};

(L.Map.prototype as unknown as { _onPanTransitionEnd: (this: L.Map) => void })._onPanTransitionEnd =
  function (this: L.Map) {
    const m = this as MapaInterno;
    if (m._mapPane) {
      m._mapPane.classList.remove('leaflet-pan-anim');
      this.fire('moveend');
    }
  };

type EstadoGps = 'inactivo' | 'obteniendo' | 'listo' | 'error';

export interface PuntoGps {
  latitud: number;
  longitud: number;
  precision: number | null;
}

interface Props {
  gps: PuntoGps | null;
  onChange: (g: PuntoGps | null) => void;
  invalido?: boolean;
}

export default function MapaCliente({ gps, onChange, invalido = false }: Props) {
  const [estadoGps, setEstadoGps] = useState<EstadoGps>('inactivo');
  const [errorGps, setErrorGps] = useState('');
  const [busquedaMapa, setBusquedaMapa] = useState('');
  const [resultadosMapa, setResultadosMapa] = useState<
    { lat: number; lon: number; nombre: string }[]
  >([]);
  const [buscandoMapa, setBuscandoMapa] = useState(false);

  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const marcadorRef = useRef<L.Marker | null>(null);
  const timerBusquedaRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerInvalidarRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ubicarMarcador = (latitud: number, longitud: number) => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    if (marcadorRef.current) {
      marcadorRef.current.setLatLng([latitud, longitud]);
      return;
    }
    const icono = L.divIcon({
      html: '<div style="width:26px;height:26px;border-radius:50%;background:#1A3C6E;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);"></div>',
      className: '',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
    const marcador = L.marker([latitud, longitud], {
      icon: icono,
      draggable: true,
      autoPan: false,
    }).addTo(mapa);
    marcador.on('dragend', () => {
      const ll = marcador.getLatLng();
      cambiar(ll.lat, ll.lng, null);
    });
    marcadorRef.current = marcador;
  };

  const cambiar = (latitud: number, longitud: number, precision: number | null) => {
    setErrorGps('');
    setEstadoGps('listo');
    onChange({ latitud, longitud, precision });
    ubicarMarcador(latitud, longitud);
  };

  const buscarLugar = async (q: string) => {
    if (!q.trim()) return setResultadosMapa([]);
    setBuscandoMapa(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`,
      );
      const datos = await res.json();
      setResultadosMapa(
        (Array.isArray(datos) ? datos : []).map(
          (d: { lat: string; lon: string; display_name: string }) => ({
            lat: parseFloat(d.lat),
            lon: parseFloat(d.lon),
            nombre: d.display_name,
          }),
        ),
      );
    } catch {
      setResultadosMapa([]);
    } finally {
      setBuscandoMapa(false);
    }
  };

  const obtenerGps = () => {
    if (!('geolocation' in navigator)) {
      setEstadoGps('error');
      setErrorGps('Tu navegador no soporta geolocalización.');
      return;
    }
    setEstadoGps('obteniendo');
    setErrorGps('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        cambiar(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy ?? null);
      },
      err => {
        setEstadoGps('error');
        const mensajes: Record<number, string> = {
          1: 'Permiso de ubicación denegado. Habilitalo en el navegador.',
          2: 'No se pudo obtener la ubicación. Verificá que el GPS esté activo.',
          3: 'Tiempo de espera agotado al obtener el GPS. Intentá de nuevo.',
        };
        setErrorGps(mensajes[err.code] || 'Error al obtener la ubicación.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const setGpsInput = (valor: string) => {
    setBusquedaMapa(valor);
    if (timerBusquedaRef.current) clearTimeout(timerBusquedaRef.current);
    timerBusquedaRef.current = setTimeout(() => buscarLugar(valor), 500);
  };

  const limpiar = () => {
    const mapa = mapaRef.current;
    if (mapa && marcadorRef.current) {
      mapa.removeLayer(marcadorRef.current);
      marcadorRef.current = null;
    }
    setErrorGps('');
    setEstadoGps('inactivo');
    setGpsInput('');
    onChange(null);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const contenedor = contenedorRef.current;
    if (!contenedor || mapaRef.current) return;

    const mapa = L.map(contenedor, {
      center: [-17.7833, -63.1821],
      zoom: 13,
      worldCopyJump: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(mapa);
    mapa.on('click', (e: L.LeafletMouseEvent) => {
      const ll = e.latlng;
      cambiar(ll.lat, ll.lng, null);
    });
    mapaRef.current = mapa;
    timerInvalidarRef.current = setTimeout(() => {
      if (mapaRef.current === mapa) mapa.invalidateSize();
    }, 50);

    if (gps) {
      ubicarMarcador(gps.latitud, gps.longitud);
      mapa.setView([gps.latitud, gps.longitud], gps.precision != null ? 17 : 16);
    }

    return () => {
      if (timerInvalidarRef.current) clearTimeout(timerInvalidarRef.current);
      timerInvalidarRef.current = null;
      if (timerBusquedaRef.current) clearTimeout(timerBusquedaRef.current);
      timerBusquedaRef.current = null;
      const mapaActual = mapaRef.current;
      mapaRef.current = null;
      marcadorRef.current = null;
      if (mapaActual) {
        try {
          mapaActual.stop();
        } catch {
          /* noop */
        }
        try {
          mapaActual.remove();
        } catch {
          /* noop */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!gps || !mapaRef.current) return;
    ubicarMarcador(gps.latitud, gps.longitud);
    mapaRef.current.setView([gps.latitud, gps.longitud], gps.precision != null ? 17 : 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gps]);

  return (
    <div className={`border rounded-xl p-4 ${
      invalido
        ? 'border-prolimal-red-500 bg-prolimal-red-50/40 dark:border-prolimal-red-400/70 dark:bg-prolimal-red-900/15'
        : 'dark:border-prolimal-border/50'
    }`}>
      <p className={`text-sm font-medium mb-3 ${invalido ? 'text-prolimal-red-700 dark:text-prolimal-red-300' : 'dark:text-prolimal-light'}`}>
        Ubicación del cliente *
      </p>

      <input
        type="text"
        placeholder="🔎 Buscar lugar o dirección en el mapa..."
        value={busquedaMapa}
        onChange={e => setGpsInput(e.target.value)}
        className="w-full border dark:border-prolimal-border/50 rounded-xl px-4 py-3 text-sm bg-white dark:bg-prolimal-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prolimal-primary/50"
      />
      {buscandoMapa && (
        <p className="text-xs text-prolimal-muted/80 mb-1">Buscando...</p>
      )}
      {resultadosMapa.length > 0 && (
        <ul className="border dark:border-prolimal-border/50 rounded-xl mb-2 max-h-36 overflow-y-auto divide-y dark:divide-prolimal-border/50 text-sm">
          {resultadosMapa.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  cambiar(r.lat, r.lon, null);
                  setBusquedaMapa(r.nombre);
                  setResultadosMapa([]);
                }}
                className="w-full text-left px-3 py-2 hover:bg-prolimal-primary/10 dark:hover:bg-prolimal-primary/20 text-prolimal-light truncate"
              >
                📍 {r.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        ref={contenedorRef}
        className="h-64 w-full rounded-xl z-0 border dark:border-prolimal-border/50 mb-3"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={obtenerGps}
          className="flex-1 bg-prolimal-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-prolimal-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prolimal-primary/50"
        >
          📡 Usar mi ubicación actual
        </button>
        {gps && (
          <button
            type="button"
            onClick={limpiar}
            className="border dark:border-prolimal-border/50 px-4 py-2.5 rounded-xl text-sm text-prolimal-muted/70 dark:text-prolimal-light"
          >
            Limpiar
          </button>
        )}
      </div>

      {estadoGps === 'obteniendo' && (
        <p className="text-sm text-prolimal-primary/80 dark:text-prolimal-primary/90 animate-pulse mt-2">
          🛰️ Obteniendo tu ubicación GPS...
        </p>
      )}
      {estadoGps === 'error' && <p className="text-prolimal-red-600 text-xs mt-2">{errorGps}</p>}
      {gps && (
        <div className="mt-2 text-sm space-y-1">
          <p className="text-prolimal-green-600 dark:text-prolimal-green-400 font-medium">✅ Ubicación seleccionada</p>
          <p className="text-prolimal-muted/60 dark:text-prolimal-muted/40 font-mono text-xs">
            lat: {gps.latitud.toFixed(6)} · lng: {gps.longitud.toFixed(6)}
          </p>
          {gps.precision != null && (
            <p className="text-prolimal-muted/50 text-xs">Precisión: ±{Math.round(gps.precision)} m</p>
          )}
          <p className="text-prolimal-muted/40 dark:text-prolimal-muted/50">
            Buscá un lugar, hacé clic en el mapa o arrastrá el pin para ajustar el punto exacto.
          </p>
        </div>
      )}
    </div>
  );
}