'use client';
import { useState, KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { tripsApi } from '@/lib/api';

const BUDGET_TIERS = [
  { value: 'budget', label: '🟢 Budget', desc: 'Hostels, street food, free sights' },
  { value: 'mid-range', label: '🔵 Mid-range', desc: 'Hotels, restaurants, paid attractions' },
  { value: 'luxury', label: '🟡 Luxury', desc: '5-star hotels, fine dining, VIP experiences' },
];

const INTEREST_SUGGESTIONS = ['Art', 'History', 'Food', 'Nature', 'Beaches', 'Hiking', 'Architecture', 'Nightlife', 'Shopping', 'Museums', 'Photography', 'Adventure'];

export default function NewTripPage() {
  const router = useRouter();
  const [form, setForm] = useState({ destination: '', durationDays: 5, budgetTier: 'mid-range', interests: [] as string[] });
  const [interestInput, setInterestInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addInterest(val: string) {
    const trimmed = val.trim();
    if (trimmed && !form.interests.includes(trimmed)) {
      setForm(f => ({ ...f, interests: [...f.interests, trimmed] }));
    }
    setInterestInput('');
  }

  function removeInterest(i: string) {
    setForm(f => ({ ...f, interests: f.interests.filter(x => x !== i) }));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addInterest(interestInput); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.destination.trim()) { setError('Please enter a destination.'); return; }
    setError('');
    setLoading(true);
    try {
      const trip = await tripsApi.create(form);
      router.push(`/trips/${trip._id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', maxWidth: 800, margin: '0 auto' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>← Back</Link>
          <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            <span className="gradient-text">Wander</span><span style={{ color: 'var(--text-primary)' }}>AI</span>
          </span>
        </div>
      </nav>

      <div className="page-content" style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>
        <div className="animate-fade-in">
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 8 }}>✨ Plan a new trip</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 40 }}>Fill in the details and AI will generate your full itinerary in seconds.</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* Destination */}
            <div className="card" style={{ padding: 24 }}>
              <label className="label" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                🌍 Where are you going?
              </label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Tokyo, Japan or Rome, Italy"
                value={form.destination}
                onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                required
                autoFocus
                style={{ fontSize: '1.05rem' }}
              />
            </div>

            {/* Duration */}
            <div className="card" style={{ padding: 24 }}>
              <label className="label" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
                📅 How many days? <span className="gradient-text" style={{ fontSize: '1.4rem', fontWeight: 800 }}>{form.durationDays}</span>
              </label>
              <input
                type="range"
                min={1} max={30} step={1}
                value={form.durationDays}
                onChange={e => setForm(f => ({ ...f, durationDays: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 8 }}>
                <span>1 day</span><span>30 days</span>
              </div>
            </div>

            {/* Budget */}
            <div className="card" style={{ padding: 24 }}>
              <label className="label" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
                💰 Budget tier
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {BUDGET_TIERS.map(bt => (
                  <label
                    key={bt.value}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                      border: `1px solid ${form.budgetTier === bt.value ? 'var(--accent-primary)' : 'var(--border)'}`,
                      background: form.budgetTier === bt.value ? 'rgba(99,102,241,0.08)' : 'var(--bg-secondary)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input type="radio" name="budget" value={bt.value} checked={form.budgetTier === bt.value} onChange={() => setForm(f => ({ ...f, budgetTier: bt.value }))} style={{ accentColor: 'var(--accent-primary)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{bt.label}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{bt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div className="card" style={{ padding: 24 }}>
              <label className="label" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                🎯 Interests <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.85rem' }}>(optional)</span>
              </label>

              {/* tag display */}
              {form.interests.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {form.interests.map(i => (
                    <span key={i} className="tag">
                      {i}<button type="button" onClick={() => removeInterest(i)}>×</button>
                    </span>
                  ))}
                </div>
              )}

              <input
                className="input"
                type="text"
                placeholder="Type and press Enter (e.g. food, hiking…)"
                value={interestInput}
                onChange={e => setInterestInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => addInterest(interestInput)}
              />

              {/* suggestions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {INTEREST_SUGGESTIONS.filter(s => !form.interests.includes(s)).map(s => (
                  <button key={s} type="button" onClick={() => addInterest(s)}
                    style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--accent-primary)'; (e.target as HTMLElement).style.color = '#a5b4fc'; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--text-secondary)'; }}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#fca5a5', fontSize: '0.9rem' }}>
                ⚠️ {error}
              </div>
            )}

            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '1.05rem' }}>
              {loading
                ? <><span className="spinner" />Generating your itinerary… (this may take a moment)</>
                : '✨ Generate itinerary'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
