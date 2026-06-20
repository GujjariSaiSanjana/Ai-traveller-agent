'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { tripsApi, type Trip, type PackingItem } from '@/lib/api';

const TIME_COLORS: Record<string, string> = {
  Morning: '#f59e0b', Afternoon: '#06b6d4', Evening: '#14b8a6',
};
const TIME_ICONS: Record<string, string> = {
  Morning: '🌅', Afternoon: '☀️', Evening: '🌙',
};
const CATEGORY_ICONS: Record<string, string> = {
  Documents: '📄', Clothing: '👕', Gear: '🎒', Other: '📦',
};

type TabKey = 'itinerary' | 'hotels' | 'budget' | 'packing';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('itinerary');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    tripsApi.get(id).then(setTrip).catch(() => router.push('/dashboard')).finally(() => setLoading(false));
  }, [id, router]);

  async function togglePacked(idx: number) {
    if (!trip) return;
    const updated = trip.packingList.map((p, i) => i === idx ? { ...p, isPacked: !p.isPacked } : p);
    setTrip({ ...trip, packingList: updated });
    setSaving(true);
    try { await tripsApi.update(id, { packingList: updated }); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading itinerary…</p>
      </div>
    </div>
  );

  if (!trip) return null;

  const packed = trip.packingList.filter(p => p.isPacked).length;
  const total  = trip.packingList.length;
  const pct    = total > 0 ? Math.round((packed / total) * 100) : 0;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'itinerary', label: '📅 Itinerary' },
    { key: 'hotels',    label: '🏨 Hotels' },
    { key: 'budget',    label: '💰 Budget' },
    { key: 'packing',   label: `🎒 Packing ${pct}%` },
  ];

  const byCategory = (trip.packingList ?? []).reduce<Record<string, PackingItem[]>>((acc, item) => {
    acc[item.category] = acc[item.category] ?? [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 1000, margin: '0 auto' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            ← My Trips
          </Link>
          <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            <span className="gradient-text">Wander</span><span style={{ color: 'var(--text-primary)' }}>AI</span>
          </span>
          {saving && <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Saving…</span>}
        </div>
      </nav>

      <div className="page-content" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

        {/* Hero header */}
        <div className="animate-fade-in" style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 12 }}>{trip.destination}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            <span className="badge badge-purple">📅 {trip.durationDays} days</span>
            <span className="badge badge-teal">💰 {trip.budgetTier}</span>
            {trip.interests.map(i => <span key={i} className="badge badge-amber">{i}</span>)}
          </div>
          {/* Budget summary bar */}
          <div className="card glass" style={{ padding: '16px 24px', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {[
              { label: 'Transport', val: trip.itinerary?.estimatedBudget?.transport },
              { label: 'Hotels', val: trip.itinerary?.estimatedBudget?.accommodation },
              { label: 'Food', val: trip.itinerary?.estimatedBudget?.food },
              { label: 'Activities', val: trip.itinerary?.estimatedBudget?.activities },
              { label: 'Total', val: trip.itinerary?.estimatedBudget?.total, highlight: true },
            ].map(b => (
              <div key={b.label}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: 2 }}>{b.label}</div>
                <div style={{ fontWeight: b.highlight ? 800 : 600, color: b.highlight ? '#a5f3fc' : 'var(--text-primary)', fontSize: b.highlight ? '1.2rem' : '1rem' }}>
                  ${b.val?.toLocaleString() ?? 0}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── ITINERARY ── */}
        {tab === 'itinerary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {trip.itinerary?.itinerary?.map(day => (
              <div key={day.dayNumber} className="card" style={{ padding: 24 }}>
                <h2 style={{ fontWeight: 700, marginBottom: 18, color: '#a5f3fc', fontSize: '1.05rem' }}>Day {day.dayNumber}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {day.activities.map((act, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14 }}>
                      <div style={{ minWidth: 44, height: 44, borderRadius: 10, background: `${TIME_COLORS[act.timeOfDay]}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', border: `1px solid ${TIME_COLORS[act.timeOfDay]}44`, flexShrink: 0 }}>
                        {TIME_ICONS[act.timeOfDay]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{act.name}</span>
                          <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                            {act.estimatedCostUSD === 0 ? 'Free' : `$${act.estimatedCostUSD}`}
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.87rem', lineHeight: 1.5 }}>{act.description}</p>
                        <span style={{ fontSize: '0.75rem', color: TIME_COLORS[act.timeOfDay], marginTop: 6, display: 'inline-block' }}>{act.timeOfDay}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── HOTELS ── */}
        {tab === 'hotels' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {trip.itinerary?.hotels?.map((h, i) => (
              <div key={i} className="card" style={{ padding: 24 }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>🏨</div>
                <h3 style={{ fontWeight: 700, marginBottom: 8 }}>{h.name}</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  <span className="badge badge-purple">{h.tier}</span>
                  <span className="badge badge-amber">⭐ {h.rating}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Per night</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#a5f3fc' }}>${h.estimatedCostNightUSD}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 8 }}>
                  Est. total: ${(h.estimatedCostNightUSD * trip.durationDays).toLocaleString()} for {trip.durationDays} nights
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── BUDGET ── */}
        {tab === 'budget' && (
          <div className="card" style={{ padding: 32 }}>
            <h2 style={{ fontWeight: 700, marginBottom: 24, fontSize: '1.2rem' }}>Budget Breakdown</h2>
            {[
              { label: '🚌 Transport', key: 'transport', color: '#14b8a6' },
              { label: '🏨 Accommodation', key: 'accommodation', color: '#06b6d4' },
              { label: '🍽️ Food', key: 'food', color: '#f59e0b' },
              { label: '🎭 Activities', key: 'activities', color: '#22d3ee' },
            ].map(({ label, key, color }) => {
              const val = trip.itinerary?.estimatedBudget?.[key as keyof typeof trip.itinerary.estimatedBudget] as number ?? 0;
              const tot = trip.itinerary?.estimatedBudget?.total ?? 1;
              const pctVal = Math.round((val / tot) * 100);
              return (
                <div key={key} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 500 }}>{label}</span>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{pctVal}%</span>
                      <span style={{ fontWeight: 700, color }}>${val.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div style={{ height: '100%', width: `${pctVal}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Total Estimate</span>
              <span style={{ fontWeight: 800, fontSize: '1.8rem', color: '#a5f3fc' }}>
                ${trip.itinerary?.estimatedBudget?.total?.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* ── PACKING ── */}
        {tab === 'packing' && (
          <div>
            {/* progress */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontWeight: 600 }}>Packing progress</span>
                <span style={{ color: '#a5f3fc', fontWeight: 700 }}>{packed}/{total} packed</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              {pct === 100 && <p style={{ color: '#10b981', marginTop: 12, fontWeight: 600 }}>✅ All packed! You&apos;re ready to go!</p>}
            </div>

            {/* by category */}
            {Object.entries(byCategory).map(([cat, items]) => (
              <div key={cat} className="card" style={{ padding: 24, marginBottom: 16 }}>
                <h3 style={{ fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {CATEGORY_ICONS[cat]} {cat}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 400 }}>
                    ({items.filter(i => i.isPacked).length}/{items.length})
                  </span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map((item, localIdx) => {
                    const globalIdx = trip.packingList.indexOf(item);
                    return (
                      <label key={localIdx} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '8px 0', opacity: item.isPacked ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                        <input
                          type="checkbox"
                          className="checkbox-custom"
                          checked={item.isPacked}
                          onChange={() => togglePacked(globalIdx)}
                        />
                        <span style={{ textDecoration: item.isPacked ? 'line-through' : 'none', fontSize: '0.93rem' }}>
                          {item.item}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
