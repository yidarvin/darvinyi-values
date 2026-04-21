import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';

const RATING_CONFIG = [
  { rating: 1, label: 'Most Important to Me', color: '#c8a96e' },
  { rating: 2, label: 'Very Important to Me', color: '#b8943e' },
  { rating: 3, label: 'Important to Me', color: '#5a8fc8' },
  { rating: 4, label: 'Somewhat Important to Me', color: '#6a6a6a' },
  { rating: 5, label: 'Not Important to Me', color: '#3a3a3a' },
];

export default function SessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [shuffleOrder, setShuffleOrder] = useState([]);
  const [valuesMap, setValuesMap] = useState({});
  const [ratings, setRatings] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    async function load() {
      const { data } = await client.get(`/sessions/${id}`);
      setSession(data);
      setShuffleOrder(data.shuffle_order);
      setValuesMap(data.valuesMap);
      setRatings(data.ratings || {});

      const ratedIds = new Set(Object.keys(data.ratings || {}).map(Number));
      let resumeIndex = 0;
      for (let i = 0; i < data.shuffle_order.length; i++) {
        if (!ratedIds.has(data.shuffle_order[i])) {
          resumeIndex = i;
          break;
        }
        if (i === data.shuffle_order.length - 1) resumeIndex = i;
      }
      setCurrentIndex(resumeIndex);
      setLoading(false);
    }
    load();
  }, [id]);

  const currentValueId = shuffleOrder[currentIndex];
  const currentValue = valuesMap[currentValueId];
  const totalRated = Object.keys(ratings).length;

  async function rate(rating) {
    if (!currentValue) return;
    const valueId = currentValueId;

    setRatings(prev => ({ ...prev, [valueId]: rating }));

    const isLast = currentIndex === shuffleOrder.length - 1;

    if (!isLast) {
      setTimeout(() => setCurrentIndex(i => i + 1), 150);
    }

    setSaving(true);
    try {
      await client.put(`/sessions/${id}/values/${valueId}`, { rating });
    } catch {
      setToast('Save failed — please try again');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function completeSession() {
    await client.post(`/sessions/${id}/complete`);
    navigate(`/session/${id}/results`);
  }

  if (loading) {
    return (
      <div style={{ ...styles.page, alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading session…</p>
      </div>
    );
  }

  const isLast = currentIndex === shuffleOrder.length - 1;
  const lastRated = isLast && ratings[currentValueId];
  const progress = (totalRated / 107) * 100;

  return (
    <div style={styles.page}>
      {toast && <div style={styles.toast}>{toast}</div>}

      <header style={styles.header}>
        <span style={styles.sessionName}>{session?.name}</span>
        <button onClick={() => navigate('/dashboard')} style={styles.exitBtn}>
          Save &amp; exit
        </button>
      </header>

      <div style={styles.progressWrap}>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
        <span style={styles.progressLabel}>{totalRated} of 107</span>
      </div>

      <main style={styles.main}>
        <div style={styles.card}>
          <p style={styles.cardLabel}>Value {currentIndex + 1}</p>
          <h2 style={styles.valueName}>{currentValue?.name}</h2>
          <p style={styles.definition}>{currentValue?.definition}</p>
        </div>

        <div style={styles.ratingList}>
          {RATING_CONFIG.map(({ rating, label, color }) => {
            const selected = ratings[currentValueId] === rating;
            return (
              <button
                key={rating}
                onClick={() => rate(rating)}
                style={{
                  ...styles.ratingBtn,
                  ...(selected ? { ...styles.ratingBtnSelected, borderColor: color } : {}),
                }}
              >
                <span style={{ ...styles.dot, background: color }} />
                <span style={styles.ratingLabel}>{label}</span>
                {selected && <span style={{ color, fontSize: '1rem', marginLeft: 'auto' }}>✓</span>}
              </button>
            );
          })}
        </div>

        <div style={styles.nav}>
          <button
            onClick={() => setCurrentIndex(i => i - 1)}
            disabled={currentIndex === 0}
            style={styles.navBtn}
          >
            ← Back
          </button>

          {isLast ? (
            <button
              onClick={completeSession}
              disabled={!lastRated}
              style={{
                ...styles.completeBtn,
                opacity: lastRated ? 1 : 0.4,
              }}
            >
              Complete session →
            </button>
          ) : (
            <button
              onClick={() => setCurrentIndex(i => i + 1)}
              disabled={currentIndex >= shuffleOrder.length - 1}
              style={styles.navBtn}
            >
              Next →
            </button>
          )}
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid var(--border)',
  },
  sessionName: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  exitBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    minHeight: '44px',
  },
  progressWrap: {
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  progressBar: {
    flex: 1,
    height: '3px',
    background: 'var(--border)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'var(--accent)',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  progressLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  main: {
    flex: 1,
    maxWidth: '600px',
    width: '100%',
    margin: '0 auto',
    padding: '32px 24px 48px',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  card: {
    textAlign: 'center',
    padding: '40px 24px 32px',
  },
  cardLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '16px',
  },
  valueName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 'clamp(28px, 6vw, 44px)',
    fontWeight: 500,
    color: 'var(--text)',
    marginBottom: '12px',
    letterSpacing: '-0.5px',
  },
  definition: {
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    fontSize: '1rem',
  },
  ratingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  ratingBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 18px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    fontSize: '0.95rem',
    textAlign: 'left',
    cursor: 'pointer',
    minHeight: '52px',
    transition: 'all 0.15s',
  },
  ratingBtnSelected: {
    background: 'rgba(200, 169, 110, 0.06)',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  ratingLabel: {
    flex: 1,
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
  },
  navBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    minHeight: '44px',
    transition: 'opacity 0.15s',
  },
  completeBtn: {
    background: 'var(--accent)',
    border: 'none',
    color: '#0f0f0f',
    borderRadius: '6px',
    padding: '10px 24px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    minHeight: '44px',
  },
  toast: {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--danger)',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '0.875rem',
    zIndex: 100,
  },
};
