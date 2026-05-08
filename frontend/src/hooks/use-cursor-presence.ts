import { useState, useEffect, useCallback, useMemo } from "react";
import type { EditorEvent, Presence } from "@/types";

const COLORS = [
  "#2563EB", "#DC2626", "#16A34A", "#CA8A04", "#9333EA",
  "#0891B2", "#DB2777", "#EA580C", "#4F46E5", "#059669",
];

const ANIMALS = [
  "Fox", "Owl", "Bear", "Wolf", "Hawk", "Lynx", "Deer", "Puma",
  "Raven", "Otter", "Badger", "Finch", "Lark", "Heron", "Crane",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function useCursorPresence(
  userId: string,
  cursorPos: number,
  sendEvent: (event: EditorEvent) => void,
) {
  const displayName = useMemo(
    () => pick(COLORS).replace("#", "") + " " + pick(ANIMALS),
    [],
  );
  const color = useMemo(() => pick(COLORS), []);
  const [remotePresences, setRemotePresences] = useState<Presence[]>([]);

  const processPresenceEvent = useCallback((event: EditorEvent) => {
    if (event.type !== "PRESENCE") return;
    const presences = event.presences;
    if (!presences) return;

    setRemotePresences(
      presences.filter((p) => p.userId !== userId),
    );
  }, [userId]);

  useEffect(() => {
    const interval = setInterval(() => {
      sendEvent({
        type: "PRESENCE",
        data: { userId, displayName, color, cursorPos },
      });
    }, 150);
    return () => clearInterval(interval);
  }, [userId, displayName, color, cursorPos, sendEvent]);

  return { remotePresences, displayName, color, processPresenceEvent };
}
