'use client';

import Link from 'next/link';
import { Activity, ArrowUpRight, Plus, RadioTower } from 'lucide-react';
import { useCallback, useState } from 'react';
import { AppShell } from '../../components/app-shell';
import { LiveRefreshControl } from '../../components/live-refresh-control';
import { StatusBadge } from '../../components/status-badge';
import { useLiveRefresh } from '../../hooks/use-live-refresh';
import { api } from '../../lib/api';

type Monitor = { id: string; name: string; url: string; currentStatus: string; intervalMinutes: number; isActive: boolean; lastCheckedAt: string | null };

export default function MonitorsPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setMonitors(await api<Monitor[]>('/monitors'));
      setError('');
    } catch (loadError) {
      setError('Unable to load monitors.');
      throw loadError;
    } finally {
      setLoading(false);
    }
  }, []);
  const liveRefresh = useLiveRefresh(load);

  return <AppShell title="Monitors"><div className="page"><div className="page-title"><div><span className="eyebrow"><RadioTower size={13} /> Endpoint registry</span><h2>Monitors</h2><p>Endpoints currently tracked by this PulseDock instance.</p></div><div className="page-title-actions"><LiveRefreshControl {...liveRefresh} onRefresh={liveRefresh.refresh} /><Link className="button" href="/monitors/new"><Plus size={17} /> New monitor</Link></div></div>{error && <div className="notice">{error}</div>}<section className="surface"><div className="surface-head"><div><h3>Endpoint inventory</h3><p>{loading ? 'Loading monitors...' : `${monitors.length} configured ${monitors.length === 1 ? 'endpoint' : 'endpoints'}`}</p></div></div>{loading ? <div className="table-skeleton" aria-label="Loading monitors"><span /><span /><span /></div> : monitors.length ? <div className="table-wrap"><table className="monitor-table"><thead><tr><th>Name</th><th>Endpoint</th><th>Status</th><th>Interval</th><th>Last check</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>{monitors.map((monitor) => <tr key={monitor.id}><td><Link href={`/monitors/${monitor.id}`}><strong>{monitor.name}</strong></Link></td><td className="url-cell" title={monitor.url}>{monitor.url}</td><td><StatusBadge status={monitor.isActive ? monitor.currentStatus : 'DISABLED'} /></td><td>Every {monitor.intervalMinutes} min</td><td>{monitor.lastCheckedAt ? new Date(monitor.lastCheckedAt).toLocaleString() : 'Not checked'}</td><td className="row-action"><Link className="icon-link" href={`/monitors/${monitor.id}`} aria-label={`Open ${monitor.name}`} title={`Open ${monitor.name}`}><ArrowUpRight size={16} /></Link></td></tr>)}</tbody></table></div> : <div className="empty-state"><div className="empty-state-inner"><div className="empty-icon"><Activity size={22} /></div><h3>No monitors yet</h3><p>Add an endpoint to begin recording availability and response time.</p><Link className="button" href="/monitors/new"><Plus size={16} /> Add first monitor</Link></div></div>}</section></div></AppShell>;
}
