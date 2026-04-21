const router = require('express').Router();
const pool = require('../db');

const RATING_LABELS = {
  1: 'Most Important to Me',
  2: 'Very Important to Me',
  3: 'Important to Me',
  4: 'Somewhat Important to Me',
  5: 'Not Important to Me',
};

function fisherYates(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatSessionName() {
  return `Session — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
}

async function getSessionForUser(sessionId, userId) {
  const result = await pool.query(
    'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
    [sessionId, userId]
  );
  return result.rows[0] || null;
}

router.get('/', async (req, res) => {
  const result = await pool.query(
    `SELECT s.id, s.name, s.status, s.created_at, s.completed_at,
      COUNT(sv.id) AS total_rated
     FROM sessions s
     LEFT JOIN session_values sv ON sv.session_id = s.id
     WHERE s.user_id = $1
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    [req.user.userId]
  );
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const valuesResult = await pool.query('SELECT id FROM values_list ORDER BY original_order');
  const ids = valuesResult.rows.map(r => r.id);
  const shuffled = fisherYates(ids);
  const name = formatSessionName();
  const result = await pool.query(
    'INSERT INTO sessions (user_id, name, shuffle_order) VALUES ($1, $2, $3) RETURNING *',
    [req.user.userId, name, JSON.stringify(shuffled)]
  );
  res.json(result.rows[0]);
});

router.get('/:id', async (req, res) => {
  const session = await getSessionForUser(req.params.id, req.user.userId);
  if (!session) return res.status(403).json({ error: 'Forbidden' });

  const ratingsResult = await pool.query(
    'SELECT value_id, rating FROM session_values WHERE session_id = $1',
    [session.id]
  );
  const ratings = {};
  for (const row of ratingsResult.rows) {
    ratings[row.value_id] = row.rating;
  }

  const valuesResult = await pool.query('SELECT * FROM values_list ORDER BY original_order');
  const valuesMap = {};
  for (const v of valuesResult.rows) {
    valuesMap[v.id] = v;
  }

  res.json({ ...session, ratings, valuesMap });
});

router.put('/:id/values/:valueId', async (req, res) => {
  const session = await getSessionForUser(req.params.id, req.user.userId);
  if (!session) return res.status(403).json({ error: 'Forbidden' });

  const rating = parseInt(req.body.rating, 10);
  if (rating < 1 || rating > 5 || isNaN(rating)) {
    return res.status(400).json({ error: 'Rating must be 1–5' });
  }

  await pool.query(
    `INSERT INTO session_values (session_id, value_id, rating)
     VALUES ($1, $2, $3)
     ON CONFLICT (session_id, value_id)
     DO UPDATE SET rating = $3, rated_at = NOW()`,
    [session.id, req.params.valueId, rating]
  );
  res.json({ ok: true });
});

router.post('/:id/complete', async (req, res) => {
  const session = await getSessionForUser(req.params.id, req.user.userId);
  if (!session) return res.status(403).json({ error: 'Forbidden' });

  await pool.query(
    "UPDATE sessions SET status = 'complete', completed_at = NOW() WHERE id = $1",
    [session.id]
  );
  res.json({ ok: true });
});

router.get('/:id/export', async (req, res) => {
  const session = await getSessionForUser(req.params.id, req.user.userId);
  if (!session) return res.status(403).json({ error: 'Forbidden' });

  const result = await pool.query(
    `SELECT vl.name, vl.definition, sv.rating
     FROM session_values sv
     JOIN values_list vl ON vl.id = sv.value_id
     WHERE sv.session_id = $1
     ORDER BY sv.rating, vl.name`,
    [session.id]
  );

  const rows = [['Value', 'Definition', 'Rating', 'Rating Label']];
  for (const row of result.rows) {
    rows.push([
      row.name,
      row.definition,
      row.rating,
      RATING_LABELS[row.rating],
    ]);
  }

  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="values-session-${session.id}.csv"`);
  res.send(csv);
});

module.exports = router;
