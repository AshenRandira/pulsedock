'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useState } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Pencil,
  Play,
  Power,
  Save,
  X,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { AppShell } from '../../../components/app-shell';
import { LiveRefreshControl } from '../../../components/live-refresh-control';
import { StatusBadge } from '../../../components/status-badge';
import { useLiveRefresh } from '../../../hooks/use-live-refresh';
import { api } from '../../../lib/api';

type Monitor = {
  id: string;
  name: string;
  url: string;
  currentStatus: string;
  intervalMinutes: number;
  expectedStatusCode: number;
  isActive: boolean;
  isPublic: boolean;
  lastCheckedAt: string | null;
};
type Check = { id: string; success: boolean; statusCode: number | null; responseTimeMs: number | null; checkedAt: string; errorMessage: string | null };
type Incident = { id: string; status: string; reason: string; startedAt: string; resolvedAt: string | null };

export default function MonitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [monitor, setMonitor] = useState<Monitor>();
  const [checks, setChecks] = useState<Check[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingActive, setChangingActive] = useState(false);

  const load = useCallback(() => Promise.all([
        api<Monitor>(`/monitors/${id}`),
        api<Check[]>(`/monitors/${id}/check-results?limit=20`),
        api<Incident[]>(`/monitors/${id}/incidents?limit=20`),
      ])
    .then(([nextMonitor, nextChecks, nextIncidents]) => {
      setMonitor(nextMonitor);
      setChecks(nextChecks);
      setIncidents(nextIncidents);
      setError('');
    })
    .catch(() => {
      setError('Unable to load this monitor.');
    }), [id]);

  const liveRefresh = useLiveRefresh(load, {
    enabled: !editing && !saving && !checking && !changingActive,
  });

  async function check() {
    setChecking(true);
    setError('');
    setMessage('');
    try {
      await api(`/monitors/${id}/check`, { method: 'POST' });
      await load();
      setMessage('Health check completed.');
    } catch {
      setError('Manual check failed to start.');
    } finally {
      setChecking(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api(`/monitors/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.get('name'),
          url: form.get('url'),
          intervalMinutes: Number(form.get('interval')),
          expectedStatusCode: Number(form.get('status')),
          isActive: form.get('active') === 'on',
          isPublic: form.get('public') === 'on',
        }),
      });
      await load();
      setEditing(false);
      setMessage('Monitor settings saved.');
    } catch {
      setError('Monitor settings could not be saved. Check the entered values.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (!monitor) return;
    if (monitor.isActive && !window.confirm(`Disable ${monitor.name}? Scheduled checks will stop until it is enabled again.`)) return;

    setChangingActive(true);
    setError('');
    setMessage('');
    try {
      if (monitor.isActive) {
        await api(`/monitors/${id}`, { method: 'DELETE' });
      } else {
        await api(`/monitors/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive: true }) });
      }
      await load();
      setEditing(false);
      setMessage(monitor.isActive ? 'Monitor disabled.' : 'Monitor enabled.');
    } catch {
      setError(`Monitor could not be ${monitor.isActive ? 'disabled' : 'enabled'}.`);
    } finally {
      setChangingActive(false);
    }
  }

  const measuredChecks = checks.filter((checkResult) => checkResult.responseTimeMs !== null);
  const averageResponse = measuredChecks.length
    ? Math.round(measuredChecks.reduce((total, checkResult) => total + (checkResult.responseTimeMs ?? 0), 0) / measuredChecks.length)
    : null;
  const successRate = checks.length
    ? Math.round((checks.filter((checkResult) => checkResult.success).length / checks.length) * 100)
    : null;

  return (
    <AppShell title="Monitor detail">
      <div className="page">
        <div className="detail-toolbar"><Link className="back-link" href="/monitors"><ArrowLeft size={15} /> All monitors</Link></div>
        {error && <div className="notice">{error}</div>}
        {message && <div className="notice success">{message}</div>}

        <section className="surface monitor-summary">
          <div className="monitor-hero">
            <div>
              <span className="eyebrow">Monitor detail</span>
              <h3>{monitor?.name ?? 'Loading monitor...'}</h3>
              <p>{monitor?.url}</p>
              <div className="monitor-hero-meta">
                <span className="detail-chip">Expected {monitor?.expectedStatusCode ?? '-'}</span>
                <span className="detail-chip">Every {monitor?.intervalMinutes ?? '-'} min</span>
                {monitor && <StatusBadge status={monitor.isActive ? monitor.currentStatus : 'DISABLED'} />}
              </div>
            </div>
            <div className="monitor-actions">
              {monitor && <button className="button secondary" onClick={() => setEditing((current) => !current)}><Pencil size={15} /> {editing ? 'Close editor' : 'Edit monitor'}</button>}
              {monitor && <a className="button secondary" href={monitor.url} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open endpoint</a>}
              <button className="button" onClick={check} disabled={checking || !monitor?.isActive}><Play size={16} /> {checking ? 'Checking...' : 'Run check'}</button>
              {monitor && <button className={`button ${monitor.isActive ? 'danger' : 'secondary'}`} onClick={toggleActive} disabled={changingActive}><Power size={16} /> {changingActive ? 'Updating...' : monitor.isActive ? 'Disable' : 'Enable'}</button>}
            </div>
          </div>
          <div className="detail-stats">
            <DetailStat label="Recent uptime" value={successRate === null ? 'No data' : `${successRate}%`} />
            <DetailStat label="Average response" value={averageResponse === null ? 'No data' : `${averageResponse} ms`} />
            <DetailStat label="Latest check" value={monitor?.lastCheckedAt ? new Date(monitor.lastCheckedAt).toLocaleString() : 'Not checked'} />
          </div>
        </section>

        {editing && monitor && (
          <section className="surface monitor-editor">
            <div className="surface-head"><div><h3>Edit monitor</h3><p>Update the endpoint and monitoring behavior.</p></div><button className="icon-link" onClick={() => setEditing(false)} aria-label="Close monitor editor" title="Close monitor editor"><X size={16} /></button></div>
            <form className="form monitor-edit-form" onSubmit={save}>
              <div className="field"><label htmlFor="edit-name">Name</label><input id="edit-name" name="name" required defaultValue={monitor.name} /></div>
              <div className="field"><label htmlFor="edit-url">URL</label><input id="edit-url" name="url" type="url" required defaultValue={monitor.url} /></div>
              <div className="form-row">
                <div className="field"><label htmlFor="edit-interval">Check interval (minutes)</label><input id="edit-interval" name="interval" type="number" min="1" max="1440" defaultValue={monitor.intervalMinutes} /></div>
                <div className="field"><label htmlFor="edit-status">Expected HTTP status</label><input id="edit-status" name="status" type="number" min="100" max="599" defaultValue={monitor.expectedStatusCode} /></div>
              </div>
              <div className="checks"><label><input name="active" type="checkbox" defaultChecked={monitor.isActive} /> Active monitoring</label><label><input name="public" type="checkbox" defaultChecked={monitor.isPublic} /> Show on public status</label></div>
              <div className="form-actions"><button className="button" disabled={saving}><Save size={15} /> {saving ? 'Saving...' : 'Save changes'}</button><button className="button secondary" type="button" onClick={() => setEditing(false)}>Cancel</button></div>
            </form>
          </section>
        )}

        <div className="two-col">
          <section className="surface">
            <div className="surface-head"><div><h3>Check history</h3><p>Latest availability results.</p></div><LiveRefreshControl {...liveRefresh} onRefresh={liveRefresh.refresh} /></div>
            <div className="table-wrap"><table><thead><tr><th>Time</th><th>Result</th><th>HTTP</th><th>Response</th></tr></thead><tbody>{checks.length ? checks.map((checkResult) => <tr key={checkResult.id}><td>{new Date(checkResult.checkedAt).toLocaleString()}</td><td><StatusBadge status={checkResult.success ? 'UP' : 'DOWN'} /></td><td>{checkResult.statusCode ?? '-'}</td><td>{checkResult.responseTimeMs ?? '-'} ms</td></tr>) : <tr><td colSpan={4} className="empty">No checks recorded yet.</td></tr>}</tbody></table></div>
          </section>
          <section className="surface">
            <div className="surface-head"><div><h3>Incidents</h3><p>Recent downtime events.</p></div></div>
            <div className="table-wrap"><table><thead><tr><th>Status</th><th>Started</th></tr></thead><tbody>{incidents.length ? incidents.map((incident) => <tr key={incident.id}><td><StatusBadge status={incident.status} /></td><td title={incident.reason}>{new Date(incident.startedAt).toLocaleString()}</td></tr>) : <tr><td colSpan={2} className="empty">No incidents for this monitor.</td></tr>}</tbody></table></div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
