'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi, tripsApi, type User, type Trip } from '@/lib/api';

const BUDGET_COLORS: Record<string, string> = {
  budget: '#10b981', 'mid-range': '#06b6d4', luxury: '#f59e0b',
};

function TripCard({ trip, onDelete }: { trip: Trip; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const packed = trip.packingList?.filter(p => p.isPacked).length ?? 0;
  const total  = trip.packingList?.length ?? 0;
  const pct    = total > 0 ? Math.round((packed / total) * 100) : 0;

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm('Delete this trip?')) return;
    setDeleting(true);
    try { await tripsApi.delete(trip._id); onDelete(); }
    catch { setDeleting(false); }
  }

  return (
    <Link href={`/trips/${trip._id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ padding: 24, cursor: 'pointer' }}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>{trip.destination}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              {new Date(trip.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem', padding: 4, borderRadius: 6, transition: 'color 0.2s' }}
            title="Delete trip"
          >
            {deleting ? '…' : '🗑️'}
          </button>
        </div>

        {/* badges */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <span className="badge badge-purple">📅 {trip.durationDays} days</span>
          <span className="badge" style={{ background: `rgba(${BUDGET_COLORS[trip.budgetTier] ?? '#06b6d4'}, 0.12)`, color: BUDGET_COLORS[trip.budgetTier] ?? '#a5f3fc', border: `1px solid ${BUDGET_COLORS[trip.budgetTier] ?? '#06b6d4'}33` }}>
            💰 {trip.budgetTier}
          </span>
        </div>

        {/* interests */}
        {trip.interests?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {trip.interests.slice(0, 3).map(i => (
              <span key={i} className="badge badge-teal" style={{ fontSize: '0.72rem' }}>{i}</span>
            ))}
            {trip.interests.length > 3 && <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', alignSelf: 'center' }}>+{trip.interests.length - 3} more</span>}
          </div>
        )}

        {/* budget */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Est. budget</span>
          <span style={{ fontWeight: 700, color: '#a5f3fc' }}>${trip.itinerary?.estimatedBudget?.total?.toLocaleString()}</span>
        </div>

        {/* packing progress */}
        {total > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              <span>🎒 Packing</span><span>{packed}/{total} ({pct}%)</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser]   = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [u, t] = await Promise.all([authApi.me(), tripsApi.list()]);
        setUser(u.user);
        setTrips(t);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function handleLogout() {
    await authApi.logout();
    router.push('/');
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading your trips…</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 1200, margin: '0 auto' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', fontSize: '1.4rem', fontWeight: 700 }}>
            <span className="gradient-text">Wander</span><span style={{ color: 'var(--text-primary)' }}>AI</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>👋 {user?.name}</span>
            <button className="btn-secondary" style={{ padding: '7px 16px', fontSize: '0.85rem' }} onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="page-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 6 }}>My Trips</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {trips.length === 0 ? 'No trips yet — create your first one!' : `${trips.length} trip${trips.length !== 1 ? 's' : ''} planned`}
            </p>
          </div>
          <Link href="/trips/new">
            <button className="btn-primary" style={{ padding: '12px 24px' }}>
              ✨ New trip
            </button>
          </Link>
        </div>

        {/* Stats row */}
        {trips.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 40 }}>
            {[
              { label: 'Trips planned', value: trips.length, icon: '🗺️' },
              { label: 'Total days', value: trips.reduce((a, t) => a + t.durationDays, 0), icon: '📅' },
              { label: 'Total budget', value: `$${trips.reduce((a, t) => a + (t.itinerary?.estimatedBudget?.total ?? 0), 0).toLocaleString()}`, icon: '💰' },
              { label: 'Items to pack', value: trips.reduce((a, t) => a + (t.packingList?.length ?? 0), 0), icon: '🎒' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: '20px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#a5f3fc' }}>{s.value}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Trip grid */}
        {trips.length === 0 ? (
          <div className="card" style={{ padding: '80px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: 20 }}>✈️</div>
            <h2 style={{ fontWeight: 600, marginBottom: 12 }}>Your adventure starts here</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
              Create your first AI-powered trip and get a full itinerary, hotel picks, and packing list in seconds.
            </p>
            <Link href="/trips/new">
              <button className="btn-primary" style={{ padding: '14px 32px' }}>✨ Plan my first trip</button>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {trips.map(trip => (
              <TripCard key={trip._id} trip={trip} onDelete={() => setTrips(ts => ts.filter(t => t._id !== trip._id))} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
