const fs = require('fs');
let c = fs.readFileSync('frontend/components/Navbar.tsx', 'utf8');
// Reemplazar el carrito en mobile para usuario NO autenticado (quitar el enlace)
// Buscar el patrón exacto de la línea 138
const pattern = '            <Link href="/carrito" className="block py-2 text-gray-600 dark:text-gray-300" onClick={() => setMenuOpen(false)}>Carrito</Link>';
const replacement = '';
c = c.replace(pattern, replacement);
// También asegurarnos de que el bloque "Iniciar sesión" se mantenga
// El patrón original tenía ambos enlaces juntos, ahora solo queda el de iniciar sesión
fs.writeFileSync('frontend/components/Navbar.tsx', c);
console.log('Removed unauthenticated carrito mobile link');