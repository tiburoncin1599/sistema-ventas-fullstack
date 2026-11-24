import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  Not,
  QueryDeepPartialEntity,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Producto } from './producto.entity';
import { Inventario } from '../inventario/inventario.entity';
import { InventarioMovimiento } from '../inventario-movimientos/inventario-movimiento.entity';

export type ProductoConStock = Producto & { stock: number; disponible: boolean };

/** Filtro opcional por categoría; `sinCategoria` incluye los productos null. */
export interface FiltrosCategoria {
  categoriaId?: number;
  sinCategoria?: boolean;
}

export type DatosCreacionProducto = Partial<Producto> & {
  categoria_id?: number | null;
};

export type DatosActualizacionProducto = Partial<Producto> & {
  categoria_id?: number | null;
  stock?: number;
  cantidad?: number;
};

export interface ResultadoActualizacionProducto {
  anterior: ProductoConStock;
  actualizado: ProductoConStock;
  stockAnterior: number;
  stockNuevo: number;
  movimientoRegistrado: boolean;
}

export interface ResultadoLimpiezaE2E {
  productos: number;
  pedidos: number;
  detalles: number;
  inventario: number;
  movimientos: number;
  deudas: number;
  visitas: number;
}

const MOTIVO_AJUSTE = 'Ajuste manual desde edición de producto';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private productosRepo: Repository<Producto>,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  /**
   * Orden alfabético determinista e insensible a mayúsculas/minúsculas.
   * Se aplica también en memoria para que el criterio sea idéntico al del
   * frontend (`localeCompare('es', { sensitivity: 'base' })`) aunque la
   * collation de PostgreSQL difiera; el id desempata nombres iguales.
   */
  private ordenarPorNombre<T extends { id: number; nombre: string }>(
    lista: T[],
  ): T[] {
    return [...lista].sort(
      (a, b) =>
        a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }) ||
        a.id - b.id,
    );
  }

  /** LEFT JOIN para no perder productos sin categoría al filtrar. */
  private aplicarFiltroCategoria(
    qb: SelectQueryBuilder<Producto>,
    filtros?: FiltrosCategoria,
  ): SelectQueryBuilder<Producto> {
    if (filtros?.sinCategoria) return qb.andWhere('categoria.id IS NULL');
    if (filtros?.categoriaId) {
      return qb.andWhere('categoria.id = :categoriaId', {
        categoriaId: filtros.categoriaId,
      });
    }
    return qb;
  }

  /** Añade al producto únicamente el stock necesario para el catálogo. */
  private async conStock(lista: Producto[]): Promise<ProductoConStock[]> {
    if (lista.length === 0) return [];
    const ids = lista.map((p) => p.id);
    const filas: { producto_id: number; cantidad: number }[] =
      await this.productosRepo.manager.query(
        'SELECT producto_id, cantidad FROM inventario WHERE producto_id = ANY($1)',
        [ids],
      );
    const mapa = new Map(filas.map((f) => [f.producto_id, Number(f.cantidad)]));
    return lista.map((p) => {
      const stock = mapa.get(p.id) ?? 0;
      return { ...p, stock, disponible: stock > 0 };
    });
  }

  async findAll(page = 1, limit = 50, filtros?: FiltrosCategoria) {
    // Catálogo paginado: el ORDER BY va en SQL para que la paginación no
    // dependa del orden físico/MVCC de PostgreSQL. `eager` NO aplica a
    // QueryBuilder, así que la categoría se une explícitamente (LEFT).
    const qb = this.aplicarFiltroCategoria(
      this.productosRepo
        .createQueryBuilder('producto')
        .leftJoinAndSelect('producto.categoria', 'categoria')
        .where('producto.activo = :activo', { activo: true }),
      filtros,
    );
    const lista = await qb
      // TypeORM no resuelve alias dentro de funciones en `orderBy`:
      // `LOWER(producto.nombre)` se interpreta como el alias `LOWER(producto`.
      .addSelect('LOWER(producto.nombre)', 'nombre_lower')
      .orderBy('nombre_lower', 'ASC')
      .addOrderBy('producto.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    return this.conStock(this.ordenarPorNombre(lista));
  }

  async findAllInclusoInactivos(filtros?: FiltrosCategoria) {
    // Listado admin (sin paginación): mismo criterio de orden que el catálogo.
    const qb = this.aplicarFiltroCategoria(
      this.productosRepo
        .createQueryBuilder('producto')
        .leftJoinAndSelect('producto.categoria', 'categoria'),
      filtros,
    );
    const lista = await qb
      .addSelect('LOWER(producto.nombre)', 'nombre_lower')
      .orderBy('nombre_lower', 'ASC')
      .addOrderBy('producto.id', 'ASC')
      .getMany();
    return this.conStock(this.ordenarPorNombre(lista));
  }

  async findOne(id: number) {
    const producto = await this.productosRepo.findOne({
      where: { id },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    const [conStock] = await this.conStock([producto]);
    return conStock;
  }

  /** Evita dos productos con el mismo código: el POS busca por código. */
  private async codigoDisponible(codigo: string, idExcluido?: number) {
    const repetido = await this.productosRepo.findOne({
      where: { codigo, ...(idExcluido ? { id: Not(idExcluido) } : {}) },
    });
    if (repetido) {
      throw new ConflictException(
        `El código ${codigo} ya está asignado a otro producto`,
      );
    }
  }

  /**
   * La columna `categoria_id` no es una propiedad mapeada de `Producto`: se
   * traduce a la relación `categoria` antes de persistir. `null` desasocia la
   * categoría y `undefined` no toca el valor (compatibilidad con clientes
   * antiguos que no envían el campo).
   */
  private async asignarCategoria(
    manager: DataSource['manager'],
    id: number,
    categoriaId: number | null | undefined,
  ) {
    if (categoriaId === undefined) return;
    if (categoriaId === null) {
      await manager.query(
        'UPDATE productos SET categoria_id = NULL WHERE id = $1',
        [id],
      );
      return;
    }
    await manager.update(
      Producto,
      id,
      { categoria: { id: categoriaId } } as unknown as QueryDeepPartialEntity<Producto>,
    );
  }

  async crear(data: DatosCreacionProducto): Promise<Producto> {
    const { categoria_id, ...resto } = data;
    if (resto.codigo) await this.codigoDisponible(resto.codigo);
    return this.dataSource.transaction(async (manager) => {
      const producto = manager.create(Producto, resto);
      const guardado = await manager.save(producto);
      await this.asignarCategoria(manager, guardado.id, categoria_id);
      return guardado;
    });
  }

  /**
   * Actualiza el producto y, si cambia el stock, ajusta `inventario.cantidad`
   * y escribe el movimiento AJUSTE del Kardex en la MISMA transacción.
   * El bloqueo pesimista del renglón evita ajustes concurrentes sobre la misma
   * base. Si falla cualquier paso, se hace rollback de todos.
   */
  async actualizar(
    id: number,
    data: DatosActualizacionProducto,
    usuarioId?: number,
  ): Promise<ResultadoActualizacionProducto> {
    const anterior = await this.findOne(id);
    if (data.codigo) await this.codigoDisponible(data.codigo, id);

    const { stock, cantidad, categoria_id, ...camposProducto } = data;
    if (stock !== undefined && cantidad !== undefined && stock !== cantidad) {
      throw new BadRequestException(
        'Los campos stock y cantidad deben coincidir cuando se envían juntos',
      );
    }
    const stockSolicitado = stock ?? cantidad;
    const campos = camposProducto as QueryDeepPartialEntity<Producto>;

    const resultado = await this.dataSource.transaction(async (manager) => {
      const inventario = await manager
        .getRepository(Inventario)
        .createQueryBuilder('inventario')
        .setLock('pessimistic_write')
        .where('inventario.producto_id = :productoId', { productoId: id })
        .getOne();

      const stockAnterior = inventario ? Number(inventario.cantidad) : 0;

      if (Object.keys(campos).length > 0) {
        await manager.update(Producto, id, campos);
      }
      // Dentro de la misma transacción que el ajuste de stock y el Kardex.
      await this.asignarCategoria(manager, id, categoria_id);

      let stockNuevo = stockAnterior;
      let movimientoRegistrado = false;

      if (stockSolicitado !== undefined && stockSolicitado !== stockAnterior) {
        stockNuevo = stockSolicitado;

        if (inventario) {
          await manager.update(Inventario, inventario.id, {
            cantidad: stockNuevo,
          });
        } else {
          await manager.save(
            manager.create(Inventario, {
              producto_id: id,
              cantidad: stockNuevo,
            }),
          );
        }

        await manager.save(
          manager.create(InventarioMovimiento, {
            producto_id: id,
            tipo: 'AJUSTE',
            // Diferencia con signo: negativa al reducir, positiva al aumentar.
            cantidad: stockNuevo - stockAnterior,
            cantidad_anterior: stockAnterior,
            cantidad_nueva: stockNuevo,
            motivo: MOTIVO_AJUSTE,
            referencia_tipo: 'manual',
            usuario_id: usuarioId ?? null,
          }),
        );
        movimientoRegistrado = true;
      }

      return { stockAnterior, stockNuevo, movimientoRegistrado };
    });

    const actualizado = await this.findOne(id);
    return { anterior, actualizado, ...resultado };
  }

  async desactivar(id: number) {
    await this.findOne(id);
    return this.productosRepo.update(id, { activo: false });
  }

  /**
   * Limpieza idempotente de datos E2E. Solo toca productos `E2E %` y pedidos
   * exclusivamente vinculados a ellos; un pedido mixto jamás se elimina.
   * Se ejecuta entero en una transacción para no dejar huérfanos.
   */
  async limpiarProductosE2E(): Promise<ResultadoLimpiezaE2E> {
    return this.dataSource.transaction(async (manager) => {
      const productos: { id: number }[] = await manager.query(
        "SELECT id FROM productos WHERE nombre LIKE 'E2E %' ORDER BY id",
      );
      const idsProductosE2E = productos.map((f) => Number(f.id));
      if (idsProductosE2E.length === 0) {
        return {
          productos: 0,
          pedidos: 0,
          detalles: 0,
          inventario: 0,
          movimientos: 0,
          deudas: 0,
          visitas: 0,
        };
      }

      const pedidos: { id: number }[] = await manager.query(
        `SELECT DISTINCT d.pedido_id AS id
           FROM detalle_pedido d
          WHERE d.producto_id = ANY($1)
            AND NOT EXISTS (
              SELECT 1 FROM detalle_pedido d2
               WHERE d2.pedido_id = d.pedido_id
                 AND d2.producto_id <> ALL($1)
            )`,
        [idsProductosE2E],
      );
      const idsPedidos = pedidos.map((f) => Number(f.id));

      const detalles: { id: number }[] = idsPedidos.length
        ? await manager.query(
            'SELECT id FROM detalle_pedido WHERE pedido_id = ANY($1)',
            [idsPedidos],
          )
        : [];
      const deudas: { id: number }[] = idsPedidos.length
        ? await manager.query(
            'SELECT id FROM deudas WHERE pedido_id = ANY($1)',
            [idsPedidos],
          )
        : [];
      const visitas: { id: number }[] = idsPedidos.length
        ? await manager.query(
            'SELECT id FROM cliente_visitas WHERE pedido_id = ANY($1)',
            [idsPedidos],
          )
        : [];

      const borrar = async (tabla: string, ids: number[]) => {
        if (ids.length === 0) return;
        await manager.query(`DELETE FROM ${tabla} WHERE id = ANY($1)`, [ids]);
      };

      await borrar('deudas', deudas.map((f) => Number(f.id)));
      await borrar('cliente_visitas', visitas.map((f) => Number(f.id)));
      await borrar('detalle_pedido', detalles.map((f) => Number(f.id)));
      await borrar('pedidos', idsPedidos);

      // Se calcula DESPUÉS de borrar los detalles: los productos que solo
      // aparecían en pedidos E2E ya son eliminables. Si un producto E2E sigue
      // referenciado por un pedido real, se conserva para no romper la FK.
      const eliminables: { id: number }[] = await manager.query(
        `SELECT p.id
           FROM productos p
          WHERE p.id = ANY($1)
            AND NOT EXISTS (
              SELECT 1 FROM detalle_pedido d WHERE d.producto_id = p.id
            )`,
        [idsProductosE2E],
      );
      const idsProductos = eliminables.map((f) => Number(f.id));

      const inventario: { id: number }[] = idsProductos.length
        ? await manager.query(
            'SELECT id FROM inventario WHERE producto_id = ANY($1)',
            [idsProductos],
          )
        : [];
      const movimientos: { id: number }[] = idsProductos.length
        ? await manager.query(
            'SELECT id FROM inventario_movimientos WHERE producto_id = ANY($1)',
            [idsProductos],
          )
        : [];

      await borrar(
        'inventario_movimientos',
        movimientos.map((f) => Number(f.id)),
      );
      await borrar('inventario', inventario.map((f) => Number(f.id)));
      await borrar('productos', idsProductos);

      return {
        productos: idsProductos.length,
        pedidos: idsPedidos.length,
        detalles: detalles.length,
        inventario: inventario.length,
        movimientos: movimientos.length,
        deudas: deudas.length,
        visitas: visitas.length,
      };
    });
  }
}
