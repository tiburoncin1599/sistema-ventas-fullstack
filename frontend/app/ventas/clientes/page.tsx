'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { useValidacionFormulario } from '@/lib/hooks/use-validacion-formulario';
import {
  email,
  longitudMaxima,
  longitudMinima,
  mensajeGeneral,
  numero,
  primero,
  requerido,
  type ErroresFormulario,
} from '@/lib/validacion';
import { AvisoErrorFormulario, CampoError, claseCampo } from '@/components/ui/CampoError';
import { MapPin, Phone, Plus, Search, X } from 'lucide-react';

const MapaCliente = dynamic(() => import('@/components/MapaCliente'), {
  ssr: false,
  loading: () => (
    <p className="text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">Cargando mapa...</p>
  ),
});

interface Cliente {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;
  ubicacion?: string;
  activo: boolean;
}

interface Pedido {
  id: number;
  estado: string;
  total: number;
  usuario?: { nombre?: string };
}

const DIAS = [
  { valor: 'lunes', etiqueta: 'Lun' },
  { valor: 'martes', etiqueta: 'Mar' },
  { valor: 'miercoles', etiqueta: 'Mié' },
  { valor: 'jueves', etiqueta: 'Jue' },
  { valor: 'viernes', etiqueta: 'Vie' },
  { valor: 'sabado', etiqueta: 'Sáb' },
  { valor: 'domingo', etiqueta: 'Dom' },
];

interface PuntoGps {
  latitud: number;
  longitud: number;
  precision: number | null;
}

interface FormVisita {
  nombre: string;
  email: string;
  telefono: string;
  ubicacion: string;
  latitud: number | null;
  longitud: number | null;
  diasVisita: string[];
}

const FORM_INICIAL: FormVisita = {
  nombre: '',
  email: '',
  telefono: '',
  ubicacion: '',
  latitud: null,
  longitud: null,
  diasVisita: [],
};

const CAMPOS_VISITA: Array<keyof FormVisita | '_general'> = [
  'nombre',
  'email',
  'telefono',
  'ubicacion',
  'latitud',
  'longitud',
  'diasVisita',
  '_general',
];
const ALIAS_VISITA = {
  nombrecliente: 'nombre',
  'nombre cliente': 'nombre',
  nombre: 'nombre',
  'correo electrónico': 'email',
  correo: 'email',
  email: 'email',
  telefono: 'telefono',
  'teléfono': 'telefono',
  ubicacion: 'ubicacion',
  'ubicación': 'ubicacion',
  latitud: 'latitud',
  longitud: 'longitud',
  diasvisita: 'diasVisita',
  'días de visita': 'diasVisita',
  dias: 'diasVisita',
} as const;

const CORREO_DUPLICADO = /ya está registrado|already (registered|exists)/i;

/** Espejo de `CrearClienteVisitaDto` + nombre requerido del `CrearClienteDto`. */
function validarVisita(form: FormVisita): ErroresFormulario<FormVisita> {
  const errores: ErroresFormulario<FormVisita> = {};

  const nombre = primero(
    requerido(form.nombre, 'Ingresá el nombre del cliente'),
    longitudMinima(form.nombre, 2, 'El nombre debe tener al menos 2 caracteres'),
    longitudMaxima(form.nombre, 150, 'El nombre no puede superar los 150 caracteres'),
  );
  if (nombre) errores.nombre = nombre;

  const correo = primero(
    requerido(form.email, 'El correo electrónico es obligatorio'),
    email(form.email, 'Ingresá un correo electrónico válido'),
    longitudMaxima(form.email, 150, 'El correo es demasiado largo'),
  );
  if (correo) errores.email = correo;

  const telefono = primero(
    requerido(form.telefono, 'El teléfono es obligatorio'),
    form.telefono.trim().replace(/\D/g, '').length < 7
      ? 'Ingresá un teléfono válido (al menos 7 dígitos)'
      : undefined,
    longitudMaxima(form.telefono, 255, 'El teléfono es demasiado largo'),
  );
  if (telefono) errores.telefono = telefono;

  const ubicacion = primero(
    requerido(form.ubicacion, 'La ubicación es obligatoria'),
    longitudMinima(form.ubicacion, 3, 'Ingresá una ubicación más precisa'),
    longitudMaxima(form.ubicacion, 255, 'La ubicación es demasiado larga'),
  );
  if (ubicacion) errores.ubicacion = ubicacion;

  const latitud = primero(
    requerido(form.latitud ?? '', 'Seleccioná la ubicación en el mapa'),
    numero(form.latitud ?? '', 'Ingresá una latitud válida'),
    form.latitud !== null && Number(form.latitud) < -90
      ? 'La latitud debe estar entre -90 y 90'
      : undefined,
    form.latitud !== null && Number(form.latitud) > 90
      ? 'La latitud debe estar entre -90 y 90'
      : undefined,
  );
  if (latitud) errores.latitud = latitud;

  const longitud = primero(
    requerido(form.longitud ?? '', 'Seleccioná la ubicación en el mapa'),
    numero(form.longitud ?? '', 'Ingresá una longitud válida'),
    form.longitud !== null && Number(form.longitud) < -180
      ? 'La longitud debe estar entre -180 y 180'
      : undefined,
    form.longitud !== null && Number(form.longitud) > 180
      ? 'La longitud debe estar entre -180 y 180'
      : undefined,
  );
  if (longitud) errores.longitud = longitud;

  const diasVisita = primero(
    form.diasVisita.length < 1 ? 'Seleccioná al menos un día de visita' : undefined,
    form.diasVisita.length > 7 ? 'Seleccioná como máximo 7 días de visita' : undefined,
    form.diasVisita.some((dia) => !DIAS.some((opcion) => opcion.valor === dia))
      ? 'Seleccioná días de visita válidos'
      : undefined,
  );
  if (diasVisita) errores.diasVisita = diasVisita;

  return errores;
}

export default function VentasClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteExistente, setClienteExistente] = useState<Cliente | null>(null);
  const [form, setForm] = useState<FormVisita>(FORM_INICIAL);
  const [pedidoId, setPedidoId] = useState('');
  const [gps, setGps] = useState<PuntoGps | null>(null);
  const [guardando, setGuardando] = useState(false);

  const {
    errores,
    tocados,
    enviado,
    errorGeneral,
    setErrorGeneral,
    marcarTocado,
    validarCampo,
    validarTodo,
    aplicarErroresBackend,
    reiniciar,
  } = useValidacionFormulario<FormVisita>(validarVisita);

  const errorDe = (campo: keyof FormVisita) =>
    enviado || tocados[campo] ? errores[campo] : undefined;
  const errorGps = errorDe('latitud') || errorDe('longitud');

  const cargar = async () => {
    try {
      const [resC, resP] = await Promise.all([
        api.get('/clientes'),
        api.get('/pedidos').catch(() => ({ data: [] })),
      ]);
      setClientes(resC.data || []);
      const lista = Array.isArray(resP.data) ? resP.data : [];
      setPedidos(
        lista.filter((p: Pedido) => p.estado === 'pendiente' || p.estado === 'confirmado'),
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirNuevo = () => {
    reiniciar();
    setClienteExistente(null);
    setForm(FORM_INICIAL);
    setGps(null);
    setPedidoId('');
    setModalAbierto(true);
  };

  const abrirAsignarGps = (c: Cliente) => {
    reiniciar();
    setClienteExistente(c);
    setForm({
      ...FORM_INICIAL,
      nombre: c.nombre,
      email: c.email || '',
      telefono: c.telefono || '',
      ubicacion: c.ubicacion || '',
    });
    setGps(null);
    setPedidoId('');
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    reiniciar();
    setModalAbierto(false);
  };

  const toggleDia = (dia: string) => {
    const nuevo = {
      ...form,
      diasVisita: form.diasVisita.includes(dia)
        ? form.diasVisita.filter(d => d !== dia)
        : [...form.diasVisita, dia],
    };
    setForm(nuevo);
    validarCampo('diasVisita', nuevo);
  };

  const cambiarGps = (punto: PuntoGps | null) => {
    setGps(punto);
    const nuevo = {
      ...form,
      latitud: punto?.latitud ?? null,
      longitud: punto?.longitud ?? null,
    };
    setForm(nuevo);
    validarCampo('latitud', nuevo);
    validarCampo('longitud', nuevo);
  };

  const guardar = async () => {
    const formActual = {
      ...form,
      latitud: gps?.latitud ?? form.latitud,
      longitud: gps?.longitud ?? form.longitud,
    };
    if (!validarTodo(formActual)) return;

    setGuardando(true);
    try {
      let clienteId = clienteExistente?.id;
      const datosCliente = {
        nombre: form.nombre.trim(),
        email: form.email.trim().toLowerCase(),
        telefono: form.telefono.trim(),
        ubicacion: form.ubicacion.trim(),
      };
      if (!clienteId) {
        const res = await api.post('/clientes', datosCliente);
        clienteId = res.data?.id;
      } else {
        await api.put(`/clientes/${clienteId}`, datosCliente);
      }

      await api.post('/ubicaciones/clientes-visitas', {
        nombreCliente: form.nombre.trim(),
        latitud: Number(formActual.latitud),
        longitud: Number(formActual.longitud),
        accuracy: gps?.precision ?? undefined,
        clienteId: clienteId ?? undefined,
        pedidoId: pedidoId ? Number(pedidoId) : undefined,
        diasVisita: form.diasVisita,
      });

      cerrarModal();
      await cargar();
    } catch (err: unknown) {
      aplicarErroresBackend(err, CAMPOS_VISITA, ALIAS_VISITA);
      if (CORREO_DUPLICADO.test(mensajeGeneral(err, ''))) {
        setErrorGeneral(
          'Este correo electrónico ya está registrado. No se guardó el cliente; usá otro correo.',
        );
      } else {
        setErrorGeneral(mensajeGeneral(err, 'No se pudo guardar el cliente y su visita. Revisá los datos e intentá nuevamente.'));
      }
    } finally {
      setGuardando(false);
    }
  };

  const filtrados = clientes.filter(
    c =>
      !busqueda.trim() ||
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.telefono || '').includes(busqueda),
  );

  if (cargando) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          Cargando clientes...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="prolimal-eyebrow">Cartera</p>
          <h1 className="prolimal-display mt-2 text-3xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
            Mis clientes
          </h1>
          <p className="mt-2 text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
            {filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''} · ubicación GPS y días de visita
          </p>
        </div>
        <button onClick={abrirNuevo} className="prolimal-btn-primary">
          <Plus className="h-4 w-4" />
          Nuevo cliente con GPS
        </button>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-prolimal-ink-400 dark:text-prolimal-ink-300" />
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="prolimal-search-input"
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="prolimal-surface px-6 py-20 text-center text-sm font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">
          No hay clientes para mostrar.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map(c => (
            <article
              key={c.id}
              className="flex flex-col rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-5 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-prolimal-teal-100 text-sm font-extrabold text-prolimal-teal-700 dark:bg-prolimal-teal-900/30 dark:text-prolimal-teal-300">
                  {c.nombre.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-prolimal-ink-900 dark:text-prolimal-sand-50">{c.nombre}</p>
                  <p className="truncate text-xs font-medium text-prolimal-ink-400 dark:text-prolimal-ink-300">{c.email}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-1 flex-col gap-1.5 text-xs font-medium text-prolimal-ink-500 dark:text-prolimal-ink-200">
                {c.telefono && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-prolimal-ink-400 dark:text-prolimal-ink-300" />
                    {c.telefono}
                  </span>
                )}
                {c.ubicacion && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-prolimal-ink-400 dark:text-prolimal-ink-300" />
                    <span className="truncate">{c.ubicacion}</span>
                  </span>
                )}
              </div>
              <button
                onClick={() => abrirAsignarGps(c)}
                className="prolimal-btn-secondary mt-5 w-full px-4 py-2.5 text-xs"
              >
                <MapPin className="h-3.5 w-3.5" />
                Registrar punto GPS de visita
              </button>
            </article>
          ))}
        </div>
      )}

      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-prolimal-ink-900/50 p-4 backdrop-blur-sm"
          onClick={cerrarModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-prolimal-ink-900/10 bg-card p-6 shadow-[0_24px_60px_-46px_rgba(11,37,32,0.45)] dark:border-prolimal-sand-100/10 dark:bg-card-dark sm:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="prolimal-display text-2xl tracking-[-0.04em] text-prolimal-ink-900 dark:text-prolimal-sand-50">
                  {clienteExistente ? 'Registrar punto de visita' : 'Nuevo cliente'}
                </h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  {clienteExistente
                    ? `Asignale una ubicación GPS y días de visita a ${clienteExistente.nombre}.`
                    : 'Completá los datos y ubicá al cliente en el mapa.'}
                </p>
              </div>
              <button
                onClick={cerrarModal}
                className="prolimal-icon-btn shrink-0"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4">
              <AvisoErrorFormulario mensaje={errorGeneral} />
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="cliente-nombre" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  Nombre del cliente *
                </label>
                <input
                  id="cliente-nombre"
                  placeholder="Nombre del cliente *"
                  value={form.nombre}
                  onChange={e => {
                    const nuevo = { ...form, nombre: e.target.value };
                    setForm(nuevo);
                    validarCampo('nombre', nuevo);
                  }}
                  onBlur={() => marcarTocado('nombre')}
                  aria-invalid={Boolean(errorDe('nombre'))}
                  aria-describedby={errorDe('nombre') ? 'cliente-nombre-error' : undefined}
                  className={claseCampo(Boolean(errorDe('nombre')), 'prolimal-input')}
                />
                <CampoError id="cliente-nombre-error" mensaje={errorDe('nombre')} />
              </div>
              <div>
                <label htmlFor="cliente-email" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  Correo electrónico *
                </label>
                <input
                  id="cliente-email"
                  type="email"
                  placeholder="Correo electrónico *"
                  value={form.email}
                  onChange={e => {
                    const nuevo = { ...form, email: e.target.value };
                    setForm(nuevo);
                    validarCampo('email', nuevo);
                  }}
                  onBlur={() => marcarTocado('email')}
                  aria-invalid={Boolean(errorDe('email'))}
                  aria-describedby={errorDe('email') ? 'cliente-email-error' : undefined}
                  className={claseCampo(Boolean(errorDe('email')), 'prolimal-input')}
                />
                <CampoError id="cliente-email-error" mensaje={errorDe('email')} />
              </div>
              <div>
                <label htmlFor="cliente-telefono" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  Teléfono *
                </label>
                <input
                  id="cliente-telefono"
                  type="tel"
                  placeholder="Teléfono *"
                  value={form.telefono}
                  onChange={e => {
                    const nuevo = { ...form, telefono: e.target.value };
                    setForm(nuevo);
                    validarCampo('telefono', nuevo);
                  }}
                  onBlur={() => marcarTocado('telefono')}
                  aria-invalid={Boolean(errorDe('telefono'))}
                  aria-describedby={errorDe('telefono') ? 'cliente-telefono-error' : undefined}
                  className={claseCampo(Boolean(errorDe('telefono')), 'prolimal-input')}
                />
                <CampoError id="cliente-telefono-error" mensaje={errorDe('telefono')} />
              </div>
              <div>
                <label htmlFor="cliente-ubicacion" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                  Dirección de referencia *
                </label>
                <input
                  id="cliente-ubicacion"
                  placeholder="Dirección de referencia *"
                  value={form.ubicacion}
                  onChange={e => {
                    const nuevo = { ...form, ubicacion: e.target.value };
                    setForm(nuevo);
                    validarCampo('ubicacion', nuevo);
                  }}
                  onBlur={() => marcarTocado('ubicacion')}
                  aria-invalid={Boolean(errorDe('ubicacion'))}
                  aria-describedby={errorDe('ubicacion') ? 'cliente-ubicacion-error' : undefined}
                  className={claseCampo(Boolean(errorDe('ubicacion')), 'prolimal-input')}
                />
                <CampoError id="cliente-ubicacion-error" mensaje={errorDe('ubicacion')} />
              </div>

              <div
                role="group"
                aria-label="Días de visita"
                aria-invalid={Boolean(errorDe('diasVisita'))}
                aria-describedby={errorDe('diasVisita') ? 'cliente-dias-error' : undefined}
              >
                <p className={`mb-2 text-[10px] font-bold uppercase tracking-[0.16em] ${
                  errorDe('diasVisita')
                    ? 'text-prolimal-red-700 dark:text-prolimal-red-300'
                    : 'text-prolimal-ink-400 dark:text-prolimal-ink-300'
                }`}>
                  Días de visita *
                </p>
                <div className="flex flex-wrap gap-2">
                  {DIAS.map(d => {
                    const activo = form.diasVisita.includes(d.valor);
                    return (
                      <button
                        key={d.valor}
                        type="button"
                        onClick={() => toggleDia(d.valor)}
                        className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
                          activo
                            ? 'border-prolimal-ink-900 bg-prolimal-ink-900 text-white dark:border-prolimal-teal-400 dark:bg-prolimal-teal-400 dark:text-prolimal-ink-900'
                            : errorDe('diasVisita')
                              ? 'border-prolimal-red-500 bg-prolimal-red-50/60 text-prolimal-red-700 dark:border-prolimal-red-400/70 dark:bg-prolimal-red-900/20 dark:text-prolimal-red-300'
                              : 'border-prolimal-ink-900/15 bg-transparent text-prolimal-ink-500 hover:bg-prolimal-sand-100 dark:border-prolimal-sand-100/15 dark:text-prolimal-ink-200 dark:hover:bg-prolimal-ink-800'
                        }`}
                      >
                        {d.etiqueta}
                      </button>
                    );
                  })}
                </div>
                <CampoError id="cliente-dias-error" mensaje={errorDe('diasVisita')} />
              </div>

              <div
                role="group"
                aria-label="Ubicación del cliente"
                aria-invalid={Boolean(errorGps)}
                aria-describedby={errorGps ? 'cliente-gps-error' : undefined}
              >
                <MapaCliente gps={gps} onChange={cambiarGps} invalido={false} />
                <CampoError id="cliente-gps-error" mensaje={errorGps} />
              </div>

              {pedidos.length > 0 && (
                <div>
                  <label htmlFor="cliente-pedido" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-prolimal-ink-400 dark:text-prolimal-ink-300">
                    Pedido asociado (opcional)
                  </label>
                  <select
                    id="cliente-pedido"
                    value={pedidoId}
                    onChange={e => setPedidoId(e.target.value)}
                    className="prolimal-input"
                  >
                    <option value="">— Sin pedido asociado —</option>
                    {pedidos.map(p => (
                      <option key={p.id} value={p.id}>
                        #{p.id} · {p.estado} · {p.usuario?.nombre || 'Cliente'} ·{' '}
                        Bs {Number(p.total).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={guardar}
                disabled={guardando}
                className="prolimal-btn-primary flex-1"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={cerrarModal}
                className="prolimal-btn-secondary flex-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
