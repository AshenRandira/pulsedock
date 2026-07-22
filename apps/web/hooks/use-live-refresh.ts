'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type LiveRefreshOptions = {
  enabled?: boolean;
  intervalMs?: number;
};

export function useLiveRefresh(
  load: () => Promise<void>,
  { enabled = true, intervalMs = 30_000 }: LiveRefreshOptions = {},
) {
  const running = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (running.current) return;

    running.current = true;
    setRefreshing(true);
    try {
      await load();
      setLastUpdatedAt(new Date());
    } catch {
      // The page loader owns its user-facing error state.
    } finally {
      running.current = false;
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(initialRefresh);
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;

    const refreshVisiblePage = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const interval = window.setInterval(refreshVisiblePage, intervalMs);

    document.addEventListener('visibilitychange', refreshVisiblePage);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshVisiblePage);
    };
  }, [enabled, intervalMs, refresh]);

  return { lastUpdatedAt, refresh, refreshing };
}
