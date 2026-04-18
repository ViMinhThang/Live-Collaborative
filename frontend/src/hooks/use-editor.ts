import { useState, useCallback, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Char, CharID, EditorEvent } from "@/lib/crdt";
import {
  generateMidPoint,
  comparePositions,
  isLess,
  type VectorClock,
  mergeClocks,
} from "@/lib/crdt";

const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const WS_URL = `${wsProtocol}//${window.location.host}/ws`;

export function useEditor() {
  const [document, setDocument] = useState<Char[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [vectorClock, setVectorClock] = useState<VectorClock>({});
  const userId = useRef(uuidv4());
  const counter = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => setIsConnected(true);
    socket.onclose = () => setIsConnected(false);
    socket.onmessage = (event) => {
      try {
        const rawEvent = JSON.parse(event.data);
        handleIncomingEvent(rawEvent);
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  const handleIncomingEvent = useCallback((event: EditorEvent) => {
    if (event.type === "INSERT") {
      const char = event.data as Char;
      setVectorClock((prev) => mergeClocks(prev, char.clock));
      setDocument((prev) => {
        // Find existing or insert location
        const existingIdx = prev.findIndex(
          (c) =>
            comparePositions(c.position, char.position) === 0 &&
            c.id.userId === char.id.userId &&
            c.id.counter === char.id.counter,
        );

        if (existingIdx !== -1) return prev; // Already have it

        const newDoc = [...prev, char];
        return newDoc.sort((a, b) => (isLess(a, b) ? -1 : 1));
      });
    } else if (event.type === "DELETE") {
      const deleteReq = event.data as { position: number[]; id: CharID };
      setDocument((prev) => {
        return prev.map((c) => {
          if (
            comparePositions(c.position, deleteReq.position) === 0 &&
            c.id.userId === deleteReq.id.userId &&
            c.id.counter === deleteReq.id.counter
          ) {
            return { ...c, deleted: true };
          }
          return c;
        });
      });
    } else if (event.type === "SYNC") {
      const chars = (event.data as Char[]) || [];
      setDocument(chars.sort((a, b) => (isLess(a, b) ? -1 : 1)));
    }
  }, []);

  const visibleDocument = document.filter((c) => !c.deleted);

  const insert = useCallback(
    (value: string, index: number) => {
      const prevChar = index > 0 ? visibleDocument[index - 1] : null;
      const nextChar =
        index < visibleDocument.length ? visibleDocument[index] : null;

      const newClock = {
        ...vectorClock,
        [userId.current]: (vectorClock[userId.current] || 0) + 1,
      };

      const position = generateMidPoint(
        prevChar?.position ?? [],
        nextChar?.position ?? [10],
      );

      counter.current += 1;
      const newChar: Char = {
        value,
        position,
        id: {
          counter: counter.current,
          userId: userId.current,
        },
        deleted: false,
        clock: newClock,
      };

      // Optimistic update
      setDocument((prev) => {
        const newDoc = [...prev, newChar];
        return newDoc.sort((a, b) => (isLess(a, b) ? -1 : 1));
      });

      // Send to server
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "INSERT",
            data: newChar,
            clock: newClock,
          }),
        );
      }
    },
    [visibleDocument, vectorClock],
  );

  const remove = useCallback(
    (index: number) => {
      const char = visibleDocument[index];
      if (!char) return;

      // Optimistic update
      setDocument((prev) => {
        // Find index in FULL document
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

      // Send to server
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "DELETE",
            data: {
              position: char.position,
              id: char.id,
            },
          }),
        );
      }
    },
    [visibleDocument],
  );

  return {
    document: visibleDocument,
    insert,
    remove,
    isConnected,
  };
}
