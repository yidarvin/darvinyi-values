import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';

const TIERS = [
  { rating: 1, label: 'Most Important to Me', color: '#c8a96e', defaultOpen: true },
  { rating: 2, label: 'Very Important to Me', color: '#b8943e', defaultOpen: true },
  { rating: 3, label: 'Important to Me', color: '#5a8fc8', defaultOpen: true },
  { rating: 4, label: 'Somewhat Important to Me', color: '#6a6a6a', defaultOpen: false },
  { rating: 5, label: 'Not Important to Me', color: '#3a3a3a', defaultOpen: false },
];

function Tier({ rating, label, color, values, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  if (values.length === 0) return null;
  return (
    <div style={styles.tier}>
      <button onClick={() => setOpen(o => !o)} style={styles.tierHeader}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ ...styles.tierDot, background: color }} />
          <span style={styles.tierLabel}>{label}</span>
          <span style={styles.tierCount}>{values.length}</span>
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={styles.badges}>
          {values.map(v => (
            <span key={v.id} title={v.definition} style={{ ...styles.badge, borderColor: color + '40' }}>
              {v.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await client.get(`/sessions/${id}`);
      setSession(data);

      const g = { 1: [], 2: [], 3: [], 4: [], 5: [] };
      for (const [valueId, rating] of Object.entries(data.ratings)) {
        const v = data.valuesMap[valueId];
        if (v) g[rating].push(v);
      }
      for (const tier of Object.values(g)) {
        tier.sort((a, b) => a.name.localeCompare(b.name));
      }
      setGrouped(g);
      setLoading(false);
    }
    load();
  }, [id]);

  async function exportCSV() {
    const res = await client.get(`/sessions/${id}/export`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `values-session-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading results…</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.logo}>values.</h1>
      </header>

      <main style={styles.main}>
        <div style={styles.titleRow}>
          <div>
            <h2 style={styles.sessionTitle}>{session.name}</h2>
            <p style={styles.sessionDate}>
              {session.completed_at
                ? `Completed ${new Date(session.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                : new Date(session.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button onClick={exportCSV} style={styles.exportBtn}>Export CSV</button>
        </div>

        <div style={styles.tiers}>
          {TIERS.map(t => (
            <Tier
              key={t.rating}
              rating={t.rating}
              label={t.label}
              color={t.color}
              values={grouped[t.rating] || []}
              defaultOpen={t.defaultOpen}
            />
          ))}
        </div>

        <div style={styles.backRow}>
          <Link to="/dashboard" style={styles.backLink}>← Back to dashboard</Link>
        </div>
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
    padding: '20px 32px',
    borderBottom: '1px solid var(--border)',
  },
  logo: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.5rem',
    color: 'var(--accent)',
    fontWeight: 400,
  },
  main: {
    flex: 1,
    maxWidth: '700px',
    width: '100%',
    margin: '0 auto',
    padding: '40px 24px 64px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '40px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  sessionTitle: {
    fontSize: '1.4rem',
    fontWeight: 400,
    marginBottom: '4px',
  },
  sessionDate: {
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
  },
  exportBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '0.875rem',
    cursor: 'pointer',
    minHeight: '44px',
    flexShrink: 0,
  },
  tiers: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  tier: {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  tierHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px',
    background: 'var(--surface)',
    border: 'none',
    color: 'var(--text)',
    cursor: 'pointer',
    textAlign: 'left',
    minHeight: '52px',
  },
  tierDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  tierLabel: {
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  tierCount: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    background: 'var(--border)',
    borderRadius: '12px',
    padding: '2px 8px',
  },
  badges: {
    padding: '16px 18px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    borderTop: '1px solid var(--border)',
  },
  badge: {
    fontSize: '0.8rem',
    fontWeight: 500,
    padding: '5px 12px',
    borderRadius: '20px',
    border: '1px solid',
    color: 'var(--text)',
    background: 'var(--bg)',
    cursor: 'default',
    letterSpacing: '0.03em',
  },
  backRow: {
    marginTop: '48px',
  },
  backLink: {
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
    textDecoration: 'none',
  },
};
