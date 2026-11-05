// Pure layout and timing maths for TransformMarquee. No DOM access here, so
// every function is deterministic and unit-testable.

export type Breakpoint = "base" | "sm" | "md" | "lg" | "xl";
export type Breakpoints = Record<Exclude<Breakpoint, "base">, number>;

/** A single value, or a value per breakpoint (mobile-first, like Tailwind). */
export type Responsive<T> = T | Partial<Record<Breakpoint, T>>;

export const DEFAULT_BREAKPOINTS: Breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280 };

const ORDER = ["sm", "md", "lg", "xl"] as const;

function isPerBreakpoint<T>(value: Responsive<T>): value is Partial<Record<Breakpoint, T>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Resolves a responsive value for a container width. Each breakpoint applies
 * from its min-width upwards; below the first defined one, `base` (or
 * `fallback`) applies.
 */
export function resolveResponsive<T>(
  value: Responsive<T> | undefined,
  width: number,
  breakpoints: Breakpoints,
  fallback: T,
): T {
  if (value === undefined) return fallback;
  if (!isPerBreakpoint(value)) return value;
  let result = value.base ?? fallback;
  for (const bp of ORDER) {
    const v = value[bp];
    if (v !== undefined && width >= breakpoints[bp]) result = v;
  }
  return result;
}

/**
 * Low-discrepancy sequence in [0, 1). Any prefix of it is evenly spread, so
 * however many lanes are visible their starting points never clump.
 */
export function vanDerCorput(n: number, base = 2): number {
  let result = 0;
  let denominator = 1 / base;
  let k = Math.floor(n);
  while (k > 0) {
    result += (k % base) * denominator;
    k = Math.floor(k / base);
    denominator /= base;
  }
  return result;
}

/** How many whole rows of `rowHeight` fit in `height` with `gap` between them. */
export function fitRows(height: number, rowHeight: number, gap: number): number {
  if (rowHeight <= 0 || height < rowHeight) return 0;
  return Math.floor((height + gap) / (rowHeight + gap));
}

/** Height of `rows` rows of `rowHeight` with `gap` between them. */
export function rowsHeight(rows: number, rowHeight: number, gap: number): number {
  return rows <= 0 ? 0 : rows * rowHeight + (rows - 1) * gap;
}

/**
 * Speed for a lane in px/s. A range is spread deterministically across lanes
 * (base-3 sequence, so it doesn't line up with the base-2 phase sequence).
 * Every chip in a lane shares its lane's speed, so they can never collide.
 */
export function laneSpeed(lane: number, speed: number | readonly [number, number]): number {
  if (typeof speed === "number") return speed;
  const [min, max] = speed;
  return min + (max - min) * vanDerCorput(lane + 1, 3);
}

/** Starting phase (0–1 of the lane's travel cycle) for one chip. */
export function travelerPhase(lane: number, slot: number, perRow: number): number {
  return (vanDerCorput(lane + 1) + slot / perRow) % 1;
}

/** Which item a lane/slot shows: items are dealt out in order, wrapping. */
export function itemIndexFor(lane: number, slot: number, perRow: number, count: number): number {
  return count <= 0 ? 0 : (lane * perRow + slot) % count;
}

/**
 * The travel cycle of a lane. Chips enter fully off one edge and leave fully
 * off the other (`range >= rowWidth + widest chip`), and the cycle is long
 * enough that `perRow` evenly spaced chips keep at least `minGap` between
 * them however long their labels are.
 */
export function travelGeometry(
  rowWidth: number,
  widestChip: number,
  perRow: number,
  minGap: number,
): { start: number; range: number } {
  const range = Math.max(rowWidth + widestChip, perRow * (widestChip + minGap));
  return { start: -widestChip, range };
}

/** Left edge (px, for rightward travel) of a chip after `elapsedS` seconds. */
export function positionAt(
  elapsedS: number,
  speed: number,
  phase: number,
  start: number,
  range: number,
): number {
  if (range <= 0) return start;
  const traveled = elapsedS * speed + phase * range;
  return start + (((traveled % range) + range) % range);
}

/** Fraction (0–1) of a chip at `x` with `width` that lies left of `split`. */
export function wipeFraction(x: number, width: number, split: number): number {
  if (width <= 0) return 0;
  return Math.min(1, Math.max(0, (split - x) / width));
}

export type Direction = "right" | "left";

/**
 * clip-path values for both chip layers. Moving right, the part left of the
 * split hasn't crossed yet (shows "from"); moving left, it's the reverse.
 */
export function clipPaths(fraction: number, direction: Direction): { from: string; to: string } {
  const left = `inset(0 ${(1 - fraction) * 100}% 0 0)`;
  const right = `inset(0 0 0 ${fraction * 100}%)`;
  return direction === "right" ? { from: left, to: right } : { from: right, to: left };
}
