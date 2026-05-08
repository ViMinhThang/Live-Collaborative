import { useState, useEffect, useRef, useCallback } from "react";
import type { ConnectionState } from "@/types";

const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const WS_URL = `${wsProtocol}//${window.location.host}/ws`;

export function useWebsocket() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const socketRef = useRef<WebSocket | null>(null);

  const send = useCallback((data: unknown) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => setConnectionState("connected");
    socket.onclose = () => setConnectionState("disconnected");

    return () => {
      socket.close();
    };
  }, []);

  return {
    socketRef,
    connectionState,
    isConnected: connectionState === "connected",
    send,
  };
}
