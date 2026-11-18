import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { ReportesService, FiltrosEfectivos } from '../reportes/reportes.service';
import { NotificacionesService } from './notificaciones.service';
import { EnviarWhatsappDto } from './dto/enviar-whatsapp.dto';
import {
  EstadoNotificacion,
  NotificacionHistorial,
} from './entities/notificacion-historial.entity';
import {
  ModoWhatsapp,
  WHATSAPP_ADAPTER,
  WhatsappAdapter,
} from './adapters/whatsapp.adapter';

export interface ResultadoNotificacion {
  modo: ModoWhatsapp;
  urlWhatsapp: string | null;
  registro: NotificacionHistorial;
  error?: string;
}

export interface HistorialPaginado {
  data: NotificacionHistorial[];
  total: number;
  page: number;
  limit: number;
}

interface AlertaStock {
  nombre: string;
  cantidad: number;
  faltante: number;
}

@Injectable()
export class WhatsappService {
  constructor(
    @InjectRepository(NotificacionHistorial)
    private readonly historialRepo: Repository<NotificacionHistorial>,
    @Inject(WHATSAPP_ADAPTER)
    private readonly adapter: WhatsappAdapter,
    private readonly reportesService: ReportesService,
    private readonly configuracionService: ConfiguracionService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  /** Símbolo monetario configurado por la empresa (por defecto Bs). */
  private async moneda(): Promise<string> {
    const config = await this.configuracionService.obtener();
    return config.moneda_simbolo || config.moneda || 'Bs';
  }

  private monto(valor: number, simbolo: string): string {
    return `${simbolo} ${Number(valor || 0).toFixed(2)}`;
  }

  /** Viñetas con los productos en alerta (cantidad <= 10). */
  async generarMensajeStockBajo(): Promise<string> {
    const productos = (await this.notificacionesService.stockBajo()) as AlertaStock[];

    const viñetas = productos.length
      ? productos.map(
          (p) =>
            `• ${p.nombre}: ${p.cantidad} uds. (faltan ${Math.max(Number(p.faltante), 0)})`,
        )
      : ['• Sin productos en alerta en este momento.'];

    return [
      '⚠️ *ALERTA DE STOCK BAJO — PROLIMAC SRL*',
      `Productos con 10 unidades o menos: ${productos.length}`,
      '',
      ...viñetas,
      '',
      'Por favor, programar la reposición con el proveedor.',
    ].join('\n');
  }

  /** Resumen ejecutivo a partir de los servicios de reportes ya existentes. */
  async generarMensajeReporteVentas(
    fechaInicio?: string,
    fechaFin?: string,
    vendedorId?: number,
  ): Promise<string> {
    const filtros: FiltrosEfectivos = { fechaInicio, fechaFin, vendedorId };
    const [ganancias, top] = await Promise.all([
      this.reportesService.ganancias(filtros),
      this.reportesService.topProductos(filtros),
    ]);
    const simbolo = await this.moneda();

    const top3 = top.masVendidos.slice(0, 3);
    const viñetas = top3.length
      ? top3.map(
          (p, i) =>
            `${i + 1}. ${p.nombre} — ${p.unidades_vendidas} uds. (${this.monto(p.ingresos, simbolo)})`,
        )
      : ['• Sin ventas en el período seleccionado.'];

    return [
      '📊 *REPORTE EJECUTIVO — PROLIMAC SRL*',
      `Período: ${fechaInicio ?? 'inicio'} al ${fechaFin ?? 'hoy'}`,
      `Ingresos totales: ${this.monto(ganancias.ingresos, simbolo)}`,
      `Utilidad neta estimada: ${this.monto(ganancias.utilidad_bruta, simbolo)}`,
      `Margen: ${ganancias.margen_porcentual.toFixed(2)}%`,
      `Pedidos concretados: ${ganancias.total_pedidos}`,
      '',
      'Top 3 productos más vendidos:',
      ...viñetas,
    ].join('\n');
  }

  /**
   * Entrega el mensaje con la estrategia activa y persiste el evento.
   * En modo enlace se guarda con estado GENERADO_LINK; si la API falla se
   * guarda con estado ERROR y se devuelve el error sin lanzar, para que la UI
   * pueda mostrar un feedback claro y el historial quede completo.
   */
  async enviarNotificacion(
    dto: EnviarWhatsappDto,
    usuarioId?: number,
  ): Promise<ResultadoNotificacion> {
    const config = await this.configuracionService.obtener();
    const telefono =
      dto.destinatario_telefono ||
      config.whatsapp ||
      config.telefono ||
      process.env.WHATSAPP_DESTINO ||
      '';

    let estado: EstadoNotificacion = 'ERROR';
    let urlWhatsapp: string | null = null;
    let error: string | undefined;

    try {
      const solicitud = { telefono, mensaje: dto.mensaje };
      const resultado = await this.adapter.enviar(solicitud);

      if (this.adapter.modo === 'LINK') {
        urlWhatsapp = this.adapter.urlPara(solicitud);
        estado = 'GENERADO_LINK';
      } else {
        estado = resultado.estado === 'ENVIADO' ? 'ENVIADO' : 'ERROR';
        if (resultado.detalle) error = resultado.detalle;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    const registro = await this.historialRepo.save(
      this.historialRepo.create({
        tipo: dto.tipo,
        destinatario_telefono: telefono || null,
        mensaje: dto.mensaje,
        estado,
        usuario_id: usuarioId ?? null,
      }),
    );

    return { modo: this.adapter.modo, urlWhatsapp, registro, error };
  }

  async listarHistorial(page = 1, limit = 20): Promise<HistorialPaginado> {
    const paginaSegura = Math.max(1, Math.floor(page) || 1);
    const limiteSeguro = Math.min(100, Math.max(1, Math.floor(limit) || 20));

    const [data, total] = await this.historialRepo.findAndCount({
      relations: ['usuario'],
      order: { creado_en: 'DESC' },
      skip: (paginaSegura - 1) * limiteSeguro,
      take: limiteSeguro,
    });

    return { data, total, page: paginaSegura, limit: limiteSeguro };
  }
}
