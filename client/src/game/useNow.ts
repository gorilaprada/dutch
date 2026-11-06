import { useEffect, useState } from "react";

// Current time while `active`, re-rendering every intervalMs: drives countdowns.
// The clock is read on each render, so a countdown that just started is right
// on its first frame (the ticking state only schedules re-renders)
export function useNow(intervalMs: number, active = true): number {
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setTick(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, active]);

  return active ? Date.now() : tick;
}
