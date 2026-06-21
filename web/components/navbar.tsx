import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

/** Sticky translucent header. Full-width with left padding matching page content. `right` slot for actions. */
export function Navbar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6 sm:px-8 lg:px-12">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          Wander<span className="text-primary">AI</span>
        </Link>
        <div className="flex items-center gap-3">
          <a
            href="https://saisanjana.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Portfolio ↗
          </a>
          {right}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
