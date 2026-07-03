import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/cuenta', '/checkout'];
const adminRoutes = ['/admin'];
const adminRoles = ['admin', 'inventario', 'ventas'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;
  const usuarioStr = request.cookies.get('usuario')?.value;
  let usuario: { rol?: string } | null = null;
  try {
    if (usuarioStr) usuario = JSON.parse(decodeURIComponent(usuarioStr));
  } catch {}

  const isProtected = protectedRoutes.some(r => pathname.startsWith(r));
  const isAdmin = adminRoutes.some(r => pathname.startsWith(r));

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  if (isAdmin && (!usuario || !usuario.rol || !adminRoles.includes(usuario.rol))) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/cuenta/:path*', '/checkout/:path*', '/admin/:path*'],
};
