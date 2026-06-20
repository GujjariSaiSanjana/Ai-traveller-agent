/** Minimal classnames joiner (shadcn-style `cn`, dependency-free). */
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(' ');
}
