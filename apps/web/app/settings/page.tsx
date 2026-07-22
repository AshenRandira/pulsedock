'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { AppShell } from '../../components/app-shell';
import { api } from '../../lib/api';

type Settings = { statusPageTitle: string; statusPageDescription: string | null };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({ statusPageTitle: 'PulseDock Status', statusPageDescription: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    api<Settings>('/settings').then(setSettings).catch(() => setMessage('Unable to load status-page settings.'));
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      const next = await api<Settings>('/settings', { method: 'PATCH', body: JSON.stringify(settings) });
      setSettings(next);
      setMessage('Changes saved.');
    } catch {
      setMessage('Could not save settings.');
    }
  }

  return <AppShell title="Settings"><div className="page"><div className="page-title"><div><span className="eyebrow"><Settings2 size={13} /> Status configuration</span><h2>Public status settings</h2><p>Control the title and description shown on the public status page.</p></div></div>{message && <div className={message === 'Changes saved.' ? 'status-overview' : 'notice'}>{message}</div>}<form className="surface form" onSubmit={save}><div className="field"><label htmlFor="title">Status page title</label><input id="title" value={settings.statusPageTitle} onChange={(event) => setSettings({ ...settings, statusPageTitle: event.target.value })} /></div><div className="field"><label htmlFor="description">Description</label><textarea id="description" value={settings.statusPageDescription ?? ''} onChange={(event) => setSettings({ ...settings, statusPageDescription: event.target.value })} /></div><div><button className="button">Save changes</button></div></form></div></AppShell>;
}
