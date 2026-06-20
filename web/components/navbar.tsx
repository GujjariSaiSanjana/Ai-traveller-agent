import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

/** Sticky translucent header. `right` slot for page-specific actions. */
export function Navbar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          Wander<span className="text-primary">AI</span>
        </Link>
        <div className="flex items-center gap-3">
          {right}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
