const fs = require('fs');
let c = fs.readFileSync('frontend/components/Navbar.tsx', 'utf8');
// Replace the exact line 116
c = c.replace(
  '                <div className="text-left leading-tight">\\r\\n',
  '                <span className="text-[10px] text-gray-300">\\r\\n'
);
// Also need to remove the closing </div> that was after the p tag
c = c.replace(
  '                  )}\\r\\n                </div>\\r\\n              ) : null}',
  '              ) : null}'
);
fs.writeFileSync('frontend/components/Navbar.tsx', c);
console.log('Fixed');