'use client';

import Link from 'next/link';
import { Activity, CircleAlert, Gauge, Plus, RadioTower, TimerReset } from 'lucide-react';
import { useCallback, useState } from 'react';
import { AppShell } from '../../components/app-shell';
import { LiveRefreshControl } from '../../components/live-refresh-control';
import { useLiveRefresh } from '../../hooks/use-live-refresh';
import { api } from '../../lib/api';

type Summary = {
  monitors: { total: number; active: number; disabled: number; up: number; down: number; unknown: number };
  activeIncidents: number;
  averageResponseTimeMs: number | null;
  recentChecks: Array<{
    id: string;
    success: boolean;
    responseTimeMs: number | null;
    checkedAt: string;
    monitor: { name: string };
  }>;
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary>();
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setSummary(await api<Summary>('/dashboard/summary'));
      setError('');
    } catch (loadError) {
      setError('PulseDock API is unavailable. Start the API to see live monitoring data.');
      throw loadError;
    }
  }, []);
  const liveRefresh = useLiveRefresh(load);

  const active = summary?.monitors.active ?? 0;
  const healthyPercentage = active ? Math.round(((summary?.monitors.up ?? 0) / active) * 100) : 0;

  return (
    <AppShell title="Operations dashboard">
      <div className="page">
        <div className="page-title">
          <div>
            <span className="eyebrow"><Activity size={13} /> Live overview</span>
            <h2>System overview</h2>
            <p>Current monitor health, active incidents, and the latest check activity.</p>
          </div>
          <div className="page-title-actions">
            <LiveRefreshControl {...liveRefresh} onRefresh={liveRefresh.refresh} />
            <Link className="button" href="/monitors/new"><Plus size={16} /> Add monitor</Link>
          </div>
        </div>

        {error && <div className="notice">{error}</div>}

        <div className="metric-grid">
          <Metric label="All monitors" value={summary?.monitors.total ?? '-'} foot={summary ? `${summary.monitors.active} active, ${summary.monitors.disabled} disabled` : 'Configured endpoints'} icon={<RadioTower size={18} />} />
          <Metric label="Healthy" value={summary?.monitors.up ?? '-'} foot="Responding as expected" tone="up" icon={<Activity size={18} />} />
          <Metric label="Down" value={summary?.monitors.down ?? '-'} foot="Needs attention" tone="down" icon={<CircleAlert size={18} />} />
          <Metric label="Open incidents" value={summary?.activeIncidents ?? '-'} foot="Unresolved downtime" tone={summary?.activeIncidents ? 'down' : 'up'} icon={<Gauge size={18} />} />
        </div>

        <div className="two-col">
          <section className="surface">
            <div className="surface-head">
              <div><h3>Monitor state</h3><p>Current outcome across active endpoints.</p></div>
              <span className="surface-meta"><TimerReset size={14} /> {summary?.averageResponseTimeMs ?? '-'} ms average</span>
            </div>
            {summary ? <div className="health-panel"><div className="health-summary"><div><strong>{healthyPercentage}%</strong><span>of active monitors healthy</span></div><span className={`badge ${summary.monitors.down ? 'down' : 'up'}`}>{summary.monitors.down ? 'Attention needed' : 'All clear'}</span></div><div className="health-track" aria-label={`${healthyPercentage}% of active monitors are healthy`}><span className="health-up" style={{ width: `${active ? (summary.monitors.up / active) * 100 : 0}%` }} /><span className="health-down" style={{ width: `${active ? (summary.monitors.down / active) * 100 : 0}%` }} /><span className="health-unknown" style={{ width: `${active ? (summary.monitors.unknown / active) * 100 : 0}%` }} /></div><div className="health-list"><HealthRow label="Up" value={summary.monitors.up} tone="up" /><HealthRow label="Down" value={summary.monitors.down} tone="down" /><HealthRow label="Unknown" value={summary.monitors.unknown} tone="unknown" /></div></div> : <div className="skeleton-panel" aria-label="Loading monitor state"><span /><span /><span /></div>}
          </section>

          <section className="surface">
            <div className="surface-head"><div><h3>Recent checks</h3><p>Most recent monitor responses.</p></div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Monitor</th><th>Result</th><th>Response</th></tr></thead>
                <tbody>
                  {summary?.recentChecks.length ? summary.recentChecks.map((check) => (
                    <tr key={check.id}>
                      <td><strong>{check.monitor.name}</strong><br /><span className="surface-meta">{new Date(check.checkedAt).toLocaleTimeString()}</span></td>
                      <td><span className={`badge ${check.success ? 'up' : 'down'}`}>{check.success ? 'UP' : 'DOWN'}</span></td>
                      <td>{check.responseTimeMs ?? '-'} ms</td>
                    </tr>
                  )) : <tr><td colSpan={3} className="empty">No checks recorded yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, foot, tone, icon }: { label: string; value: string | number; foot: string; tone?: string; icon: React.ReactNode }) {
  return <section className={`metric ${tone ?? ''}`}><div className="metric-head"><span className="label">{label}</span><span className="metric-icon">{icon}</span></div><div className="value">{value}</div><div className="metric-foot">{foot}</div></section>;
}

function HealthRow({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="health-row"><span><i className={`health-dot ${tone}`} />{label}</span><strong>{value}</strong></div>;
}
