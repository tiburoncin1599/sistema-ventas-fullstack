import { API_URL } from './api';

interface SseOptions {
  onData: (data: unknown) => void;
  onError?: () => void;
}

interface EventoSseNormalizado {
  type: string;
  data?: unknown;
}

export function conectarSSE(path: string, { onData, onError }: SseOptions) {
  let cerrado = false;
  let intentos = 0;
  const maxIntentos = 50;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const controller = new AbortController();

  // Normaliza el frame SSE: usa el nombre del evento (`event:`) y envuelve el payload
  function procesarParte(parte: string) {
    const lineas = parte.split('\n');
    const nombreEvento =
      lineas.find((l) => l.startsWith('event:'))?.slice(6).trim() || null;
    const lineaData = lineas.find((l) => l.startsWith('data:'));
    if (!lineaData) return;

    let payload: unknown;
    try {
      const raw = lineaData.slice(5).trim();
      // Heartbeats llegan sin payload: solo importa el nombre del evento
      payload = raw ? JSON.parse(raw) : undefined;
    } catch {
      return;
    }

    let evento: EventoSseNormalizado;
    if (
      payload &&
      typeof payload === 'object' &&
      ('tipo' in payload || 'type' in payload) &&
      'data' in payload
    ) {
      // El backend ya envía el wrapper completo dentro de data
      const p = payload as { tipo?: string; type?: string; data?: unknown };
      evento = { type: p.tipo || p.type || nombreEvento || 'message', data: p.data };
    } else {
      evento = { type: nombreEvento || 'message', data: payload };
    }
    onData(evento);
  }

  const conectar = async () => {
    if (cerrado) return;

    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_URL}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error('SSE no disponible');

      intentos = 0;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const partes = buffer.split('\n\n');
          buffer = partes.pop() || '';
          for (const parte of partes) {
            procesarParte(parte);
          }
        }
      } finally {
        reader.cancel().catch(() => {});
      }

      throw new Error('Conexión finalizada');
    } catch {
      if (controller.signal.aborted || cerrado) return;
      if (intentos < maxIntentos) {
        intentos += 1;
        timer = setTimeout(conectar, Math.min(1000 * 2 ** intentos, 30000));
      } else {
        onError?.();
      }
    }
  };

  conectar();

  return () => {
    cerrado = true;
    controller.abort();
    if (timer) clearTimeout(timer);
  };
}
