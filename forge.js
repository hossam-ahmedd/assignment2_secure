
const jwt = require('jsonwebtoken');


const WEAK_SECRET = 'weak-secret'; 

const token = jwt.sign(
  { sub: 'admin', role: 'admin' },
  WEAK_SECRET,
  { algorithm: 'HS256', expiresIn: '7d', issuer: 'jwt-lab' } 
);

console.log(token);
