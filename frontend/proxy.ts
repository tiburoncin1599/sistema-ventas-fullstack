import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { normalizarRol } from './lib/roles';

const rutasObligatorias = ['/cuenta', '/checkout'];
const ventasLoginRoute = '/ventas/login';

const rolesOperacion = ['admin', 'inventario'];
const rolesAdminBase = ['admin', 'inventario', 'ventas'];

/**
 * Roles permitidos por ruta. Coincide con los links visibles en
 * `admin/layout.tsx`, `admin/page.tsx` y `ventas/layout.tsx`.
 * Es control de UX: la autorización real la hace el backend con guards.
 */
const rutasAdmin: { ruta: string; roles: string[] }[] = [
  { ruta: '/admin/productos', roles: rolesOperacion },
  { ruta: '/admin/inventario', roles: rolesOperacion },
  { ruta: '/admin/pedidos', roles: rolesOperacion },
  { ruta: '/admin/ubicaciones', roles: rolesOperacion },
  { ruta: '/admin/ventas', roles: rolesAdminBase },
  { ruta: '/admin/deudas', roles: rolesAdminBase },
  { ruta: '/admin/clientes', roles: ['admin'] },
  { ruta: '/admin/usuarios', roles: ['admin'] },
  { ruta: '/admin/personal', roles: ['admin'] },
  { ruta: '/admin/reportes', roles: ['admin'] },
  { ruta: '/admin/rendimiento', roles: ['admin'] },
];

const rutasExtra: { ruta: string; roles: string[] }[] = [
  { ruta: '/inventario', roles: rolesOperacion },
  { ruta: '/configuracion', roles: ['admin'] },
];

function leerUsuario(request: NextRequest): { rol?: string } | null {
  const usuarioStr = request.cookies.get('usuario')?.value;
  try {
    if (!usuarioStr) return null;
    const usuario = JSON.parse(decodeURIComponent(usuarioStr)) as {
      rol?: unknown;
    };
    return { rol: normalizarRol(usuario.rol, undefined) };
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
    if (pathname === '/admin') {
      return rolesAdminBase.includes(rol)
        ? NextResponse.next()
        : NextResponse.redirect(new URL('/', request.url));
    }
    // Las subrutas no declaradas quedan restringidas a admin.
    const regla = rutasAdmin.find(r => pathname.startsWith(r.ruta));
    if (!regla || !regla.roles.includes(rol)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  for (const regla of rutasExtra) {
    if (!pathname.startsWith(regla.ruta)) continue;
    if (!autenticado) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
    if (!rol || !regla.roles.includes(rol)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (pathname.startsWith('/ventas')) {
    // El POS y el portal de ventas son EXCLUSIVOS del rol ventas.
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
    '/inventario/:path*',
    '/configuracion/:path*',
  ],
};
