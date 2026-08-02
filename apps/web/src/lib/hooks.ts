"use client";

import { useEffect, useState } from "react";

export function useCountdown(active: boolean, seconds: number, onExpire?: () => void) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (!active) return;
    setRemaining(seconds);
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          onExpire?.();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [active, seconds, onExpire]);

  return remaining;
}
