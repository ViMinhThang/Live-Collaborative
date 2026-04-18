export interface CharID {
  counter: number;
  userId: string;
}

export interface Char {
  value: string;
  position: number[];
  id: CharID;
  deleted: boolean;
  clock: VectorClock;
}
export type VectorClock = Record<string, number>;
export interface EditorEvent {
  type: string;
  data: any;
  clock: VectorClock;
}
export function mergeClocks(
  local: VectorClock,
  remote: VectorClock,
): VectorClock {
  const merged = { ...local };
  for (const [userId, counter] of Object.entries(remote)) {
    merged[userId] = Math.max(merged[userId] || 0, counter);
  }
  return merged;
}
const BASE = 65536; // Large base for fractional indexing to reduce depth

export function generateMidPoint(pos1: number[], pos2: number[]): number[] {
  const p1 = pos1 || [];
  const p2 = pos2 || [];
  const maxLength = Math.max(p1.length, p2.length) + 1;
  const newPos: number[] = [];

  for (let i = 0; i < maxLength; i++) {
    const val1 = i < p1.length ? p1[i] : 0;
    const val2 = i < p2.length ? p2[i] : BASE;

    if (val1 === val2) {
      newPos.push(val1);
      continue;
    }

    if (val2 - val1 > 1) {
      newPos.push(val1 + Math.floor((val2 - val1) / 2));
      break;
    } else {
      newPos.push(val1);
      // If we are at the end of pos1, we need to go deeper
      if (i === p1.length - 1 || i >= p1.length) {
        newPos.push(Math.floor(BASE / 2));
        break;
      }
    }
  }

  return newPos;
}

export function comparePositions(pos1: number[], pos2: number[]): number {
  const p1 = pos1 || [];
  const p2 = pos2 || [];
  const minLen = Math.min(p1.length, p2.length);
  for (let i = 0; i < minLen; i++) {
    if (p1[i] !== p2[i]) return p1[i] - p2[i];
  }
  return p1.length - p2.length;
}

export function isLess(char1: Char, char2: Char): boolean {
  if (!char1) return true;
  if (!char2) return false;
  const posComp = comparePositions(char1.position, char2.position);
  if (posComp !== 0) return posComp < 0;

  if (char1.id.userId !== char2.id.userId) {
    return char1.id.userId < char2.id.userId;
  }

  return char1.id.counter < char2.id.counter;
}
