
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = 1235; 
const DB = new sqlite3.Database('./users.db');


const ACCESS_SECRET = 'SECRET_DIFFERENT_FROM_ACCESS'
const REFRESH_SECRET = 'REFRESH_SECRET_DIFFERENT_FROM_ACCESS';


function issueAccessToken(username, role) {
  return jwt.sign({ sub: username, role }, ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: '15m',
    issuer: 'jwt-lab'
  });
}
function issueRefreshToken(username, tokenId) {
  return jwt.sign({ sub: username, tid: tokenId }, REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d',
    issuer: 'jwt-lab'
  });
}


const refreshStore = new Map();


app.post('/login', (req, res) => {
  const { username, password } = req.body;
  DB.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
    if (err) return res.status(500).json({ error: 'db' });
    if (!row || !bcrypt.compareSync(password, row.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = issueAccessToken(row.username, row.role);
    const tokenId = Math.random().toString(36).slice(2);
    const refreshToken = issueRefreshToken(row.username, tokenId);
    // store tokenId associated with username
    refreshStore.set(tokenId, { username: row.username, created: Date.now() });


    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false, 
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({ accessToken, expiresIn: 900 }); 
  });
});


function authMiddleware(req, res, next) {
  const auth = (req.headers.authorization || '');
  const token = auth.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(token, ACCESS_SECRET, { algorithms: ['HS256'], issuer: 'jwt-lab' });
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}


app.get('/admin', authMiddleware, (req, res) => {
  if (req.user.role === 'admin') return res.json({ secret: 'VERY SENSITIVE ADMIN DATA (SECURE)' });
  return res.status(403).json({ error:   'Forbidden' });
});


app.post('/refresh', (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh' });
  try {
    const payload = jwt.verify(token, REFRESH_SECRET, { algorithms: ['HS256'], issuer: 'jwt-lab' });
    const info = refreshStore.get(payload.tid);
    if (!info || info.username !== payload.sub) return res.status(401).json({ error: 'Invalid refresh' });

    
    refreshStore.delete(payload.tid);
    const newTid = Math.random().toString(36).slice(2);
    refreshStore.set(newTid, { username: payload.sub, created: Date.now() });
    const accessToken = issueAccessToken(payload.sub, 'user'); 
    const newRefresh = issueRefreshToken(payload.sub, newTid);

    res.cookie('refreshToken', newRefresh, { httpOnly: true, secure: false, maxAge: 7*24*60*60*1000 });
    res.json({ accessToken });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid refresh' });
  }
});

app.listen(PORT, () => console.log(`SECURE server running at http://localhost:${PORT}`));

