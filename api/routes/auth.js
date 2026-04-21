const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const USERNAME_RE = /^[a-z0-9_-]{3,30}$/;

function signToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

router.get('/check-username', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.json({ available: false });
  const result = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  res.json({ available: result.rows.length === 0 });
});

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username must be 3–30 characters: lowercase letters, numbers, underscores, hyphens only' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (existing.rows.length > 0) {
    return res.status(400).json({ error: 'Username already taken' });
  }
  const password_hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
    [username, password_hash]
  );
  const user = result.rows[0];
  res.json({ token: signToken(user), user: { id: user.id, username: user.username } });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  res.json({ token: signToken(user), user: { id: user.id, username: user.username } });
});

module.exports = router;
