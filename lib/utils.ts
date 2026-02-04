/**
 * Utility function for merging Tailwind CSS classes
 * Handles conditional classes and deduplication
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs
    .filter(Boolean)
    .join(' ')
    .split(' ')
    .filter((cls, idx, arr) => {
      // Remove duplicates, keeping the last occurrence (allows overrides)
      const lastIdx = arr.lastIndexOf(cls);
      return idx === lastIdx;
    })
    .join(' ');
}
