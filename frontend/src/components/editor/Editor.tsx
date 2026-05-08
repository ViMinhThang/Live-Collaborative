import { Fragment } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Char, Presence } from "@/types";
import { Cursor } from "./Cursor";
import { CharSpan } from "./CharSpan";
import { Placeholder } from "./Placeholder";

interface EditorProps {
  document: Char[];
  clampedCursor: number;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  docText: string;
  remotePresences: Presence[];
  onInput: (e: React.FormEvent<HTMLTextAreaElement>) => void;
  onSelect: (e: React.SyntheticEvent<HTMLTextAreaElement>) => void;
  onClick: () => void;
}

function RemoteCursor({ presence }: { presence: Presence }) {
  return (
    <span
      className="relative inline-block"
      style={{ position: "relative" }}
    >
      <span
        className="absolute bottom-full left-0 mb-1 px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap pointer-events-none z-30"
        style={{ backgroundColor: presence.color, color: "#fff" }}
      >
        {presence.displayName}
      </span>
      <span
        className="inline-block w-[2px] h-8 align-middle -mt-1"
        style={{ backgroundColor: presence.color }}
      />
    </span>
  );
}

export function Editor({
  document,
  clampedCursor,
  textareaRef,
  docText,
  remotePresences,
  onInput,
  onSelect,
  onClick,
}: EditorProps) {
  const othersEditing = remotePresences.length > 0;

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, delay: 0.2 }}
      className="w-full max-w-[65ch] z-10 p-12 bg-white rounded-[2rem] shadow-[0_1px_2px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.03)] border border-black/[0.03]"
    >
      {othersEditing && (
        <div className="flex items-center gap-2 mb-4 text-xs text-black/40">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {remotePresences.map((p) => (
            <span
              key={p.userId}
              className="font-medium"
              style={{ color: p.color }}
            >
              {p.displayName}
            </span>
          ))}
          <span>editing</span>
        </div>
      )}

      <div className="relative min-h-[500px]">
        <textarea
          ref={textareaRef}
          defaultValue={docText}
          onInput={onInput}
          onSelect={onSelect}
          onClick={onClick}
          autoFocus
          className="absolute inset-0 w-full h-full resize-none bg-transparent text-transparent caret-transparent outline-none z-20 cursor-text"
          aria-label="Collaborative editor"
        />

        <div className="relative min-h-[500px] pointer-events-none">
          <div className="w-full text-editorial text-2xl md:text-3xl font-medium tracking-tight whitespace-pre-wrap break-all pr-4 flex flex-wrap items-baseline">
            <AnimatePresence initial={false}>
              {document.map((char, index) => {
                const isCursorHere = clampedCursor === index;
                const hasRemoteCursor = remotePresences.some(
                  (p) => p.cursorPos === index,
                );
                const remoteCursor = remotePresences.find(
                  (p) => p.cursorPos === index,
                );

                return (
                  <Fragment key={`${char.id.userId}-${char.id.counter}-container`}>
                    {isCursorHere && <Cursor />}
                    {hasRemoteCursor && remoteCursor && (
                      <RemoteCursor presence={remoteCursor} />
                    )}
                    <CharSpan char={char} index={index} />
                  </Fragment>
                );
              })}
              {clampedCursor === document.length && <Cursor />}
              {remotePresences
                .filter((p) => p.cursorPos >= document.length)
                .map((p) => (
                  <RemoteCursor key={`end-${p.userId}`} presence={p} />
                ))}
            </AnimatePresence>
          </div>

          {document.length === 0 && <Placeholder />}
        </div>
      </div>
    </motion.main>
  );
}
