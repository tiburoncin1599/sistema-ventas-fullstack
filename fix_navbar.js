const fs = require('fs');
let c = fs.readFileSync('frontend/components/Navbar.tsx', 'utf8');
// Replace the problematic div class - remove leading-tight
c = c.replace(
  '                <div className="text-left leading-tight">',
  '                <div className="text-left">'
);
fs.writeFileSync('frontend/components/Navbar.tsx', c);
console.log('Fixed div class');