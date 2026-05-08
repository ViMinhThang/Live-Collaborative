import type { Char } from "@/types";
import { isLess } from "./crdt";

export function insertSorted(doc: Char[], char: Char): Char[] {
  let lo = 0;
  let hi = doc.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (isLess(doc[mid], char)) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return [...doc.slice(0, lo), char, ...doc.slice(lo)];
}

export function sortDoc(doc: Char[]): Char[] {
  return [...doc].sort((a, b) => (isLess(a, b) ? -1 : 1));
}

export function filterVisible(doc: Char[]): Char[] {
  return doc.filter((c) => !c.deleted);
}
