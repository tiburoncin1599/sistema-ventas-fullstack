-- Migración para nuevas funcionalidades

-- 1. Tabla de deudas del personal
CREATE TABLE IF NOT EXISTS deudas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  monto DECIMAL(10,2) NOT NULL,
  monto_pagado DECIMAL(10,2) DEFAULT 0,
  descripcion TEXT,
  estado VARCHAR(20) DEFAULT 'pendiente',
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_pago TIMESTAMP,
  factura_url TEXT
);

-- 2. Columna procesado_por en pedidos (quién registró la venta)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS procesado_por INTEGER REFERENCES usuarios(id);
