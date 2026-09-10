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
}

export default function MapaCliente({ gps, onChange }: Props) {
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
      html: '<div style="width:26px;height:26px;border-radius:50%;background:#005a24;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);"></div>',
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
    <div className="border dark:border-gray-600 rounded-xl p-4">
      <p className="text-sm font-medium mb-3 dark:text-white">Ubicación del cliente *</p>

      <input
        type="text"
        placeholder="🔎 Buscar lugar o dirección en el mapa..."
        value={busquedaMapa}
        onChange={e => setGpsInput(e.target.value)}
        className="w-full border dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 dark:text-white mb-2"
      />
      {buscandoMapa && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Buscando...</p>
      )}
      {resultadosMapa.length > 0 && (
        <ul className="border dark:border-gray-600 rounded-xl mb-2 max-h-36 overflow-y-auto divide-y dark:divide-gray-700 text-sm">
          {resultadosMapa.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  cambiar(r.lat, r.lon, null);
                  setBusquedaMapa(r.nombre);
                  setResultadosMapa([]);
                }}
                className="w-full text-left px-3 py-2 hover:bg-green-50 dark:hover:bg-green-900/30 dark:text-white truncate"
              >
                📍 {r.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        ref={contenedorRef}
        className="h-64 w-full rounded-xl z-0 border dark:border-gray-600 mb-3"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={obtenerGps}
          className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700"
        >
          📡 Usar mi ubicación actual
        </button>
        {gps && (
          <button
            type="button"
            onClick={limpiar}
            className="border dark:border-gray-600 px-4 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300"
          >
            Limpiar
          </button>
        )}
      </div>

      {estadoGps === 'obteniendo' && (
        <p className="text-sm text-yellow-600 dark:text-yellow-400 animate-pulse mt-2">
          🛰️ Obteniendo tu ubicación GPS...
        </p>
      )}
      {estadoGps === 'error' && <p className="text-red-500 text-xs mt-2">{errorGps}</p>}
      {gps && (
        <div className="mt-2 text-sm space-y-1">
          <p className="text-green-600 dark:text-green-400 font-medium">✅ Ubicación seleccionada</p>
          <p className="text-gray-600 dark:text-gray-300 font-mono text-xs">
            lat: {gps.latitud.toFixed(6)} · lng: {gps.longitud.toFixed(6)}
          </p>
          {gps.precision != null && (
            <p className="text-gray-400 text-xs">Precisión: ±{Math.round(gps.precision)} m</p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Buscá un lugar, hacé clic en el mapa o arrastrá el pin para ajustar el punto exacto.
          </p>
        </div>
      )}
    </div>
  );
}