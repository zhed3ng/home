import Image from 'next/image';
import { AskJoeForm } from '@/components/ask-joe-form';
import { getSiteContent } from '@/lib/content';

const profile = {
  chips: ['IS & Education', 'Emerging Tech Policy', 'Healthcare Analytics', 'Field Experiments', 'ML & Econometrics'],
  research: [
    'Information systems and education',
    'Policies for emerging technologies',
    'Healthcare, supply chain, and analytics',
    'Video analytics and multimodal learning',
  ],
  teaching: ['DSS 315 – BIA Concepts & Practices', 'DSS 335 – Foundations of Supply Chain Management', 'DSS 465/710 – Supply Chain Analytics', 'DSS 720 – Six Sigma Applications & Foundations'],
  grants: [
    'Milton Lev Faculty Research Grant at Saint Joseph\'s University.',
    'Summer Research Fund on internet policy and educational outcomes.',
    'Seed funding and young scholar grants supporting healthcare and classroom analytics research.',
  ],
  service: ['Co-Chair, AI Committee, Haub School of Business', 'Reviewer for MISQ, ECRA, and multiple IS conferences', 'Session Chair at INFORMS Annual Meeting'],
};

export default async function HomePage() {
  const content = await getSiteContent();

  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-badge">ZD</div>{content.hero.name}</div>
        <nav className="nav">
          <a href="#askjoe">AskJoe</a>
          <a href="#news">News</a>
          <a href="#research">Research</a>
          <a href="#teaching">Teaching</a>
          <a href="#admin">Admin</a>
        </nav>
      </header>

      <section className="hero">
        <div>
          <Image src="/zhe-deng-sju-headshot-min.jpg" alt={content.hero.name} width={560} height={680} style={{ borderRadius: 20, objectFit: 'cover' }} priority />
        </div>
        <div>
          <div className="eyebrow">Official Academic Website</div>
          <h1>{content.hero.name}</h1>
          <h2>{content.hero.title}</h2>
          <p>{content.hero.subtitle}</p>
          <div className="chip-row" style={{ margin: '20px 0' }}>
            {profile.chips.map((chip) => <span key={chip} className="chip">{chip}</span>)}
          </div>
          <div className="action-row">
            <a className="btn btn-primary" href={content.hero.cvUrl} target="_blank" rel="noreferrer">Download CV</a>
            <a className="btn" href={`mailto:${content.hero.email}`}>Email / Contact</a>
          </div>
        </div>
      </section>

      <section className="section-grid">
        <div className="stack">
          <article className="panel" id="askjoe">
            <div className="eyebrow">AskJoe</div>
            <h3>Direct AI route on the server</h3>
            <p>{content.askJoe.intro}</p>
            <AskJoeForm suggestedQuestions={content.askJoe.suggestedQuestions} />
          </article>

          <article className="panel" id="news">
            <div className="eyebrow">News & Updates</div>
            <h3>Simple content page, managed from hosted storage</h3>
            {content.news.map((item) => (
              <div className="news-item" key={`${item.date}-${item.text}`}>
                <div className="news-date">{item.date}</div>
                <div>{item.text}</div>
              </div>
            ))}
          </article>

          <article className="panel" id="research">
            <div className="eyebrow">Research</div>
            <h3>Research focus</h3>
            <ul className="list">
              {profile.research.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
        </div>

        <aside className="stack">
          <article className="panel" id="teaching">
            <div className="eyebrow">Teaching</div>
            <h3>Courses</h3>
            <ul className="list">
              {profile.teaching.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>

          <article className="panel">
            <div className="eyebrow">Grants</div>
            <h3>Selected funding</h3>
            <ul className="list">
              {profile.grants.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>

          <article className="panel">
            <div className="eyebrow">Service</div>
            <h3>Academic roles</h3>
            <ul className="list">
              {profile.service.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>

          <article className="panel" id="admin">
            <div className="eyebrow">Admin</div>
            <h3>Production admin workspace</h3>
            <p>For content operations, use the dedicated admin page with email-code verification and hosted KV persistence.</p>
            <a className="btn btn-primary" href="/admin">Open Admin</a>
          </article>
        </aside>
      </section>
    </main>
  );
}
