import { useEffect, useState } from "react";

// Whole seconds left until `endsAt` (epoch ms), ticking down; null when nothing runs
export function useCountdown(endsAt: number | null): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (endsAt === null) {
      setSecondsLeft(null);
      return;
    }

    const tick = () => {
      const remaining = Math.ceil((endsAt - Date.now()) / 1000);
      setSecondsLeft(remaining > 0 ? remaining : null);
    };

    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  return secondsLeft;
}
