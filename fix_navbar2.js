const fs = require('fs');
let c = fs.readFileSync('frontend/components/Navbar.tsx', 'utf8');
// Replace the entire cart link section to remove the div
c = c.replace(
  '              {usuario ? (\n                <span className=\"text-lg\">🛒</span>\n                <div className=\"text-left\">\\r\\n                  <p className=\"text-[10px] text-gray-300\">Carrito</p>\\r\\n                  {cantidadItems > 0 && (\n                    <p className=\"font-medium text-xs\">{cantidadItems} {cantidadItems === 1 ? \\\"item\\\" : \\\"items\\\"}</p>\n                  )\\r\\n                </div>\n              ) : null}',
  '              {usuario ? (\n                <span className=\"text-lg\">🛒</span>\n                <p className=\"text-[10px] text-gray-300\">Carrito</p>\n                {cantidadItems > 0 && (\n                  <p className=\"font-medium text-xs\">{cantidadItems} {cantidadItems === 1 ? \"item\" : \"items\"}</p>\n                )}\n              ) : null}'
);
fs.writeFileSync('frontend/components/Navbar.tsx', c);
console.log('Fixed cart section');