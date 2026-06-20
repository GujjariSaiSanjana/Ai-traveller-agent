const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
  return data as T;
}

// ── Auth ──
export const authApi = {
  register: (body: { email: string; password: string; name: string }) =>
    request<{ user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  me: () => request<{ user: User }>('/auth/me'),
};

// ── Trips ──
export const tripsApi = {
  create: (body: CreateTripInput) =>
    request<Trip>('/trips', { method: 'POST', body: JSON.stringify(body) }),

  list: () => request<Trip[]>('/trips'),

  get: (id: string) => request<Trip>(`/trips/${id}`),

  update: (id: string, patch: Partial<Pick<Trip, 'itinerary' | 'packingList'>>) =>
    request<Trip>(`/trips/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  delete: (id: string) => request(`/trips/${id}`, { method: 'DELETE' }),
};

// ── Types ──
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Activity {
  name: string;
  description: string;
  estimatedCostUSD: number;
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening';
}

export interface DayPlan {
  dayNumber: number;
  activities: Activity[];
}

export interface Hotel {
  name: string;
  tier: string;
  estimatedCostNightUSD: number;
  rating: string;
}

export interface Budget {
  transport: number;
  accommodation: number;
  food: number;
  activities: number;
  total: number;
}

export interface PackingItem {
  item: string;
  category: 'Documents' | 'Clothing' | 'Gear' | 'Other';
  isPacked: boolean;
}

export interface TripItinerary {
  itinerary: DayPlan[];
  hotels: Hotel[];
  estimatedBudget: Budget;
}

export interface Trip {
  _id: string;
  owner: string;
  destination: string;
  durationDays: number;
  budgetTier: string;
  interests: string[];
  itinerary: TripItinerary;
  packingList: PackingItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripInput {
  destination: string;
  durationDays: number;
  budgetTier: string;
  interests: string[];
}
