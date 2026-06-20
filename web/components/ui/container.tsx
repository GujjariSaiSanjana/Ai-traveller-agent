import * as React from 'react';
import { cn } from '@/lib/utils';

/** Centered page container with consistent horizontal padding. Pass a max-w-* for the content width. */
export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full px-6 sm:px-8 lg:px-12', className)} {...props} />;
}
