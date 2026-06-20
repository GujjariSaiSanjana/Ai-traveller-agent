'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi, tripsApi, type User, type Trip } from '@/lib/api';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

const TIER_LABEL: Record<string, string> = { budget: 'Budget', 'mid-range': 'Mid-range', luxury: 'Luxury', Low: 'Budget', Medium: 'Mid-range', High: 'Luxury' };

function TripCard({ trip, onDelete }: { trip: Trip; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const packed = trip.packingList?.filter((p) => p.isPacked).length ?? 0;
  const total = trip.packingList?.length ?? 0;
  const pct = total > 0 ? Math.round((packed / total) * 100) : 0;

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm('Delete this trip?')) return;
    setDeleting(true);
    try {
      await tripsApi.delete(trip._id);
      onDelete();
    } catch {
      setDeleting(false);
    }
  }

  return (
    <Link href={`/trips/${trip._id}`} className="group block">
      <Card className="h-full p-6 transition-transform group-hover:-translate-y-1">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-display text-xl font-semibold tracking-tight">{trip.destination}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {new Date(trip.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Delete trip"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
          >
            {deleting ? '…' : '🗑'}
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <Badge>📅 {trip.durationDays} days</Badge>
          <Badge variant="amber">💰 {TIER_LABEL[trip.budgetTier] ?? trip.budgetTier}</Badge>
          {trip.interests?.slice(0, 2).map((i) => <Badge key={i} variant="outline">{i}</Badge>)}
        </div>

        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Est. budget</span>
          <span className="font-display text-lg font-semibold text-primary">
            ${trip.itinerary?.estimatedBudget?.total?.toLocaleString() ?? 0}
          </span>
        </div>

        {total > 0 && (
          <>
            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
              <span>🎒 Packing</span>
              <span>{packed}/{total} ({pct}%)</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Spinner className="mr-3 text-primary" /> Loading your trips…
      </div>
    );
  }

  const stats = [
    { label: 'Trips planned', value: trips.length, icon: '🗺️' },
    { label: 'Total days', value: trips.reduce((a, t) => a + t.durationDays, 0), icon: '📅' },
    { label: 'Total budget', value: `$${trips.reduce((a, t) => a + (t.itinerary?.estimatedBudget?.total ?? 0), 0).toLocaleString()}`, icon: '💰' },
    { label: 'Items to pack', value: trips.reduce((a, t) => a + (t.packingList?.length ?? 0), 0), icon: '🎒' },
  ];

  return (
    <div className="min-h-screen">
      <Navbar
        right={
          <>
            <span className="hidden text-sm text-muted-foreground sm:inline">👋 {user?.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>Sign out</Button>
          </>
        }
      />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">My Trips</h1>
            <p className="mt-1 text-muted-foreground">
              {trips.length === 0 ? 'No trips yet — create your first one.' : `${trips.length} journey${trips.length !== 1 ? 's' : ''} planned`}
            </p>
          </div>
          <Link href="/trips/new"><Button>✦ New trip</Button></Link>
        </div>

        {trips.length > 0 && (
          <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label} className="p-5 text-center">
                <div className="mb-1.5 text-2xl">{s.icon}</div>
                <div className="font-display text-2xl font-semibold text-primary">{s.value}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
              </Card>
            ))}
          </div>
        )}

        {trips.length === 0 ? (
          <Card className="px-10 py-20 text-center">
            <div className="mb-5 text-5xl">✈️</div>
            <h2 className="mb-2 font-display text-xl font-semibold">Your adventure starts here</h2>
            <p className="mx-auto mb-7 max-w-md text-muted-foreground">
              Create your first AI-powered trip and get a full itinerary, hotel picks, budget and packing list in seconds.
            </p>
            <Link href="/trips/new"><Button size="lg">✦ Plan my first trip</Button></Link>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <TripCard key={trip._id} trip={trip} onDelete={() => setTrips((ts) => ts.filter((t) => t._id !== trip._id))} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
