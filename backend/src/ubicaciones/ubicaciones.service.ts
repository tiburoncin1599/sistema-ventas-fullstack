import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan } from 'typeorm';
import { Subject } from 'rxjs';
import { Ubicacion } from './ubicacion.entity';
import { Seguimiento } from './seguimiento.entity';
import { ClienteVisita } from './cliente-visita.entity';
import { ActualizarUbicacionDto } from './dto/actualizar-ubicacion.dto';
import { CrearClienteVisitaDto } from './dto/crear-cliente-visita.dto';

export interface UbicacionEvento {
  tipo: 'ubicacion' | 'tracking' | 'heartbeat';
  data?: unknown;
}

export interface VendedorFila {
  usuario_id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  iniciado_en: Date | null;
  ultima_actualizacion_en: Date | null;
  latitud: number | null;
  longitud: number | null;
  precision: number | null;
}

export const RETENCION_HISTORIAL_HORAS = 48;

const SQL_VENDEDOR = `
  SELECT
    s.usuario_id,
    u.nombre AS nombre,
    u.email AS email,
    u.rol AS rol,
    s.activo,
    s.iniciado_en,
    s.ultima_actualizacion_en,
    s.latitud,
    s.longitud,
    s."precision"
  FROM seguimientos s
  JOIN usuarios u ON u.id = s.usuario_id
`;

export interface VisitaFila {
  id: number;
  vendedor_id: number;
  cliente_id: number | null;
  nombre_cliente: string;
  pedido_id: number | null;
  pedido_estado: string | null;
  pedido_total: number | null;
  direccion_entrega: string | null;
  latitud: number;
  longitud: number;
  precision: number | null;
  dias_visita: string[];
  creado_en: Date;
}

@Injectable()
export class UbicacionesService {
  private readonly eventos$ = new Subject<UbicacionEvento>();
  private ultimaLimpieza = 0;

  constructor(
    @InjectRepository(Ubicacion)
    private ubicacionesRepo: Repository<Ubicacion>,
    @InjectRepository(Seguimiento)
    private seguimientosRepo: Repository<Seguimiento>,
    @InjectRepository(ClienteVisita)
    private visitasRepo: Repository<ClienteVisita>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  get eventos() {
    return this.eventos$.asObservable();
  }

  async actualizarSeguimiento(usuarioId: number, activo: boolean) {
    const ahora = new Date();

    if (activo) {
      await this.seguimientosRepo.upsert(
        { usuario_id: usuarioId, activo: true, iniciado_en: ahora },
        ['usuario_id'],
      );
    } else {
      await this.seguimientosRepo.upsert(
        { usuario_id: usuarioId, activo: false },
        ['usuario_id'],
      );
    }

    if (activo) {
      const vendedor = await this.vendedorPorId(usuarioId);
      if (vendedor) {
        this.eventos$.next({ tipo: 'tracking', data: vendedor });
      }
    } else {
      this.eventos$.next({
        tipo: 'tracking',
        data: { usuario_id: usuarioId, activo: false },
      });
    }

    return this.estadoDeVendedor(usuarioId);
  }

  async registrarUbicacion(usuarioId: number, dto: ActualizarUbicacionDto) {
    const seguimiento = await this.seguimientosRepo.findOne({
      where: { usuario_id: usuarioId },
    });

    if (!seguimiento || !seguimiento.activo) {
      throw new BadRequestException(
        'El seguimiento de ubicación no está activo',
      );
    }

    const ahora = new Date();

    await this.ubicacionesRepo.save({
      usuario_id: usuarioId,
      latitud: dto.latitud,
      longitud: dto.longitud,
      precision: dto.accuracy ?? null,
    });

    await this.seguimientosRepo.update(usuarioId, {
      latitud: dto.latitud,
      longitud: dto.longitud,
      precision: dto.accuracy ?? null,
      ultima_actualizacion_en: ahora,
    });

    void this.limpiarHistorial();

    const vendedor = await this.vendedorPorId(usuarioId);
    if (vendedor) {
      this.eventos$.next({ tipo: 'ubicacion', data: vendedor });
    }

    return { message: 'Ubicación registrada', actualizado_en: ahora };
  }

  async estadoDeVendedor(usuarioId: number) {
    const seguimiento = await this.seguimientosRepo.findOne({
      where: { usuario_id: usuarioId },
    });
    if (!seguimiento) {
      return { usuario_id: usuarioId, activo: false };
    }
    return seguimiento;
  }

  async listarVendedoresActivos(): Promise<VendedorFila[]> {
    return this.dataSource.query<VendedorFila[]>(
      `${SQL_VENDEDOR}
       WHERE s.activo = true AND u.activo = true
       ORDER BY s.ultima_actualizacion_en DESC NULLS LAST`,
    );
  }

  async historial(usuarioId: number, horas: number) {
    const existe = await this.dataSource.query<{ id: number }[]>(
      `SELECT id FROM usuarios WHERE id = $1`,
      [usuarioId],
    );
    if (!existe.length) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const horasValidas = Math.min(
      Math.max(horas || 24, 1),
      RETENCION_HISTORIAL_HORAS,
    );
    const desde = new Date(Date.now() - horasValidas * 3600_000);

    return this.ubicacionesRepo.find({
      where: { usuario_id: usuarioId, creado_en: MoreThan(desde) },
      order: { creado_en: 'DESC' },
      take: 500,
    });
  }

  private async vendedorPorId(usuarioId: number): Promise<VendedorFila | null> {
    const rows = await this.dataSource.query<VendedorFila[]>(
      `${SQL_VENDEDOR}
       WHERE s.usuario_id = $1 AND s.activo = true AND u.activo = true`,
      [usuarioId],
    );
    return rows[0] ?? null;
  }

  async crearVisitaCliente(
    vendedorId: number,
    dto: CrearClienteVisitaDto,
  ): Promise<VisitaFila> {
    const vendedorExiste = await this.dataSource.query<{ id: number }[]>(
      `SELECT id FROM usuarios WHERE id = $1 AND rol = 'ventas' AND activo = true`,
      [vendedorId],
    );
    if (!vendedorExiste.length) {
      throw new NotFoundException('Vendedor no encontrado o inactivo');
    }

    let clienteId: number | null = dto.clienteId ?? null;
    if (clienteId != null) {
      const clienteExiste = await this.dataSource.query<{ id: number }[]>(
        `SELECT id FROM usuarios WHERE id = $1 AND rol = 'cliente'`,
        [clienteId],
      );
      if (!clienteExiste.length) {
        throw new BadRequestException('El cliente indicado no existe');
      }
    } else {
      const { randomBytes } = await import('crypto');
      const creado = await this.dataSource.query<{ id: number }[]>(
        `INSERT INTO usuarios (nombre, email, telefono, carnet, ubicacion, password_hash, rol)
         VALUES ($1, $2, '', '', '', '', 'cliente')
         RETURNING id`,
        [
          dto.nombreCliente,
          `cliente_${Date.now().toString(36)}_${randomBytes(6).toString('hex')}@tienda.com`,
        ],
      );
      clienteId = creado[0].id;
    }

    if (dto.pedidoId != null) {
      const pedidoExiste = await this.dataSource.query<{ id: number }[]>(
        `SELECT id FROM pedidos WHERE id = $1`,
        [dto.pedidoId],
      );
      if (!pedidoExiste.length) {
        throw new BadRequestException('El pedido indicado no existe');
      }
    }

    const visita = await this.visitasRepo.save({
      vendedor_id: vendedorId,
      cliente_id: clienteId,
      nombre_cliente: dto.nombreCliente,
      pedido_id: dto.pedidoId ?? null,
      latitud: dto.latitud,
      longitud: dto.longitud,
      precision: dto.accuracy ?? null,
      dias_visita: dto.diasVisita,
    });

    return this.visitaPorId(visita.id);
  }

  async visitasDeVendedor(
    vendedorId: number,
    fecha?: string,
  ): Promise<VisitaFila[]> {
    const rows = await this.dataSource.query<VisitaFila[]>(
      `SELECT
        cv.id,
        cv.vendedor_id,
        cv.cliente_id,
        cv.nombre_cliente,
        cv.pedido_id,
        p.estado AS pedido_estado,
        p.total AS pedido_total,
        p.direccion_entrega,
        cv.latitud,
        cv.longitud,
        cv."precision",
        cv.dias_visita,
        cv.creado_en
      FROM cliente_visitas cv
      LEFT JOIN pedidos p ON p.id = cv.pedido_id
      WHERE cv.vendedor_id = $1
        AND ($2::date IS NULL OR cv.creado_en::date = $2::date)
      ORDER BY cv.creado_en ASC`,
      [vendedorId, fecha ?? null],
    );
    return rows.map(normalizarVisita);
  }

  private async visitaPorId(id: number): Promise<VisitaFila> {
    const rows = await this.dataSource.query<VisitaFila[]>(
      `SELECT
        cv.id,
        cv.vendedor_id,
        cv.cliente_id,
        cv.nombre_cliente,
        cv.pedido_id,
        p.estado AS pedido_estado,
        p.total AS pedido_total,
        p.direccion_entrega,
        cv.latitud,
        cv.longitud,
        cv."precision",
        cv.dias_visita,
        cv.creado_en
      FROM cliente_visitas cv
      LEFT JOIN pedidos p ON p.id = cv.pedido_id
      WHERE cv.id = $1`,
      [id],
    );
    if (!rows.length) {
      throw new NotFoundException('Visita no encontrada');
    }
    return normalizarVisita(rows[0]);
  }

  private async limpiarHistorial() {
    const ahora = Date.now();
    if (ahora - this.ultimaLimpieza < 3600_000) return;
    this.ultimaLimpieza = ahora;

    await this.dataSource.query(
      `DELETE FROM vendedor_ubicaciones
       WHERE creado_en < NOW() - INTERVAL '${RETENCION_HISTORIAL_HORAS} hours'`,
    );
  }
}

function normalizarVisita(row: VisitaFila): VisitaFila {
  let dias: string[] = [];
  if (Array.isArray(row.dias_visita)) {
    dias = row.dias_visita;
  } else if (typeof row.dias_visita === 'string') {
    dias = (row.dias_visita as unknown as string)
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);
  }
  return { ...row, dias_visita: dias };
}
