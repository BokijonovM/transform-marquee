import { describe, expect, it } from "vitest";
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
  vanDerCorput,
  wipeFraction,
} from "../src/engine";

describe("resolveResponsive", () => {
  it("returns plain values as-is", () => {
    expect(resolveResponsive(3, 0, DEFAULT_BREAKPOINTS, 1)).toBe(3);
    expect(resolveResponsive<number | "auto">("auto", 2000, DEFAULT_BREAKPOINTS, 1)).toBe("auto");
  });

  it("applies breakpoints mobile-first", () => {
    const value = { base: 2, lg: 4 };
    expect(resolveResponsive(value, 375, DEFAULT_BREAKPOINTS, 1)).toBe(2);
    expect(resolveResponsive(value, 1023, DEFAULT_BREAKPOINTS, 1)).toBe(2);
    expect(resolveResponsive(value, 1024, DEFAULT_BREAKPOINTS, 1)).toBe(4);
  });

  it("uses the fallback below the first breakpoint when base is missing", () => {
    expect(resolveResponsive({ md: 5 }, 500, DEFAULT_BREAKPOINTS, 1)).toBe(1);
    expect(resolveResponsive(undefined, 500, DEFAULT_BREAKPOINTS, 7)).toBe(7);
  });
});

describe("vanDerCorput", () => {
  it("produces the base-2 sequence", () => {
    expect([1, 2, 3, 4, 5].map((n) => vanDerCorput(n))).toEqual([0.5, 0.25, 0.75, 0.125, 0.625]);
  });
});

describe("rows", () => {
  it("fits only whole rows", () => {
    expect(fitRows(300, 68, 4)).toBe(4); // 4*68 + 3*4 = 284
    expect(fitRows(355, 68, 4)).toBe(4);
    expect(fitRows(356, 68, 4)).toBe(5); // 5*68 + 4*4 = 356
    expect(fitRows(40, 68, 4)).toBe(0);
  });

  it("computes the height of fixed rows", () => {
    expect(rowsHeight(5, 68, 4)).toBe(356);
    expect(rowsHeight(0, 68, 4)).toBe(0);
  });
});

describe("lanes", () => {
  it("keeps a fixed speed, and spreads a range within bounds", () => {
    expect(laneSpeed(3, 140)).toBe(140);
    for (let lane = 0; lane < 20; lane++) {
      const s = laneSpeed(lane, [120, 155]);
      expect(s).toBeGreaterThanOrEqual(120);
      expect(s).toBeLessThan(155);
    }
  });

  it("spaces chips in a lane evenly", () => {
    const phases = [0, 1, 2, 3].map((slot) => travelerPhase(0, slot, 4));
    const sorted = [...phases].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i]! - sorted[i - 1]!).toBeCloseTo(0.25);
  });

  it("deals items out in order and wraps", () => {
    expect(itemIndexFor(0, 0, 2, 5)).toBe(0);
    expect(itemIndexFor(1, 1, 2, 5)).toBe(3);
    expect(itemIndexFor(2, 1, 2, 5)).toBe(0);
  });
});

describe("travel", () => {
  it("starts fully off-screen and ends fully off-screen", () => {
    const { start, range } = travelGeometry(1000, 300, 2, 48);
    expect(start).toBe(-300);
    expect(start + range).toBeGreaterThanOrEqual(1000);
  });

  it("never lets evenly spaced chips overlap on a narrow row", () => {
    const widest = 300;
    const { range } = travelGeometry(375, widest, 4, 48);
    expect(range / 4).toBeGreaterThanOrEqual(widest + 48);
  });

  it("wraps position within the cycle", () => {
    const { start, range } = travelGeometry(1000, 200, 2, 48);
    for (const t of [0, 1.3, 10, 1000]) {
      const x = positionAt(t, 150, 0.4, start, range);
      expect(x).toBeGreaterThanOrEqual(start);
      expect(x).toBeLessThan(start + range);
    }
  });
});

describe("wipe", () => {
  it("measures how much of a chip has crossed", () => {
    expect(wipeFraction(0, 100, 500)).toBe(1);
    expect(wipeFraction(600, 100, 500)).toBe(0);
    expect(wipeFraction(450, 100, 500)).toBe(0.5);
  });

  it("swaps layers with direction", () => {
    expect(clipPaths(0.25, "right")).toEqual({
      from: "inset(0 75% 0 0)",
      to: "inset(0 0 0 25%)",
    });
    expect(clipPaths(0.25, "left")).toEqual({
      from: "inset(0 0 0 25%)",
      to: "inset(0 75% 0 0)",
    });
  });
});
