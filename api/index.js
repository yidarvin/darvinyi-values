require('dotenv').config();
const express = require('express');
const cors = require('cors');
const auth = require('./middleware/auth');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://values.darvinyi.com',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', require('./routes/auth'));
app.use('/sessions', auth, require('./routes/sessions'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
