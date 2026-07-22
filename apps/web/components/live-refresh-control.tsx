'use client';

import { RefreshCw } from 'lucide-react';

type LiveRefreshControlProps = {
  lastUpdatedAt: Date | null;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
};

export function LiveRefreshControl({ lastUpdatedAt, onRefresh, refreshing }: LiveRefreshControlProps) {
  const label = lastUpdatedAt
    ? `Updated ${lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Updating';

  return (
    <div className="live-refresh" aria-live="polite">
      <span>{label}</span>
      <button
        className="icon-link"
        type="button"
        onClick={() => void onRefresh()}
        disabled={refreshing}
        aria-label="Refresh data"
        title="Refresh data"
      >
        <RefreshCw className={refreshing ? 'spin' : ''} size={16} />
      </button>
    </div>
  );
}
