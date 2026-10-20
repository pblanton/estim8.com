import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/estim8-header-logo.png';

export function LandingPage() {
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="brand-badge">
          <img src={logo} alt="estim8.com" className="brand-logo" />
        </div>
        <button
          type="button"
          className="landing-nav-toggle"
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls="landing-nav-actions"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <div id="landing-nav-actions" className={`landing-nav-actions${menuOpen ? ' open' : ''}`}>
          <Link to="/login" className="btn btn-secondary" onClick={() => setMenuOpen(false)}>
            Login
          </Link>
          <Link to="/register" className="btn btn-primary" onClick={() => setMenuOpen(false)}>
            Create&nbsp;Account
          </Link>
        </div>
      </nav>

      <header className="landing-hero">
        <h1>Estimate together, without anchoring on the loudest voice.</h1>
        <p className="subtitle">
          estim8 is a distributed planning poker table for remote and hybrid teams. Everyone picks a card in
          private, cards flip at the same time, and the conversation starts from the full spread of opinions —
          not just whoever spoke first.
        </p>
      </header>

      <section className="landing-section">
        <h2>Why hide the cards until everyone's picked?</h2>
        <div className="landing-grid">
          <div className="card">
            <strong>Mental anchoring is real.</strong>
            <p>
              The moment one person says "I think this is a 5," everyone else's estimate quietly drifts toward 5 —
              even people who were about to say 13. It's not a discipline problem, it's how brains work with
              numbers they just heard.
            </p>
          </div>
          <div className="card">
            <strong>Simultaneous reveal fixes it.</strong>
            <p>
              Planning poker has every estimator commit to a number privately, then reveals all cards at once. The
              spread of answers — not a single confident guess — becomes the start of the discussion.
            </p>
          </div>
          <div className="card">
            <strong>Disagreement is useful signal.</strong>
            <p>
              A 2 next to a 13 for the same story usually means someone knows a risk, a dependency, or a shortcut
              the rest of the team doesn't. That's exactly the conversation you want to have before committing to
              a number.
            </p>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <h2>How estim8 works</h2>
        <div className="landing-steps">
          <div className="step">
            <div className="step-number">1</div>
            <div>
              <strong>Create a facilitator account.</strong> Verify your email, set a password, and you're ready to
              run sessions. Players never need an account.
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div>
              <strong>Set up a session and add topics.</strong> Pick a card deck (Fibonacci, decimal, or your own
              custom labels like "P1"–"P5"), then add the items you're estimating — each with a description and
              any reference docs, images, or slides.
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div>
              <strong>Invite your team.</strong> Send invite emails or just paste the session link into your team
              chat. Up to 10 players join with nothing but a name — no account, no install.
            </div>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <div>
              <strong>Discuss and estimate.</strong> Walk through each topic's reference material on one side of
              the screen while players quietly pick cards at the felt table on the other. Reveal when everyone's
              in, see the spread and the agreement level, then capture notes and the team's final consensus
              number before moving to the next topic.
            </div>
          </div>
          <div className="step">
            <div className="step-number">5</div>
            <div>
              <strong>Take your results with you.</strong> Every topic's discussion notes, individual votes, and
              final consensus are saved to a Results file you can download. estim8 isn't a permanent archive —
              more on that below.
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <h2>Your data doesn't live here forever</h2>
        <p style={{ maxWidth: 700 }}>
          estim8 is a working table, not a filing cabinet. A session and everything uploaded to it — documents,
          votes, notes, results — is automatically deleted 7 days after you mark it complete (and abandoned,
          never-completed sessions are cleaned up too). Export a ZIP of everything whenever you like, or purge a
          session immediately yourself. Come in, estimate, take what you learned with you.
        </p>
      </section>

      <section className="landing-cta">
        <Link to="/register" className="btn btn-primary">
          Create your facilitator account
        </Link>
      </section>
    </div>
  );
}
