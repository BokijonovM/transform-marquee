import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import {
  DEFAULT_BREAKPOINTS,
  clipPaths,
  fitRows,
  itemIndexFor,
  laneSpeed,
  positionAt,
  resolveResponsive,
  rowsHeight,
  travelGeometry,
  travelerPhase,
  wipeFraction,
  type Breakpoints,
  type Direction,
  type Responsive,
} from "./engine";

export type TransformMarqueeItem = {
  /** Stable key. Falls back to the item's index. */
  id?: string | number;
  /** The "before" state, shown until the chip crosses the split line. */
  from: ReactNode;
  /** The "after" state, revealed as the chip crosses the split line. */
  to: ReactNode;
  fromIcon?: ReactNode;
  toIcon?: ReactNode;
};

export type TransformMarqueeClassNames = Partial<
  Record<"root" | "lane" | "chip" | "from" | "to" | "icon" | "divider" | "fade" | "pauseButton", string>
>;

export interface TransformMarqueeProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  items: TransformMarqueeItem[];
  /**
   * Number of rows, or `"auto"` to fit as many whole rows as the container's
   * height allows (the container then needs a height). Default `"auto"`.
   */
  rows?: Responsive<number | "auto">;
  /** Chips travelling in each row at once. Default `{ base: 2, lg: 4 }`. */
  perRow?: Responsive<number>;
  /** Speed in px/s, or a `[min, max]` range spread across rows. Default `[120, 155]`. */
  speed?: number | readonly [number, number];
  /** Travel direction. Default `"right"`. */
  direction?: Direction;
  /** Where the wipe line sits, 0–1 of the row width. Default `0.5`. */
  splitAt?: number;
  /** Row height in px. Default `68`. */
  rowHeight?: number;
  /** Gap between rows in px. Default `4`. */
  rowGap?: number;
  /** Minimum horizontal gap between chips in the same row, px. Default `48`. */
  chipGap?: number;
  /** Pause a row while the pointer is over it. Default `true`. */
  pauseOnHover?: boolean;
  /** Controlled pause state. Omit to let the component manage it. */
  paused?: boolean;
  /** Called when the built-in pause button is pressed. */
  onPausedChange?: (paused: boolean) => void;
  /** Show a pause/play button (helps meet WCAG 2.2.2). Default `false`. */
  pauseButton?: boolean;
  /** Draw the vertical line at the split. Default `true`. */
  divider?: boolean;
  /** Width of the left/right fade masks (CSS length or px), or `false`. */
  edgeFade?: Responsive<string | number> | false;
  /** Min-widths (px) for responsive props. Measured on the container, not the viewport. */
  breakpoints?: Partial<Breakpoints>;
  classNames?: TransformMarqueeClassNames;
  /** Replace the default chip content (icon + label) for a side. */
  renderChip?: (item: TransformMarqueeItem, side: "from" | "to") => ReactNode;
  /**
   * Render a visually hidden list of all `from → to` pairs for screen
   * readers (the animation itself is hidden from them). Default `true`.
   */
  srList?: boolean;
  /** Labels for the pause button. */
  labels?: { pause?: string; play?: string };
}

type Clock = {
  holds: number;
  pausedMs: number;
  pauseStartedAt: number | null;
  globalHeld: boolean;
  hoverHeld: boolean;
};

const newClock = (): Clock => ({
  holds: 0,
  pausedMs: 0,
  pauseStartedAt: null,
  globalHeld: false,
  hoverHeld: false,
});

function hold(clock: Clock, now: number) {
  if (clock.holds++ === 0) clock.pauseStartedAt = now;
}

function release(clock: Clock, now: number) {
  if (clock.holds === 0) return;
  if (--clock.holds === 0 && clock.pauseStartedAt !== null) {
    clock.pausedMs += now - clock.pauseStartedAt;
    clock.pauseStartedAt = null;
  }
}

function pausedFor(clock: Clock, now: number) {
  return clock.pausedMs + (clock.pauseStartedAt !== null ? now - clock.pauseStartedAt : 0);
}

function syncGlobal(clock: Clock, paused: boolean, now: number) {
  if (paused && !clock.globalHeld) {
    hold(clock, now);
    clock.globalHeld = true;
  } else if (!paused && clock.globalHeld) {
    release(clock, now);
    clock.globalHeld = false;
  }
}

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(" ");
const toLength = (value: string | number) => (typeof value === "number" ? `${value}px` : value);

const isDev = () =>
  typeof process !== "undefined" && process.env?.NODE_ENV !== "production";

export function TransformMarquee({
  items,
  rows = "auto",
  perRow = { base: 2, lg: 4 },
  speed = [120, 155],
  direction = "right",
  splitAt = 0.5,
  rowHeight = 68,
  rowGap = 4,
  chipGap = 48,
  pauseOnHover = true,
  paused,
  onPausedChange,
  pauseButton = false,
  divider = true,
  edgeFade = "clamp(3rem, 15%, 16rem)",
  breakpoints,
  classNames = {},
  renderChip,
  srList = true,
  labels,
  className,
  style,
  ...rest
}: TransformMarqueeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [internalPaused, setInternalPaused] = useState(false);
  const isPaused = paused ?? internalPaused;

  // Persist across engine rebuilds (resize, prop changes) so motion and
  // accumulated pauses continue instead of jumping back to the start.
  const startRef = useRef<number | null>(null);
  const clocksRef = useRef(new Map<number, Clock>());
  const pausedRef = useRef(isPaused);

  const bps: Breakpoints = { ...DEFAULT_BREAKPOINTS, ...breakpoints };
  const width = size?.w ?? 0;
  const split = Math.min(1, Math.max(0, splitAt));
  const rowsSetting = resolveResponsive(rows, width, bps, "auto");
  const perRowCount = Math.max(1, Math.round(resolveResponsive(perRow, width, bps, 2)));
  const fixedRows = rowsSetting === "auto" ? null : Math.max(0, Math.floor(rowsSetting));
  const laneCount =
    !size || items.length === 0
      ? 0
      : fixedRows ?? fitRows(size.h, rowHeight, rowGap);
  const fade = edgeFade === false ? null : resolveResponsive(edgeFade, width, bps, "0px");
  const [speedMin, speedMax] = typeof speed === "number" ? [speed, speed] : speed;

  // Container size drives breakpoints and, in "auto" mode, the row count.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const warnedRef = useRef(false);
  useEffect(() => {
    if (!size || fixedRows !== null || warnedRef.current || !isDev()) return;
    if (size.h < rowHeight) {
      warnedRef.current = true;
      console.warn(
        `[transform-marquee] rows="auto" needs a container with a height of at least rowHeight (${rowHeight}px); ` +
          `this one is ${size.h}px tall. Give it a height, or pass a number to \`rows\`.`,
      );
    }
  }, [size, fixedRows, rowHeight]);

  // Apply the controlled/uncontrolled pause to every lane clock. Declared
  // before the engine effect so pausedRef is current when lanes are built.
  useEffect(() => {
    pausedRef.current = isPaused;
    const now = performance.now();
    for (const clock of clocksRef.current.values()) syncGlobal(clock, isPaused, now);
  }, [isPaused]);

  // The animation engine. Sizes come from ResizeObserver and are cached, so
  // each frame only does arithmetic and style writes — no layout reads.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || laneCount === 0) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = (startRef.current ??= performance.now());
    const builtAt = performance.now();
    const speedSetting: [number, number] = [speedMin, speedMax];

    type Chip = { el: HTMLElement; from: HTMLElement; to: HTMLElement; phase: number; width: number };
    type Lane = { el: HTMLElement; speed: number; width: number; widest: number; chips: Chip[]; clock: Clock };

    const lanes: Lane[] = Array.from(grid.querySelectorAll<HTMLElement>("[data-tm-lane]"), (el, index) => {
      let clock = clocksRef.current.get(index);
      if (!clock) {
        clock = newClock();
        clocksRef.current.set(index, clock);
      }
      syncGlobal(clock, pausedRef.current, builtAt);
      return {
        el,
        speed: laneSpeed(index, speedSetting),
        width: 0,
        widest: 0,
        clock,
        chips: Array.from(el.querySelectorAll<HTMLElement>("[data-tm-traveler]"), (traveler) => ({
          el: traveler,
          from: traveler.querySelector<HTMLElement>("[data-tm-from]")!,
          to: traveler.querySelector<HTMLElement>("[data-tm-to]")!,
          phase: Number(traveler.dataset.phase),
          width: 0,
        })),
      };
    });

    const laneByEl = new Map<Element, Lane>(lanes.map((lane) => [lane.el, lane]));
    const chipByEl = new Map<Element, Chip>();
    for (const lane of lanes) for (const chip of lane.chips) chipByEl.set(chip.el, chip);

    const render = (now: number) => {
      for (const lane of lanes) {
        if (!lane.width || !lane.widest) continue;
        const { start: from, range } = travelGeometry(lane.width, lane.widest, lane.chips.length, chipGap);
        const elapsedS = reduceMotion ? 0 : (now - start - pausedFor(lane.clock, now)) / 1000;
        const splitPx = lane.width * split;
        for (const chip of lane.chips) {
          if (!chip.width) continue;
          const pos = positionAt(elapsedS, lane.speed, chip.phase, from, range);
          const x = direction === "right" ? pos : lane.width - pos - chip.width;
          const clips = clipPaths(wipeFraction(x, chip.width, splitPx), direction);
          chip.el.style.transform = `translate3d(${x}px, 0, 0)`;
          chip.from.style.clipPath = clips.from;
          chip.to.style.clipPath = clips.to;
        }
      }
    };

    // Callbacks run after layout, so reading sizes here is free. The first
    // callback also places every chip before the (hidden) grid is revealed.
    const sizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        const lane = laneByEl.get(entry.target);
        if (lane) lane.width = w;
        else {
          const chip = chipByEl.get(entry.target);
          if (chip) chip.width = w;
        }
      }
      for (const lane of lanes) lane.widest = Math.max(0, ...lane.chips.map((chip) => chip.width));
      render(performance.now());
      grid.dataset.ready = "";
    });
    for (const lane of lanes) {
      sizeObserver.observe(lane.el);
      for (const chip of lane.chips) sizeObserver.observe(chip.el);
    }

    if (reduceMotion) return () => sizeObserver.disconnect();

    // Pause a whole lane, not a single chip: its chips share one speed, so
    // pausing only one would let the next chip run into it.
    const enter = (event: Event) => {
      const lane = laneByEl.get(event.currentTarget as Element);
      if (lane && !lane.clock.hoverHeld) {
        hold(lane.clock, performance.now());
        lane.clock.hoverHeld = true;
      }
    };
    const leave = (event: Event) => {
      const lane = laneByEl.get(event.currentTarget as Element);
      if (lane?.clock.hoverHeld) {
        release(lane.clock, performance.now());
        lane.clock.hoverHeld = false;
      }
    };
    if (pauseOnHover) {
      for (const lane of lanes) {
        lane.el.addEventListener("mouseenter", enter);
        lane.el.addEventListener("mouseleave", leave);
      }
    }

    // Animate only while on screen.
    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      render(now);
    };
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      raf = entry?.isIntersecting ? requestAnimationFrame(frame) : 0;
    });
    visibilityObserver.observe(grid);

    return () => {
      cancelAnimationFrame(raf);
      visibilityObserver.disconnect();
      sizeObserver.disconnect();
      const now = performance.now();
      for (const lane of lanes) {
        lane.el.removeEventListener("mouseenter", enter);
        lane.el.removeEventListener("mouseleave", leave);
        if (lane.clock.hoverHeld) {
          release(lane.clock, now);
          lane.clock.hoverHeld = false;
        }
      }
    };
  }, [laneCount, perRowCount, speedMin, speedMax, chipGap, split, direction, pauseOnHover]);

  const togglePaused = () => {
    const next = !isPaused;
    if (paused === undefined) setInternalPaused(next);
    onPausedChange?.(next);
  };

  const rootStyle = {
    "--tm-row-height": `${rowHeight}px`,
    "--tm-row-gap": `${rowGap}px`,
    "--tm-split": `${split * 100}%`,
    ...(fade !== null && { "--tm-fade-width": toLength(fade) }),
    ...(fixedRows !== null && { height: rowsHeight(fixedRows, rowHeight, rowGap) }),
    ...style,
  } as CSSProperties;

  const initialClips = clipPaths(0, direction);

  const chipContent = (item: TransformMarqueeItem, side: "from" | "to") => {
    if (renderChip) return renderChip(item, side);
    const icon = side === "from" ? item.fromIcon : item.toIcon;
    return (
      <>
        {icon != null && <span className={cx("tm-icon", classNames.icon)}>{icon}</span>}
        <span className="tm-label">{side === "from" ? item.from : item.to}</span>
      </>
    );
  };

  return (
    <div
      ref={rootRef}
      className={cx("tm-root", fixedRows === null && "tm-root--auto", className, classNames.root)}
      data-direction={direction}
      style={rootStyle}
      {...rest}
    >
      {srList && items.length > 0 && (
        <ul className="tm-sr-only">
          {items.map((item, i) => (
            <li key={item.id ?? i}>
              {item.from} → {item.to}
            </li>
          ))}
        </ul>
      )}

      <div ref={gridRef} className="tm-grid" aria-hidden="true">
        {Array.from({ length: laneCount }, (_, lane) => (
          <div key={lane} data-tm-lane="" className={cx("tm-lane", classNames.lane)}>
            {Array.from({ length: perRowCount }, (_, slot) => {
              const item = items[itemIndexFor(lane, slot, perRowCount, items.length)]!;
              return (
                <div
                  key={slot}
                  data-tm-traveler=""
                  data-phase={travelerPhase(lane, slot, perRowCount)}
                  className="tm-traveler"
                >
                  <div className="tm-stack">
                    <div
                      data-tm-from=""
                      className={cx("tm-chip", "tm-chip-from", classNames.chip, classNames.from)}
                      style={{ clipPath: initialClips.from }}
                    >
                      {chipContent(item, "from")}
                    </div>
                    <div
                      data-tm-to=""
                      className={cx("tm-chip", "tm-chip-to", classNames.chip, classNames.to)}
                      style={{ clipPath: initialClips.to }}
                    >
                      {chipContent(item, "to")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {divider && <div className={cx("tm-divider", classNames.divider)} aria-hidden="true" />}
      {fade !== null && (
        <>
          <div className={cx("tm-fade", "tm-fade-left", classNames.fade)} aria-hidden="true" />
          <div className={cx("tm-fade", "tm-fade-right", classNames.fade)} aria-hidden="true" />
        </>
      )}

      {pauseButton && (
        <button
          type="button"
          className={cx("tm-pause", classNames.pauseButton)}
          aria-pressed={isPaused}
          aria-label={isPaused ? labels?.play ?? "Play animation" : labels?.pause ?? "Pause animation"}
          onClick={togglePaused}
        >
          {isPaused ? (
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
