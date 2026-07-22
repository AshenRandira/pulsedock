'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Activity, BellRing, Gauge, MonitorCog, Settings, ShieldCheck, Siren } from 'lucide-react';
import { usePathname } from 'next/navigation';

const items = [
  ['/dashboard', 'Dashboard', Gauge], ['/monitors', 'Monitors', MonitorCog], ['/incidents', 'Incidents', Siren], ['/status', 'Public status', Activity], ['/settings', 'Settings', Settings],
] as const;

export function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  const pathname = usePathname();
  return <div className="shell"><aside className="sidebar"><Link className="brand" href="/dashboard"><Image src="/pulsedock-mark.png" alt="PulseDock" width={34} height={34} priority /><span className="brand-lockup"><span>PulseDock</span><span className="brand-kicker">Uptime control</span></span></Link><nav className="nav">{items.map(([href, label, Icon]) => <Link key={href} href={href} title={label} aria-label={label} className={pathname.startsWith(href) ? 'active' : ''}><Icon size={17} /><span>{label}</span></Link>)}</nav><div className="sidebar-foot"><div className="sidebar-foot-line"><ShieldCheck size={15} /> Self-hosted workspace</div><div><BellRing size={13} /> Alerts follow your configured provider.</div></div></aside><main className="main"><header className="topbar"><div className="topbar-title"><h1>{title}</h1><p>PulseDock monitoring workspace</p></div><div className="connection connection-chip"><span className="dot" /> Workspace online</div></header>{children}</main></div>;
}
