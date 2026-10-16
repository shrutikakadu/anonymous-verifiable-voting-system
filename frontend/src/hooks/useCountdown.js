import { useEffect, useState } from 'react';

// Milliseconds remaining until expiresAt, refreshed every 15 seconds.
export default function useCountdown(expiresAt) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  return Math.max(0, expiresAt - now);
}

export const formatDuration = (ms) => {
  if (ms < 60000) return 'under 1 min';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};
