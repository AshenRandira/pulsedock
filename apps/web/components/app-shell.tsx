'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Activity, BellRing, Gauge, ListChecks, MonitorCog, Settings, Siren } from 'lucide-react';
import { usePathname } from 'next/navigation';

const items = [
  ['/dashboard', 'Dashboard', Gauge], ['/monitors', 'Monitors', MonitorCog], ['/incidents', 'Incidents', Siren], ['/status', 'Public status', Activity], ['/settings', 'Settings', Settings],
] as const;

export function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  const pathname = usePathname();
  return <div className="shell"><aside className="sidebar"><Link className="brand" href="/dashboard"><Image src="/pulsedock-mark.png" alt="PulseDock" width={34} height={34} priority /><span>PulseDock</span></Link><nav className="nav">{items.map(([href, label, Icon]) => <Link key={href} href={href} className={pathname.startsWith(href) ? 'active' : ''}><Icon size={17} /><span>{label}</span></Link>)}</nav><div className="sidebar-foot"><BellRing size={15} /> Alerts follow your configured provider.</div></aside><main className="main"><header className="topbar"><h1>{title}</h1><div className="connection"><span className="dot" /> API workspace</div></header>{children}</main></div>;
}
