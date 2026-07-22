'use client';

import { Play, RefreshCw } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../components/app-shell';
import { StatusBadge } from '../../../components/status-badge';
import { api } from '../../../lib/api';

type Monitor = { id: string; name: string; url: string; currentStatus: string; intervalMinutes: number; expectedStatusCode: number; lastCheckedAt: string | null };
type Check = { id: string; success: boolean; statusCode: number | null; responseTimeMs: number | null; checkedAt: string; errorMessage: string | null };
type Incident = { id: string; status: string; reason: string; startedAt: string; resolvedAt: string | null };

export default function MonitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [monitor, setMonitor] = useState<Monitor>();
  const [checks, setChecks] = useState<Check[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const load = useCallback(() => Promise.all([api<Monitor>(`/monitors/${id}`), api<Check[]>(`/monitors/${id}/check-results?limit=20`), api<Incident[]>(`/monitors/${id}/incidents?limit=20`)]).then(([nextMonitor, nextChecks, nextIncidents]) => { setMonitor(nextMonitor); setChecks(nextChecks); setIncidents(nextIncidents); }).catch(() => setError('Unable to load this monitor.')), [id]);

  useEffect(() => { void load(); }, [load]);

  async function check() {
    setChecking(true);
    try {
      await api(`/monitors/${id}/check`, { method: 'POST' });
      await load();
    } catch {
      setError('Manual check failed to start.');
    } finally {
      setChecking(false);
    }
  }

  return <AppShell title="Monitor detail"><div className="page">{error && <div className="notice">{error}</div>}<section className="surface monitor-hero"><div><span className="eyebrow">Monitor detail</span><h3>{monitor?.name ?? 'Loading monitor...'}</h3><p>{monitor?.url}</p><div className="monitor-hero-meta"><span className="detail-chip">Expected {monitor?.expectedStatusCode ?? '-'}</span><span className="detail-chip">Every {monitor?.intervalMinutes ?? '-'} min</span>{monitor && <StatusBadge status={monitor.currentStatus} />}</div></div><div><button className="button" onClick={check} disabled={checking}><Play size={16} /> {checking ? 'Checking...' : 'Run check'}</button></div></section><div className="two-col"><section className="surface"><div className="surface-head"><div><h3>Check history</h3><p>Latest availability results.</p></div><button className="button secondary" onClick={() => void load()}><RefreshCw size={15} /> Refresh</button></div><div className="table-wrap"><table><thead><tr><th>Time</th><th>Result</th><th>HTTP</th><th>Response</th></tr></thead><tbody>{checks.length ? checks.map((checkResult) => <tr key={checkResult.id}><td>{new Date(checkResult.checkedAt).toLocaleString()}</td><td><StatusBadge status={checkResult.success ? 'UP' : 'DOWN'} /></td><td>{checkResult.statusCode ?? '-'}</td><td>{checkResult.responseTimeMs ?? '-'} ms</td></tr>) : <tr><td colSpan={4} className="empty">No checks recorded yet.</td></tr>}</tbody></table></div></section><section className="surface"><div className="surface-head"><div><h3>Incidents</h3><p>Recent downtime events.</p></div></div><div className="table-wrap"><table><thead><tr><th>Status</th><th>Started</th></tr></thead><tbody>{incidents.length ? incidents.map((incident) => <tr key={incident.id}><td><StatusBadge status={incident.status} /></td><td title={incident.reason}>{new Date(incident.startedAt).toLocaleString()}</td></tr>) : <tr><td colSpan={2} className="empty">No incidents for this monitor.</td></tr>}</tbody></table></div></section></div></div></AppShell>;
}
