import { useRef, useEffect, useCallback } from "react";
import type { EditorEvent } from "@/types";
import { useWebsocket } from "@/hooks/use-websocket";
import { useDocument } from "@/hooks/use-document";
import { useEditor } from "@/hooks/use-editor";
import { useCursorPresence } from "@/hooks/use-cursor-presence";
import { Header } from "@/components/header/Header";
import { Editor } from "@/components/editor/Editor";
import { Footer } from "@/components/footer/Footer";

function App() {
  const { socketRef, connectionState } = useWebsocket();

  const { document, handleIncoming, makeInsertChar, makeRemovePayload, userId } =
    useDocument();

  const onMessageRef = useRef<(e: EditorEvent) => void>(undefined);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as EditorEvent;
        onMessageRef.current?.(event);
      } catch {
        // ignore parse errors
      }
    };
    socket.onerror = () => {};
  });

  const sendEvent = useCallback(
    (event: EditorEvent) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(event));
      }
    },
    [socketRef],
  );

  const insert = useCallback(
    (value: string, index: number) => {
      const newChar = makeInsertChar(value, index);
      sendEvent({ type: "INSERT", data: newChar, clock: newChar.clock });
    },
    [makeInsertChar, sendEvent],
  );

  const remove = useCallback(
    (index: number) => {
      const payload = makeRemovePayload(index);
      if (payload) {
        sendEvent({ type: "DELETE", data: payload });
      }
    },
    [makeRemovePayload, sendEvent],
  );

  const {
    textareaRef,
    cursorPosition,
    clampedCursor,
    docText,
    handleInput,
    handleSelect,
    handleClick,
  } = useEditor(document);

  const { remotePresences, processPresenceEvent } = useCursorPresence(
    userId,
    cursorPosition,
    sendEvent,
  );

  const wrappedHandleIncoming = useCallback(
    (event: EditorEvent) => {
      handleIncoming(event);
      processPresenceEvent(event);
    },
    [handleIncoming, processPresenceEvent],
  );

  useEffect(() => {
    onMessageRef.current = wrappedHandleIncoming;
  });

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] flex flex-col items-center justify-start p-6 md:p-20 font-sans selection:bg-[#E5E7EB] selection:text-black">
      <Header connectionState={connectionState} remoteCount={remotePresences.length} />

      <Editor
        document={document}
        clampedCursor={clampedCursor}
        textareaRef={textareaRef}
        docText={docText}
        remotePresences={remotePresences}
        onInput={(e) => handleInput(e, insert, remove)}
        onSelect={handleSelect}
        onClick={handleClick}
      />

      <Footer document={document} connectionState={connectionState} />
    </div>
  );
}

export default App;
