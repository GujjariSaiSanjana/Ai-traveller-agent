import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'amber' | 'outline' | 'success';

const variants: Record<Variant, string> = {
  default: 'border-border bg-muted text-muted-foreground',
  amber: 'border-primary/30 bg-primary/10 text-primary',
  outline: 'border-border text-foreground',
  success: 'border-success/30 bg-success/10 text-success',
};

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
