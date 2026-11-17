const fs = require('fs');
let c = fs.readFileSync('frontend/components/Navbar.tsx', 'utf8');
// Reemplazar la línea que calcula cantidadItems para que no dependa de usuario
c = c.replace(
  'const cantidadItems = mounted && usuario ? items.reduce((sum, i) => sum + i.cantidad, 0) : 0;',
  'const cantidadItems = mounted ? items.reduce((sum, i) => sum + i.cantidad, 0) : 0;'
);
fs.writeFileSync('frontend/components/Navbar.tsx', c);
console.log('Fixed cantidadItems dependency');