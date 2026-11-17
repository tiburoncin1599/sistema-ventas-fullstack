--
-- PostgreSQL database dump
--

\restrict rMj5L8302QRXoE7FsnWq3mhj7P8aFyUbpw6oKfQPXNNZQBZrd1skiuqImt6sHbH

-- Dumped from database version 18.6 (ac70818)
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auditoria (
    id integer NOT NULL,
    accion character varying(50) NOT NULL,
    entidad character varying(100) NOT NULL,
    entidad_id integer,
    valor_anterior jsonb,
    valor_nuevo jsonb,
    usuario_id integer,
    usuario_nombre character varying(100),
    usuario_rol character varying(50),
    ip character varying(45),
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: auditoria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auditoria_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auditoria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auditoria_id_seq OWNED BY public.auditoria.id;


--
-- Name: categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    imagen_url character varying(500)
);


--
-- Name: categorias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categorias_id_seq OWNED BY public.categorias.id;


--
-- Name: cliente_visitas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cliente_visitas (
    id integer NOT NULL,
    vendedor_id integer NOT NULL,
    cliente_id integer,
    nombre_cliente character varying(150) NOT NULL,
    pedido_id integer,
    latitud double precision NOT NULL,
    longitud double precision NOT NULL,
    "precision" double precision,
    dias_visita text DEFAULT ''::text NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: cliente_visitas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cliente_visitas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cliente_visitas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cliente_visitas_id_seq OWNED BY public.cliente_visitas.id;


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    carnet character varying(20) NOT NULL,
    lugar character varying(100),
    creado_en timestamp without time zone DEFAULT now()
);


--
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;


--
-- Name: configuracion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracion (
    id integer NOT NULL,
    nombre_empresa character varying(200),
    logo_url character varying(500),
    moneda character varying(20) DEFAULT 'Bs'::character varying,
    moneda_simbolo character varying(20),
    impuesto_porcentaje numeric(5,2) DEFAULT 0,
    nit character varying(20),
    direccion character varying(200),
    telefono character varying(50),
    whatsapp character varying(50),
    email_empresa character varying(100),
    qr_bancario_url character varying(500),
    terminos_condiciones character varying(500),
    notificaciones_stock boolean DEFAULT true,
    stock_minimo_alerta integer DEFAULT 5,
    modo_oscuro boolean DEFAULT false
);


--
-- Name: configuracion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.configuracion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: configuracion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.configuracion_id_seq OWNED BY public.configuracion.id;


--
-- Name: detalle_pedido; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalle_pedido (
    id integer NOT NULL,
    pedido_id integer,
    producto_id integer,
    cantidad integer NOT NULL,
    precio_unitario numeric(10,2) NOT NULL
);


--
-- Name: detalle_pedido_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.detalle_pedido_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_pedido_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalle_pedido_id_seq OWNED BY public.detalle_pedido.id;


--
-- Name: deudas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deudas (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    monto numeric(10,2) NOT NULL,
    monto_pagado numeric(10,2) DEFAULT 0,
    descripcion text,
    estado character varying(20) DEFAULT 'pendiente'::character varying,
    fecha_creacion timestamp without time zone DEFAULT now(),
    fecha_pago timestamp without time zone,
    factura_url text,
    vendedor_id integer
);


--
-- Name: deudas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.deudas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: deudas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.deudas_id_seq OWNED BY public.deudas.id;


--
-- Name: inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario (
    id integer NOT NULL,
    producto_id integer,
    cantidad integer DEFAULT 0 NOT NULL,
    cantidad_minima integer DEFAULT 5,
    ubicacion character varying(100)
);


--
-- Name: inventario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventario_id_seq OWNED BY public.inventario.id;


--
-- Name: inventario_movimientos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario_movimientos (
    id integer NOT NULL,
    producto_id integer NOT NULL,
    tipo character varying(20) NOT NULL,
    cantidad integer NOT NULL,
    cantidad_anterior integer,
    cantidad_nueva integer,
    costo_unitario numeric(10,2),
    motivo character varying(255),
    referencia_id integer,
    referencia_tipo character varying(50),
    usuario_id integer,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: inventario_movimientos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventario_movimientos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventario_movimientos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventario_movimientos_id_seq OWNED BY public.inventario_movimientos.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: pedidos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pedidos (
    id integer NOT NULL,
    usuario_id integer,
    total numeric(10,2) NOT NULL,
    estado character varying(30) DEFAULT 'pendiente'::character varying,
    direccion_entrega text,
    notas text,
    creado_en timestamp without time zone DEFAULT now(),
    procesado_por integer
);


--
-- Name: pedidos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pedidos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pedidos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pedidos_id_seq OWNED BY public.pedidos.id;


--
-- Name: productos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.productos (
    id integer NOT NULL,
    nombre character varying(200) NOT NULL,
    descripcion text,
    precio numeric(10,2) NOT NULL,
    precio_costo numeric(10,2),
    imagen_url character varying(500),
    categoria_id integer,
    activo boolean DEFAULT true,
    creado_en timestamp without time zone DEFAULT now(),
    precio_por_docena numeric(10,2),
    tamano character varying(50),
    codigo character varying(50)
);


--
-- Name: productos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.productos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.productos_id_seq OWNED BY public.productos.id;


--
-- Name: proveedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proveedores (
    id integer NOT NULL,
    nombre character varying(200) NOT NULL,
    nit character varying(20),
    telefono character varying(50),
    email character varying(100),
    direccion character varying(200),
    contacto_nombre character varying(200),
    contacto_telefono character varying(50),
    notas character varying(500),
    activo boolean DEFAULT true,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: proveedores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proveedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proveedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proveedores_id_seq OWNED BY public.proveedores.id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    token character varying(500) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    revocado boolean DEFAULT false,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: seguimientos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seguimientos (
    usuario_id integer NOT NULL,
    activo boolean DEFAULT false NOT NULL,
    iniciado_en timestamp without time zone,
    ultima_actualizacion_en timestamp without time zone,
    latitud double precision,
    longitud double precision,
    "precision" double precision
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    rol character varying(20) DEFAULT 'cliente'::character varying,
    telefono character varying(20),
    activo boolean DEFAULT true,
    creado_en timestamp without time zone DEFAULT now(),
    carnet character varying(50),
    ubicacion character varying(255),
    google_id character varying(255)
);


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: vendedor_ubicaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendedor_ubicaciones (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    latitud double precision NOT NULL,
    longitud double precision NOT NULL,
    "precision" double precision,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: vendedor_ubicaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendedor_ubicaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendedor_ubicaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendedor_ubicaciones_id_seq OWNED BY public.vendedor_ubicaciones.id;


--
-- Name: auditoria id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria ALTER COLUMN id SET DEFAULT nextval('public.auditoria_id_seq'::regclass);


--
-- Name: categorias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias ALTER COLUMN id SET DEFAULT nextval('public.categorias_id_seq'::regclass);


--
-- Name: cliente_visitas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_visitas ALTER COLUMN id SET DEFAULT nextval('public.cliente_visitas_id_seq'::regclass);


--
-- Name: clientes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);


--
-- Name: configuracion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion ALTER COLUMN id SET DEFAULT nextval('public.configuracion_id_seq'::regclass);


--
-- Name: detalle_pedido id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_pedido ALTER COLUMN id SET DEFAULT nextval('public.detalle_pedido_id_seq'::regclass);


--
-- Name: deudas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deudas ALTER COLUMN id SET DEFAULT nextval('public.deudas_id_seq'::regclass);


--
-- Name: inventario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario ALTER COLUMN id SET DEFAULT nextval('public.inventario_id_seq'::regclass);


--
-- Name: inventario_movimientos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimientos ALTER COLUMN id SET DEFAULT nextval('public.inventario_movimientos_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: pedidos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos ALTER COLUMN id SET DEFAULT nextval('public.pedidos_id_seq'::regclass);


--
-- Name: productos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos ALTER COLUMN id SET DEFAULT nextval('public.productos_id_seq'::regclass);


--
-- Name: proveedores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores ALTER COLUMN id SET DEFAULT nextval('public.proveedores_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: vendedor_ubicaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendedor_ubicaciones ALTER COLUMN id SET DEFAULT nextval('public.vendedor_ubicaciones_id_seq'::regclass);


--
-- Data for Name: auditoria; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auditoria (id, accion, entidad, entidad_id, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, ip, creado_en) FROM stdin;
1	actualizar	inventario	\N	\N	{"raw": [], "affected": 1, "generatedMaps": []}	1	\N	admin	::1	2026-08-25 16:08:55.082076
2	actualizar	inventario	\N	\N	{"raw": [], "affected": 1, "generatedMaps": []}	1	\N	admin	::1	2026-08-25 16:09:12.385522
3	actualizar	inventario	\N	\N	{"raw": [], "affected": 1, "generatedMaps": []}	1	\N	admin	::1	2026-08-25 16:09:19.222733
4	actualizar	inventario	\N	\N	{"raw": [], "affected": 1, "generatedMaps": []}	1	\N	admin	::1	2026-08-25 16:09:27.535539
5	actualizar	inventario	\N	\N	{"raw": [], "affected": 1, "generatedMaps": []}	1	\N	admin	::1	2026-08-25 16:09:36.298243
6	actualizar	inventario	\N	\N	{"raw": [], "affected": 1, "generatedMaps": []}	1	\N	admin	::1	2026-08-25 16:09:41.576335
7	actualizar	inventario	\N	\N	{"raw": [], "affected": 1, "generatedMaps": []}	1	\N	admin	::1	2026-08-25 16:09:45.441791
8	actualizar	inventario	\N	\N	{"raw": [], "affected": 1, "generatedMaps": []}	1	\N	admin	::1	2026-08-25 16:09:49.613961
9	actualizar	inventario	\N	\N	{"raw": [], "affected": 1, "generatedMaps": []}	1	\N	admin	::1	2026-08-25 16:09:54.612931
10	actualizar	inventario	\N	\N	{"raw": [], "affected": 1, "generatedMaps": []}	1	\N	admin	::1	2026-08-25 16:09:59.068902
11	actualizar	inventario	\N	\N	{"raw": [], "affected": 1, "generatedMaps": []}	1	\N	admin	::1	2026-08-25 16:10:02.283655
12	actualizar	inventario	\N	\N	{"raw": [], "affected": 1, "generatedMaps": []}	1	\N	admin	::1	2026-08-25 16:10:07.501775
13	crear	usuarios	2	\N	{"id": 2, "rol": "inventario", "email": "inventario@sistema.com", "activo": true, "carnet": null, "nombre": "Inventario", "telefono": null, "creado_en": "2026-08-25T20:14:14.075Z", "google_id": null, "ubicacion": null}	1	\N	admin	::1	2026-08-25 16:14:14.492853
14	crear	usuarios	50	\N	{"id": 50, "rol": "ventas", "email": "ven1@gmail.com", "activo": true, "carnet": null, "nombre": "noemi", "telefono": null, "creado_en": "2026-09-08T18:20:10.566Z", "google_id": null, "ubicacion": null}	1	\N	admin	::1	2026-09-08 14:20:11.245181
15	crear	clientes	51	\N	{"id": 51, "rol": "cliente", "email": "cliente_1788883210847@tienda.com", "activo": true, "carnet": "", "nombre": "andres", "telefono": "70000000", "creado_en": "2026-09-08T20:00:13.081Z", "google_id": null, "ubicacion": "punata y lanza"}	50	\N	ventas	::1	2026-09-08 16:00:13.553809
16	crear	ubicaciones	1	\N	{"id": 1, "latitud": -17.402382183912906, "longitud": -66.15209877490999, "creado_en": "2026-09-08T20:00:14.736Z", "pedido_id": null, "precision": null, "cliente_id": 51, "dias_visita": ["lunes", "miercoles", "viernes"], "vendedor_id": 50, "pedido_total": null, "pedido_estado": null, "nombre_cliente": "andres", "direccion_entrega": null}	50	\N	ventas	::1	2026-09-08 16:00:15.256623
17	crear	pedidos	16	\N	{"id": 16, "notas": "", "total": 39, "estado": "pendiente", "usuario": {"id": 51, "rol": "cliente", "email": "cliente_1788883210847@tienda.com", "activo": true, "carnet": "", "nombre": "andres", "telefono": "70000000", "creado_en": "2026-09-08T20:00:13.081Z", "google_id": null, "ubicacion": "punata y lanza", "password_hash": "$2b$10$nMTFuk.oPm2eqntTKvfGpOKla9488Fhq1Xb2BYwbzokAX2cF1O7Ri"}, "creado_en": "2026-09-08T20:10:01.925Z", "procesador": {"id": 50, "rol": "ventas", "email": "ven1@gmail.com", "activo": true, "carnet": null, "nombre": "noemi", "telefono": null, "creado_en": "2026-09-08T18:20:10.566Z", "google_id": null, "ubicacion": null, "password_hash": "$2b$10$.PVGb3v3apLkHepXUqZkEug01F9W45IBc/5DkQrBOPARUUXVaZOhy"}, "usuario_id": 51, "procesado_por": 50, "direccion_entrega": "punata y lanza"}	50	\N	ventas	::1	2026-09-08 16:10:05.12486
18	actualizar	pedidos	16	\N	{"id": 16, "notas": "", "total": 39, "estado": "confirmado", "usuario": {"id": 51, "rol": "cliente", "email": "cliente_1788883210847@tienda.com", "activo": true, "carnet": "", "nombre": "andres", "telefono": "70000000", "creado_en": "2026-09-08T20:00:13.081Z", "google_id": null, "ubicacion": "punata y lanza", "password_hash": "$2b$10$nMTFuk.oPm2eqntTKvfGpOKla9488Fhq1Xb2BYwbzokAX2cF1O7Ri"}, "creado_en": "2026-09-08T20:10:01.925Z", "procesador": {"id": 50, "rol": "ventas", "email": "ven1@gmail.com", "activo": true, "carnet": null, "nombre": "noemi", "telefono": null, "creado_en": "2026-09-08T18:20:10.566Z", "google_id": null, "ubicacion": null, "password_hash": "$2b$10$.PVGb3v3apLkHepXUqZkEug01F9W45IBc/5DkQrBOPARUUXVaZOhy"}, "usuario_id": 51, "procesado_por": 50, "direccion_entrega": "punata y lanza"}	50	\N	ventas	::1	2026-09-08 16:10:57.543799
19	crear	ubicaciones	\N	\N	{"activo": true, "latitud": null, "longitud": null, "precision": null, "usuario_id": 50, "iniciado_en": "2026-09-08T16:11:05.587Z", "ultima_actualizacion_en": null}	50	\N	ventas	::1	2026-09-08 16:11:07.93502
20	eliminar	productos	3	\N	\N	1	\N	admin	::1	2026-09-08 16:18:09.211043
21	actualizar	productos	3	\N	{"raw": [], "affected": 1, "generatedMaps": []}	1	\N	admin	::1	2026-09-08 16:18:12.016694
22	crear	pedidos	17	\N	{"id": 17, "notas": "", "total": 1194, "estado": "pendiente", "usuario": {"id": 52, "rol": "cliente", "email": "angel@gmail.com", "activo": true, "carnet": null, "nombre": "angel", "telefono": null, "creado_en": "2026-09-10T21:32:00.950Z", "google_id": null, "ubicacion": null, "password_hash": "$2b$10$cAxpHUnlNbT7CjcQwCMQA.pqS.1yvhZf5pdFQ//8YY7Mc2y9C/nSa"}, "creado_en": "2026-09-10T21:34:14.084Z", "procesador": null, "usuario_id": 52, "procesado_por": null, "direccion_entrega": ""}	52	\N	cliente	::1	2026-09-10 17:34:17.98332
23	actualizar	inventario	\N	\N	{"raw": [], "affected": 1, "generatedMaps": []}	1	\N	admin	::1	2026-09-15 16:35:39.714177
24	actualizar	pedidos	17	\N	{"id": 17, "notas": "", "total": 1194, "estado": "confirmado", "usuario": {"id": 52, "rol": "cliente", "email": "angel@gmail.com", "activo": true, "carnet": null, "nombre": "angel", "telefono": null, "creado_en": "2026-09-10T17:32:00.950Z", "google_id": null, "ubicacion": null, "password_hash": "$2b$10$cAxpHUnlNbT7CjcQwCMQA.pqS.1yvhZf5pdFQ//8YY7Mc2y9C/nSa"}, "creado_en": "2026-09-10T17:34:14.084Z", "procesador": null, "usuario_id": 52, "procesado_por": null, "direccion_entrega": ""}	1	\N	admin	10.31.0.171	2026-10-30 17:11:55.384743
25	eliminar	pedidos	17	\N	\N	1	\N	admin	10.26.23.136	2026-10-30 17:11:59.448836
26	eliminar	pedidos	16	\N	\N	1	\N	admin	10.26.23.136	2026-10-30 17:12:02.441928
\.


--
-- Data for Name: categorias; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categorias (id, nombre, descripcion, imagen_url) FROM stdin;
2	Limpieza	\N	\N
3	Categ Actualizada 1788535717400	Categoría de prueba	\N
4	Categ Actualizada 1788535903532	Categoría de prueba	\N
5	Categ Actualizada 1788536720733	Categoría de prueba	\N
6	Categ Actualizada 1788539557854	Categoría de prueba	\N
7	Categ Actualizada 1788539621944	Categoría de prueba	\N
\.


--
-- Data for Name: cliente_visitas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cliente_visitas (id, vendedor_id, cliente_id, nombre_cliente, pedido_id, latitud, longitud, "precision", dias_visita, creado_en) FROM stdin;
1	50	51	andres	\N	-17.402382183912906	-66.15209877490999	\N	lunes,miercoles,viernes	2026-09-08 16:00:14.736061
\.


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clientes (id, nombre, carnet, lugar, creado_en) FROM stdin;
\.


--
-- Data for Name: configuracion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.configuracion (id, nombre_empresa, logo_url, moneda, moneda_simbolo, impuesto_porcentaje, nit, direccion, telefono, whatsapp, email_empresa, qr_bancario_url, terminos_condiciones, notificaciones_stock, stock_minimo_alerta, modo_oscuro) FROM stdin;
\.


--
-- Data for Name: detalle_pedido; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.detalle_pedido (id, pedido_id, producto_id, cantidad, precio_unitario) FROM stdin;
\.


--
-- Data for Name: deudas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.deudas (id, usuario_id, monto, monto_pagado, descripcion, estado, fecha_creacion, fecha_pago, factura_url, vendedor_id) FROM stdin;
\.


--
-- Data for Name: inventario; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventario (id, producto_id, cantidad, cantidad_minima, ubicacion) FROM stdin;
4	4	88	5	\N
6	6	50	5	\N
5	5	50	5	\N
9	9	50	5	\N
7	7	50	5	\N
12	12	50	5	\N
8	8	50	5	\N
10	10	50	5	\N
11	11	50	5	\N
3	3	50	5	\N
13	13	50	5	\N
14	14	50	5	\N
\.


--
-- Data for Name: inventario_movimientos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventario_movimientos (id, producto_id, tipo, cantidad, cantidad_anterior, cantidad_nueva, costo_unitario, motivo, referencia_id, referencia_tipo, usuario_id, creado_en) FROM stdin;
19	3	venta	1	\N	\N	\N	\N	16	pedido	\N	2026-09-08 16:10:01.925634
20	8	venta	1	\N	\N	\N	\N	16	pedido	\N	2026-09-08 16:10:01.925634
21	11	venta	1	\N	\N	\N	\N	16	pedido	\N	2026-09-08 16:10:01.925634
22	4	venta	48	\N	\N	\N	\N	17	pedido	\N	2026-09-10 17:34:14.084217
23	8	venta	12	\N	\N	\N	\N	17	pedido	\N	2026-09-10 17:34:14.084217
24	6	venta	3	\N	\N	\N	\N	17	pedido	\N	2026-09-10 17:34:14.084217
25	9	venta	6	\N	\N	\N	\N	17	pedido	\N	2026-09-10 17:34:14.084217
26	12	venta	3	\N	\N	\N	\N	17	pedido	\N	2026-09-10 17:34:14.084217
27	4	devolucion	48	\N	\N	\N	Pedido eliminado	17	pedido	\N	2026-10-30 17:11:59.322551
28	6	devolucion	3	\N	\N	\N	Pedido eliminado	17	pedido	\N	2026-10-30 17:11:59.322551
29	8	devolucion	12	\N	\N	\N	Pedido eliminado	17	pedido	\N	2026-10-30 17:11:59.322551
30	9	devolucion	6	\N	\N	\N	Pedido eliminado	17	pedido	\N	2026-10-30 17:11:59.322551
31	12	devolucion	3	\N	\N	\N	Pedido eliminado	17	pedido	\N	2026-10-30 17:11:59.322551
32	8	devolucion	1	\N	\N	\N	Pedido eliminado	16	pedido	\N	2026-10-30 17:12:02.331353
33	11	devolucion	1	\N	\N	\N	Pedido eliminado	16	pedido	\N	2026-10-30 17:12:02.331353
34	3	devolucion	1	\N	\N	\N	Pedido eliminado	16	pedido	\N	2026-10-30 17:12:02.331353
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.migrations (id, "timestamp", name) FROM stdin;
15	1717000000000	CreateAuditoria1717000000000
16	1717000000001	CreateConfiguracion1717000000001
17	1717000000002	CreateInventarioMovimientos1717000000002
18	1717000000003	CreateProveedores1717000000003
19	1717000000004	CreateRefreshTokens1717000000004
20	1717000000005	CreateUbicaciones1717000000005
21	1717000000006	CreateClienteVisitas1717000000006
22	1717000000007	AddVendedorIdDeudas1717000000007
23	1717000000008	AddCodigoProductos1717000000008
\.


--
-- Data for Name: pedidos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pedidos (id, usuario_id, total, estado, direccion_entrega, notas, creado_en, procesado_por) FROM stdin;
\.


--
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.productos (id, nombre, descripcion, precio, precio_costo, imagen_url, categoria_id, activo, creado_en, precio_por_docena, tamano, codigo) FROM stdin;
4	Limpia Baños Gatillo 860ml	Super Activo limpia baños	18.00	12.00	/uploads/productos/ba%C3%B1os_gatillo.png	2	t	2026-08-25 13:57:45.418701	\N	860ml	\N
5	Limpia Baños Recarga 860ml	Super Activo limpia baños	15.00	10.00	/uploads/productos/ba%C3%B1os_recarga.png	2	t	2026-08-25 13:57:45.886738	\N	860ml	\N
6	Antigrasa Gatillo 860ml	Super Activo antigrasa	18.00	12.00	/uploads/productos/grasa-gatillo.png	2	t	2026-08-25 13:57:46.352603	\N	860ml	\N
7	Antigrasa Recarga 860ml	Super Activo antigrasa	15.00	10.00	/uploads/productos/grasa-recarga.png	2	t	2026-08-25 13:57:46.818896	\N	860ml	\N
8	Lavandina Cloro 1lt	Activo lavandina cloro	12.00	8.00	/uploads/productos/lavandina-1lt.png	2	t	2026-08-25 13:57:47.285032	\N	1lt	\N
9	Piso Floral 1lt	Super Activo desinfectante de piso	14.00	9.00	/uploads/productos/piso-floral.png	2	t	2026-08-25 13:57:47.751533	\N	1lt	\N
10	Piso Lavanda 1lt	Super Activo desinfectante de piso	14.00	9.00	/uploads/productos/piso-lavanda.png	2	t	2026-08-25 13:57:48.245718	\N	1lt	\N
11	Piso Pino 1lt	Super Activo desinfectante de piso	12.00	9.00	/uploads/productos/piso-pino.png	2	t	2026-08-25 13:57:48.712476	\N	1lt	\N
12	Lavavajillas Limón 1lt	Super Activo lavavajilla	16.00	11.00	/uploads/productos/vajillero-1lt.png	2	t	2026-08-25 13:57:49.186748	\N	1lt	\N
13	Limpia Vidrios Gatillo 860ml	Super Activo 3D limpia vidrios	18.00	12.00	/uploads/productos/vidrios-gatillo.png	2	t	2026-08-25 13:57:49.959371	\N	860ml	\N
14	Limpia Vidrios Recarga 860ml	Super Activo 3D limpia vidrios	15.00	10.00	/uploads/productos/vidrios-recarga.png	2	t	2026-08-25 13:57:50.43145	\N	860ml	\N
3	Alcohol en Gel Amare 360ml	Sanitizador alcohol en gel	15.00	10.00	/uploads/productos/alcohol.png	2	t	2026-08-25 13:57:44.935724	\N	360ml	\N
\.


--
-- Data for Name: proveedores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.proveedores (id, nombre, nit, telefono, email, direccion, contacto_nombre, contacto_telefono, notas, activo, creado_en, actualizado_en) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, usuario_id, token, expires_at, revocado, creado_en) FROM stdin;
1	1	e799df5a338d3296618b4024b1f149494ec1ab55644479c31ebb40bcb0bc341056029c9222c9c898	2026-09-23 14:15:45.943	t	2026-08-24 18:15:39.395842
2	1	33d691b40282b0e5e992b193d5b49bcc8d72ec52036e0405014a9dbc46067fa7ea76be1ac38506ff	2026-09-24 10:17:48.034	t	2026-08-25 14:17:39.939907
3	1	489311f815571fbb4dd38104477ea8e050280a9c05c702bd4fa9c8cce028cf1365184f12c34c5903	2026-09-24 10:25:06.536	t	2026-08-25 14:24:58.450898
4	1	481f92b1afdd815470f2b5e68fadeab505e24bd5218831bc1a3d62a3449bed6f2dec8c26c08bc730	2026-09-24 10:28:53.916	t	2026-08-25 14:28:45.831319
5	1	02838135a9244299a1ddf3d3ec107e99b7436243cc4e29d6dbe24b8629ae9f43b64c3cfdd20aae91	2026-09-24 10:44:15.905	t	2026-08-25 14:44:07.848976
6	1	ec1cd9a7d7df6e2bf363c5cd01ceb338e71c89d3a3cb8bad80e8eb30b40970b523e27712d17fa408	2026-09-24 10:46:33.144	t	2026-08-25 14:46:25.123386
7	1	f143306d5384946b1ccbc8a499a283e76dce4a87b6b0946e60075754150964f7958dd9bd2605b735	2026-09-24 11:07:59.151	t	2026-08-25 15:07:51.145801
8	1	03f80b0c37da9becae7bb742785eed8d07b2e5194907ec2c226b34d9bb276d894c43425d4e19e19f	2026-09-24 11:15:37.746	t	2026-08-25 15:15:29.733204
9	1	85e401a50beb258684b9e2ecae158d07631c3ce0fe154b5a6a0fa2a8ca1fae9ad095c8eb149a3ccf	2026-09-24 11:16:00.54	t	2026-08-25 15:15:52.527488
10	1	8cb28052b59bf537a0980df432b1222c53ee9e5875e1972f44f9e299d41d56f7ce4d321d8ee88729	2026-09-24 11:18:41.445	t	2026-08-25 15:18:33.439495
11	1	6a63d3979dfe6c852133c7a1fc193d16bc2bf2e45d076f9f4a80301b14e9fa0be1ce52825ade413c	2026-09-24 11:20:36.6	t	2026-08-25 15:20:28.592561
12	1	71e1f97a66fe411e94a5aa80ad6ee22d61d3646f268294911eddedebb9f6dad98dd1047ed23dc21b	2026-09-24 11:20:44.345	t	2026-08-25 15:20:36.335312
13	1	0a84d5776146f01142a1cfeb8777b3e59896972f48c3a715f3bf6c15fc4aeca7cd4aa9f09d533ba6	2026-09-24 11:24:18.559	t	2026-08-25 15:24:10.558054
14	1	388bc0d34e2090bc1e2428f7e36b40e88718305c4d2a6c99eef7d6af095107e46652ac6fc76bb9b5	2026-09-24 11:25:55.859	t	2026-08-25 15:25:47.864164
15	1	77ddf7243f602dc5ede3b2fa0335df1a3f16cc954d792d8ab3dbb8e6702d8d4a4ef20e17d0504d53	2026-09-24 11:27:58.776	t	2026-08-25 15:27:50.788523
16	1	dc4b5bd5ed9be23d78a0782566fcce669bb83ed4be9f2912b0c78e4a16ac830ec5cacafb8e385294	2026-09-24 11:30:47.656	t	2026-08-25 15:30:39.665333
17	1	a8cab3ce7d3559c79def31ab3dd1fd692abe503960df9f47ae483acf36067e6b1db87bfbc5eedb7e	2026-09-24 12:07:49.81	t	2026-08-25 16:07:41.866899
19	3	54a6ebe3415e15d8a57fa8bea95cbc49812a84a39436f58668b6dab4c121c47d6c2202874274ddc1	2026-10-04 11:25:10.312	f	2026-09-04 15:25:01.383093
20	4	ab2a1aa98c59ee0fc5bfee9dec3ec086abe3f0db30f3df07434471f23cf2df52233c11f289c1052c	2026-10-04 11:25:12.113	f	2026-09-04 15:25:03.188676
21	3	0c7e6928f3b6fba18a3e42da17fd74da4fd3d2d61d97aeba874a5449d494a258b6f3d04db7e31d35	2026-10-04 11:25:12.911	f	2026-09-04 15:25:04.012225
22	5	5878f57e4af2df0ae31dc2fdb9e1659b3e2614c0e70cf71a4cbcf750886df0b5fa913bcbe61fea93	2026-10-04 11:28:39.776	f	2026-09-04 15:28:30.848737
23	5	c5c15aef57e947c809936838e20d3b5ed6133ae5dcbeed13c800be6dd6e4860fad316c7dc0dd8ed5	2026-10-04 11:28:40.552	f	2026-09-04 15:28:31.624728
24	6	36cd60c8294f069ade77ba7cb61196a3dfe7efd05b0edd00923f00bed9d579d3bb9132871d24421d	2026-10-04 11:28:42.141	f	2026-09-04 15:28:33.213719
25	7	ef21d509780b5a3c87694872a10656e1a0f516ecfe50cbe6ed46595457b40db75a0aba0d4bf72fe4	2026-10-04 11:28:43.618	f	2026-09-04 15:28:34.690186
26	8	bd806c5f0d2d7d550b9b4893191e6c7ec4de070a8404becc2456bbb9a0b3bab8a47985309fb6805d	2026-10-04 11:28:44.624	f	2026-09-04 15:28:35.698331
27	5	0789f40063725ad734837bec9141fdb1d44704e14ee35e7d8d3849b74ae1d03dc7f35ad7db2a3ff2	2026-10-04 11:28:45.264	f	2026-09-04 15:28:36.337745
28	11	15724d835e8d4362cf46602beeb63e85f1de647d710324ee799c3fc0ee4c637f51904bb288bd7b9c	2026-10-04 11:31:46.036	f	2026-09-04 15:31:37.113811
29	11	2c87fd8a3e3f07a8ac6be32454b6beada262a80441b746c8742d4fbeca4dd804f9235678c25efece	2026-10-04 11:31:46.862	f	2026-09-04 15:31:37.941091
30	12	f4f6e1e1ba65276b96c231bfd666ddbb2028002d87b0ecde5288164c6f9a7471f974669c5e08b531	2026-10-04 11:31:48.436	f	2026-09-04 15:31:39.517166
31	13	3f8d6754ad7b550a0f691865d1b30f99e718f29cfc212be36c86b668696b96a082c9f3c305a6b94b	2026-10-04 11:31:49.983	f	2026-09-04 15:31:41.059029
32	14	b437a30f6c9d23bd96309e7bf460094ffd8e34bb1de5350919f567ec6abcdd890252d959ea64a3a5	2026-10-04 11:31:51.206	f	2026-09-04 15:31:42.286358
33	11	2b5dea3a28fe5370193a1df163000cd3e84a54a5dc282c9ddeb4ccb426acd8fb3b0a77c3e926ca92	2026-10-04 11:31:51.943	f	2026-09-04 15:31:43.022832
34	17	89350b322a6c2c38a9b7071c94bee06bef764c867c033cd762789bbed88803dd5524fcdddfcd7e78	2026-10-04 11:33:22.592	f	2026-09-04 15:33:13.672521
35	17	bfb93b1dae62811dd09ee4d28df4aeb13b313191e87e119b7900482aa7c4c69c1495d51073abc1c1	2026-10-04 11:33:23.339	f	2026-09-04 15:33:14.420163
36	18	49d2aa06f7853233f2fabad26e46236f4028e17156d348d55bdf788213a4fedbada5c38a917ff566	2026-10-04 11:33:24.819	f	2026-09-04 15:33:15.90167
37	19	e5cd571bb74fbb538e87568a1b4e7bc4c04c23255efb3353809f3dc9d1aa98c560876af0a5b37b86	2026-10-04 11:33:26.408	f	2026-09-04 15:33:17.489778
38	20	f39084b026dca99c7996a485a75dcb652b2852b0948614c544ac8f471c5ba4a174c3fbaf01ea8222	2026-10-04 11:33:27.508	f	2026-09-04 15:33:18.594942
18	2	2c97615f12f8be33fed7a4e703c7676c720f0630bcc70251d781a5e11579a41c70a0c964813dc1cc	2026-09-24 12:14:32.585	t	2026-08-25 16:14:24.646578
39	17	77060b9be3e356dc223cbe32e45b821d4ef9249717ef8d406e17c55cbc5f86cbd2b169e50774f407	2026-10-04 11:33:28.219	f	2026-09-04 15:33:19.310895
40	21	3895872272b7b79f71e515f784ebfee539a53e87ea00db11a1be928e8bce8266f4777c429e751055	2026-10-04 11:35:21.5	f	2026-09-04 15:35:12.580302
41	21	169afe160b4892981e251d69f6914e8219b442e0fd200ea30c117647923e74c404f2d4b26cbc27e8	2026-10-04 11:35:22.363	f	2026-09-04 15:35:13.443654
42	22	5753cb58972ba514a3a52ad11dfebd251b86dd891385560a13db1a86a78d51ae60514079b606ba6f	2026-10-04 11:35:23.78	f	2026-09-04 15:35:14.862608
43	23	9ee7df6e9ac2fecff3be2e4f0fddeff95c4980daa8110ef420b730bace5bc8f621cdc49d0ea9e653	2026-10-04 11:35:25.244	f	2026-09-04 15:35:16.326446
44	24	925c655cdb571296472af0490271bf3659034cbd7b85e888ad7d7c72a45cdb2f6aa0d880c8d0b316	2026-10-04 11:35:26.45	f	2026-09-04 15:35:17.546861
45	21	0f0034c935678d94e0988db31552991bd9c34920f535527eb6e7c62920782bb265a024de6eb0a6a4	2026-10-04 11:35:27.099	f	2026-09-04 15:35:18.17934
46	25	3548ddb9f324a59fee06d48bc66a25f23673e2ba4f78b1923390f4c7670a2eebbff85b989912c87d	2026-10-04 11:45:23.114	f	2026-09-04 15:45:14.218753
47	25	9e8174dca9132f61bca3d0322c5c0600e8309ea3390a400624f319adf3b3a947e19ab99fe4e47d73	2026-10-04 11:45:23.919	f	2026-09-04 15:45:15.027852
48	26	4aa8ea044e44cd23c2e033fcc8d71bdf04ee3bd9fb0ec0446c1d60aeabf8a4ce8a44d6cfb380a296	2026-10-04 11:45:25.447	f	2026-09-04 15:45:16.549011
49	27	631489a3eebed08aadd5df00d13c165be2c960a19bf178fd81d31260d84bcd5f5c3df2c6e3510002	2026-10-04 11:45:26.919	f	2026-09-04 15:45:18.025916
50	28	ef7f389a34fe70f32d746cf13e2f6966bb405207d00bb78c1b89d295e24c65582423ddbc5abc93a0	2026-10-04 11:45:27.974	f	2026-09-04 15:45:19.082755
51	25	a86dad8ba0b9d764d0e0f85ff3a5784bd3b9f87dd9106a44858d3076c0804a74bc33011135938a35	2026-10-04 11:45:28.824	f	2026-09-04 15:45:19.926128
52	29	c8ecb0efff3ba1bdb5f7aec81a847b2b0fb5d3d08ed6f6597c9ab869493c4b946caea925240768c2	2026-10-04 11:45:30.32	f	2026-09-04 15:45:21.421208
53	32	8a72fb72e45fcc92110332cb17e040b427e91890aaff3bc657c2cda77703c3408752c0eb31c3e1ae	2026-10-04 12:30:48.295	f	2026-09-04 16:30:39.466568
54	32	6020762f9d6c20df52333667312df0169298eaff8940ffd8d2a955b27d4d60d3dbc07fb60ef846c4	2026-10-04 12:30:49.205	f	2026-09-04 16:30:40.378641
55	33	60bc5888e2ebc7a59fd25f0778546948edf6eb379765614e1737aec47196dc247c0084d9e9a40af6	2026-10-04 12:30:50.629	f	2026-09-04 16:30:41.801307
56	34	d746a8bf60fec687ea06ee00247ed31f842df017ebd68bd236e0637edcc03d60e9e93f24f1fe675e	2026-10-04 12:30:52.027	f	2026-09-04 16:30:43.200385
57	35	d226e2d3933496fb8db0dd6d88fcebd5f64c06bec170edf22385d924311f7ab5ff4ee80a499f6ed7	2026-10-04 12:30:53.234	f	2026-09-04 16:30:44.412274
59	36	34cfaaa6c5061d3e45d0d1676b93d8b4fa3a0ccf56009de02aa1d1e3079ed15d42f4173a2895d886	2026-10-04 12:32:40.269	f	2026-09-04 16:32:31.443357
60	36	f6bd367e487fc0cde94b2d35caa0f46e54c353e4b7a107f6a87cb278edb28c3b2786c52bd29e01c0	2026-10-04 12:32:41.043	f	2026-09-04 16:32:32.21784
61	37	7a729c1f02c6046c63566e35ea9d2d7897f05e7f799f0c10626998d1a546c536c30710436e8922fe	2026-10-04 12:32:42.62	f	2026-09-04 16:32:33.795095
62	38	88c557312aafe827e125615b2fcf6533c165506fc66058faa488c322624d06c6ec76d15805e575ce	2026-10-04 12:32:44.007	f	2026-09-04 16:32:35.190832
63	39	2d38c6c77fd4ca0ff75cb6d61c889ef602b1a50d7eb89cb14284cdae3ba8da860ed60bfc030d77ea	2026-10-04 12:32:45.07	f	2026-09-04 16:32:36.247839
64	36	9059db6be431c645b6af20a0bd5de0719e8c7efdbadba22b8dcae9f3adc8e2b2d331a74fa6d9ad1f	2026-10-04 12:32:45.821	f	2026-09-04 16:32:36.997859
65	40	25d41259d3b2637808954297cca2e997a6abc8b6c4c9f2a254632030c6931ebf09311f3061684a75	2026-10-04 12:32:47.299	f	2026-09-04 16:32:38.473369
66	43	5d011509d18e43b7b87cfda7475af0bf1c221e617e0e0198db1f44cb3770fd86d41b0f46ef916350	2026-10-04 12:33:44.174	f	2026-09-04 16:33:35.349061
67	43	65bf761cb91f6054539672fc2fa52bef62a309b1c46b1dde37b0f5f099a74a14dc3817c74b9fe0c4	2026-10-04 12:33:44.938	f	2026-09-04 16:33:36.114196
68	44	7a6ee7cc1c94bc0b082f549f10eadb8575effb0f07ba0fd34f6159ac3a92cecd9d28fbc63aebc496	2026-10-04 12:33:46.335	f	2026-09-04 16:33:37.525094
69	45	7fc283ca0e9384c59c06171a12d81688f98a5cb1e4d165991c75b248802a630aa9ea1d463ac0c9cb	2026-10-04 12:33:47.828	f	2026-09-04 16:33:39.005039
70	46	ee12a0fb28b87e618ee2897aade31f7b49079e6a6591b91d49d699ec1d0bdc76f3630e69898692b8	2026-10-04 12:33:48.95	f	2026-09-04 16:33:40.126221
71	43	da1491e7661cd25a3ea6191c1610607e47c0ce300ebae11512a4afbdf8688d6c0ac32df67db8cd39	2026-10-04 12:33:49.676	f	2026-09-04 16:33:40.851471
72	47	c525aeb071c75a7bbb5590f862dd9dc25bf00e235cbb53e984632731b160642a599eee64dcd93f68	2026-10-04 12:33:51.206	f	2026-09-04 16:33:42.384349
73	2	eb91487e8e390c70618219e8197393e0faac108d810f51fe4b75943a3abeeb79ed11798558528da1	2026-10-05 16:29:56.277	t	2026-09-05 20:29:46.493007
74	1	b3278f4379c915a6a7034c05f739b03e1a4078b085b0f9f3a81100be21394853e1a13207a1e8bd34	2026-10-05 16:30:03.566	t	2026-09-05 20:29:53.751529
75	1	d89300e7cdebaef41ac0e7f085d83b5392d4b1f66d7ecb6331481e36684973a6b2a04f8587f5650d	2026-10-08 10:19:18.301	t	2026-09-08 14:19:20.13148
76	50	ff1bf1ba1bc5367bd212d507d10c23244b80f93b5cfce400337dfb30b6e7c7e82cc244daf13812bf	2026-10-08 10:20:34.401	t	2026-09-08 14:20:36.226201
77	50	8433419eb8e515428dacc6f744be170706ca1a215d4f13e5bae3e38fcfa04397b1dd8ccd1e6b1cfa	2026-10-08 10:25:50.474	t	2026-09-08 14:25:52.309018
78	1	d6d4fa007ffd5624e2721947567865749bab9c3da038a674bcc55c50a8da74b8a2f4bd7adbd44660	2026-10-08 12:17:03.376	t	2026-09-08 16:17:05.370216
79	1	b0696daefad43ef4fa5cead701d04d3f7ed12f7ccedb32e48beae2c6580dda548cb84c295f32a307	2026-10-08 12:17:11.84	t	2026-09-08 16:17:13.833049
80	50	54d4676dfb5cf220b714cf6920bcb5cb32eae324017f5ceb18699d85206e954484b28bdb8c1ffac1	2026-10-08 12:23:22.196	t	2026-09-08 16:23:24.19945
81	1	71a34609da61dc52c12596d4f54648744cb74deecb3827ea097866a9dda38a35744d8c5960796dcf	2026-10-08 12:27:12.999	t	2026-09-08 16:27:15.010138
82	50	80a208d7526e78b1c43f0e989d779358be20f8d51267c8cb5b67a0fa6891ee2ebc6040b6e0a417e0	2026-10-08 12:29:43.673	t	2026-09-08 16:29:45.687073
83	1	43187012a46b08f013aa10aced0633059ced4939e29d84bc3344202c9d2788216757ce5bcda413d4	2026-10-08 12:35:23.142	t	2026-09-08 16:35:25.163698
84	52	abda9eb572a075cff3137c08d5577749a19c9fa265a6c595c67748188becf71ff98b34bcbc4bfe3a	2026-10-10 13:32:01.226	t	2026-09-10 17:32:01.341392
85	50	305f1a80f5a2de65679c05ec9105c77b8037e852b6fe3e5bf52658ed6070713b105c91ae65fb7ae2	2026-10-10 13:36:25.295	t	2026-09-10 17:36:25.417158
86	2	9a1aaee892031b26654710aba20f9f85f0b0737d3cd9e454d3528ed0b3e5cfcfe3034eb70c2a8533	2026-10-10 13:40:53.216	t	2026-09-10 17:40:53.345834
87	1	6ec0362366eab3e8d19cff022508d245f117fd098d4bb05b710f2a23432888170e9728fcce69100c	2026-10-10 13:43:38.982	t	2026-09-10 17:43:39.125163
88	50	34789035f3cf47c563b15e49073288e0f56be2355bd514acb6a9142b734137db5c802f094a971d3d	2026-10-15 12:36:35.4	t	2026-09-15 16:36:37.127065
90	2	c1461d2ae0bce42ffece19bc1ba74754cdc2463734d2f380ae9af5e5b54d8b5dfe9e6e9c88590d16	2026-11-23 15:37:21.346	t	2026-10-24 15:37:21.347873
91	50	ac3909c7acb5cd1c23004d10df22d10c91375a2654320fb57f7342a6d566958f8f42692c3237b0fc	2026-11-23 15:38:00.537	t	2026-10-24 15:38:00.538564
92	52	721dddec56e87c07aeec7954fd9e4ee51dc6bd4afd6e5e219db31cb695fd33201725b11ad047a502	2026-11-23 15:38:42.638	t	2026-10-24 15:38:42.639685
89	1	164df314899998e724740a88d85f8a8b18b635b3fa173dac3adad3c4e7f300de04960c56e57b0b65	2026-11-23 15:32:19.534	t	2026-10-24 15:32:19.538963
93	1	d9282ffc1c0c784c311233b09294406f7c3f8fa5b6dfb3e5e71934475b83bd4aec629b2b704001a6	2026-11-29 12:11:14.654	t	2026-10-30 12:11:14.658486
94	2	c6e7109a1ec03e43df9fc6384f463855e2b93a058dc7f77eef047c46ea9ba6b237d9f977e9671391	2026-11-29 12:11:52.455	t	2026-10-30 12:11:52.457795
95	50	0c36607641aec7361ff20352ed2d0f588ef6b1e6ead2d30ba54d8486aea3363c5197089f17c055c1	2026-11-29 12:12:37.955	t	2026-10-30 12:12:37.957379
96	53	3d769da9533a0fa395fd47d6cfab1a3bb367b124786eaa09e4fe5af8e4885d0e5fccc3b3fcff88f8	2026-11-29 12:13:38.065	f	2026-10-30 12:13:38.067381
97	52	736d8f668d2cd62aad73d551a3770a1221941d259c2f051a1a204ab2e0c5ef5b381b3a6005532940	2026-11-29 16:38:49.251	t	2026-10-30 16:38:49.256705
98	52	b4f7e11700fcebd85a97ad22215cecab0cc53eb9c2a8f2c8554f9a43255ddbee8773fcb2f376ef74	2026-11-29 16:45:01.983	t	2026-10-30 16:45:02.073087
99	52	70e0df8c30d258bb9124e34fba2e5600b825e8b14fa73a5104717c891da525e77677a0cd258df500	2026-11-29 16:54:40.339	t	2026-10-30 16:54:40.428014
100	52	0e061070a3842de81eb04c351049978c5535f0b9f14111f6316915f42f597adf9fb5768c71eb882c	2026-11-29 16:59:11.638	t	2026-10-30 16:59:11.648276
101	52	6a41877a252f20873ed9d53e655da1202f000b09684f6d88617e80f0b9d4513d5f115acd4a1abb63	2026-11-29 17:03:06.439	t	2026-10-30 17:03:06.441873
102	52	48110f93449b7bd663d2cb067c9c735c6a6e263c3342557f56d11b3f151aed81571d1a6902037f3c	2026-11-29 17:11:26.82	t	2026-10-30 17:11:26.823824
103	1	82f63de7764d6abad0f849b3afb1811fe1815dab29fedbe47672d60dfbf803209ce8dd1f3d3054f6	2026-11-29 17:11:34.734	t	2026-10-30 17:11:34.735305
104	52	a1c46a46afd66eb697f702b8bc0601f74867535c7451cb48787e76bd24bf4ac774df456da47eeb37	2026-11-29 17:12:11.018	t	2026-10-30 17:12:11.020109
105	52	bb7cb4f7bdce69966e829a878a26a053764b7708d6899bfff50d9289b03771366ecdf9a8ade0d326	2026-11-29 17:36:38.434	t	2026-10-30 17:36:38.435344
106	52	01941b692cb59b9d74f921ec7341b6bb2b94138180629e6a03362ebea580fd1d05780fdd9b67529f	2026-11-29 18:07:57.319	t	2026-10-30 18:07:57.323241
107	2	296651f2f24e8127c67b601984e459532dc3537505f65fc97a486c8d5860c6d0c18c4acac09aa701	2026-11-29 18:08:33.81	t	2026-10-30 18:08:33.811663
108	2	2a22003a045089a13e876baeb7b855c274bcee998e37250cf3480fbc4db5a91935d7cea0744bcebb	2026-11-30 15:24:09.306	t	2026-10-31 15:24:09.395406
109	1	71438dc6aff2d9f6948ab4c38af278839c0ef80535f56c68f6a0b184c55ab85de18ce1f9ef6e1cb3	2026-11-30 15:25:14.607	t	2026-10-31 15:25:14.60877
110	52	4c4848f726379be860f3c6fb1c0e34a72644d7c505b1535d197fae23494bc4cceb96f349ea0cd9be	2026-11-30 15:26:16.902	f	2026-10-31 15:26:16.903359
\.


--
-- Data for Name: seguimientos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seguimientos (usuario_id, activo, iniciado_en, ultima_actualizacion_en, latitud, longitud, "precision") FROM stdin;
50	t	2026-09-08 12:11:05.587	\N	\N	\N	\N
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id, nombre, email, password_hash, rol, telefono, activo, creado_en, carnet, ubicacion, google_id) FROM stdin;
1	Admin	admin@sistema.com	$2b$10$i8jEMP/rye6mqwNCLxHcMOcfA41z2ERc00BqdOI6dLC2bRA9/opH.	admin	\N	t	2026-08-24 18:14:31.701905	\N	\N	\N
2	Inventario	inventario@sistema.com	$2b$10$1gj9FW1JEyMmWvWdb3ERNOsD4GtiQDZL/Mlu84rUB4Ir8bS.2mIOO	inventario	\N	t	2026-08-25 16:14:14.075419	\N	\N	\N
50	noemi	ven1@gmail.com	$2b$10$.PVGb3v3apLkHepXUqZkEug01F9W45IBc/5DkQrBOPARUUXVaZOhy	ventas	\N	t	2026-09-08 14:20:10.56689	\N	\N	\N
51	andres	cliente_1788883210847@tienda.com	$2b$10$nMTFuk.oPm2eqntTKvfGpOKla9488Fhq1Xb2BYwbzokAX2cF1O7Ri	cliente	70000000	t	2026-09-08 16:00:13.081878		punata y lanza	\N
52	angel	angel@gmail.com	$2b$10$cAxpHUnlNbT7CjcQwCMQA.pqS.1yvhZf5pdFQ//8YY7Mc2y9C/nSa	cliente	\N	t	2026-09-10 17:32:00.950093	\N	\N	\N
53	Juan Perez	juan@gmail.com	$2b$10$GREu5wnjVNmSJva/CZsDGeA/4mzbCLlFzzpwy29tQwsJBb2n6PNcC	cliente	\N	t	2026-10-30 12:13:38.053451	\N	\N	\N
\.


--
-- Data for Name: vendedor_ubicaciones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendedor_ubicaciones (id, usuario_id, latitud, longitud, "precision", creado_en) FROM stdin;
\.


--
-- Name: auditoria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auditoria_id_seq', 26, true);


--
-- Name: categorias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categorias_id_seq', 7, true);


--
-- Name: cliente_visitas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cliente_visitas_id_seq', 1, true);


--
-- Name: clientes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clientes_id_seq', 1, false);


--
-- Name: configuracion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.configuracion_id_seq', 1, false);


--
-- Name: detalle_pedido_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.detalle_pedido_id_seq', 18, true);


--
-- Name: deudas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.deudas_id_seq', 5, true);


--
-- Name: inventario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventario_id_seq', 29, true);


--
-- Name: inventario_movimientos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventario_movimientos_id_seq', 34, true);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.migrations_id_seq', 23, true);


--
-- Name: pedidos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pedidos_id_seq', 17, true);


--
-- Name: productos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.productos_id_seq', 39, true);


--
-- Name: proveedores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.proveedores_id_seq', 1, false);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 110, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 53, true);


--
-- Name: vendedor_ubicaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.vendedor_ubicaciones_id_seq', 1, false);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: auditoria PK_auditoria; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria
    ADD CONSTRAINT "PK_auditoria" PRIMARY KEY (id);


--
-- Name: cliente_visitas PK_cliente_visitas; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_visitas
    ADD CONSTRAINT "PK_cliente_visitas" PRIMARY KEY (id);


--
-- Name: configuracion PK_configuracion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion
    ADD CONSTRAINT "PK_configuracion" PRIMARY KEY (id);


--
-- Name: inventario_movimientos PK_inventario_movimientos; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimientos
    ADD CONSTRAINT "PK_inventario_movimientos" PRIMARY KEY (id);


--
-- Name: proveedores PK_proveedores; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT "PK_proveedores" PRIMARY KEY (id);


--
-- Name: refresh_tokens PK_refresh_tokens; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "PK_refresh_tokens" PRIMARY KEY (id);


--
-- Name: seguimientos PK_seguimientos; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguimientos
    ADD CONSTRAINT "PK_seguimientos" PRIMARY KEY (usuario_id);


--
-- Name: vendedor_ubicaciones PK_vendedor_ubicaciones; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendedor_ubicaciones
    ADD CONSTRAINT "PK_vendedor_ubicaciones" PRIMARY KEY (id);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_carnet_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_carnet_key UNIQUE (carnet);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: detalle_pedido detalle_pedido_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_pedido
    ADD CONSTRAINT detalle_pedido_pkey PRIMARY KEY (id);


--
-- Name: deudas deudas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deudas
    ADD CONSTRAINT deudas_pkey PRIMARY KEY (id);


--
-- Name: inventario inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_pkey PRIMARY KEY (id);


--
-- Name: inventario inventario_producto_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_producto_id_key UNIQUE (producto_id);


--
-- Name: pedidos pedidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_pkey PRIMARY KEY (id);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: IDX_auditoria_accion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_auditoria_accion" ON public.auditoria USING btree (accion);


--
-- Name: IDX_auditoria_usuario_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_auditoria_usuario_id" ON public.auditoria USING btree (usuario_id);


--
-- Name: IDX_movimientos_producto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_movimientos_producto_id" ON public.inventario_movimientos USING btree (producto_id);


--
-- Name: idx_cliente_visitas_creado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cliente_visitas_creado ON public.cliente_visitas USING btree (creado_en);


--
-- Name: idx_cliente_visitas_pedido; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cliente_visitas_pedido ON public.cliente_visitas USING btree (pedido_id);


--
-- Name: idx_cliente_visitas_vendedor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cliente_visitas_vendedor ON public.cliente_visitas USING btree (vendedor_id);


--
-- Name: idx_deudas_vendedor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deudas_vendedor ON public.deudas USING btree (vendedor_id);


--
-- Name: idx_productos_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_productos_codigo ON public.productos USING btree (codigo);


--
-- Name: idx_refresh_tokens_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_usuario ON public.refresh_tokens USING btree (usuario_id);


--
-- Name: idx_vendedor_ubicaciones_creado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendedor_ubicaciones_creado ON public.vendedor_ubicaciones USING btree (creado_en);


--
-- Name: idx_vendedor_ubicaciones_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendedor_ubicaciones_usuario ON public.vendedor_ubicaciones USING btree (usuario_id);


--
-- Name: inventario_movimientos FK_movimientos_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimientos
    ADD CONSTRAINT "FK_movimientos_producto" FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: inventario_movimientos FK_movimientos_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimientos
    ADD CONSTRAINT "FK_movimientos_usuario" FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: detalle_pedido detalle_pedido_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_pedido
    ADD CONSTRAINT detalle_pedido_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id);


--
-- Name: detalle_pedido detalle_pedido_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_pedido
    ADD CONSTRAINT detalle_pedido_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: deudas deudas_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deudas
    ADD CONSTRAINT deudas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: inventario inventario_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: pedidos pedidos_procesado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_procesado_por_fkey FOREIGN KEY (procesado_por) REFERENCES public.usuarios(id);


--
-- Name: pedidos pedidos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: productos productos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id);


--
-- PostgreSQL database dump complete
--

\unrestrict rMj5L8302QRXoE7FsnWq3mhj7P8aFyUbpw6oKfQPXNNZQBZrd1skiuqImt6sHbH

