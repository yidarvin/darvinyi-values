require('dotenv').config();
const express = require('express');
const path = require('path');
const auth = require('./api/middleware/auth');

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./api/routes/auth'));
app.use('/api/sessions', auth, require('./api/routes/sessions'));

const distPath = path.join(__dirname, 'web', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server listening on :${PORT}`));
