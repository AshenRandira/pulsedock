'use client';

import Image from 'next/image';
import { Activity, CircleAlert, CircleCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatusBadge } from '../../components/status-badge';
import { api } from '../../lib/api';

type PublicStatus = { title: string; description: string | null; status: string; monitors: Array<{ id: string; name: string; url: string; currentStatus: string; lastCheckedAt: string | null; uptimePercentage: number | null }>; incidents: Array<{ id: string; reason: string; startedAt: string; monitor: { name: string } }> };

export default function StatusPage() {
  const [data, setData] = useState<PublicStatus>();
  const [error, setError] = useState('');

  useEffect(() => {
    api<PublicStatus>('/status').then(setData).catch(() => setError('Public status data is unavailable.'));
  }, []);

  const degraded = data?.status === 'degraded';
  return <main className="status-page"><section className="status-hero"><div className="status-brand-mark"><Image src="/pulsedock-mark.png" alt="PulseDock" width={44} height={44} priority /></div><div><span className="eyebrow"><Activity size={13} /> System status</span><h1>{data?.title ?? 'PulseDock Status'}</h1><p>{data?.description ?? 'Service availability'}</p></div><span className={`badge ${degraded ? 'down' : 'up'}`}>{degraded ? 'DEGRADED' : 'OPERATIONAL'}</span></section>{error && <div className="notice">{error}</div>}<div className={`status-overview ${degraded ? 'degraded' : ''}`}>{degraded ? <CircleAlert size={19} /> : <CircleCheck size={19} />}{degraded ? 'Some monitored services are experiencing an issue.' : 'All monitored services are operating normally.'}</div><section className="surface"><div className="surface-head"><div><h3>Services</h3><p>Availability from retained monitor check history.</p></div><span className="surface-meta">Last 30 days</span></div><div className="table-wrap"><table><thead><tr><th>Service</th><th>Status</th><th>Uptime</th><th>Last check</th></tr></thead><tbody>{data?.monitors.length ? data.monitors.map((monitor) => <tr key={monitor.id}><td><strong>{monitor.name}</strong></td><td><StatusBadge status={monitor.currentStatus} /></td><td className="uptime-value">{monitor.uptimePercentage === null ? 'No data' : `${monitor.uptimePercentage.toFixed(2)}%`}</td><td>{monitor.lastCheckedAt ? new Date(monitor.lastCheckedAt).toLocaleString() : 'Not checked'}</td></tr>) : <tr><td colSpan={4} className="empty">No public monitors are configured.</td></tr>}</tbody></table></div></section></main>;
}
