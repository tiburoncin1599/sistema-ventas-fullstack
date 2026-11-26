import { Injectable } from '@nestjs/common';
import {
  CANTIDAD_MINIMA_POR_PRESENTACION,
} from '../pedidos/detalle-pedido.entity';
import {
  factorConversion,
  factorConversionPorNombre,
  normalizarNombreProducto,
} from '../pedidos/conversion-paquetes';
import { PedidosService } from '../pedidos/pedidos.service';
import { TIPOS_PAGO, type Pedido } from '../pedidos/pedido.entity';
import {
  ProductosService,
  type ProductoConStock,
} from '../productos/productos.service';
import { InventarioService } from '../inventario/inventario.service';
import type { UsuarioOpcional } from './jwt-opcional.guard';

export type IntencionAsistente =
  | 'bienvenida'
  | 'guia'
  | 'catalogo'
  | 'producto'
  | 'reglas'
  | 'pedidos'
  | 'contacto'
  | 'fallback';

export interface AccionAsistente {
  etiqueta: string;
  url: string;
  externa?: boolean;
}

export interface ProductoAsistente {
  id: number;
  nombre: string;
  precio: string;
  stock: number;
  estado: 'Disponible' | 'Agotado';
  equivalencia: string;
}

export interface PedidoAsistente {
  id: number;
  estado: string;
  total: string;
  creado_en: string;
  tipo_pago: string;
  metodo_pago: string | null;
  referencia_transaccion: string | null;
  monto_pagado: string;
}

export interface RespuestaAsistente {
  mensaje: string;
  intencion: IntencionAsistente;
  autenticado: boolean;
  opciones: string[];
  acciones: AccionAsistente[];
  productos?: ProductoAsistente[];
  pedidos?: PedidoAsistente[];
}

const TOPE_CATALOGO = 1000;
const MAX_PRODUCTOS = 5;
const MAX_COINCIDENCIAS = 4;
const MAX_PEDIDOS = 3;

export const OPCIONES_ASISTENTE: string[] = [
  '¿Cómo hacer mi primer pedido?',
  'Ver productos y precios',
  '¿Cómo funcionan los paquetes?',
  'Estado de mi pedido',
  'Contactar a un asesor',
];

/** Términos que no identifican un producto y ensuciarían la búsqueda. */
const PALABRAS_VACIAS = new Set([
  'hola', 'holi', 'buenas', 'buenos', 'dias', 'tardes', 'noches', 'gracias',
  'por', 'favor', 'quiero', 'necesito', 'busco', 'buscando', 'dame', 'ver',
  'muestra', 'mostrar', 'listar', 'lista', 'catalogo', 'producto', 'productos',
  'precio', 'precios', 'cuesta', 'cuestan', 'cuanto', 'cuanta', 'cuantos',
  'disponible', 'disponibles', 'stock', 'hay', 'tienes', 'tiene', 'tengo',
  'sobre', 'para', 'como', 'cual', 'cuales', 'donde', 'puedo', 'puede',
  'ayuda', 'ayudar', 'detalle', 'detalles', 'informacion', 'info',
  'limpieza', 'empresa', 'srl', 'prolimac', 'asistente', 'algo',
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del',
  'al', 'en', 'y', 'o', 'con', 'sin',
]);

@Injectable()
export class AsistenteService {
  constructor(
    private readonly productosService: ProductosService,
    private readonly inventarioService: InventarioService,
    private readonly pedidosService: PedidosService,
  ) {}

  async consultar(
    mensaje: string,
    usuario?: UsuarioOpcional,
  ): Promise<RespuestaAsistente> {
    const texto = mensaje.trim();
    const normalizado = normalizarNombreProducto(texto);
    const autenticado = Boolean(usuario?.id);

    // Va antes de `esConsultaPedidos`: "¿Cómo hacer mi primer pedido?"
    // contiene la palabra "pedido" pero es una guía, no un seguimiento.
    if (this.esPrimeraCompra(normalizado)) {
      return this.respuestaGuiaPrimerPedido(autenticado);
    }
    if (this.esConsultaPedidos(normalizado)) {
      return this.respuestaPedidos(usuario, autenticado);
    }
    if (this.esContacto(normalizado)) {
      return this.respuestaContacto(autenticado);
    }
    if (this.esReglas(normalizado)) {
      return this.respuestaReglas(autenticado);
    }
    if (this.esSaludo(normalizado)) {
      return this.respuestaBienvenida(autenticado);
    }

    const productos = await this.productosService.findAll(1, TOPE_CATALOGO);
    const terminos = this.terminosDe(texto);

    if (terminos.length === 0) {
      if (productos.length === 0) return this.respuestaSinCatalogo(autenticado);
      return this.respuestaProductos(
        productos.slice(0, MAX_PRODUCTOS + 3),
        'Estos son algunos productos activos del catálogo:',
        'catalogo',
        autenticado,
      );
    }

    const coincidencias = this.buscarCoincidencias(
      productos,
      terminos,
      normalizado,
    );
    if (coincidencias.length === 0) {
      return this.respuestaFallback(autenticado);
    }

    return this.respuestaProductos(
      coincidencias.slice(0, MAX_COINCIDENCIAS),
      coincidencias.length === 1
        ? 'Encontré este producto activo:'
        : `Encontré ${coincidencias.length} productos activos:`,
      'producto',
      autenticado,
    );
  }

  private terminosDe(mensaje: string): string[] {
    const terminos = new Set<string>();
    const palabras = normalizarNombreProducto(mensaje)
      .split(/\s+/)
      .filter((palabra) => palabra.length >= 3 && !PALABRAS_VACIAS.has(palabra));

    for (const palabra of palabras) {
      terminos.add(palabra);
      // "pisos" debe encontrar "Pisos" y "limpiavidrios" a "Limpiavidrios".
      if (palabra.length > 4 && palabra.endsWith('s')) {
        terminos.add(palabra.slice(0, -1));
      }
    }
    return [...terminos];
  }

  private puntuar(
    producto: ProductoConStock,
    terminos: string[],
    consultaNormalizada: string,
  ): number {
    const nombre = normalizarNombreProducto(producto.nombre);
    const descripcion = normalizarNombreProducto(producto.descripcion ?? '');
    const codigo = normalizarNombreProducto(producto.codigo ?? '');
    let puntos = 0;

    if (nombre && consultaNormalizada.includes(nombre)) puntos += 10;
    for (const termino of terminos) {
      if (nombre.includes(termino)) puntos += 3;
      else if (codigo.includes(termino)) puntos += 2;
      else if (descripcion.includes(termino)) puntos += 1;
    }
    return puntos;
  }

  private buscarCoincidencias(
    productos: ProductoConStock[],
    terminos: string[],
    consultaNormalizada: string,
  ): ProductoConStock[] {
    return productos
      .map((producto) => ({
        producto,
        puntos: this.puntuar(producto, terminos, consultaNormalizada),
      }))
      .filter((resultado) => resultado.puntos > 0)
      .sort(
        (a, b) =>
          b.puntos - a.puntos ||
          a.producto.nombre.localeCompare(b.producto.nombre, 'es', {
            sensitivity: 'base',
          }),
      )
      .map((resultado) => resultado.producto);
  }

  private esPrimeraCompra(normalizado: string): boolean {
    const contextoPedido =
      /\b(pedido|pedidos|compra|comprar|compro|compras|pedir|cliente|cuenta|registro|registrarme)\b/.test(
        normalizado,
      );
    const indicadorNuevo =
      /\b(primer|primera|primero|nuevo|nueva|vez|iniciar|empezar|comenzar|guia|pasos)\b/.test(
        normalizado,
      );

    return (
      (contextoPedido && indicadorNuevo) ||
      /^(soy nuevo|soy nueva|primera vez|como comprar|como comprar por primera vez|como hacer un pedido|como hacer mi primer pedido|quiero hacer mi primer pedido|como me registro)\b/.test(
        normalizado,
      )
    );
  }

  private esConsultaPedidos(normalizado: string): boolean {
    return (
      /\b(pedido|pedidos|orden|ordenes|seguimiento)\b/.test(normalizado) ||
      normalizado.includes('mi compra') ||
      normalizado.includes('estado de mi')
    );
  }

  private esContacto(normalizado: string): boolean {
    return /\b(asesor|asesores|contacto|contactar|ventas|humano|persona|whatsapp|llamar|escribir|ayuda)\b/.test(
      normalizado,
    );
  }

  private esReglas(normalizado: string): boolean {
    return /\b(paquete|paquetes|presentacion|presentaciones|unidad|unidades|minimo|comprar|compro|compra|pago|pagar|contado|credito|qr|sandbox|forma|formas|metodo)\b/.test(
      normalizado,
    );
  }

  private esSaludo(normalizado: string): boolean {
    return /^(hola|holi|buenas|buenos dias|buenas tardes|buenas noches|hey)\b/.test(
      normalizado,
    );
  }

  private formatearBs(valor: number | string | null | undefined): string {
    const numero = Number(valor ?? 0);
    return `Bs. ${Number.isFinite(numero) ? numero.toFixed(2) : '0.00'}`;
  }

  private formatearFecha(
    fecha: Date | string | null | undefined,
  ): string {
    if (!fecha) return '—';
    const fechaDate = fecha instanceof Date ? fecha : new Date(fecha);
    if (Number.isNaN(fechaDate.getTime())) return '—';
    return fechaDate.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private estadoLegible(estado: string): string {
    const estados: Record<string, string> = {
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      preparacion: 'En preparación',
      'en preparacion': 'En preparación',
      listo: 'Listo',
      entregado: 'Entregado',
      completado: 'Completado',
      cancelado: 'Cancelado',
    };
    return estados[estado.trim().toLowerCase()] ?? estado;
  }

  private whatsappUrl(): string {
    const numero = (
      process.env.WHATSAPP_NUMERO ??
      process.env.NEXT_PUBLIC_WHATSAPP ??
      '59170000000'
    ).replace(/\D/g, '') || '59170000000';
    return `https://wa.me/${numero}`;
  }

  private accionesBase(): AccionAsistente[] {
    return [
      {
        etiqueta: 'Hablar con ventas por WhatsApp',
        url: this.whatsappUrl(),
        externa: true,
      },
      { etiqueta: 'Ver productos', url: '/productos' },
    ];
  }

  private equivalenciasCanonicas(): string {
    const doce = [
      'Alcohol en gel',
      'Lavandina',
      'Pisos',
    ].filter((nombre) => factorConversionPorNombre(nombre) === 12);
    const seis = [
      'Antigrasa',
      'Limpiavidrios',
      'Limpia baños',
      'Lavavajillas',
    ].filter((nombre) => factorConversionPorNombre(nombre) === 6);

    return `12 unidades = 1 paquete (${doce.join(', ')}) o 6 unidades = 1 paquete (${seis.join(', ')})`;
  }

  private async aProducto(producto: ProductoConStock): Promise<ProductoAsistente> {
    let stock = Number(producto.stock ?? 0);
    try {
      const inventario = await this.inventarioService.findOne(producto.id);
      stock = Number(inventario.cantidad ?? stock);
    } catch {
      // Producto sin fila de inventario: se usa el stock del catálogo.
    }
    if (!Number.isFinite(stock)) stock = 0;
    stock = Math.max(0, Math.floor(stock));

    const factor = factorConversion(producto);
    const equivalencia =
      factor > 1
        ? `${factor} unidades = 1 paquete`
        : '1 unidad = 1 presentación (sin paquete)';

    return {
      id: producto.id,
      nombre: producto.nombre,
      precio: this.formatearBs(producto.precio),
      stock,
      estado: stock > 0 ? 'Disponible' : 'Agotado',
      equivalencia,
    };
  }

  private aPedido(pedido: Pedido): PedidoAsistente {
    return {
      id: pedido.id,
      estado: this.estadoLegible(pedido.estado),
      total: this.formatearBs(pedido.total),
      creado_en: this.formatearFecha(pedido.creado_en),
      tipo_pago: pedido.tipo_pago ?? 'CONTADO',
      metodo_pago: pedido.metodo_pago?.trim() || null,
      referencia_transaccion: pedido.referencia_transaccion ?? null,
      monto_pagado: this.formatearBs(pedido.monto_pagado ?? 0),
    };
  }

  private respuestaBienvenida(autenticado: boolean): RespuestaAsistente {
    return {
      mensaje: 'Asistente PROLIMAC SRL — ¿En qué puedo ayudarte hoy?',
      intencion: 'bienvenida',
      autenticado,
      opciones: [...OPCIONES_ASISTENTE],
      acciones: this.accionesBase(),
    };
  }

  private respuestaGuiaPrimerPedido(autenticado: boolean): RespuestaAsistente {
    const minimoUnidad = CANTIDAD_MINIMA_POR_PRESENTACION.UNIDAD;
    const minimoPaquete = CANTIDAD_MINIMA_POR_PRESENTACION.PAQUETE;
    const pasos = [
      `1. Crear cuenta o iniciar sesión: registrate como cliente o iniciá sesión para asociar el pedido y su comprobante.${autenticado ? ' Ya tenés sesión activa, podés ir al paso 2.' : ''}`,
      `2. Explorar catálogo y elegir presentación: elegí cada producto por unidad (mínimo ${minimoUnidad} unidades) o por paquete completo (mínimo ${minimoPaquete} paquete). Equivalencia exacta: ${this.equivalenciasCanonicas()}.`,
      '3. Revisar el carrito: verificá cantidades, precios en Bs. y subtotal antes de continuar.',
      '4. Completar el checkout y método de pago: elegí Contado, Pago Digital QR Sandbox o Crédito según corresponda y confirmá el pedido.',
      '5. Seguimiento y comprobante: consultá el estado en Mi cuenta > Pedidos y descargá el comprobante PDF desde tu cuenta.',
    ].join('\n');

    return {
      mensaje: `Para hacer tu primer pedido, seguí estos pasos:\n${pasos}\n\nSi querés, escribinos por WhatsApp y te acompañamos en el proceso.`,
      intencion: 'guia',
      autenticado,
      opciones: [...OPCIONES_ASISTENTE],
      acciones: [
        { etiqueta: 'Ir al catálogo', url: '/productos' },
        { etiqueta: 'Mis pedidos', url: '/cuenta/pedidos' },
        { etiqueta: 'Hablar con ventas', url: this.whatsappUrl(), externa: true },
      ],
    };
  }

  private respuestaContacto(autenticado: boolean): RespuestaAsistente {
    return {
      mensaje:
        'Claro, te derivo con nuestro equipo de ventas. Escribinos por WhatsApp y te atienden directamente; también podés ver el catálogo mientras tanto.',
      intencion: 'contacto',
      autenticado,
      opciones: [...OPCIONES_ASISTENTE],
      acciones: this.accionesBase(),
    };
  }

  private respuestaReglas(autenticado: boolean): RespuestaAsistente {
    const minimoUnidad = CANTIDAD_MINIMA_POR_PRESENTACION.UNIDAD;
    const minimoPaquete = CANTIDAD_MINIMA_POR_PRESENTACION.PAQUETE;
    const pagos = TIPOS_PAGO.map(
      (tipo) => tipo.charAt(0) + tipo.slice(1).toLowerCase(),
    ).join(' y ');

    return {
      mensaje:
        `En presentación unitaria el mínimo es ${minimoUnidad} unidades; en paquete, ${minimoPaquete} paquete completo. ` +
        `Equivalencia exacta: ${this.equivalenciasCanonicas()}. ` +
        `Modalidades de pago: ${pagos} y Pago Digital QR Sandbox. En la modalidad digital podés abonar con QR o tarjeta de prueba; el abono queda registrado como ${TIPOS_PAGO[0]} con referencia en tu comprobante.`,
      intencion: 'reglas',
      autenticado,
      opciones: [...OPCIONES_ASISTENTE],
      acciones: this.accionesBase(),
    };
  }

  private async respuestaPedidos(
    usuario: UsuarioOpcional | undefined,
    autenticado: boolean,
  ): Promise<RespuestaAsistente> {
    if (!usuario?.id) {
      return {
        mensaje:
          'Para consultar el estado de tus pedidos necesitás iniciar sesión. Una vez dentro, volvé a preguntar por "mi pedido" y te muestro sólo tus compras. Si no tenés cuenta, escribinos por WhatsApp.',
        intencion: 'pedidos',
        autenticado: false,
        opciones: [...OPCIONES_ASISTENTE],
        acciones: [
          { etiqueta: 'Iniciar sesión', url: '/auth' },
          ...this.accionesBase(),
        ],
      };
    }

    const pedidos = await this.pedidosService.findByUsuario(usuario.id);
    if (pedidos.length === 0) {
      return {
        mensaje:
          'No encontré pedidos asociados a tu cuenta. Cuando realices una compra, volvé a consultar y te muestro el estado actualizado.',
        intencion: 'pedidos',
        autenticado: true,
        opciones: [...OPCIONES_ASISTENTE],
        acciones: this.accionesBase(),
        pedidos: [],
      };
    }

    const ultimos = pedidos.slice(0, MAX_PEDIDOS);
    const detalle = ultimos
      .map((pedido) => {
        const metodo = pedido.metodo_pago ? ` · ${pedido.metodo_pago}` : '';
        return `• #${pedido.id} — ${this.estadoLegible(pedido.estado)} — ${this.formatearBs(pedido.total)} — ${this.formatearFecha(pedido.creado_en)}${metodo}`;
      })
      .join('\n');

    return {
      mensaje: `Estos son tus últimos ${ultimos.length} pedidos:\n${detalle}\n\nSi necesitás más detalle, escribinos por WhatsApp con el número de pedido.`,
      intencion: 'pedidos',
      autenticado: true,
      opciones: [...OPCIONES_ASISTENTE],
      acciones: this.accionesBase(),
      pedidos: ultimos.map((pedido) => this.aPedido(pedido)),
    };
  }

  private async respuestaProductos(
    productos: ProductoConStock[],
    encabezado: string,
    intencion: 'catalogo' | 'producto',
    autenticado: boolean,
  ): Promise<RespuestaAsistente> {
    const visibles = await Promise.all(
      productos.map((producto) => this.aProducto(producto)),
    );
    const detalle = visibles
      .map(
        (producto) =>
          `• ${producto.nombre}: ${producto.precio} · ${producto.estado} (stock ${producto.stock} u.) · ${producto.equivalencia}`,
      )
      .join('\n');
    const minimoUnidad = CANTIDAD_MINIMA_POR_PRESENTACION.UNIDAD;
    const minimoPaquete = CANTIDAD_MINIMA_POR_PRESENTACION.PAQUETE;

    return {
      mensaje:
        `${encabezado}\n${detalle}\n\nMínimo de compra: ${minimoUnidad} unidades sueltas o ${minimoPaquete} paquete completo. ¿Querés hablar con un asesor?`,
      intencion,
      autenticado,
      opciones: [...OPCIONES_ASISTENTE],
      acciones: this.accionesBase(),
      productos: visibles,
    };
  }

  private respuestaSinCatalogo(autenticado: boolean): RespuestaAsistente {
    return {
      mensaje:
        'En este momento no hay productos activos publicados. Escribinos por WhatsApp y te damos el catálogo actualizado.',
      intencion: 'catalogo',
      autenticado,
      opciones: [...OPCIONES_ASISTENTE],
      acciones: this.accionesBase(),
      productos: [],
    };
  }

  private respuestaFallback(autenticado: boolean): RespuestaAsistente {
    return {
      mensaje:
        'No encontré una coincidencia clara con esa consulta. Puedo ayudarte con el catálogo y precios, las reglas de paquetes y pago, o el estado de tus pedidos si iniciás sesión. Si preferís atención directa, hablá con ventas.',
      intencion: 'fallback',
      autenticado,
      opciones: [...OPCIONES_ASISTENTE],
      acciones: this.accionesBase(),
    };
  }
}
