const fs = require('fs');
let c = fs.readFileSync('frontend/store/carrito.ts', 'utf8');
// Agregar version: 1 al persist para evitar conflictos de hidratación
c = c.replace(
  '{ name: \'carrito-storage\' },',
  '{ name: \'carrito-storage\', version: 1 },'
);
fs.writeFileSync('frontend/store/carrito.ts', c);
console.log('Added version: 1 to persist');