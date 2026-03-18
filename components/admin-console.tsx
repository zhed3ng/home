'use client';

import { useState } from 'react';

export function AdminConsole({ initialContent }: { initialContent: string }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [editor, setEditor] = useState(initialContent);
  const [sessionToken, setSessionToken] = useState('');
  const [status, setStatus] = useState<{ text: string; error?: boolean }>({ text: '' });

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
    setSessionToken(data.sessionToken);
    setStatus({ text: 'Verified. You can save content now.' });
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
        'X-Admin-Token': sessionToken,
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
            This admin page is now designed for a production-style workflow on Next.js + Vercel. It authenticates by email code,
            edits structured JSON, and saves content into managed storage instead of a local file.
          </p>
        </div>
        <a className="btn" href="/">
          Back to site
        </a>
      </section>

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
          <button className="btn" onClick={verifyCode}>Verify</button>
          <button className="btn" onClick={reloadContent}>Reload</button>
          <button className="btn btn-primary" onClick={saveContent}>Save</button>
        </div>
        <p className={status.error ? 'status-error' : 'status-ok'}>{status.text}</p>
      </section>

      <section className="admin-card">
        <div className="eyebrow">Content JSON</div>
        <textarea className="textarea editor" value={editor} onChange={(e) => setEditor(e.target.value)} />
      </section>
    </div>
  );
}
