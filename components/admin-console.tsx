'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SiteContent } from '@/lib/content';

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

function parseInitialContent(initialContent: string): SiteContent {
  if (!initialContent.trim()) {
    return {
      hero: { name: '', title: '', subtitle: '', email: '', cvUrl: '' },
      askJoe: { intro: '', suggestedQuestions: [''] },
      news: [],
    };
  }

  return JSON.parse(initialContent) as SiteContent;
}

export function AdminConsole({
  adminEmail,
  adminHost,
  publicSiteUrl,
  initialContent,
  initialAuditEvents,
}: {
  adminEmail: string | null;
  adminHost: string;
  publicSiteUrl: string;
  initialContent: string;
  initialAuditEvents: AuditEvent[];
}) {
  const router = useRouter();
  const [content, setContent] = useState<SiteContent>(() => parseInitialContent(initialContent));
  const [status, setStatus] = useState<{ text: string; error?: boolean }>({ text: '' });
  const [auditEvents, setAuditEvents] = useState(initialAuditEvents);
  const [loginEmail, setLoginEmail] = useState(adminEmail || '');
  const [verificationCode, setVerificationCode] = useState('');

  const isAuthenticated = Boolean(adminEmail);
  const editor = useMemo(() => JSON.stringify(content, null, 2), [content]);
  const accessLogoutUrl = `https://${adminHost}/cdn-cgi/access/logout`;

  function updateHero<K extends keyof SiteContent['hero']>(key: K, value: SiteContent['hero'][K]) {
    setContent((current) => ({
      ...current,
      hero: {
        ...current.hero,
        [key]: value,
      },
    }));
  }

  function updateAskJoeIntro(value: string) {
    setContent((current) => ({
      ...current,
      askJoe: {
        ...current.askJoe,
        intro: value,
      },
    }));
  }

  function updateSuggestedQuestion(index: number, value: string) {
    setContent((current) => ({
      ...current,
      askJoe: {
        ...current.askJoe,
        suggestedQuestions: current.askJoe.suggestedQuestions.map((item, itemIndex) => (
          itemIndex === index ? value : item
        )),
      },
    }));
  }

  function addSuggestedQuestion() {
    setContent((current) => ({
      ...current,
      askJoe: {
        ...current.askJoe,
        suggestedQuestions: [...current.askJoe.suggestedQuestions, ''],
      },
    }));
  }

  function removeSuggestedQuestion(index: number) {
    setContent((current) => ({
      ...current,
      askJoe: {
        ...current.askJoe,
        suggestedQuestions: current.askJoe.suggestedQuestions.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  }

  function updateNews(index: number, key: 'date' | 'text', value: string) {
    setContent((current) => ({
      ...current,
      news: current.news.map((item, itemIndex) => (
        itemIndex === index
          ? {
              ...item,
              [key]: value,
            }
          : item
      )),
    }));
  }

  function addNewsItem() {
    setContent((current) => ({
      ...current,
      news: [...current.news, { date: '', text: '' }],
    }));
  }

  function removeNewsItem(index: number) {
    setContent((current) => ({
      ...current,
      news: current.news.filter((_, itemIndex) => itemIndex !== index),
    }));
  }


  async function requestVerificationCode() {
    const email = loginEmail.trim().toLowerCase();
    if (!email) {
      setStatus({ text: 'Please enter your admin email first.', error: true });
      return;
    }

    const res = await fetch('/admin/api/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setStatus({ text: data.message || data.error || (res.ok ? 'Verification code sent.' : 'Request failed.'), error: !res.ok });
  }

  async function verifyCode() {
    const email = loginEmail.trim().toLowerCase();
    const code = verificationCode.trim();
    if (!email || !code) {
      setStatus({ text: 'Please enter both email and verification code.', error: true });
      return;
    }

    const res = await fetch('/admin/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json().catch(() => ({}));
    setStatus({ text: data.message || data.error || (res.ok ? 'Signed in successfully.' : 'Verification failed.'), error: !res.ok });
    if (res.ok) {
      router.refresh();
    }
  }

  async function logout() {
    const res = await fetch('/admin/api/logout', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setStatus({ text: data.message || (res.ok ? 'Signed out.' : 'Sign-out failed.'), error: !res.ok });
    if (res.ok) {
      router.refresh();
    }
  }

  async function reloadContent() {
    setStatus({ text: 'Loading latest content...' });
    const res = await fetch('/admin/api/content');
    const data = await res.json();
    if (!res.ok) {
      setStatus({ text: data.error || 'Load failed', error: true });
      return;
    }
    setContent(data as SiteContent);
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
    const res = await fetch('/admin/api/content', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(content),
    });
    const data = await res.json();
    setStatus({ text: data.message || (res.ok ? 'Content saved to KV storage.' : data.error), error: !res.ok });
  }

  return (
    <div className="admin-shell">
      <section className="admin-card admin-hero">
        <div>
          <div className="eyebrow">Admin Console</div>
          <h1>Simple content editor</h1>
          <p>
            This workspace is intended for {adminHost}. Cloudflare Access should identify you before the app loads, then the editor reads and writes the same structured KV content as the public site.
          </p>
        </div>
        <a className="btn" href={publicSiteUrl}>
          Back to site
        </a>
      </section>

      {!isAuthenticated ? (
        <section className="admin-card">
          <div className="eyebrow">Access required</div>
          <p style={{ margin: '8px 0 0' }}>
            If Cloudflare Access is enabled, sign in there first. Otherwise, request a one-time email code below to create the in-app admin session and unlock the editor.
          </p>
          <div className="admin-grid" style={{ marginTop: 16 }}>
            <div className="field">
              <label htmlFor="admin-email">Admin email</label>
              <input id="admin-email" className="input" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="admin-code">Verification code</label>
              <input id="admin-code" className="input" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} />
            </div>
          </div>
          <div className="action-row" style={{ marginTop: 16 }}>
            <button className="btn" onClick={requestVerificationCode}>Send email code</button>
            <button className="btn btn-primary" onClick={verifyCode}>Verify and sign in</button>
            <a className="btn" href={accessLogoutUrl}>Cloudflare Access</a>
            <a className="btn" href={publicSiteUrl}>Return to public site</a>
          </div>
          <p className={status.error ? 'status-error' : 'status-ok'}>
            {status.text || 'Cloudflare Access did not present an approved admin identity yet.'}
          </p>
        </section>
      ) : (
        <>
          <section className="admin-card">
            <div className="action-row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p className="status-ok" style={{ margin: 0 }}>Signed in as {adminEmail}</p>
                <p style={{ margin: '8px 0 0' }}>Access is controlled by Cloudflare Access on {adminHost} when enabled, or by the built-in email verification flow when gateway protection is not configured.</p>
              </div>
              <div className="action-row">
                <button className="btn" onClick={logout}>Sign out</button>
                <a className="btn" href={accessLogoutUrl}>End Access session</a>
              </div>
            </div>
            <div className="action-row">
              <button className="btn" onClick={reloadContent}>Reload content</button>
              <button className="btn" onClick={reloadAuditLog}>Reload audit</button>
              <button className="btn btn-primary" onClick={saveContent}>Save</button>
            </div>
            <p className={status.error ? 'status-error' : 'status-ok'}>{status.text || 'Authenticated through Cloudflare Access.'}</p>
          </section>

          <section className="admin-card">
            <div className="eyebrow">Website content</div>
            <div className="admin-grid">
              <div className="field">
                <label htmlFor="hero-name">Name</label>
                <input id="hero-name" className="input" value={content.hero.name} onChange={(e) => updateHero('name', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="hero-title">Title</label>
                <input id="hero-title" className="input" value={content.hero.title} onChange={(e) => updateHero('title', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="hero-email">Email</label>
                <input id="hero-email" className="input" value={content.hero.email} onChange={(e) => updateHero('email', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="hero-cv">CV URL</label>
                <input id="hero-cv" className="input" value={content.hero.cvUrl} onChange={(e) => updateHero('cvUrl', e.target.value)} />
              </div>
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label htmlFor="hero-subtitle">Subtitle</label>
              <textarea id="hero-subtitle" className="textarea" value={content.hero.subtitle} onChange={(e) => updateHero('subtitle', e.target.value)} />
            </div>
          </section>

          <section className="admin-card">
            <div className="eyebrow">AskJoe</div>
            <div className="field">
              <label htmlFor="askjoe-intro">Intro text</label>
              <textarea id="askjoe-intro" className="textarea" value={content.askJoe.intro} onChange={(e) => updateAskJoeIntro(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
              {content.askJoe.suggestedQuestions.map((question, index) => (
                <div key={`question-${index}`} className="field">
                  <label htmlFor={`question-${index}`}>Suggested question {index + 1}</label>
                  <div className="action-row">
                    <input
                      id={`question-${index}`}
                      className="input"
                      value={question}
                      onChange={(e) => updateSuggestedQuestion(index, e.target.value)}
                    />
                    <button
                      className="btn"
                      type="button"
                      onClick={() => removeSuggestedQuestion(index)}
                      disabled={content.askJoe.suggestedQuestions.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="action-row" style={{ marginTop: 16 }}>
              <button className="btn" type="button" onClick={addSuggestedQuestion}>Add question</button>
            </div>
          </section>

          <section className="admin-card">
            <div className="action-row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div className="eyebrow">News & updates</div>
                <p style={{ margin: '8px 0 0' }}>Add or remove news items without touching code.</p>
              </div>
              <button className="btn" type="button" onClick={addNewsItem}>Add news item</button>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              {content.news.map((item, index) => (
                <div key={`news-${index}`} style={{ border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
                  <div className="admin-grid">
                    <div className="field">
                      <label htmlFor={`news-date-${index}`}>Date / tag</label>
                      <input
                        id={`news-date-${index}`}
                        className="input"
                        value={item.date}
                        onChange={(e) => updateNews(index, 'date', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="field" style={{ marginTop: 16 }}>
                    <label htmlFor={`news-text-${index}`}>Content</label>
                    <textarea
                      id={`news-text-${index}`}
                      className="textarea"
                      value={item.text}
                      onChange={(e) => updateNews(index, 'text', e.target.value)}
                    />
                  </div>
                  <div className="action-row" style={{ marginTop: 16 }}>
                    <button className="btn" type="button" onClick={() => removeNewsItem(index)}>Remove this item</button>
                  </div>
                </div>
              ))}
              {content.news.length === 0 ? <p style={{ margin: 0 }}>No news items yet. Click “Add news item” to create one.</p> : null}
            </div>
          </section>

          <section className="admin-card">
            <div className="eyebrow">Generated JSON preview</div>
            <textarea className="textarea editor" value={editor} readOnly />
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
