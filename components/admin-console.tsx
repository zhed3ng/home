'use client';

import Link from 'next/link';
import { useState } from 'react';

type AuditEvent = {
  timestamp: string;
  action: string;
  outcome: 'success' | 'failure' | 'blocked' | 'info';
  email?: string;
  ip?: string;
  country?: string;
  userAgent?: string;
  detail?: string;
};

export function AdminConsole({
  adminEmail,
  initialContent,
  initialAuditEvents,
}: {
  adminEmail: string | null;
  initialContent: string;
  initialAuditEvents: AuditEvent[];
}) {
  const [email, setEmail] = useState(adminEmail || '');
  const [code, setCode] = useState('');
  const [editor, setEditor] = useState(initialContent);
  const [status, setStatus] = useState<{ text: string; error?: boolean }>({ text: '' });
  const [auditEvents, setAuditEvents] = useState(initialAuditEvents);

  const isAuthenticated = Boolean(adminEmail);

  async function requestCode() {
    setStatus({ text: 'Sending verification code...' });
    const res = await fetch('/admin/api/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setStatus({ text: data.message || (res.ok ? 'Verification code sent.' : data.error), error: !res.ok });
  }

  async function verifyCode() {
    setStatus({ text: 'Verifying code...' });
    const res = await fetch('/admin/api/verify-code', {
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
    const res = await fetch('/admin/api/logout', { method: 'POST' });
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
    const res = await fetch('/admin/api/content');
    const data = await res.json();
    if (!res.ok) {
      setStatus({ text: data.error || 'Load failed', error: true });
      return;
    }
    setEditor(JSON.stringify(data, null, 2));
    setStatus({ text: 'Loaded latest content.' });
  }


  async function reloadAuditLog() {
    setStatus({ text: 'Loading audit log...' });
    const res = await fetch('/admin/api/audit');
    const data = await res.json();
    if (!res.ok) {
      setStatus({ text: data.error || 'Failed to load audit log', error: true });
      return;
    }
    setAuditEvents(data.events || []);
    setStatus({ text: 'Audit log loaded.' });
  }

  async function saveContent() {
    let parsed;
    try {
      parsed = JSON.parse(editor);
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : 'Invalid JSON', error: true });
      return;
    }

    const res = await fetch('/admin/api/content', {
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
            This admin workspace always requires the email-code second factor. If you configure gateway allowlist variables, only approved Google identities, device tokens, countries, or IPs can reach the verification step.
          </p>
        </div>
        <Link className="btn" href="/">
          Back to site
        </Link>
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
          <p className={status.error ? 'status-error' : 'status-ok'}>{status.text || 'Not signed in yet. If gateway rules are configured, they have already been checked.'}</p>
        </section>
      ) : (
        <>
          <section className="admin-card">
            <div className="action-row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
              <p className="status-ok" style={{ margin: 0 }}>Signed in as {adminEmail}</p>
              <button className="btn" onClick={logout}>Sign out</button>
            </div>
            <div className="action-row">
              <button className="btn" onClick={reloadContent}>Reload content</button>
              <button className="btn" onClick={reloadAuditLog}>Reload audit</button>
              <button className="btn btn-primary" onClick={saveContent}>Save</button>
            </div>
            <p className={status.error ? 'status-error' : 'status-ok'}>{status.text || 'Authenticated.'}</p>
          </section>

          <section className="admin-card">
            <div className="eyebrow">Content JSON</div>
            <textarea className="textarea editor" value={editor} onChange={(e) => setEditor(e.target.value)} />
          </section>

          <section className="admin-card">
            <div className="eyebrow">Audit log</div>
            <div style={{ display: 'grid', gap: 12 }}>
              {auditEvents.length === 0 ? (
                <p style={{ margin: 0 }}>No audit events yet.</p>
              ) : (
                auditEvents.map((event, index) => (
                  <div key={`${event.timestamp}-${index}`} style={{ border: '1px solid var(--line)', borderRadius: 16, padding: 12 }}>
                    <strong>{event.action}</strong> · {event.outcome} · {event.timestamp}
                    <div style={{ fontSize: 14, marginTop: 6 }}>
                      <div>Email: {event.email || 'n/a'}</div>
                      <div>IP: {event.ip || 'n/a'} · Country: {event.country || 'n/a'}</div>
                      <div>Detail: {event.detail || 'n/a'}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
