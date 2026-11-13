import { useEffect, useState } from "react";
import { Hero } from "./Hero";
import * as I from "./icons";
import { Playground, defaults, type Settings } from "./Playground";
import { CodeBlock, CopyButton, Segmented } from "./ui";

const GITHUB = "https://github.com/BokijonovM/transform-marquee";
const NPM = "https://www.npmjs.com/package/transform-marquee";

const installCommands = {
  npm: "npm i transform-marquee",
  pnpm: "pnpm add transform-marquee",
  yarn: "yarn add transform-marquee",
  bun: "bun add transform-marquee",
} as const;
type Manager = keyof typeof installCommands;
const managerOptions = (Object.keys(installCommands) as Manager[]).map((value) => ({ value, label: value }));

const facts = [
  {
    term: "One component",
    detail:
      "Rows, chips per row, speed, direction and the position of the line are props. Responsive values follow the container's width, so it behaves the same in a sidebar as in a full-width section.",
  },
  {
    term: "Styled with CSS variables",
    detail:
      "Radius, colours, icon size and padding are custom properties. The default colours follow your page's color-scheme, light or dark.",
  },
  {
    term: "Cheap to run",
    detail:
      "Layout is measured once with ResizeObserver. Each frame only writes transform and clip-path, and the animation stops while the marquee is off screen.",
  },
  {
    term: "Accessible",
    detail:
      "It respects prefers-reduced-motion, has an optional pause button, and gives screen readers a plain list of the pairs in place of the animation.",
  },
  {
    term: "No dependencies",
    detail: "Only React 18 or newer. It ships as a client component, so it works with the Next.js App Router.",
  },
];

// Mirrors `.hero-marquee` in demo.css (light theme values).
const heroStyles = `.hero-marquee {
  --tm-radius: 999px;
  --tm-icon-radius: 999px;
  --tm-border-width: 1.5px;
  --tm-accent: #e8391d;
  --tm-bg: #131a33;
  --tm-fg: #f5f6f8;
  --tm-fade-color: #f5f6f8;
}

.hero-marquee .tm-chip-from,
.hero-marquee .tm-chip-from .tm-icon {
  border-style: dashed;
  border-color: #3f93c6;
}

.hero-marquee .tm-chip-from {
  background: transparent;
  color: #2a6e9c;
}`;

const Logo = () => (
  <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
    <rect x="3" y="8" width="26" height="16" rx="8" className="logo-draft" />
    <path d="M16 8h5a8 8 0 0 1 0 16h-5z" className="logo-ink" />
    <path d="M16 3v26" className="logo-line" />
  </svg>
);

export function App() {
  const [s, setS] = useState<Settings>(defaults);
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark");
  const [manager, setManager] = useState<Manager>("npm");

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    try {
      localStorage.setItem("tm-theme", next ? "dark" : "light");
    } catch {
      /* storage unavailable */
    }
  };

  const command = installCommands[manager];

  return (
    <div className="page" id="top">
      <header className="nav wrap">
        <a className="brand" href="#top">
          <Logo />
          transform-marquee
        </a>
        <nav aria-label="Site">
          <a className="nav-optional" href="#playground">
            Playground
          </a>
          <a href={GITHUB}>GitHub</a>
          <a className="nav-optional" href={NPM}>
            npm
          </a>
          <button
            type="button"
            className="icon-button"
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            onClick={toggleTheme}
          >
            {dark ? <I.Sun /> : <I.Moon />}
          </button>
        </nav>
      </header>

      <main>
        <Hero />

        <section className="lede wrap">
          <p>
            transform-marquee is a React component. Rows of chips drift across the screen, and each one wipes
            from its before state into its after state as it crosses the line.
          </p>
          <div className="install">
            <Segmented label="Package manager" hideLabel value={manager} options={managerOptions} onChange={setManager} />
            <div className="install-command">
              <code>{command}</code>
              <CopyButton text={command} />
            </div>
          </div>
        </section>

        <Playground s={s} onChange={setS} />

        <section className="wrap section" aria-labelledby="facts-title">
          <header className="section-head">
            <h2 id="facts-title">What you install</h2>
          </header>
          <dl className="facts">
            {facts.map((fact) => (
              <div key={fact.term}>
                <dt>{fact.term}</dt>
                <dd>{fact.detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="wrap section restyle" aria-labelledby="restyle-title">
          <header className="section-head">
            <h2 id="restyle-title">The hero is the same component</h2>
            <p>
              The dashed drafts and inked chips at the top of this page are the stock marquee with one class on
              it. These are all the styles that class carries.
            </p>
            <a className="button" href={`${GITHUB}#readme`}>
              Read the docs on GitHub
            </a>
          </header>
          <CodeBlock title="CSS" code={heroStyles} />
        </section>
      </main>

      <footer className="wrap">
        <div className="footer">
          <p>
            MIT licence. Made by{" "}
            <a href="https://bokijonov.com" target="_blank" rel="noopener noreferrer">
              Muhsinjon Bokijonov
            </a>
            .
          </p>
          <nav aria-label="Footer">
            <a href={GITHUB}>GitHub</a>
            <a href={NPM}>npm</a>
            <a href={`${GITHUB}/issues`}>Report an issue</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
