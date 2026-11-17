const fs = require('fs');
let c = fs.readFileSync('frontend/components/Navbar.tsx', 'utf8');
// Reemplazar el carrito en mobile para usuario NO autenticado
// La línea exacta tiene 12 espacios de indentación
const pattern = '            <Link href="/carrito" className="block py-2 text-gray-600 dark:text-gray-300" onClick={() => setMenuOpen(false)}>Carrito</Link>';
const replacement = '';
c = c.replace(pattern, replacement);
fs.writeFileSync('frontend/components/Navbar.tsx', c);
console.log('Done: removed unauthenticated mobile carrito link');