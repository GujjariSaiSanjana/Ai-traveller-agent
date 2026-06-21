'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { tripsApi, type Trip, type PackingItem, type Activity, type Hotel, type DayPlan, type TripItinerary } from '@/lib/api';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs } from '@/components/ui/tabs';
import { Container } from '@/components/ui/container';
import { Input } from '@/components/ui/input';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const TIME_LABEL: Record<string, string> = { Morning: 'AM', Afternoon: 'PM', Evening: 'EVE' };

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('itinerary');
  const [saving, setSaving] = useState(false);

  // Dialog state (replaces native prompt/alert)
  const [regenDay, setRegenDay] = useState<number | null>(null);
  const [regenText, setRegenText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Editing Activities State
  const [editingActivityKey, setEditingActivityKey] = useState<string | null>(null);
  const [editActivityForm, setEditActivityForm] = useState<Partial<Activity> | null>(null);
  const [addingActivityDay, setAddingActivityDay] = useState<number | null>(null);
  const [newActivityForm, setNewActivityForm] = useState<Activity>({
    name: '',
    description: '',
    estimatedCostUSD: 0,
    timeOfDay: 'Morning'
  });

  // Editing Hotels State
  const [editingHotelIdx, setEditingHotelIdx] = useState<number | null>(null);
  const [editHotelForm, setEditHotelForm] = useState<Partial<Hotel> | null>(null);
  const [addingHotel, setAddingHotel] = useState(false);
  const [newHotelForm, setNewHotelForm] = useState<Hotel>({
    name: '',
    tier: 'mid-range',
    estimatedCostNightUSD: 100,
    rating: '4.0'
  });

  // Editing Budget Categories State
  const [editingBudgetCategory, setEditingBudgetCategory] = useState<'transport' | 'food' | null>(null);
  const [editBudgetVal, setEditBudgetVal] = useState<string>('');

  // Adding Custom Packing Item State
  const [newPackingItem, setNewPackingItem] = useState('');
  const [newPackingCategory, setNewPackingCategory] = useState<'Documents' | 'Clothing' | 'Gear' | 'Other'>('Clothing');

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

  // Save changes to backend and live-recalculate budgets
  function saveItineraryChanges(updatedItinerary: TripItinerary) {
    if (!trip) return;
    const actTotal = (updatedItinerary.itinerary || []).reduce(
      (sum: number, day: DayPlan) => sum + (day.activities || []).reduce((s: number, a: Activity) => s + (Number(a.estimatedCostUSD) || 0), 0),
      0
    );
    const hotelTotal = (updatedItinerary.hotels || []).reduce(
      (sum: number, hotel: Hotel) => sum + (Number(hotel.estimatedCostNightUSD) || 0) * trip.durationDays,
      0
    );
    const transport = Number(updatedItinerary.estimatedBudget?.transport) || 0;
    const food = Number(updatedItinerary.estimatedBudget?.food) || 0;
    const total = transport + hotelTotal + food + actTotal;

    updatedItinerary.estimatedBudget = {
      transport,
      accommodation: hotelTotal,
      food,
      activities: actTotal,
      total,
    };

    setTrip({ ...trip, itinerary: updatedItinerary });
    setSaving(true);
    tripsApi.update(id, { itinerary: updatedItinerary }).finally(() => setSaving(false));
  }

  // --- Handlers for Custom Packing Checklist ---
  async function addCustomPackingItem(e: React.FormEvent) {
    e.preventDefault();
    if (!trip || !newPackingItem.trim()) return;
    const newItem: PackingItem = {
      item: newPackingItem.trim(),
      category: newPackingCategory,
      isPacked: false,
    };
    const updatedList = [...(trip.packingList || []), newItem];
    setTrip({ ...trip, packingList: updatedList });
    setNewPackingItem('');
    setSaving(true);
    try {
      await tripsApi.update(id, { packingList: updatedList });
    } finally {
      setSaving(false);
    }
  }

  async function deletePackingItem(globalIdx: number) {
    if (!trip) return;
    const updatedList = trip.packingList.filter((_, idx) => idx !== globalIdx);
    setTrip({ ...trip, packingList: updatedList });
    setSaving(true);
    try {
      await tripsApi.update(id, { packingList: updatedList });
    } finally {
      setSaving(false);
    }
  }

  // --- Handlers for Activities ---
  function startEditActivity(dayNum: number, actIdx: number, act: Activity) {
    setEditingActivityKey(`${dayNum}-${actIdx}`);
    setEditActivityForm({ ...act });
  }

  function saveActivityEdit(dayNum: number, actIdx: number) {
    if (!trip || !editActivityForm || !editActivityForm.name) return;
    const newItinerary = { ...trip.itinerary };
    newItinerary.itinerary = newItinerary.itinerary.map(day => {
      if (day.dayNumber === dayNum) {
        const activities = day.activities.map((act, idx) => {
          if (idx === actIdx) {
            return {
              name: editActivityForm.name!,
              description: editActivityForm.description || '',
              estimatedCostUSD: Number(editActivityForm.estimatedCostUSD) || 0,
              timeOfDay: editActivityForm.timeOfDay || 'Morning',
            };
          }
          return act;
        });
        return { ...day, activities };
      }
      return day;
    });
    setEditingActivityKey(null);
    setEditActivityForm(null);
    saveItineraryChanges(newItinerary);
  }

  function cancelEditActivity() {
    setEditingActivityKey(null);
    setEditActivityForm(null);
  }

  function deleteActivity(dayNum: number, actIdx: number) {
    if (!trip) return;
    const newItinerary = { ...trip.itinerary };
    newItinerary.itinerary = newItinerary.itinerary.map(day => {
      if (day.dayNumber === dayNum) {
        const activities = day.activities.filter((_, idx) => idx !== actIdx);
        return { ...day, activities };
      }
      return day;
    });
    saveItineraryChanges(newItinerary);
  }

  function addActivity(dayNum: number) {
    if (!trip || !newActivityForm.name.trim()) return;
    const newItinerary = { ...trip.itinerary };
    newItinerary.itinerary = newItinerary.itinerary.map(day => {
      if (day.dayNumber === dayNum) {
        return {
          ...day,
          activities: [...day.activities, { ...newActivityForm, estimatedCostUSD: Number(newActivityForm.estimatedCostUSD) || 0 }],
        };
      }
      return day;
    });
    setAddingActivityDay(null);
    setNewActivityForm({ name: '', description: '', estimatedCostUSD: 0, timeOfDay: 'Morning' });
    saveItineraryChanges(newItinerary);
  }

  // Regenerate a whole day via the LLM (server returns the updated trip with budget re-synced).
  function regenerateDayHandler(dayNum: number) {
    setRegenText('');
    setRegenDay(dayNum);
  }
  async function doRegenerate() {
    if (regenDay == null || !regenText.trim()) return;
    setSaving(true);
    try {
      const updated = await tripsApi.regenerateDay(id, regenDay, regenText.trim());
      setTrip(updated);
      setRegenDay(null);
    } catch (e) {
      setRegenDay(null);
      setErrorMsg(e instanceof Error ? e.message : 'Failed to regenerate day');
    } finally {
      setSaving(false);
    }
  }

  // --- Handlers for Hotels ---
  function startEditHotel(idx: number, hotel: Hotel) {
    setEditingHotelIdx(idx);
    setEditHotelForm({ ...hotel });
  }

  function saveHotelEdit(idx: number) {
    if (!trip || !editHotelForm || !editHotelForm.name) return;
    const newItinerary = { ...trip.itinerary };
    newItinerary.hotels = newItinerary.hotels.map((h, i) => {
      if (i === idx) {
        return {
          name: editHotelForm.name!,
          tier: editHotelForm.tier || 'mid-range',
          estimatedCostNightUSD: Number(editHotelForm.estimatedCostNightUSD) || 0,
          rating: editHotelForm.rating || '4.0',
        };
      }
      return h;
    });
    setEditingHotelIdx(null);
    setEditHotelForm(null);
    saveItineraryChanges(newItinerary);
  }

  function cancelEditHotel() {
    setEditingHotelIdx(null);
    setEditHotelForm(null);
  }

  function deleteHotel(idx: number) {
    if (!trip) return;
    const newItinerary = { ...trip.itinerary };
    newItinerary.hotels = newItinerary.hotels.filter((_, i) => i !== idx);
    saveItineraryChanges(newItinerary);
  }

  function addHotel() {
    if (!trip || !newHotelForm.name.trim()) return;
    const newItinerary = { ...trip.itinerary };
    newItinerary.hotels = [...(newItinerary.hotels || []), { ...newHotelForm, estimatedCostNightUSD: Number(newHotelForm.estimatedCostNightUSD) || 0 }];
    setAddingHotel(false);
    setNewHotelForm({ name: '', tier: 'mid-range', estimatedCostNightUSD: 100, rating: '4.0' });
    saveItineraryChanges(newItinerary);
  }

  // --- Handlers for Budgets ---
  function startEditBudgetCategory(cat: 'transport' | 'food', val: number) {
    setEditingBudgetCategory(cat);
    setEditBudgetVal(val.toString());
  }

  function saveBudgetCategoryEdit(cat: 'transport' | 'food') {
    if (!trip) return;
    const newItinerary = { ...trip.itinerary };
    newItinerary.estimatedBudget = {
      ...newItinerary.estimatedBudget,
      [cat]: Number(editBudgetVal) || 0,
    };
    setEditingBudgetCategory(null);
    setEditBudgetVal('');
    saveItineraryChanges(newItinerary);
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
  const packed = trip.packingList?.filter((p) => p.isPacked).length ?? 0;
  const total = trip.packingList?.length ?? 0;
  const pct = total > 0 ? Math.round((packed / total) * 100) : 0;

  const byCategory = (trip.packingList ?? []).reduce<Record<string, PackingItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  // Budget calculations
  const dailyLimit = trip.budgetTier === 'budget' ? 75 : trip.budgetTier === 'mid-range' ? 200 : 600;
  const budgetLimit = dailyLimit * trip.durationDays;
  const totalSpent = budget?.total ?? 0;
  const isOverBudget = totalSpent > budgetLimit;

  return (
    <div className="min-h-screen">
      <Navbar
        right={
          <>
            {saving && <span className="hidden text-sm text-muted-foreground sm:inline animate-pulse">Saving…</span>}
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>← My Trips</Button>
          </>
        }
      />

      <Container className="max-w-[920px] py-10 animate-fade-up">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="font-display text-4xl font-semibold tracking-tight">{trip.destination}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{trip.durationDays} days</Badge>
            <Badge>{trip.season}</Badge>
            <Badge variant="amber">{trip.budgetTier}</Badge>
            {trip.interests.map((i) => <Badge key={i} variant="outline">{i}</Badge>)}
          </div>
        </div>

        <Tabs
          className="mb-7"
          value={tab}
          onValueChange={setTab}
          tabs={[
            { key: 'itinerary', label: 'Itinerary' },
            { key: 'hotels', label: 'Hotels' },
            { key: 'budget', label: 'Budget' },
            { key: 'packing', label: `Packing ${pct}%` },
          ]}
        />

        {/* ITINERARY */}
        {tab === 'itinerary' && (
          <div className="flex flex-col gap-5">
            {trip.itinerary?.itinerary?.map((day) => (
              <Card key={day.dayNumber} className="p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-semibold text-primary">Day {day.dayNumber}</h2>
                  <Button variant="ghost" size="sm" className="h-8 border border-border px-3 text-xs hover:bg-accent" onClick={() => regenerateDayHandler(day.dayNumber)}>
                    Regenerate day
                  </Button>
                </div>
                <div className="flex flex-col gap-4">
                  {day.activities.map((act, i) => {
                    const isEditing = editingActivityKey === `${day.dayNumber}-${i}`;
                    if (isEditing) {
                      return (
                        <Card key={i} className="p-4 border border-dashed border-primary bg-primary/5">
                          <div className="flex flex-col gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-muted-foreground mb-1">Activity Name</label>
                              <Input
                                value={editActivityForm?.name ?? ''}
                                onChange={(e) => setEditActivityForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="e.g. Visit museum"
                              />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="block text-xs font-semibold text-muted-foreground mb-1">Cost (USD)</label>
                                <Input
                                  type="number"
                                  value={editActivityForm?.estimatedCostUSD ?? ''}
                                  onChange={(e) => setEditActivityForm(f => ({ ...f, estimatedCostUSD: Number(e.target.value) }))}
                                  placeholder="0 for Free"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-muted-foreground mb-1">Time of Day</label>
                                <select
                                  value={editActivityForm?.timeOfDay ?? 'Morning'}
                                  onChange={(e) => setEditActivityForm(f => ({ ...f, timeOfDay: e.target.value as Activity['timeOfDay'] }))}
                                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                                >
                                  <option value="Morning">Morning</option>
                                  <option value="Afternoon">Afternoon</option>
                                  <option value="Evening">Evening</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-muted-foreground mb-1">Description</label>
                              <textarea
                                value={editActivityForm?.description ?? ''}
                                onChange={(e) => setEditActivityForm(f => ({ ...f, description: e.target.value }))}
                                className="flex min-h-[75px] w-full rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                                placeholder="Tell us what you will do..."
                              />
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <Button variant="outline" size="sm" onClick={() => deleteActivity(day.dayNumber, i)} className="text-destructive border-destructive hover:bg-destructive/10 h-9 px-3">
                                Delete
                              </Button>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={cancelEditActivity} className="h-9 px-3">Cancel</Button>
                                <Button size="sm" onClick={() => saveActivityEdit(day.dayNumber, i)} className="h-9 px-4">Save</Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    }

                    return (
                      <div key={i} className="group relative flex gap-4 p-2.5 rounded-xl hover:bg-accent/40 transition-colors">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-xs font-semibold text-muted-foreground">
                          {TIME_LABEL[act.timeOfDay] ?? '—'}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <span className="font-semibold">{act.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="whitespace-nowrap text-sm font-semibold text-success">
                                {act.estimatedCostUSD === 0 ? 'Free' : `$${act.estimatedCostUSD}`}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-xs border border-transparent hover:border-border hover:bg-card"
                                onClick={() => startEditActivity(day.dayNumber, i, act)}
                                aria-label="Edit activity"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <p className="mt-0.5 text-sm text-muted-foreground">{act.description}</p>
                          <span className="mt-1.5 inline-block text-xs text-primary">{act.timeOfDay}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {addingActivityDay === day.dayNumber ? (
                  <Card className="p-4 border border-dashed border-primary bg-primary/5 mt-4">
                    <h3 className="text-sm font-semibold mb-3">Add New Activity</h3>
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Activity Name</label>
                        <Input
                          value={newActivityForm.name}
                          onChange={(e) => setNewActivityForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="e.g. Hiking up the trail"
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Cost (USD)</label>
                          <Input
                            type="number"
                            value={newActivityForm.estimatedCostUSD || ''}
                            onChange={(e) => setNewActivityForm(f => ({ ...f, estimatedCostUSD: Number(e.target.value) }))}
                            placeholder="0 for Free"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Time of Day</label>
                          <select
                            value={newActivityForm.timeOfDay}
                            onChange={(e) => setNewActivityForm(f => ({ ...f, timeOfDay: e.target.value as Activity['timeOfDay'] }))}
                            className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                          >
                            <option value="Morning">Morning</option>
                            <option value="Afternoon">Afternoon</option>
                            <option value="Evening">Evening</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Description</label>
                        <textarea
                          value={newActivityForm.description}
                          onChange={(e) => setNewActivityForm(f => ({ ...f, description: e.target.value }))}
                          className="flex min-h-[75px] w-full rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                          placeholder="Enter details..."
                        />
                      </div>
                      <div className="flex justify-end gap-2 mt-1">
                        <Button variant="ghost" size="sm" onClick={() => setAddingActivityDay(null)} className="h-9 px-3">Cancel</Button>
                        <Button size="sm" onClick={() => addActivity(day.dayNumber)} disabled={!newActivityForm.name.trim()} className="h-9 px-4">Add Activity</Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Button variant="outline" size="sm" className="w-full mt-4 border-dashed py-5 border-border hover:border-primary hover:bg-primary/5 transition-colors" onClick={() => setAddingActivityDay(day.dayNumber)}>
                    + Add Activity to Day {day.dayNumber}
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* HOTELS */}
        {tab === 'hotels' && (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {(trip.itinerary?.hotels ?? []).map((h, i) => {
                const isEditing = editingHotelIdx === i;
                if (isEditing) {
                  return (
                    <Card key={i} className="p-6 border border-primary bg-primary/5">
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Hotel Name</label>
                          <Input
                            value={editHotelForm?.name ?? ''}
                            onChange={(e) => setEditHotelForm(f => ({ ...f, name: e.target.value }))}
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Nightly Cost</label>
                            <Input
                              type="number"
                              value={editHotelForm?.estimatedCostNightUSD ?? ''}
                              onChange={(e) => setEditHotelForm(f => ({ ...f, estimatedCostNightUSD: Number(e.target.value) }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Rating</label>
                            <Input
                              value={editHotelForm?.rating ?? ''}
                              onChange={(e) => setEditHotelForm(f => ({ ...f, rating: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Tier</label>
                            <Input
                              value={editHotelForm?.tier ?? ''}
                              onChange={(e) => setEditHotelForm(f => ({ ...f, tier: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <Button variant="outline" size="sm" onClick={() => deleteHotel(i)} className="text-destructive border-destructive hover:bg-destructive/10 h-9 px-3">
                            Delete
                          </Button>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={cancelEditHotel} className="h-9 px-3">Cancel</Button>
                            <Button size="sm" onClick={() => saveHotelEdit(i)} className="h-9 px-4">Save</Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                }

                return (
                  <Card key={i} className="group relative p-6 hover:shadow-md transition-all duration-300">
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 opacity-0 group-hover:opacity-100 transition-all border border-border bg-card hover:bg-accent text-xs"
                        onClick={() => startEditHotel(i, h)}
                      >
                        Edit
                      </Button>
                    </div>
                    
                    <h3 className="mb-2 font-display text-lg font-semibold">{h.name}</h3>
                    <div className="mb-4 flex flex-wrap gap-2">
                      <Badge variant="amber">{h.tier}</Badge>
                      <Badge variant="outline">{h.rating}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Per night</span>
                      <span className="font-display text-xl font-semibold text-primary">${h.estimatedCostNightUSD}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Est. ${(h.estimatedCostNightUSD * trip.durationDays).toLocaleString()} for {trip.durationDays} nights
                    </p>
                  </Card>
                );
              })}
            </div>

            {addingHotel ? (
              <Card className="p-6 border border-dashed border-primary bg-primary/5">
                <h3 className="font-display text-lg font-semibold mb-4">Add New Hotel Option</h3>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Hotel Name</label>
                    <Input
                      value={newHotelForm.name}
                      onChange={(e) => setNewHotelForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Hilton Tokyo"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Nightly Cost (USD)</label>
                      <Input
                        type="number"
                        value={newHotelForm.estimatedCostNightUSD || ''}
                        onChange={(e) => setNewHotelForm(f => ({ ...f, estimatedCostNightUSD: Number(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Rating</label>
                      <Input
                        value={newHotelForm.rating}
                        onChange={(e) => setNewHotelForm(f => ({ ...f, rating: e.target.value }))}
                        placeholder="e.g. 4.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Tier</label>
                      <Input
                        value={newHotelForm.tier}
                        onChange={(e) => setNewHotelForm(f => ({ ...f, tier: e.target.value }))}
                        placeholder="e.g. Luxury"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <Button variant="ghost" size="sm" onClick={() => setAddingHotel(false)} className="h-9 px-3">Cancel</Button>
                    <Button size="sm" onClick={addHotel} disabled={!newHotelForm.name.trim()} className="h-9 px-4">Add Hotel</Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Button variant="outline" className="border-dashed py-6 border-border hover:border-primary hover:bg-primary/5 transition-colors" onClick={() => setAddingHotel(true)}>
                + Add Hotel Option
              </Button>
            )}
          </div>
        )}

        {/* BUDGET */}
        {tab === 'budget' && budget && (
          <div className="flex flex-col gap-6">
            {/* Tier Guardrail Alert */}
            <Card className={cn("p-6 border-l-4 transition-all duration-300", isOverBudget ? "border-l-destructive bg-destructive/5" : "border-l-success bg-success/5")}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-base">Budget Cap Guardrail</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your target tier is <span className="font-semibold capitalize text-primary">{trip.budgetTier}</span> (Max ${dailyLimit}/day).
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-display text-2xl font-bold">${totalSpent.toLocaleString()}</span>
                  <span className="text-muted-foreground text-sm"> / ${budgetLimit.toLocaleString()} cap</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Spent Progress</span>
                  <span>{Math.round((totalSpent / budgetLimit) * 100)}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-500", isOverBudget ? "bg-destructive" : "bg-success")}
                    style={{ width: `${Math.min((totalSpent / budgetLimit) * 100, 100)}%` }}
                  />
                </div>
              </div>
              {isOverBudget && (
                <div className="mt-3 text-sm text-destructive font-semibold text-center border border-destructive/20 bg-destructive/5 py-2.5 rounded-lg">
                  Budget Alert: You have exceeded the target cap of ${budgetLimit.toLocaleString()} for this trip&apos;s tier. Consider editing activity costs, choosing a cheaper hotel, or scaling back transport/food budgets.
                </div>
              )}
            </Card>

            <Card className="p-8">
              <h2 className="mb-6 font-display text-xl font-semibold">Budget breakdown</h2>
              {([
                { label: 'Transport', key: 'transport', readOnly: false },
                { label: 'Accommodation', key: 'accommodation', readOnly: true },
                { label: 'Food', key: 'food', readOnly: false },
                { label: 'Activities', key: 'activities', readOnly: true },
              ] as const).map(({ label, key, readOnly }) => {
                const val = (budget[key] as number) ?? 0;
                const tot = budget.total || 1;
                const p = Math.round((val / tot) * 100);
                const isEditing = editingBudgetCategory === key;
                return (
                  <div key={key} className="mb-5 last:mb-0">
                    <div className="mb-2 flex justify-between items-center text-sm">
                      <span>{label}</span>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              value={editBudgetVal}
                              onChange={(e) => setEditBudgetVal(e.target.value)}
                              className="h-8 w-24 text-xs px-2"
                              autoFocus
                            />
                            <Button size="sm" className="h-8 px-2 text-xs" onClick={() => saveBudgetCategoryEdit(key as 'transport' | 'food')}>Save</Button>
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setEditingBudgetCategory(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">${val.toLocaleString()} <span className="text-muted-foreground font-normal">· {p}%</span></span>
                            {!readOnly && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-1.5 text-xs border border-border hover:bg-accent"
                                onClick={() => startEditBudgetCategory(key as 'transport' | 'food', val)}
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
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
          </div>
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
              {pct === 100 && total > 0 && <p className="mt-3 font-semibold text-success">All packed — you&apos;re ready to go!</p>}
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-semibold mb-3">+ Add Custom Packing Item</h3>
              <form onSubmit={addCustomPackingItem} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    value={newPackingItem}
                    onChange={(e) => setNewPackingItem(e.target.value)}
                    placeholder="e.g. Passport, Swimwear, Camera charger..."
                    className="h-10 text-sm"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <select
                    value={newPackingCategory}
                    onChange={(e) => setNewPackingCategory(e.target.value as PackingItem['category'])}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <option value="Documents">Documents</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Gear">Gear</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <Button type="submit" size="sm" className="h-10 px-4" disabled={!newPackingItem.trim()}>
                  Add Item
                </Button>
              </form>
            </Card>

            {Object.entries(byCategory).map(([cat, items]) => (
              <Card key={cat} className="p-6">
                <h3 className="mb-4 flex items-center gap-2 font-semibold">
                  {cat}
                  <span className="text-xs font-normal text-muted-foreground">({items.filter((i) => i.isPacked).length}/{items.length})</span>
                </h3>
                <div className="flex flex-col gap-2.5">
                  {items.map((item) => {
                    const globalIdx = trip.packingList.indexOf(item);
                    return (
                      <div key={globalIdx} className="group flex items-center justify-between py-1 hover:bg-accent/20 rounded px-1.5 transition-colors">
                        <label className="flex cursor-pointer items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={item.isPacked}
                            onChange={() => togglePacked(globalIdx)}
                            className="h-[18px] w-[18px] rounded border-border accent-[var(--primary)]"
                          />
                          <span className="flex flex-col">
                            <span className={item.isPacked ? 'text-sm text-muted-foreground line-through' : 'text-sm'}>{item.item}</span>
                            {item.reason && <span className="text-xs italic text-muted-foreground">{item.reason}</span>}
                          </span>
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-xs text-destructive border border-transparent hover:border-destructive/20 hover:bg-destructive/5"
                          onClick={() => deletePackingItem(globalIdx)}
                          title="Delete item"
                        >
                          ×
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}


        {/* Regenerate-day dialog */}
        <Dialog
          open={regenDay !== null}
          onClose={() => { if (!saving) setRegenDay(null); }}
          title={`Regenerate Day ${regenDay ?? ''}`}
          description="Tell the AI what to focus on for this day."
        >
          <textarea
            value={regenText}
            onChange={(e) => setRegenText(e.target.value)}
            placeholder="e.g. more outdoor activities, less shopping"
            rows={3}
            autoFocus
            className="mt-4 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRegenDay(null)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={doRegenerate} disabled={saving || !regenText.trim()}>
              {saving ? <><Spinner /> Regenerating…</> : 'Regenerate'}
            </Button>
          </DialogFooter>
        </Dialog>

        {/* Error dialog */}
        <Dialog open={!!errorMsg} onClose={() => setErrorMsg('')} title="Something went wrong" description={errorMsg}>
          <DialogFooter>
            <Button size="sm" onClick={() => setErrorMsg('')}>OK</Button>
          </DialogFooter>
        </Dialog>
      </Container>
    </div>
  );
}
