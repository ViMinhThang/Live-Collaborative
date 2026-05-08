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
  type: "INSERT" | "DELETE" | "SYNC" | "PRESENCE";
  data: unknown;
  clock?: VectorClock;
  presences?: Presence[];
}

export interface Presence {
  userId: string;
  displayName: string;
  color: string;
  cursorPos: number;
}

export type ConnectionState = "connecting" | "connected" | "disconnected";
