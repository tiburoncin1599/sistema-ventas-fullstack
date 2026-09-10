import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rutasObligatorias = ['/cuenta', '/checkout'];
const ventasLoginRoute = '/ventas/login';

// Roles permitidos por ruta del panel admin (coincide con las secciones visibles).
const rutasAdmin: { ruta: string; roles: string[] }[] = [
  { ruta: '/admin/usuarios', roles: ['admin'] },
  { ruta: '/admin/clientes', roles: ['admin'] },
  { ruta: '/admin/personal', roles: ['admin'] },
  { ruta: '/admin/productos', roles: ['admin', 'inventario'] },
  { ruta: '/admin/inventario', roles: ['admin', 'inventario'] },
  { ruta: '/admin/pedidos', roles: ['admin', 'inventario'] },
  { ruta: '/admin/ubicaciones', roles: ['admin', 'inventario'] },
  { ruta: '/admin/ventas', roles: ['admin', 'inventario', 'ventas'] },
  { ruta: '/admin/deudas', roles: ['admin', 'inventario', 'ventas'] },
];

const rolesAdminBase = ['admin', 'inventario', 'ventas'];

function leerUsuario(request: NextRequest): { rol?: string } | null {
  const usuarioStr = request.cookies.get('usuario')?.value;
  try {
    return usuarioStr ? JSON.parse(decodeURIComponent(usuarioStr)) : null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;
  const usuario = leerUsuario(request);
  const autenticado = !!token;
  const rol = usuario?.rol;

  const requiereSesion = rutasObligatorias.some(r => pathname.startsWith(r));
  if (requiereSesion && !autenticado) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  if (pathname.startsWith('/admin')) {
    if (!autenticado || !rol) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
    const regla =
      rutasAdmin.find(ruta => pathname.startsWith(ruta.ruta)) ?? null;
    const rolesPermitidos = regla ? regla.roles : rolesAdminBase;
    if (!rolesPermitidos.includes(rol)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (pathname.startsWith('/ventas')) {
    const esVendedor = autenticado && rol === 'ventas';

    if (pathname === ventasLoginRoute) {
      if (esVendedor) {
        return NextResponse.redirect(new URL('/ventas', request.url));
      }
      return NextResponse.next();
    }

    if (esVendedor) {
      return NextResponse.next();
    }
    return NextResponse.redirect(
      new URL(autenticado ? '/' : ventasLoginRoute, request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/cuenta/:path*',
    '/checkout/:path*',
    '/admin/:path*',
    '/ventas/:path*',
  ],
};