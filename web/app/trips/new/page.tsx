'use client';
import { useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { tripsApi, type CreateTripInput } from '@/lib/api';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Container } from '@/components/ui/container';
import { cn } from '@/lib/utils';

const BUDGET_TIERS = [
  { value: 'budget', label: 'Budget', desc: 'Hostels, street food, free sights' },
  { value: 'mid-range', label: 'Mid-range', desc: 'Hotels, restaurants, paid attractions' },
  { value: 'luxury', label: 'Luxury', desc: '5-star stays, fine dining, VIP experiences' },
];
const SEASONS = [
  { value: 'Spring', label: 'Spring', desc: 'Mild weather, blossoms' },
  { value: 'Summer', label: 'Summer', desc: 'Warm, long days' },
  { value: 'Autumn', label: 'Autumn', desc: 'Cool breezes, foliage' },
  { value: 'Winter', label: 'Winter', desc: 'Cold, snow possible' },
];
const SUGGESTIONS = ['Art', 'History', 'Food', 'Nature', 'Beaches', 'Hiking', 'Architecture', 'Nightlife', 'Shopping', 'Museums', 'Photography', 'Adventure'];

export default function NewTripPage() {
  const router = useRouter();
  const [form, setForm] = useState({ destination: '', durationDays: 5, budgetTier: 'mid-range', interests: [] as string[], season: 'Summer', startDate: '', endDate: '' });
  const [interestInput, setInterestInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addInterest(val: string) {
    const t = val.trim();
    if (t && !form.interests.includes(t)) setForm((f) => ({ ...f, interests: [...f.interests, t] }));
    setInterestInput('');
  }
  function removeInterest(i: string) {
    setForm((f) => ({ ...f, interests: f.interests.filter((x) => x !== i) }));
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addInterest(interestInput); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.destination.trim()) { setError('Please enter a destination.'); return; }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setError('End date must be after the start date.'); return;
    }
    setError('');
    setLoading(true);
    const payload: CreateTripInput = {
      destination: form.destination,
      durationDays: form.durationDays,
      budgetTier: form.budgetTier,
      interests: form.interests,
      season: form.season,
      ...(form.startDate ? { startDate: form.startDate } : {}),
      ...(form.endDate ? { endDate: form.endDate } : {}),
    };
    try {
      const trip = await tripsApi.create(payload);
      router.push(`/trips/${trip._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar right={<Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>Back</Button>} />

      <Container className="max-w-[720px] py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight">Plan a new trip</h1>
          <p className="mt-1 text-muted-foreground">Fill in the details and AI will generate your full itinerary in seconds.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Card className="p-6">
            <Label htmlFor="dest">Where are you going?</Label>
            <Input id="dest" autoFocus placeholder="e.g. Tokyo, Japan or Rome, Italy"
              value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} />
          </Card>

          <Card className="p-6">
            <Label htmlFor="days">How many days? <span className="ml-1 font-display text-xl font-bold text-primary">{form.durationDays}</span></Label>
            <input id="days" type="range" min={1} max={30} value={form.durationDays}
              onChange={(e) => setForm((f) => ({ ...f, durationDays: Number(e.target.value) }))}
              className="mt-2 w-full cursor-pointer accent-[var(--primary)]" />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>1 day</span><span>30 days</span></div>
          </Card>

          <Card className="p-6">
            <Label>Travel dates <span className="font-normal text-muted-foreground">(optional — enables real weather-based packing)</span></Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-1 block text-xs text-muted-foreground">Start</span>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <span className="mb-1 block text-xs text-muted-foreground">End</span>
                <Input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">No dates? We&apos;ll use the season below instead.</p>
          </Card>

          <Card className="p-6">
            <Label>Season</Label>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {SEASONS.map((s) => (
                <label key={s.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors',
                    form.season === s.value ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-accent',
                  )}>
                  <input type="radio" name="season" value={s.value} checked={form.season === s.value}
                    onChange={() => setForm((f) => ({ ...f, season: s.value }))} className="accent-[var(--primary)]" />
                  <span>
                    <span className="block text-sm font-semibold">{s.label}</span>
                    <span className="block text-xs text-muted-foreground">{s.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <Label>Budget tier</Label>
            <div className="flex flex-col gap-2.5">
              {BUDGET_TIERS.map((bt) => (
                <label key={bt.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors',
                    form.budgetTier === bt.value ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-accent',
                  )}>
                  <input type="radio" name="budget" value={bt.value} checked={form.budgetTier === bt.value}
                    onChange={() => setForm((f) => ({ ...f, budgetTier: bt.value }))} className="accent-[var(--primary)]" />
                  <span>
                    <span className="block text-sm font-semibold">{bt.label}</span>
                    <span className="block text-xs text-muted-foreground">{bt.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <Label htmlFor="interest">Interests <span className="font-normal text-muted-foreground">(optional)</span></Label>
            {form.interests.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {form.interests.map((i) => (
                  <Badge key={i} variant="amber" className="gap-1.5">
                    {i}
                    <button type="button" onClick={() => removeInterest(i)} aria-label={`Remove ${i}`} className="opacity-70 hover:opacity-100">×</button>
                  </Badge>
                ))}
              </div>
            )}
            <Input id="interest" placeholder="Type and press Enter (e.g. food, hiking…)"
              value={interestInput} onChange={(e) => setInterestInput(e.target.value)} onKeyDown={onKey} onBlur={() => addInterest(interestInput)} />
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.filter((s) => !form.interests.includes(s)).map((s) => (
                <button key={s} type="button" onClick={() => addInterest(s)}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                  + {s}
                </button>
              ))}
            </div>
          </Card>

          {error && (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? <><Spinner /> Generating your itinerary… (this may take a moment)</> : 'Generate itinerary'}
          </Button>
        </form>
      </Container>
    </div>
  );
}
