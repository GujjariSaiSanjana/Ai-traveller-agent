'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { tripsApi, type Trip, type PackingItem } from '@/lib/api';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs } from '@/components/ui/tabs';

const TIME_ICON: Record<string, string> = { Morning: '🌅', Afternoon: '☀️', Evening: '🌙' };
const CAT_ICON: Record<string, string> = { Documents: '📄', Clothing: '👕', Gear: '🎒', Other: '📦' };

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('itinerary');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    tripsApi.get(id).then(setTrip).catch(() => router.push('/dashboard')).finally(() => setLoading(false));
  }, [id, router]);

  async function togglePacked(idx: number) {
    if (!trip) return;
    const updated = trip.packingList.map((p, i) => (i === idx ? { ...p, isPacked: !p.isPacked } : p));
    setTrip({ ...trip, packingList: updated });
    setSaving(true);
    try { await tripsApi.update(id, { packingList: updated }); } finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Spinner className="mr-3 text-primary" /> Loading itinerary…
      </div>
    );
  }
  if (!trip) return null;

  const budget = trip.itinerary?.estimatedBudget;
  const packed = trip.packingList.filter((p) => p.isPacked).length;
  const total = trip.packingList.length;
  const pct = total > 0 ? Math.round((packed / total) * 100) : 0;

  const byCategory = (trip.packingList ?? []).reduce<Record<string, PackingItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen">
      <Navbar
        right={
          <>
            {saving && <span className="hidden text-sm text-muted-foreground sm:inline">Saving…</span>}
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>← My Trips</Button>
          </>
        }
      />

      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="font-display text-4xl font-semibold tracking-tight">{trip.destination}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>📅 {trip.durationDays} days</Badge>
            <Badge variant="amber">💰 {trip.budgetTier}</Badge>
            {trip.interests.map((i) => <Badge key={i} variant="outline">{i}</Badge>)}
          </div>
        </div>

        <Tabs
          className="mb-7"
          value={tab}
          onValueChange={setTab}
          tabs={[
            { key: 'itinerary', label: '📅 Itinerary' },
            { key: 'hotels', label: '🏨 Hotels' },
            { key: 'budget', label: '💰 Budget' },
            { key: 'packing', label: `🎒 Packing ${pct}%` },
          ]}
        />

        {/* ITINERARY */}
        {tab === 'itinerary' && (
          <div className="flex flex-col gap-5">
            {trip.itinerary?.itinerary?.map((day) => (
              <Card key={day.dayNumber} className="p-6">
                <h2 className="mb-4 font-display text-lg font-semibold text-primary">Day {day.dayNumber}</h2>
                <div className="flex flex-col gap-4">
                  {day.activities.map((act, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-xl">
                        {TIME_ICON[act.timeOfDay] ?? '📍'}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <span className="font-semibold">{act.name}</span>
                          <span className="whitespace-nowrap text-sm font-semibold text-success">
                            {act.estimatedCostUSD === 0 ? 'Free' : `$${act.estimatedCostUSD}`}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">{act.description}</p>
                        <span className="mt-1.5 inline-block text-xs text-primary">{act.timeOfDay}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* HOTELS */}
        {tab === 'hotels' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {trip.itinerary?.hotels?.map((h, i) => (
              <Card key={i} className="p-6">
                <div className="mb-3 text-2xl">🏨</div>
                <h3 className="mb-2 font-display text-lg font-semibold">{h.name}</h3>
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge variant="amber">{h.tier}</Badge>
                  <Badge variant="outline">⭐ {h.rating}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Per night</span>
                  <span className="font-display text-xl font-semibold text-primary">${h.estimatedCostNightUSD}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Est. ${(h.estimatedCostNightUSD * trip.durationDays).toLocaleString()} for {trip.durationDays} nights
                </p>
              </Card>
            ))}
          </div>
        )}

        {/* BUDGET */}
        {tab === 'budget' && budget && (
          <Card className="p-8">
            <h2 className="mb-6 font-display text-xl font-semibold">Budget breakdown</h2>
            {([
              { label: '🚌 Transport', key: 'transport' },
              { label: '🏨 Accommodation', key: 'accommodation' },
              { label: '🍽️ Food', key: 'food' },
              { label: '🎭 Activities', key: 'activities' },
            ] as const).map(({ label, key }) => {
              const val = (budget[key] as number) ?? 0;
              const tot = budget.total || 1;
              const p = Math.round((val / tot) * 100);
              return (
                <div key={key} className="mb-5">
                  <div className="mb-2 flex justify-between text-sm">
                    <span>{label}</span>
                    <span className="font-semibold">${val.toLocaleString()} <span className="text-muted-foreground">· {p}%</span></span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="mt-6 flex items-baseline justify-between border-t border-border pt-5">
              <span className="font-semibold">Total estimate</span>
              <span className="font-display text-2xl font-bold text-primary">${budget.total?.toLocaleString()}</span>
            </div>
          </Card>
        )}

        {/* PACKING */}
        {tab === 'packing' && (
          <div className="flex flex-col gap-4">
            <Card className="p-6">
              <div className="mb-3 flex justify-between text-sm">
                <span className="font-semibold">Packing progress</span>
                <span className="font-semibold text-primary">{packed}/{total} packed</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              {pct === 100 && <p className="mt-3 font-semibold text-success">✅ All packed — you&apos;re ready to go!</p>}
            </Card>

            {Object.entries(byCategory).map(([cat, items]) => (
              <Card key={cat} className="p-6">
                <h3 className="mb-4 flex items-center gap-2 font-semibold">
                  {CAT_ICON[cat] ?? '📦'} {cat}
                  <span className="text-xs font-normal text-muted-foreground">({items.filter((i) => i.isPacked).length}/{items.length})</span>
                </h3>
                <div className="flex flex-col gap-2.5">
                  {items.map((item) => {
                    const globalIdx = trip.packingList.indexOf(item);
                    return (
                      <label key={globalIdx} className="flex cursor-pointer items-center gap-3 py-1">
                        <input
                          type="checkbox"
                          checked={item.isPacked}
                          onChange={() => togglePacked(globalIdx)}
                          className="h-[18px] w-[18px] rounded border-border accent-[var(--primary)]"
                        />
                        <span className={item.isPacked ? 'text-sm text-muted-foreground line-through' : 'text-sm'}>{item.item}</span>
                      </label>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
