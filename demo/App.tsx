import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { TransformMarquee, type TransformMarqueeItem } from "transform-marquee";
import * as I from "./icons";

const items: TransformMarqueeItem[] = [
  { from: "Rough idea", to: "Production-ready product", fromIcon: <I.Bulb />, toIcon: <I.Rocket /> },
  { from: "Slow experience", to: "Lightning-fast UX", fromIcon: <I.Clock />, toIcon: <I.Bolt /> },
  { from: "Buggy code", to: "Reliable software", fromIcon: <I.Alert />, toIcon: <I.Check /> },
  { from: "Guesswork", to: "Data-driven decisions", fromIcon: <I.Question />, toIcon: <I.Chart /> },
  { from: "Static mockup", to: "Interactive experience", fromIcon: <I.Swatch />, toIcon: <I.Cursor /> },
  { from: "Local demo", to: "Live deployment", fromIcon: <I.Monitor />, toIcon: <I.Globe /> },
  { from: "Security gaps", to: "Hardened application", fromIcon: <I.Alert />, toIcon: <I.Shield /> },
  { from: "Spaghetti code", to: "Clean architecture", fromIcon: <I.Puzzle />, toIcon: <I.Grid /> },
  { from: "Desktop-only UI", to: "Responsive everywhere", fromIcon: <I.Monitor />, toIcon: <I.Phone /> },
  { from: "Cluttered UI", to: "Clean design", fromIcon: <I.Swatch />, toIcon: <I.Sparkles /> },
  { from: "Siloed teams", to: "Seamless collaboration", fromIcon: <I.Question />, toIcon: <I.Users /> },
  { from: "No tests", to: "Confident releases", fromIcon: <I.Alert />, toIcon: <I.Check /> },
];

type Settings = {
  rows: number | "auto";
  perRow: number;
  speed: number;
  direction: "right" | "left";
  splitAt: number;
  radius: number;
  iconRadius: number;
  accent: string;
  icons: boolean;
  divider: boolean;
  pauseButton: boolean;
};

const defaults: Settings = {
  rows: "auto",
  perRow: 2,
  speed: 140,
  direction: "right",
  splitAt: 0.5,
  radius: 8,
  iconRadius: 8,
  accent: "#6366f1",
  icons: true,
  divider: true,
  pauseButton: true,
};

function snippet(s: Settings) {
  const props = [
    "items={items}",
    s.rows !== defaults.rows && `rows={${s.rows === "auto" ? '"auto"' : s.rows}}`,
    `perRow={${s.perRow}}`,
    `speed={${s.speed}}`,
    s.direction !== "right" && `direction="left"`,
    s.splitAt !== 0.5 && `splitAt={${s.splitAt}}`,
    !s.divider && "divider={false}",
    s.pauseButton && "pauseButton",
  ].filter(Boolean);
  const vars = [
    s.radius !== 8 && `"--tm-radius": "${s.radius}px"`,
    s.iconRadius !== 8 && `"--tm-icon-radius": "${s.iconRadius}px"`,
    s.accent !== defaults.accent && `"--tm-accent": "${s.accent}"`,
  ].filter(Boolean);
  if (vars.length) props.push(`style={{ ${vars.join(", ")} }}`);
  return `import { TransformMarquee } from "transform-marquee";
import "transform-marquee/styles.css";

<div style={{ height: 420 }}>
  <TransformMarquee
    ${props.join("\n    ")}
  />
</div>`;
}

export function App() {
  const [s, setS] = useState(defaults);
  const [dark, setDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
  );
  const [copied, setCopied] = useState<string | null>(null);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setS((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  const shownItems = useMemo(
    () => (s.icons ? items : items.map(({ fromIcon: _f, toIcon: _t, ...rest }) => rest)),
    [s.icons],
  );
  const code = snippet(s);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="page">
      <header className="top">
        <span className="brand">transform-marquee</span>
        <nav>
          <a href="https://github.com/BokijonovM/transform-marquee">GitHub</a>
          <a href="https://www.npmjs.com/package/transform-marquee">npm</a>
          <button type="button" className="ghost" onClick={() => setDark((d) => !d)}>
            {dark ? "Light" : "Dark"}
          </button>
        </nav>
      </header>

      <section className="hero">
        <h1>
          Show the <em>before</em> and the <em>after</em> — in motion.
        </h1>
        <p>
          A React marquee where every chip wipes from its old state into its new one as it crosses the line.
          Responsive, accessible, zero dependencies.
        </p>
        <button type="button" className="install" onClick={() => copy("npm i transform-marquee", "install")}>
          <code>npm i transform-marquee</code>
          <span>{copied === "install" ? "Copied" : "Copy"}</span>
        </button>
      </section>

      <section className="stage">
        <TransformMarquee
          items={shownItems}
          rows={s.rows}
          perRow={{ base: Math.min(s.perRow, 2), md: s.perRow }}
          speed={s.speed}
          direction={s.direction}
          splitAt={s.splitAt}
          divider={s.divider}
          pauseButton={s.pauseButton}
          style={
            {
              "--tm-radius": `${s.radius}px`,
              "--tm-icon-radius": `${s.iconRadius}px`,
              "--tm-accent": s.accent,
            } as CSSProperties
          }
        />
      </section>

      <section className="playground">
        <div className="controls">
          <h2>Playground</h2>
          <label>
            <span>Rows</span>
            <select
              value={String(s.rows)}
              onChange={(e) => set("rows", e.target.value === "auto" ? "auto" : Number(e.target.value))}
            >
              <option value="auto">auto (fill height)</option>
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <Range label="Chips per row (desktop)" min={1} max={5} step={1} value={s.perRow} onChange={(v) => set("perRow", v)} />
          <Range label="Speed" unit="px/s" min={40} max={320} step={10} value={s.speed} onChange={(v) => set("speed", v)} />
          <Range label="Split position" min={0.2} max={0.8} step={0.05} value={s.splitAt} onChange={(v) => set("splitAt", v)} />
          <Range label="Chip radius" unit="px" min={0} max={32} step={1} value={s.radius} onChange={(v) => set("radius", v)} />
          <Range label="Icon radius" unit="px" min={0} max={16} step={1} value={s.iconRadius} onChange={(v) => set("iconRadius", v)} />
          <label>
            <span>Direction</span>
            <select value={s.direction} onChange={(e) => set("direction", e.target.value as Settings["direction"])}>
              <option value="right">Left → right</option>
              <option value="left">Right → left</option>
            </select>
          </label>
          <label>
            <span>Accent</span>
            <input type="color" value={s.accent} onChange={(e) => set("accent", e.target.value)} />
          </label>
          <Toggle label="Icons" checked={s.icons} onChange={(v) => set("icons", v)} />
          <Toggle label="Divider line" checked={s.divider} onChange={(v) => set("divider", v)} />
          <Toggle label="Pause button" checked={s.pauseButton} onChange={(v) => set("pauseButton", v)} />
          <button type="button" className="ghost" onClick={() => setS(defaults)}>
            Reset
          </button>
        </div>

        <div className="code">
          <div className="code-head">
            <span>Usage</span>
            <button type="button" className="ghost" onClick={() => copy(code, "code")}>
              {copied === "code" ? "Copied" : "Copy"}
            </button>
          </div>
          <pre>
            <code>{code}</code>
          </pre>
        </div>
      </section>

      <footer>
        MIT © <a href="https://bokijonov.com">Muhsinjon Bokijonov</a>
      </footer>
    </div>
  );
}

function Range(props: {
  label: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span>
        {props.label}
        <output>
          {props.value}
          {props.unit ? ` ${props.unit}` : ""}
        </output>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Toggle(props: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
      <span>{props.label}</span>
    </label>
  );
}
