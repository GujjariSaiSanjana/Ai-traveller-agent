'use client';
import Link from 'next/link';

const features = [
  { icon: '🤖', title: 'AI-Powered Itineraries', desc: 'Gemini AI builds a day-by-day plan tailored to your budget and interests in seconds.' },
  { icon: '🏨', title: 'Hotel Recommendations', desc: 'Curated hotel picks with tier, rating, and estimated nightly cost for every trip.' },
  { icon: '💰', title: 'Budget Breakdown', desc: 'Transparent cost estimates across transport, accommodation, food, and activities.' },
  { icon: '🎒', title: 'Smart Packing List', desc: 'Auto-generated, categorised packing lists you can check off as you pack.' },
];

const steps = [
  { num: '01', title: 'Create an account', desc: 'Sign up in seconds — no credit card required.' },
  { num: '02', title: 'Describe your trip', desc: 'Enter your destination, duration, budget tier and interests.' },
  { num: '03', title: 'Get your itinerary', desc: 'AI generates a full plan with hotels, activities and budget in under 10 seconds.' },
];

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--gradient-hero)', minHeight: '100vh' }}>

      {/* Navbar */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 1200, margin: '0 auto' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            <span className="gradient-text">Wander</span><span style={{ color: 'var(--text-primary)' }}>AI</span>
          </span>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/login">
              <button className="btn-secondary" style={{ padding: '8px 20px' }}>Log in</button>
            </Link>
            <Link href="/register">
              <button className="btn-primary" style={{ padding: '8px 20px' }}>Get started</button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '140px 24px 100px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* background blobs */}
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />

        <div className="animate-fade-in" style={{ position: 'relative', zIndex: 1 }}>
          <span className="badge badge-purple" style={{ marginBottom: 20, display: 'inline-flex' }}>✨ Powered by Gemini AI</span>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: 24 }}>
            Plan your dream trip<br />
            <span className="gradient-text">in under 10 seconds</span>
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Tell us where you want to go and WanderAI generates a complete day-by-day itinerary, hotel picks, budget breakdown and packing list — instantly.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register">
              <button className="btn-primary animate-pulse-glow" style={{ padding: '14px 32px', fontSize: '1.05rem' }}>
                🚀 Plan my trip for free
              </button>
            </Link>
            <Link href="/login">
              <button className="btn-secondary" style={{ padding: '14px 32px', fontSize: '1.05rem' }}>
                Sign in
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: 48 }}>
          Everything you need to <span className="gradient-text">travel smarter</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {features.map((f) => (
            <div key={f.title} className="card" style={{ padding: 28 }}>
              <div style={{ fontSize: '2.4rem', marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 600, marginBottom: 10, fontSize: '1.05rem' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 24px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 56 }}>
          How it <span className="gradient-text">works</span>
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {steps.map((s, i) => (
            <div key={s.num} className="card glass" style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 24, textAlign: 'left' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-primary)', opacity: 0.4, minWidth: 60, fontVariantNumeric: 'tabular-nums' }}>{s.num}</div>
              <div>
                <h3 style={{ fontWeight: 600, marginBottom: 6 }}>{s.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{s.desc}</p>
              </div>
              {i < steps.length - 1 && <div style={{ marginLeft: 'auto', fontSize: '1.4rem', opacity: 0.3 }}>→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px 120px', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: 600, margin: '0 auto', padding: '56px 40px', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.08))' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 16 }}>Ready to explore the world?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Join thousands of travellers using WanderAI to plan unforgettable trips.</p>
          <Link href="/register">
            <button className="btn-primary" style={{ padding: '14px 36px', fontSize: '1.05rem' }}>
              🌍 Start planning — it&apos;s free
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        © 2026 WanderAI · Built with Next.js &amp; Gemini AI
      </footer>
    </div>
  );
}
