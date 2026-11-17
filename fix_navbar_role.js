const fs = require('fs');
let c = fs.readFileSync('frontend/components/Navbar.tsx', 'utf8');
// Reemplazar solo el rol 'ventas' por 'ventas' || usuario.rol === 'cliente'
// Esto añade el rol cliente a la condición existente sin romper la estructura
c = c.replace(
  'usuario.rol === "ventas"',
  'usuario.rol === "ventas" || usuario.rol === "cliente"'
);
// También necesitamos reemplazar en el menú móvil, donde el carrito aparece para todos
// Buscar el carrito en mobile: <Link href="/carrito" className="block py-2 text-gray-600 dark:text-gray-300" onClick={() => setMenuOpen(false)}>Carrito</Link>
// Pero solo queremos que aparezca para cliente y roles de ventas/inventario/admin
// Vamos a reemplazar el carrito mobile para que también tenga la condición de rol
// Primero, encontrar el carrito mobile
const mobileCarritoPattern = 'onClick={() => setMenuOpen(false)}>Carrito</Link>';
// Reemplazar para que el carrito mobile solo aparezca cuando haya sesión y sea cliente o rol de venta/admin/inventario
// Actually, let's just do a simpler approach: replace the condition block that includes the carrito
// Let's find the pattern and add the condition

// Actually, let's take a simpler approach: just add the cliente role check
// We need to replace the condition that shows/hides the carrito desktop AND mobile

// Let me just do multiple targeted replacements

// 1. En el desktop: agregar cliente a la condición existente
// La línea actual: {(usuario.rol === 'admin' || usuario.rol === 'inventario' || usuario.rol === 'ventas') && (
// Queremos: {(usuario.rol === 'admin' || usuario.rol === 'inventario' || usuario.rol === 'ventas' || usuario.rol === 'cliente') && (

// Buscar la cadena exacta y reemplazar
const oldDesktopCond = '{(usuario.rol === "admin" || usuario.rol === "inventario" || usuario.rol === "ventas") && (\n                  <Link href={usuario.rol === "ventas" ? "/ventas" : "/admin"} className="bg-[#ffd600] text-[#005a24] px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-yellow-400">\n                    {usuario.rol === "admin" ? "ADMIN" : "PANEL"}\n                  </Link>\n                )}\n                <button onClick={cerrarSesionHandler} className="text-red-200 hover:text-red-100 text-xs font-semibold bg-red-800/30 px-2.5 py-1 rounded-lg">\n                  Cerrar sesión\n                </button>\n              </>)';

const newDesktopCond = '{(usuario.rol === "admin" || usuario.rol === "inventario" || usuario.rol === "ventas" || usuario.rol === "cliente") && (\n                  <Link href={usuario.rol === "ventas" ? "/ventas" : "/admin"} className="bg-[#ffd600] text-[#005a24] px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-yellow-400">\n                    {usuario.rol === "admin" ? "ADMIN" : "PANEL"}\n                  </Link>\n                )}\n                <button onClick={cerrarSesionHandler} className="text-red-200 hover:text-red-100 text-xs font-semibold bg-red-800/30 px-2.5 py-1 rounded-lg">\n                  Cerrar sesión\n                </button>\n              </>)';

if (c.includes(oldDesktopCond)) {
  c = c.replace(oldDesktopCond, newDesktopCond);
  console.log('Desktop condition replaced');
} else {
  console.log('Desktop condition not found, trying alternative');
  // Alternative: just add '|| usuario.rol === "cliente"' after the existing condition
  // Find '})</s>' pattern near the end of the desktop section
  // Actually, let's just do a simple string replace of the role check
  // Let's try replacing just the specific 'ventas' reference
}

// 2. Ahora reemplazar en el menú móvil - el carrito mobile
// Buscar el carrito en mobile: <Link href="/carrito" className="block py-2 text-gray-600 dark:text-gray-300" onClick={() => setMenuOpen(false)}>Carrito ({cantidadItems})</Link>
// y agregarle condición de rol

// Vamos a hacer un replace más amplio que cubra todo el bloque donde aparece el carrito
// Buscar el bloque donde aparece Carrito en mobile y desktop

// Patrón para el carrito mobile: 
// <Link href="/carrito" className="block py-2 text-gray-600 dark:text-gray-300" onClick={() => setMenuOpen(false)}>Carrito ({cantidadItems})</Link>

// Vamos a reemplazar para que tenga condición de rol
// Actualmente es visible siempre en mobile, queremos que sea visible solo para cliente y roles de venta/admin/inventario

// Vamos a hacer un replace global que afecte tanto desktop como mobile
// Reemplazar todo el bloque donde aparece "Carrito" con una versión condicionada

// Patrón a reemplazar: todo el bloque desde hasta el carrito
// Voy a intentar un enfoque diferente: reemplazar la condición que controla la visibilidad del carrito

// Veamos qué hay en el archivo primero con logs
let lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Carrito') && i > 100) {
    console.log((i+1) + ': ' + lines[i]);
  }
}