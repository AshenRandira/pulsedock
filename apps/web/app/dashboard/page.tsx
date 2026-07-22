'use client';

import Link from 'next/link';
import { Activity, CircleAlert, Gauge, Plus, RadioTower, TimerReset } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AppShell } from '../../components/app-shell';
import { api } from '../../lib/api';

type Summary = {
  monitors: { total: number; up: number; down: number; unknown: number };
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

const chartColors = ['#168653', '#d95f4d', '#b97916'];

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary>();
  const [error, setError] = useState('');

  useEffect(() => {
    api<Summary>('/dashboard/summary')
      .then(setSummary)
      .catch(() => setError('PulseDock API is unavailable. Start the API to see live monitoring data.'));
  }, []);

  const data = summary
    ? [
        { name: 'Up', value: summary.monitors.up },
        { name: 'Down', value: summary.monitors.down },
        { name: 'Unknown', value: summary.monitors.unknown },
      ]
    : [];

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
            <Link className="button" href="/monitors/new"><Plus size={16} /> Add monitor</Link>
          </div>
        </div>

        {error && <div className="notice">{error}</div>}

        <div className="metric-grid">
          <Metric label="All monitors" value={summary?.monitors.total ?? '-'} foot="Configured endpoints" icon={<RadioTower size={18} />} />
          <Metric label="Healthy" value={summary?.monitors.up ?? '-'} foot="Responding as expected" tone="up" icon={<Activity size={18} />} />
          <Metric label="Down" value={summary?.monitors.down ?? '-'} foot="Needs attention" tone="down" icon={<CircleAlert size={18} />} />
          <Metric label="Open incidents" value={summary?.activeIncidents ?? '-'} foot="Unresolved downtime" tone={summary?.activeIncidents ? 'down' : 'up'} icon={<Gauge size={18} />} />
        </div>

        <div className="two-col">
          <section className="surface">
            <div className="surface-head">
              <div><h3>Monitor state</h3><p>Current outcome across all configured endpoints.</p></div>
              <span className="surface-meta"><TimerReset size={14} /> {summary?.averageResponseTimeMs ?? '-'} ms average</span>
            </div>
            <div className="chart">
              {data.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} barSize={44} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f0f5f2' }} />
                    <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                      {data.map((entry, index) => <Cell key={entry.name} fill={chartColors[index]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="empty">Waiting for monitor data.</div>}
            </div>
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
