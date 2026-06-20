import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const features = [
  { icon: '🗺️', title: 'AI Itineraries', desc: 'A day-by-day plan shaped to your budget tier and interests — generated in seconds.' },
  { icon: '🏨', title: 'Hotel picks', desc: 'Curated stays with tier, rating and nightly cost for every destination.' },
  { icon: '💰', title: 'Honest budgets', desc: 'A transparent breakdown across transport, stays, food and activities.' },
  { icon: '⛅', title: 'Weather-aware packing', desc: 'A checklist tuned to the local climate and the activities you scheduled.' },
];

const steps = [
  { num: '01', title: 'Create an account', desc: 'Sign up in seconds — your trips stay private to you.' },
  { num: '02', title: 'Describe your trip', desc: 'Destination, duration, budget tier and interests.' },
  { num: '03', title: 'Get your plan', desc: 'A full itinerary, hotels, budget and packing list — instantly.' },
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

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="aurora" />
        <div className="grid-fade absolute inset-0" />
        <div className="relative mx-auto max-w-3xl px-6 pb-20 pt-24 text-center">
          <Badge variant="amber" className="animate-fade-up">✦ Powered by Gemini AI</Badge>
          <h1 className="animate-fade-up mt-6 font-display text-5xl font-bold leading-[1.04] tracking-tight sm:text-6xl">
            Plan trips worth <em className="italic text-primary">remembering.</em>
          </h1>
          <p className="animate-fade-up mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Tell WanderAI where you&apos;re going. Get a day-by-day itinerary, a realistic budget, hand-picked stays and a packing list that actually knows the weather.
          </p>
          <div className="animate-fade-up mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/register"><Button size="lg">Plan a new trip →</Button></Link>
            <Link href="/login"><Button size="lg" variant="outline">Sign in</Button></Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-12 text-center font-display text-3xl font-semibold tracking-tight">
          Everything you need to travel <span className="text-primary">smarter</span>
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title} className="p-6 transition-transform hover:-translate-y-1">
              <div className="mb-4 text-3xl">{f.icon}</div>
              <h3 className="mb-2 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="mb-12 text-center font-display text-3xl font-semibold tracking-tight">
          How it <span className="text-primary">works</span>
        </h2>
        <div className="flex flex-col gap-4">
          {steps.map((s) => (
            <Card key={s.num} className="flex items-center gap-6 p-6">
              <div className="font-display text-3xl font-bold tabular-nums text-primary/35">{s.num}</div>
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-2xl px-6 pb-28 pt-4">
        <Card className="relative overflow-hidden p-12 text-center">
          <div className="aurora opacity-60" />
          <div className="relative">
            <h2 className="font-display text-3xl font-semibold tracking-tight">Ready to explore?</h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Start planning a trip in under a minute. No credit card, no clutter.
            </p>
            <Link href="/register" className="mt-7 inline-block">
              <Button size="lg">Start planning — it&apos;s free</Button>
            </Link>
          </div>
        </Card>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © 2026 WanderAI · Built with Next.js &amp; Gemini AI
      </footer>
    </div>
  );
}
