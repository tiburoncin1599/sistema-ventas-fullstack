-- Limpieza segura de datos generados por Playwright (PROLIMAC SRL).
-- Solo elimina productos cuyo nombre empieza por "E2E " y los pedidos
-- exclusivamente vinculados a esos productos. Los productos reales y los
-- pedidos mixtos quedan intactos. Todo corre en una sola transaccion.
--
-- Uso:
--   docker compose exec -T db psql -U ventas_user -d sistema_ventas \
--     -v ON_ERROR_STOP=1 -f /tmp/limpiar-e2e.sql

BEGIN;

CREATE TEMP TABLE e2e_productos AS
  SELECT id FROM productos WHERE nombre LIKE 'E2E %';

CREATE TEMP TABLE e2e_pedidos AS
  SELECT DISTINCT d.pedido_id AS id
    FROM detalle_pedido d
   WHERE d.producto_id IN (SELECT id FROM e2e_productos)
     AND NOT EXISTS (
       SELECT 1
         FROM detalle_pedido d2
        WHERE d2.pedido_id = d.pedido_id
          AND d2.producto_id NOT IN (SELECT id FROM e2e_productos)
     );

SELECT count(*) AS productos_e2e, (SELECT count(*) FROM e2e_pedidos) AS pedidos_exclusivos
  FROM e2e_productos;

DELETE FROM deudas WHERE pedido_id IN (SELECT id FROM e2e_pedidos);
DELETE FROM cliente_visitas WHERE pedido_id IN (SELECT id FROM e2e_pedidos);
DELETE FROM detalle_pedido WHERE pedido_id IN (SELECT id FROM e2e_pedidos);
DELETE FROM pedidos WHERE id IN (SELECT id FROM e2e_pedidos);

-- Se calcula DESPUES de borrar los detalles: asi los productos que solo
-- aparecian en pedidos E2E pasan a ser eliminables. Un producto referenciado
-- por un pedido real se conserva.
CREATE TEMP TABLE e2e_productos_eliminables AS
  SELECT p.id
    FROM productos p
   WHERE p.id IN (SELECT id FROM e2e_productos)
     AND NOT EXISTS (
       SELECT 1 FROM detalle_pedido d WHERE d.producto_id = p.id
     );

DELETE FROM inventario_movimientos WHERE producto_id IN (SELECT id FROM e2e_productos_eliminables);
DELETE FROM inventario WHERE producto_id IN (SELECT id FROM e2e_productos_eliminables);
DELETE FROM productos WHERE id IN (SELECT id FROM e2e_productos_eliminables);

COMMIT;
