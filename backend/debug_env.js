// Simulate what ConfigModule does
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
console.log('DATABASE_URL:', (process.env.DATABASE_URL || 'NOT SET').substring(0, 30) + '...');
console.log('JWT_SECRET:', process.env.JWT_SECRET || 'NOT SET');
console.log('DIR:', __dirname);
