import { useState, useCallback, useRef, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Char, CharID, EditorEvent, VectorClock } from "@/types";
import {
  generateMidPoint,
  mergeClocks,
  comparePositions,
} from "@/lib/crdt";
import { insertSorted, sortDoc, filterVisible } from "@/lib/document";

export function useDocument(onIncomingEvent?: (event: EditorEvent) => void) {
  const [document, setDocument] = useState<Char[]>([]);
  const vectorClockRef = useRef<VectorClock>({});
  const userId = useMemo(() => uuidv4(), []);
  const counter = useRef(0);

  const handleIncoming = useCallback((event: EditorEvent) => {
    if (event.type === "INSERT") {
      const char = event.data as Char;
      vectorClockRef.current = mergeClocks(vectorClockRef.current, char.clock);
      setDocument((prev) => {
        const existingIdx = prev.findIndex(
          (c) =>
            comparePositions(c.position, char.position) === 0 &&
            c.id.userId === char.id.userId &&
            c.id.counter === char.id.counter,
        );
        if (existingIdx !== -1) return prev;
        return insertSorted(prev, char);
      });
    } else if (event.type === "DELETE") {
      const deleteReq = event.data as { position: number[]; id: CharID };
      setDocument((prev) =>
        prev.map((c) => {
          if (
            comparePositions(c.position, deleteReq.position) === 0 &&
            c.id.userId === deleteReq.id.userId &&
            c.id.counter === deleteReq.id.counter
          ) {
            return { ...c, deleted: true };
          }
          return c;
        }),
      );
    } else if (event.type === "SYNC") {
      const chars = (event.data as Char[]) || [];
      if (event.clock) {
        vectorClockRef.current = mergeClocks(vectorClockRef.current, event.clock);
      }
      setDocument(sortDoc(chars));
    }

    onIncomingEvent?.(event);
  }, [onIncomingEvent]);

  const visibleDocument = useMemo(() => filterVisible(document), [document]);

  const makeInsertChar = useCallback(
    (value: string, index: number) => {
      const prevChar = index > 0 ? visibleDocument[index - 1] : null;
      const nextChar =
        index < visibleDocument.length ? visibleDocument[index] : null;

      const clock = vectorClockRef.current;
      const newClock = {
        ...clock,
        [userId]: (clock[userId] || 0) + 1,
      };
      vectorClockRef.current = newClock;

      const position = generateMidPoint(
        prevChar?.position ?? [],
        nextChar?.position ?? [65536],
      );

      counter.current += 1;
      const newChar: Char = {
        value,
        position,
        id: {
          counter: counter.current,
          userId,
        },
        deleted: false,
        clock: newClock,
      };

      setDocument((prev) => insertSorted(prev, newChar));
      return newChar;
    },
    [visibleDocument, userId],
  );

  const makeRemovePayload = useCallback(
    (index: number) => {
      const char = visibleDocument[index];
      if (!char) return null;

      setDocument((prev) => {
        const fullIndex = prev.findIndex(
          (c) =>
            c.id.userId === char.id.userId &&
            c.id.counter === char.id.counter &&
            comparePositions(c.position, char.position) === 0,
        );
        if (fullIndex === -1) return prev;

        const newDoc = [...prev];
        newDoc[fullIndex] = { ...newDoc[fullIndex], deleted: true };
        return newDoc;
      });

      return {
        position: char.position,
        id: char.id,
      };
    },
    [visibleDocument],
  );

  return {
    document: visibleDocument,
    fullDocument: document,
    handleIncoming,
    makeInsertChar,
    makeRemovePayload,
    userId,
  };
}
