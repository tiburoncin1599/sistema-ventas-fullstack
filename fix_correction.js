const fs = require('fs');
let c = fs.readFileSync('frontend/components/Navbar.tsx', 'utf8');
// Reemplazar la condición exacta
c = c.replace(
  '        {usuario?.rol === "cliente" && (\n',
  '        {String(usuario?.rol)?.trim().toLowerCase() === "cliente" && (\n'
);
fs.writeFileSync('frontend/components/Navbar.tsx', c);
console.log('Applied roll format tolerance fix');