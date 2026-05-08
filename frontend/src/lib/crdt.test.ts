import { describe, it, expect } from "vitest";
import {
  generateMidPoint,
  comparePositions,
  isLess,
  mergeClocks,
} from "./crdt";
import type { Char } from "@/types";

describe("generateMidPoint", () => {
  it("places between 0 and BASE", () => {
    const pos = generateMidPoint([], [65536]);
    expect(pos).toEqual([32768]);
  });

  it("goes deeper when integers are consecutive (no midpoint)", () => {
    const pos = generateMidPoint([5], [6]);
    expect(pos).toEqual([5, 32768]);
  });

  it("goes deeper when positions collide", () => {
    const pos = generateMidPoint([5], [5]);
    expect(pos).toEqual([5, 32768]);
  });

  it("handles empty right boundary", () => {
    const pos = generateMidPoint([32768], []);
    expect(pos[0]).toBeGreaterThan(32768);
  });
});

describe("comparePositions", () => {
  it("returns 0 for equal positions", () => {
    expect(comparePositions([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it("returns negative when first is smaller", () => {
    expect(comparePositions([1, 2], [1, 3])).toBeLessThan(0);
  });

  it("returns positive when first is larger", () => {
    expect(comparePositions([2, 1], [1, 3])).toBeGreaterThan(0);
  });

  it("shorter array is less when prefix matches", () => {
    expect(comparePositions([1], [1, 0])).toBeLessThan(0);
  });
});

describe("isLess", () => {
  const makeChar = (
    position: number[],
    userId: string,
    counter: number,
  ): Char => ({
    value: "x",
    position,
    id: { userId, counter },
    deleted: false,
    clock: {},
  });

  it("sorts by position first", () => {
    const a = makeChar([1], "a", 1);
    const b = makeChar([2], "b", 1);
    expect(isLess(a, b)).toBe(true);
    expect(isLess(b, a)).toBe(false);
  });

  it("breaks ties by userId", () => {
    const a = makeChar([1], "a", 1);
    const b = makeChar([1], "b", 1);
    expect(isLess(a, b)).toBe(true);
  });

  it("breaks ties by counter when userId matches", () => {
    const a = makeChar([1], "a", 1);
    const b = makeChar([1], "a", 2);
    expect(isLess(a, b)).toBe(true);
  });
});

describe("mergeClocks", () => {
  it("takes max of each user", () => {
    const merged = mergeClocks({ a: 1, b: 2 }, { b: 3, c: 1 });
    expect(merged).toEqual({ a: 1, b: 3, c: 1 });
  });

  it("returns a new object", () => {
    const local = { a: 1 };
    const result = mergeClocks(local, { b: 2 });
    expect(result).not.toBe(local);
  });
});
