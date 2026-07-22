'use client';

import { CircleCheck, Siren } from 'lucide-react';
import { useCallback, useState } from 'react';
import { AppShell } from '../../components/app-shell';
import { LiveRefreshControl } from '../../components/live-refresh-control';
import { StatusBadge } from '../../components/status-badge';
import { useLiveRefresh } from '../../hooks/use-live-refresh';
import { api } from '../../lib/api';

type Incident = { id: string; status: string; reason: string; startedAt: string; resolvedAt: string | null; monitor: { name: string; url: string } };

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setIncidents(await api<Incident[]>('/incidents?limit=100'));
      setError('');
    } catch (loadError) {
      setError('Unable to load incidents.');
      throw loadError;
    } finally {
      setLoading(false);
    }
  }, []);
  const liveRefresh = useLiveRefresh(load);

  return <AppShell title="Incidents"><div className="page"><div className="page-title"><div><span className="eyebrow"><Siren size={13} /> Reliability timeline</span><h2>Incidents</h2><p>Downtime events detected after consecutive failed checks.</p></div><div className="page-title-actions"><LiveRefreshControl {...liveRefresh} onRefresh={liveRefresh.refresh} /></div></div>{error && <div className="notice">{error}</div>}<section className="surface">{loading ? <div className="table-skeleton" aria-label="Loading incidents"><span /><span /><span /></div> : incidents.length ? <div className="table-wrap"><table><thead><tr><th>Monitor</th><th>Status</th><th>Reason</th><th>Started</th><th>Resolved</th></tr></thead><tbody>{incidents.map((incident) => <tr key={incident.id}><td><strong>{incident.monitor.name}</strong><br /><span className="surface-meta">{incident.monitor.url}</span></td><td><StatusBadge status={incident.status} /></td><td>{incident.reason}</td><td>{new Date(incident.startedAt).toLocaleString()}</td><td>{incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : '-'}</td></tr>)}</tbody></table></div> : <div className="empty-state"><div className="empty-state-inner"><div className="empty-icon"><CircleCheck size={23} /></div><h3>No incidents recorded</h3><p>PulseDock will show an incident after two consecutive failed checks.</p></div></div>}</section></div></AppShell>;
}
