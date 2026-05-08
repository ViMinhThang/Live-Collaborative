import { useRef, useState, useCallback, useEffect } from "react";
import type { Char } from "@/types";

export function useEditor(document: Char[]) {
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const syncingRef = useRef(false);
  const docTextRef = useRef("");

  const docText = document.map((c) => c.value).join("");
  const clampedCursor = Math.min(cursorPosition, document.length);

  const focusTextarea = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorPosition(e.currentTarget.selectionStart);
  }, []);

  const handleInput = useCallback(
    (
      e: React.FormEvent<HTMLTextAreaElement>,
      insertFn: (value: string, index: number) => void,
      removeFn: (index: number) => void,
    ) => {
      if (syncingRef.current) return;
      const ta = e.currentTarget;
      const newVal = ta.value;
      const oldVal = docTextRef.current;
      const selStart = ta.selectionStart;

      if (newVal === oldVal) return;

      let prefix = 0;
      while (prefix < oldVal.length && prefix < newVal.length && oldVal[prefix] === newVal[prefix]) {
        prefix++;
      }
      let suffixOld = oldVal.length - 1;
      let suffixNew = newVal.length - 1;
      while (suffixOld >= prefix && suffixNew >= prefix && oldVal[suffixOld] === newVal[suffixNew]) {
        suffixOld--;
        suffixNew--;
      }

      const removeStart = prefix;
      const removeCount = suffixOld - prefix + 1;
      for (let i = removeCount - 1; i >= 0; i--) {
        removeFn(removeStart + i);
      }

      const insertStr = newVal.slice(prefix, suffixNew + 1);
      for (let i = 0; i < insertStr.length; i++) {
        insertFn(insertStr[i], prefix + i);
      }

      setCursorPosition(selStart);
    },
    [],
  );

  useEffect(() => {
    docTextRef.current = docText;
  }, [docText]);

  useEffect(() => {
    if (syncingRef.current) return;
    const ta = textareaRef.current;
    if (!ta) return;

    if (ta.value !== docText) {
      syncingRef.current = true;
      ta.value = docText;
      const clamped = Math.min(cursorPosition, docText.length);
      ta.selectionStart = ta.selectionEnd = clamped;
      syncingRef.current = false;
    }
  }, [docText, cursorPosition]);

  return {
    textareaRef,
    cursorPosition,
    clampedCursor,
    docText,
    handleInput,
    handleSelect,
    handleClick: focusTextarea,
  };
}
