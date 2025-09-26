const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
console.log('Looking for .env at:', envPath);
console.log('File exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('File content:');
  console.log('---START---');
  console.log(content);
  console.log('---END---');
  console.log('Content length:', content.length);
}

console.log('\nTrying dotenv...');
require('dotenv').config({ path: envPath });
console.log('MONGODB_URI after dotenv:', process.env.MONGODB_URI);