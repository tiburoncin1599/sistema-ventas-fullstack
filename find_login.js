const fs = require('fs');
const f = fs.readFileSync('frontend/app/auth/page.tsx', 'utf8');
const regex = /localStorage\.setItem\(['\"](.+?)['\"],/g;
let m;
while ((m = regex.exec(f)) !== null) {
  console.log('Found:', m[0]);
}