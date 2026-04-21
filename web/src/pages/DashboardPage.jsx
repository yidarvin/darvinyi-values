import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const LINE_COLORS = [
  '#c8a96e', '#6eb5c8', '#9ec86e', '#c86e9e', '#c8956e',
  '#6e8bc8', '#c8c86e', '#6ec8a9', '#b06ec8', '#c87a6e',
];

function buildTrendData(sessions, valuesMap) {
  const completed = sessions
    .filter(s => s.status === 'complete' && s._ratings)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  if (completed.length < 2) return { chartData: [], topValues: [] };

  const avgByValue = {};
  for (const s of completed) {
    for (const [vid, rating] of Object.entries(s._ratings)) {
      if (!avgByValue[vid]) avgByValue[vid] = [];
      avgByValue[vid].push(rating);
    }
  }

  const avgRating = {};
  for (const [vid, ratings] of Object.entries(avgByValue)) {
    avgRating[vid] = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  }

  const topValues = Object.entries(avgRating)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 10)
    .map(([vid]) => ({ id: parseInt(vid), name: valuesMap[vid]?.name || vid }));

  const chartData = completed.map(s => {
    const point = {
      date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    };
    for (const v of topValues) {
      point[v.name] = s._ratings[v.id] ?? null;
    }
    return point;
  });

  return { chartData, topValues };
}

export default function DashboardPage() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [valuesMap, setValuesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      const sessionsRes = await client.get('/sessions');
      const rawSessions = sessionsRes.data;

      const completedIds = rawSessions.filter(s => s.status === 'complete').map(s => s.id);
      const ratingsBySession = {};
      let vm = {};

      await Promise.all(
        completedIds.map(async id => {
          const r = await client.get(`/sessions/${id}`);
          ratingsBySession[id] = r.data.ratings;
          if (!Object.keys(vm).length && r.data.valuesMap) {
            vm = r.data.valuesMap;
          }
        })
      );

      setValuesMap(vm);
      setSessions(rawSessions.map(s => ({
        ...s,
        _ratings: ratingsBySession[s.id] || null,
      })));
      setLoading(false);
    }
    load();
  }, []);

  async function deleteSession(id) {
    if (!window.confirm('Delete this session? This cannot be undone.')) return;
    await client.delete(`/sessions/${id}`);
    setSessions(prev => prev.filter(s => s.id !== id));
  }

  async function startSession() {
    setCreating(true);
    try {
      const { data } = await client.post('/sessions');
      navigate(`/session/${data.id}`);
    } finally {
      setCreating(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  const completedSessions = sessions.filter(s => s.status === 'complete');
  const { chartData, topValues } = buildTrendData(completedSessions.map(s => ({
    ...s,
    _ratings: s._ratings ? Object.fromEntries(
      Object.entries(s._ratings).map(([k, v]) => [k, v])
    ) : null,
  })), valuesMap);
  const showChart = completedSessions.length >= 2 && chartData.length >= 2;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.logo}>values.</h1>
        <button onClick={handleLogout} style={styles.logoutBtn}>Log out</button>
      </header>

      <main style={styles.main}>
        <div style={styles.greetingRow}>
          <h2 style={styles.greeting}>{greeting()}, {auth.user.username}.</h2>
          <button onClick={startSession} style={styles.newBtn} disabled={creating}>
            {creating ? 'Starting…' : '+ New session'}
          </button>
        </div>

        {loading ? (
          <p style={styles.muted}>Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyTitle}>No sessions yet.</p>
            <p style={styles.muted}>Start your first session to begin exploring your values.</p>
          </div>
        ) : (
          <div style={styles.sessionList}>
            {sessions.map(s => (
              <div key={s.id} style={styles.sessionRow}>
                <div style={styles.sessionInfo}>
                  <span style={styles.sessionName}>{s.name}</span>
                  <span style={styles.sessionMeta}>
                    {new Date(s.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    {' · '}
                    {parseInt(s.total_rated)} / 107
                  </span>
                </div>
                <div style={styles.sessionRight}>
                  <span style={{
                    ...styles.badge,
                    ...(s.status === 'complete' ? styles.badgeComplete : styles.badgeInProgress),
                  }}>
                    {s.status === 'complete' ? 'Complete' : 'In Progress'}
                  </span>
                  {s.status === 'complete' ? (
                    <Link to={`/session/${s.id}/results`} style={styles.actionLink}>View results →</Link>
                  ) : (
                    <Link to={`/session/${s.id}`} style={styles.actionLink}>Resume →</Link>
                  )}
                  <button onClick={() => deleteSession(s.id)} style={styles.deleteBtn} title="Delete session">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showChart && (
          <div style={styles.chartSection}>
            <h3 style={styles.chartTitle}>How your values have shifted</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: -20, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis
                  domain={[5, 1]}
                  tickCount={5}
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  tickFormatter={v => ['', 'Most', 'Very', 'Important', 'Somewhat', 'Least'][v] || v}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13 }}
                  formatter={(val) => {
                    const labels = { 1: 'Most Important', 2: 'Very Important', 3: 'Important', 4: 'Somewhat', 5: 'Least' };
                    return [labels[val] || val];
                  }}
                />
                <Legend wrapperStyle={{ color: 'var(--text-muted)', fontSize: 12 }} />
                {topValues.map((v, i) => (
                  <Line
                    key={v.id}
                    type="monotone"
                    dataKey={v.name}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 32px',
    borderBottom: '1px solid var(--border)',
  },
  logo: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.5rem',
    color: 'var(--accent)',
    fontWeight: 400,
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  main: {
    flex: 1,
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
    padding: '40px 24px',
  },
  greetingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '36px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  greeting: {
    fontSize: '1.5rem',
    fontWeight: 400,
    color: 'var(--text)',
  },
  newBtn: {
    background: 'var(--accent)',
    color: '#0f0f0f',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    minHeight: '44px',
  },
  muted: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
  empty: {
    padding: '40px 0',
  },
  emptyTitle: {
    fontSize: '1.1rem',
    marginBottom: '8px',
  },
  sessionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '48px',
  },
  sessionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    gap: '16px',
    flexWrap: 'wrap',
  },
  sessionInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sessionName: {
    fontWeight: 500,
    fontSize: '0.95rem',
  },
  sessionMeta: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
  },
  sessionRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexShrink: 0,
  },
  badge: {
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '20px',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
  },
  badgeComplete: {
    background: 'rgba(90, 158, 111, 0.15)',
    color: 'var(--success)',
  },
  badgeInProgress: {
    background: 'rgba(200, 169, 110, 0.12)',
    color: 'var(--accent)',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: '4px',
    lineHeight: 1,
    minHeight: '44px',
    minWidth: '44px',
    opacity: 0.5,
  },
  actionLink: {
    color: 'var(--accent)',
    fontSize: '0.875rem',
    fontWeight: 500,
    textDecoration: 'none',
  },
  chartSection: {
    marginTop: '16px',
  },
  chartTitle: {
    fontWeight: 500,
    color: 'var(--text-muted)',
    marginBottom: '20px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontSize: '0.8rem',
  },
};
