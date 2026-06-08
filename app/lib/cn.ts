/**
 * Tiny className joiner — filters out falsy values so conditional classes read
 * cleanly. No dependency needed; the design system is small enough that a plain
 * join (last-wins is handled by source order) is sufficient.
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
