import type { CSSProperties } from "react";
import { TransformMarquee } from "transform-marquee";
import { SPLIT_MAX, SPLIT_MIN } from "./Hero";
import { items, plainItems } from "./items";
import { CodeBlock, Range, Segmented, Switch } from "./ui";

export type Settings = {
  rows: number | "auto";
  perRow: number;
  speed: number;
  direction: "right" | "left";
  splitAt: number;
  radius: number;
  iconRadius: number;
  accent: string;
  /** Edge fade width as a % of the row; 0 turns the fades off. */
  fadeWidth: number;
  /** Edge fade opacity, 0 to 100. */
  fadeOpacity: number;
  icons: boolean;
  divider: boolean;
  pauseOnHover: boolean;
  pauseButton: boolean;
};

export const defaults: Settings = {
  rows: "auto",
  perRow: 2,
  speed: 140,
  direction: "right",
  splitAt: 0.5,
  radius: 8,
  iconRadius: 8,
  accent: "#6366f1",
  fadeWidth: 15,
  fadeOpacity: 100,
  icons: true,
  divider: true,
  pauseOnHover: true,
  pauseButton: true,
};

/** What the package ships with, so the snippet only lists real overrides. */
const PACKAGE = { radius: 8, iconRadius: 8, accent: "#6366f1" };

/** 15% is where the package's default `clamp(3rem, 15%, 16rem)` sits, so it stands for "default". */
const FADE_DEFAULT = 15;
const edgeFadeProp = (width: number) =>
  width === FADE_DEFAULT ? undefined : width === 0 ? (false as const) : `${width}%`;

const presets: { name: string; values: Partial<Settings> }[] = [
  { name: "Default", values: {} },
  { name: "Pills", values: { radius: 32, iconRadius: 16 } },
  { name: "Sharp", values: { radius: 0, iconRadius: 0 } },
  { name: "Dense", values: { rows: 5, perRow: 4, speed: 200 } },
  { name: "Calm", values: { rows: 3, perRow: 2, speed: 60 } },
];

const accents = [
  { value: "#6366f1", name: "Indigo, the default" },
  { value: "#e8391d", name: "Red" },
  { value: "#0d9373", name: "Green" },
  { value: "#c27a12", name: "Amber" },
  { value: "#131a33", name: "Ink" },
];

const rowOptions = [
  { value: "auto", label: "Auto" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
] as const;

const directionOptions = [
  { value: "right", label: "Left to right" },
  { value: "left", label: "Right to left" },
] as const;

const round2 = (value: number) => Number(value.toFixed(2));

function snippet(s: Settings) {
  const split = round2(s.splitAt);
  const props = [
    "items={items}",
    s.rows !== "auto" && `rows={${s.rows}}`,
    `perRow={${s.perRow}}`,
    `speed={${s.speed}}`,
    s.direction !== "right" && `direction="left"`,
    split !== 0.5 && `splitAt={${split}}`,
    !s.divider && "divider={false}",
    s.fadeWidth !== FADE_DEFAULT && (s.fadeWidth === 0 ? "edgeFade={false}" : `edgeFade="${s.fadeWidth}%"`),
    !s.pauseOnHover && "pauseOnHover={false}",
    s.pauseButton && "pauseButton",
  ].filter(Boolean);
  const vars = [
    s.radius !== PACKAGE.radius && `"--tm-radius": "${s.radius}px"`,
    s.iconRadius !== PACKAGE.iconRadius && `"--tm-icon-radius": "${s.iconRadius}px"`,
    s.accent !== PACKAGE.accent && `"--tm-accent": "${s.accent}"`,
    s.fadeWidth !== 0 && s.fadeOpacity !== 100 && `"--tm-fade-opacity": "${s.fadeOpacity / 100}"`,
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

const sameSettings = (a: Settings, b: Settings) =>
  (Object.keys(a) as (keyof Settings)[]).every((key) => a[key] === b[key]);

export function Playground({ s, onChange }: { s: Settings; onChange: (next: Settings) => void }) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...s, [key]: value });
  const customAccent = !accents.some((accent) => accent.value === s.accent);

  return (
    <section className="playground wrap" id="playground" aria-labelledby="playground-title">
      <header className="section-head">
        <h2 id="playground-title">Playground</h2>
        <p>Change a setting and the code updates with it. Copy it when the marquee looks right.</p>
      </header>

      <div className="pg">
        <form className="controls" onSubmit={(event) => event.preventDefault()}>
          <div className="presets" role="group" aria-label="Presets">
            {presets.map((preset) => {
              const target = { ...defaults, ...preset.values };
              return (
                <button
                  key={preset.name}
                  type="button"
                  aria-pressed={sameSettings(s, target)}
                  onClick={() => onChange(target)}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>

          <section className="group" aria-labelledby="group-layout">
            <h3 id="group-layout">Layout</h3>
            <Segmented
              label="Rows"
              value={String(s.rows) as (typeof rowOptions)[number]["value"]}
              options={rowOptions}
              onChange={(value) => set("rows", value === "auto" ? "auto" : Number(value))}
            />
            <Range
              label="Chips per row"
              min={1}
              max={5}
              step={1}
              value={s.perRow}
              onChange={(value) => set("perRow", value)}
              hint={<span className="only-narrow">This preview shows 2 at most on a narrow screen.</span>}
            />
            <Range
              label="Line position"
              min={SPLIT_MIN}
              max={SPLIT_MAX}
              step={0.01}
              value={round2(s.splitAt)}
              format={(value) => `${Math.round(value * 100)}%`}
              onChange={(value) => set("splitAt", value)}
            />
          </section>

          <section className="group" aria-labelledby="group-motion">
            <h3 id="group-motion">Motion</h3>
            <Range
              label="Speed"
              min={40}
              max={320}
              step={10}
              value={s.speed}
              format={(value) => `${value} px/s`}
              onChange={(value) => set("speed", value)}
            />
            <Segmented
              label="Direction"
              value={s.direction}
              options={directionOptions}
              onChange={(value) => set("direction", value)}
            />
            <div className="switches">
              <Switch
                label="Pause a row on hover"
                checked={s.pauseOnHover}
                onChange={(value) => set("pauseOnHover", value)}
              />
              <Switch
                label="Show pause button"
                checked={s.pauseButton}
                onChange={(value) => set("pauseButton", value)}
              />
            </div>
          </section>

          <section className="group" aria-labelledby="group-look">
            <h3 id="group-look">Look</h3>
            <Range
              label="Chip radius"
              min={0}
              max={32}
              step={1}
              value={s.radius}
              format={(value) => `${value} px`}
              onChange={(value) => set("radius", value)}
            />
            <Range
              label="Icon radius"
              min={0}
              max={16}
              step={1}
              value={s.iconRadius}
              format={(value) => `${value} px`}
              onChange={(value) => set("iconRadius", value)}
            />
            <fieldset className="field">
              <legend>Accent</legend>
              <div className="swatches">
                {accents.map((accent) => (
                  <label key={accent.value} title={accent.name}>
                    <input
                      type="radio"
                      name="accent"
                      checked={s.accent === accent.value}
                      onChange={() => set("accent", accent.value)}
                    />
                    <i style={{ background: accent.value }} aria-hidden="true" />
                    <span className="sr-only">{accent.name}</span>
                  </label>
                ))}
                <label className="swatch-custom" data-active={customAccent || undefined} title="Pick a colour">
                  <input type="color" value={s.accent} onChange={(event) => set("accent", event.target.value)} />
                  <i style={customAccent ? { background: s.accent } : undefined} aria-hidden="true" />
                  <span className="sr-only">Pick a colour</span>
                </label>
              </div>
            </fieldset>
            <div className="switches">
              <Switch label="Icons" checked={s.icons} onChange={(value) => set("icons", value)} />
              <Switch label="Line" checked={s.divider} onChange={(value) => set("divider", value)} />
            </div>
          </section>

          <section className="group" aria-labelledby="group-fade">
            <h3 id="group-fade">Edge fade</h3>
            <Range
              label="Width"
              min={0}
              max={40}
              step={1}
              value={s.fadeWidth}
              format={(value) => (value === 0 ? "Off" : `${value}%`)}
              onChange={(value) => set("fadeWidth", value)}
            />
            <Range
              label="Opacity"
              min={0}
              max={100}
              step={5}
              value={s.fadeOpacity}
              format={(value) => `${value}%`}
              onChange={(value) => set("fadeOpacity", value)}
            />
          </section>
        </form>

        {/* After the controls in the DOM; CSS puts the preview first on narrow screens. */}
        <div className="pg-right">
          <div className="pg-stage" data-auto={s.rows === "auto" || undefined}>
            <TransformMarquee
              className="pg-marquee"
              items={s.icons ? items : plainItems}
              rows={s.rows}
              perRow={{ base: Math.min(s.perRow, 2), sm: s.perRow }}
              speed={s.speed}
              direction={s.direction}
              splitAt={s.splitAt}
              divider={s.divider}
              edgeFade={edgeFadeProp(s.fadeWidth)}
              pauseOnHover={s.pauseOnHover}
              pauseButton={s.pauseButton}
              style={
                {
                  "--tm-radius": `${s.radius}px`,
                  "--tm-icon-radius": `${s.iconRadius}px`,
                  "--tm-accent": s.accent,
                  "--tm-fade-opacity": String(s.fadeOpacity / 100),
                } as CSSProperties
              }
            />
          </div>
          <div className="pg-code">
            <CodeBlock title="Usage" code={snippet(s)} />
          </div>
        </div>
      </div>
    </section>
  );
}
