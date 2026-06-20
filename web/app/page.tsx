import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const features = [
  { k: '01', title: 'AI itineraries', desc: 'A day-by-day plan shaped to your budget tier and interests — generated in seconds.' },
  { k: '02', title: 'Hotel picks', desc: 'Curated stays with tier, rating and nightly cost for every destination.' },
  { k: '03', title: 'Honest budgets', desc: 'A transparent breakdown across transport, stays, food and activities.' },
  { k: '04', title: 'Weather-aware packing', desc: 'A checklist tuned to the local climate and the activities you scheduled.' },
];

const steps = [
  { num: '01', title: 'Create an account', desc: 'Sign up in seconds — your trips stay private to you.' },
  { num: '02', title: 'Describe your trip', desc: 'Destination, duration, budget tier and interests.' },
  { num: '03', title: 'Get your plan', desc: 'A full itinerary, hotels, budget and packing list — instantly.' },
];

const previewDay = [
  { icon: '🌅', name: 'Sensō-ji Temple', cost: 'Free' },
  { icon: '☀️', name: 'Asakusa street food', cost: '$18' },
  { icon: '🌙', name: 'Tokyo Skytree at dusk', cost: '$22' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar
        right={
          <>
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </>
        }
      />

      {/* Hero — two columns: copy + product preview */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-32 -top-40 h-[36rem] w-[36rem] rounded-full opacity-20 blur-[120px]"
          style={{ background: 'radial-gradient(circle, var(--primary), transparent 62%)' }}
        />
        <Container className="relative max-w-[1200px] py-20 lg:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            {/* copy */}
            <div>
              <p className="animate-fade-up font-display text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                AI-crafted journeys
              </p>
              <h1 className="animate-fade-up mt-5 font-display text-5xl font-bold leading-[1.03] tracking-tight sm:text-6xl">
                Plan trips worth <em className="italic text-primary">remembering.</em>
              </h1>
              <p className="animate-fade-up mt-6 max-w-md text-lg text-muted-foreground">
                Tell WanderAI where you&apos;re going. Get a day-by-day itinerary, a realistic budget, hand-picked stays and a packing list that actually knows the weather.
              </p>
              <div className="animate-fade-up mt-9 flex flex-wrap gap-3">
                <Link href="/register"><Button size="lg">Plan a new trip →</Button></Link>
                <Link href="/login"><Button size="lg" variant="outline">Sign in</Button></Link>
              </div>
            </div>

            {/* product preview */}
            <div className="relative hidden lg:block">
              <div
                className="pointer-events-none absolute -inset-8 rounded-[2.5rem] opacity-25 blur-3xl"
                style={{ background: 'radial-gradient(circle at 70% 30%, var(--primary), transparent 62%)' }}
              />
              <Card className="relative p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-xs uppercase tracking-[0.18em] text-primary">Day 1 · Itinerary</p>
                    <h3 className="mt-1 font-display text-2xl font-semibold tracking-tight">Tokyo, Japan</h3>
                  </div>
                  <Badge variant="amber">5 days</Badge>
                </div>
                <div className="mt-5 space-y-3">
                  {previewDay.map((a) => (
                    <div key={a.name} className="flex items-center gap-3">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-lg">
                        {a.icon}
                      </span>
                      <span className="flex-1 text-sm font-medium">{a.name}</span>
                      <span className="text-sm font-semibold text-success">{a.cost}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm text-muted-foreground">Est. budget</span>
                  <span className="font-display text-xl font-semibold text-primary">$1,420</span>
                </div>
              </Card>
              <Card className="absolute -bottom-6 -left-6 flex items-center gap-3 px-4 py-3">
                <span className="text-lg">⛅</span>
                <div>
                  <p className="text-xs font-semibold">Weather-aware packing</p>
                  <p className="text-xs text-muted-foreground">9 / 15 packed</p>
                </div>
              </Card>
            </div>
          </div>
          <div className="mt-20 border-t border-border" />
        </Container>
      </section>

      {/* Features — full-width hairline grid */}
      <section className="py-16">
        <Container className="max-w-[1200px]">
          <h2 className="mb-12 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything you need to travel <span className="text-primary">smarter</span>.
          </h2>
          <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.k} className="border-t border-border pt-5">
                <div className="font-display text-sm font-semibold tabular-nums text-primary/60">{f.k}</div>
                <h3 className="mt-1 font-display text-xl font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section className="py-16">
        <Container className="max-w-[1200px]">
          <h2 className="mb-12 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            How it <span className="text-primary">works</span>.
          </h2>
          <div className="grid gap-12 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.num} className="border-t border-border pt-5">
                <div className="font-display text-4xl font-bold tabular-nums text-primary/30">{s.num}</div>
                <h3 className="mt-3 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="pb-28 pt-8">
        <Container className="max-w-[1200px]">
          <div className="flex flex-wrap items-center justify-between gap-6 border-t border-border pt-12">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Ready to explore?</h2>
              <p className="mt-2 max-w-md text-muted-foreground">Start planning a trip in under a minute. No credit card, no clutter.</p>
            </div>
            <Link href="/register"><Button size="lg">Start planning — it&apos;s free</Button></Link>
          </div>
        </Container>
      </section>

      <footer className="border-t border-border py-8">
        <Container className="max-w-[1200px] text-sm text-muted-foreground">
          © 2026 WanderAI · Built with Next.js &amp; Gemini AI
        </Container>
      </footer>
    </div>
  );
}
