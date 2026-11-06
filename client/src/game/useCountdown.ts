import { useNow } from "./useNow.ts";

// Whole seconds left until `endsAt` (epoch ms), ticking down; null when nothing runs.
// Worked out during render, so the countdown shows on the first frame
export function useCountdown(endsAt: number | null): number | null {
  const now = useNow(200, endsAt !== null);
  if (endsAt === null) return null;
  const remaining = Math.ceil((endsAt - now) / 1000);
  return remaining > 0 ? remaining : null;
}
