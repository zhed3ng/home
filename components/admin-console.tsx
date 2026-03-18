'use client';

import { useState } from 'react';

export function AdminConsole({
  adminEmail,
  initialContent,
}: {
  adminEmail: string | null;
  initialContent: string;
}) {
  const [email, setEmail] = useState(adminEmail || '');
  const [code, setCode] = useState('');
  const [editor, setEditor] = useState(initialContent);
  const [status, setStatus] = useState<{ text: string; error?: boolean }>({ text: '' });

  const isAuthenticated = Boolean(adminEmail);

  async function requestCode() {
    setStatus({ text: 'Sending verification code...' });
    const res = await fetch('/api/admin/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setStatus({ text: data.message || (res.ok ? 'Verification code sent.' : data.error), error: !res.ok });
  }

  async function verifyCode() {
    setStatus({ text: 'Verifying code...' });
    const res = await fetch('/api/admin/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus({ text: data.error || 'Verification failed', error: true });
      return;
    }
    setStatus({ text: 'Verified. Reloading secure workspace...' });
    window.location.reload();
  }

  async function logout() {
    setStatus({ text: 'Signing out...' });
    const res = await fetch('/api/admin/logout', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setStatus({ text: data.error || 'Sign out failed', error: true });
      return;
    }
    setStatus({ text: 'Signed out.' });
    window.location.reload();
  }

  async function reloadContent() {
    setStatus({ text: 'Loading latest content...' });
    const res = await fetch('/api/content');
    const data = await res.json();
    if (!res.ok) {
      setStatus({ text: data.error || 'Load failed', error: true });
      return;
    }
    setEditor(JSON.stringify(data, null, 2));
    setStatus({ text: 'Loaded latest content.' });
  }

  async function saveContent() {
    let parsed;
    try {
      parsed = JSON.parse(editor);
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : 'Invalid JSON', error: true });
      return;
    }

    const res = await fetch('/api/content', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parsed),
    });
    const data = await res.json();
    setStatus({ text: data.message || (res.ok ? 'Content saved to KV storage.' : data.error), error: !res.ok });
  }

  return (
    <div className="admin-shell">
      <section className="admin-card admin-hero">
        <div>
          <div className="eyebrow">Admin Console</div>
          <h1>Formal editorial workspace</h1>
          <p>
            Only a verified admin session can load or edit the site content. Sign in with your allowed email first, then the
            secure editor will appear.
          </p>
        </div>
        <a className="btn" href="/">
          Back to site
        </a>
      </section>

      {!isAuthenticated ? (
        <section className="admin-card">
          <div className="admin-grid">
            <div className="field">
              <label htmlFor="admin-email">Admin email</label>
              <input id="admin-email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="admin-code">Verification code</label>
              <input id="admin-code" className="input" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
          </div>
          <div className="action-row" style={{ marginTop: 16 }}>
            <button className="btn" onClick={requestCode}>Send code</button>
            <button className="btn btn-primary" onClick={verifyCode}>Verify & open editor</button>
          </div>
          <p className={status.error ? 'status-error' : 'status-ok'}>{status.text || 'Not signed in.'}</p>
        </section>
      ) : (
        <>
          <section className="admin-card">
            <div className="action-row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
              <p className="status-ok" style={{ margin: 0 }}>Signed in as {adminEmail}</p>
              <button className="btn" onClick={logout}>Sign out</button>
            </div>
            <div className="action-row">
              <button className="btn" onClick={reloadContent}>Reload</button>
              <button className="btn btn-primary" onClick={saveContent}>Save</button>
            </div>
            <p className={status.error ? 'status-error' : 'status-ok'}>{status.text || 'Authenticated.'}</p>
          </section>

          <section className="admin-card">
            <div className="eyebrow">Content JSON</div>
            <textarea className="textarea editor" value={editor} onChange={(e) => setEditor(e.target.value)} />
          </section>
        </>
      )}
    </div>
  );
}
