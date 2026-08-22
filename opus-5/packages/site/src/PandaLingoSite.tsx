import { useCallback, useEffect, useState, type FormEvent, type ReactElement, type ReactNode } from 'react';
import { targetSelectorSafe } from '@pet/core';
import { HeroPanda } from './HeroPanda.js';
import { useHashRoute } from './useHashRoute.js';
import { useReveal } from './useReveal.js';

/** Thin line icons, one consistent stroke width — no filled shapes (brand: Icon Style). */
function Icon({ path }: { path: string }): ReactElement {
  return (
    <svg className="pl-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d={path} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const FEATURES: readonly { title: string; body: string; icon: string }[] = [
  {
    title: 'Speak first',
    body: 'Conversation from the first minute. Grammar can wait its turn.',
    icon: 'M4 12a8 8 0 1 1 3.2 6.4L4 19l.7-2.9A7.9 7.9 0 0 1 4 12Z',
  },
  {
    title: 'Gentle notes',
    body: 'Corrections arrive after you finish, never mid-sentence.',
    icon: 'M5 19h14M7 15.5 17 5.5l2 2L9 17.5H7v-2Z',
  },
  {
    title: 'Your own pace',
    body: 'Five quiet minutes is a session. Nothing here expires.',
    icon: 'M12 4a8 8 0 1 0 8 8M12 8v4l3 2',
  },
  {
    title: 'Real situations',
    body: 'Cafés, stations, interviews — the sentences you will actually use.',
    icon: 'M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  },
];

const STATS: readonly { value: string; label: string }[] = [
  { value: '1,240', label: 'minutes spoken' },
  { value: '312', label: 'sentences finished' },
  { value: '3', label: 'languages begun' },
];

export interface PandaLingoSiteProps {
  /** Shown in the nav so the two solutions are distinguishable at a glance. */
  edition: string;
  /** Wired to the pet's welcome tour when a pet is mounted. */
  onStartTour?: () => void;
  /** Demo controls rendered after the page content. */
  children?: ReactNode;
}

/**
 * The host website. It knows nothing about the pet beyond two things the brief requires:
 * stable `data-pet-target` anchors, and a `practice-submitted` event the tour can wait for.
 */
export function PandaLingoSite({ edition, onStartTour, children }: PandaLingoSiteProps): ReactElement {
  const { route, navigate } = useHashRoute();
  const [scrolled, setScrolled] = useState(false);
  const [sent, setSent] = useState(false);
  useReveal(route);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // A new route starts at the top; `auto` keeps it out of the way of the tour's own
  // smooth scroll to the step target.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route]);

  const jumpTo = useCallback(
    (target: string) => {
      navigate('#home');
      requestAnimationFrame(() => {
        document
          .querySelector(targetSelectorSafe(target))
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    },
    [navigate],
  );

  const submitPractice = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
    // The tour's `site-event` completion listens for exactly this.
    window.dispatchEvent(new CustomEvent('practice-submitted'));
  }, []);

  return (
    <div className="pl-site">
      <a className="pl-skip" href="#pl-main">
        Skip to content
      </a>
      <header className="pl-nav" data-scrolled={scrolled ? 'true' : 'false'}>
        <div className="pl-nav__inner">
          <a
            className="pl-nav__brand"
            href="#home"
            onClick={(event) => {
              event.preventDefault();
              navigate('#home');
            }}
          >
            PandaLingo
            <span className="pl-nav__edition">{edition}</span>
          </a>
          <nav className="pl-nav__links" aria-label="Main">
            <a
              className="pl-nav__link"
              href="#home"
              aria-current={route === '#home' ? 'page' : undefined}
              onClick={(event) => {
                event.preventDefault();
                navigate('#home');
              }}
            >
              Home
            </a>
            <a
              className="pl-nav__link"
              href="#speak"
              data-pet-target="nav-speak"
              aria-current={route === '#speak' ? 'page' : undefined}
              onClick={(event) => {
                event.preventDefault();
                navigate('#speak');
              }}
            >
              Speak
            </a>
            <button type="button" className="pl-nav__link" onClick={() => jumpTo('progress-stats')}>
              Progress
            </button>
            <button type="button" className="pl-nav__link pl-nav__link--cta" onClick={() => jumpTo('join-cta')}>
              Join
            </button>
          </nav>
        </div>
      </header>

      <main id="pl-main">
        {route === '#home' ? (
          <>
            <section className="pl-hero">
              <div className="pl-hero__copy" data-reveal>
                <p className="pl-eyebrow">A quiet way to speak</p>
                <h1 className="pl-display">
                  Speak naturally.
                  <br />
                  Learn quietly.
                </h1>
                <p className="pl-lede">
                  A calm place to practise your voice. No streaks, no confetti — just conversation, at your pace.
                </p>
                <div className="pl-hero__actions">
                  <button
                    type="button"
                    className="pl-cta"
                    data-pet-target="hero-cta"
                    onClick={() => navigate('#speak')}
                  >
                    Start speaking
                  </button>
                  {onStartTour ? (
                    <button type="button" className="pl-cta pl-cta--ghost" onClick={onStartTour}>
                      Show me around
                    </button>
                  ) : null}
                </div>
                <p className="pl-hero__note">Every conversation builds confidence.</p>
              </div>
              <div className="pl-hero__figure" data-reveal>
                <HeroPanda />
              </div>
            </section>

            <section className="pl-section" data-pet-target="features" data-reveal>
              <h2 className="pl-display pl-display--section">Four quiet promises.</h2>
              <div className="pl-grid">
                {FEATURES.map((feature) => (
                  <article className="pl-card" key={feature.title}>
                    <Icon path={feature.icon} />
                    <h3 className="pl-card__title">{feature.title}</h3>
                    <p className="pl-card__body">{feature.body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="pl-section pl-section--split" data-reveal>
              <div>
                <h2 className="pl-display pl-display--section">Progress you can feel.</h2>
                <p className="pl-lede">
                  Small steps. Big progress. We count the minutes you spoke, not the days you missed.
                </p>
              </div>
              <div className="pl-stats" data-pet-target="progress-stats">
                {STATS.map((stat) => (
                  <div className="pl-stat" key={stat.label}>
                    <p className="pl-stat__value">{stat.value}</p>
                    <p className="pl-stat__label">{stat.label}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="pl-join" data-reveal>
              <h2 className="pl-display pl-display--section">Your voice deserves the world.</h2>
              <p className="pl-lede">Start with one sentence today. Panda will be here tomorrow.</p>
              <button type="button" className="pl-cta" data-pet-target="join-cta" onClick={() => navigate('#speak')}>
                Join PandaLingo
              </button>
            </section>
          </>
        ) : (
          <section className="pl-practice" data-reveal>
            <p className="pl-eyebrow">Practice</p>
            <h1 className="pl-display">One sentence is enough.</h1>
            <p className="pl-lede">Read the prompt aloud, or write it first if that feels kinder today.</p>
            <form className="pl-practice__card" onSubmit={submitPractice}>
              <label className="pl-label" htmlFor="pl-practice-input">
                Today’s prompt — “Tell me about a place you miss.”
              </label>
              <textarea
                id="pl-practice-input"
                className="pl-input"
                data-pet-target="practice-input"
                rows={4}
                placeholder="I miss the small station café near my grandmother’s house…"
                onChange={() => setSent(false)}
              />
              <div className="pl-practice__actions">
                <button type="submit" className="pl-cta">
                  Send to Panda
                </button>
                <p className="pl-practice__status" role="status" aria-live="polite">
                  {sent ? 'Thank you. That was a good start.' : ''}
                </p>
              </div>
            </form>
          </section>
        )}
        {children}
      </main>

      <footer className="pl-footer">
        <p>PandaLingo — a demonstration page. Every visit should feel like a quiet café.</p>
        <p className="pl-footer__edition">{edition}</p>
      </footer>
    </div>
  );
}
