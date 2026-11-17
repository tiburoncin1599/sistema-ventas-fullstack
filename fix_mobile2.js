const fs = require('fs');
let c = fs.readFileSync('frontend/components/Navbar.tsx', 'utf8');
// Reemplazar el carrito en mobile para usuario NO autenticado
// El patrón exacto está en las líneas 138
c = c.replace(
  '            <Link href="/carrito" className="block py-2 text-gray-600 dark:text-gray-300" onClick={() => setMenuOpen(false)}>Carrito</Link>',
  ''
);
fs.writeFileSync('frontend/components/Navbar.tsx', c);
console.log('Removed unauthenticated carrito mobile link');