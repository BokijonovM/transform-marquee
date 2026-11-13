import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { TransformMarquee } from "transform-marquee";
import * as I from "./icons";
import { items } from "./items";

export const SPLIT_MIN = 0.15;
export const SPLIT_MAX = 0.85;
const SPLIT_REST = 0.5;
const SPLIT_INTRO = 0.8;
const clampSplit = (value: number) => Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, value));
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

const Headline = () => (
  <>
    <span>Cross the line.</span> <span>Come out finished.</span>
  </>
);

/**
 * The hero is the component's idea at page scale: one draggable line, with
 * the draft on its left and the finished thing on its right. The headline is
 * wiped at the same x as the chips below it.
 */
export function Hero() {
  const [split, setSplit] = useState(() => (reducedMotion() ? SPLIT_REST : SPLIT_INTRO));
  const heroRef = useRef<HTMLElement>(null);
  const drag = useRef<{ offset: number } | null>(null);
  const pending = useRef<number | null>(null);
  const raf = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [used, setUsed] = useState(false);

  // Pointer moves can outpace the display; commit at most one value per frame.
  const queue = (value: number) => {
    pending.current = clampSplit(value);
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      if (pending.current !== null) setSplit(pending.current);
      pending.current = null;
    });
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // The page's one moment of unprompted motion: the line sweeps in and inks
  // the headline. Any input hands the line over to the visitor where it is.
  useEffect(() => {
    if (reducedMotion()) return;
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now + 300;
      const t = Math.min(1, Math.max(0, (now - start) / 1100));
      if (t > 0) setSplit(SPLIT_INTRO + (SPLIT_REST - SPLIT_INTRO) * (1 - (1 - t) ** 4));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const stop = () => cancelAnimationFrame(frame);
    window.addEventListener("pointerdown", stop, { once: true });
    window.addEventListener("keydown", stop, { once: true });
    return () => {
      stop();
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("keydown", stop);
    };
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const hero = heroRef.current;
    if (!hero || event.button !== 0) return;
    const rect = hero.getBoundingClientRect();
    // Keep the grab point under the pointer instead of snapping the line to it.
    drag.current = { offset: event.clientX - (rect.left + rect.width * split) };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    setDragging(true);
    setUsed(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const hero = heroRef.current;
    if (!hero || !drag.current) return;
    const rect = hero.getBoundingClientRect();
    queue((event.clientX - drag.current.offset - rect.left) / rect.width);
  };

  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    const next =
      event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? split - step
        : event.key === "ArrowRight" || event.key === "ArrowUp"
          ? split + step
          : event.key === "Home"
            ? SPLIT_MIN
            : event.key === "End"
              ? SPLIT_MAX
              : null;
    if (next === null) return;
    event.preventDefault();
    setUsed(true);
    setSplit(clampSplit(next));
  };

  return (
    <section
      ref={heroRef}
      className="hero"
      data-dragging={dragging || undefined}
      style={{ "--split": `${split * 100}%` } as CSSProperties}
    >
      <div className="hero-ground" aria-hidden="true" />

      <h1 className="headline">
        <span className="headline-layer headline-ink">
          <Headline />
        </span>
        <span className="headline-layer headline-draft" aria-hidden="true">
          <Headline />
        </span>
      </h1>

      <div className="hero-stage">
        <TransformMarquee
          className="hero-marquee"
          items={items}
          perRow={{ base: 2, md: 3, xl: 4 }}
          splitAt={split}
          divider={false}
          pauseButton
        />
      </div>

      <div className="hero-line" aria-hidden="true" />
      <div
        className="hero-handle"
        role="slider"
        tabIndex={0}
        aria-label="Position of the line"
        aria-orientation="horizontal"
        aria-valuemin={Math.round(SPLIT_MIN * 100)}
        aria-valuemax={Math.round(SPLIT_MAX * 100)}
        aria-valuenow={Math.round(split * 100)}
        aria-valuetext={`${Math.round(split * 100)}% from the left`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <span className="hero-knob">
          <I.Drag />
        </span>
        <span className="hero-hint" data-hidden={used || undefined}>
          Drag the line
        </span>
      </div>
    </section>
  );
}
