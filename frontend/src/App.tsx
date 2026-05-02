import { useEditor } from '@/hooks/use-editor';
import { useRef, useState, useEffect, Fragment, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Feather, Hash, Activity, Globe, Minimize2 } from 'lucide-react';
import type { Char } from '@/lib/crdt';

const editorTransition = { duration: 0.05, ease: [0.16, 1, 0.3, 1] };

const Cursor = () => (
  <motion.div
    key="editor-cursor"
    layout="position"
    animate={{ opacity: [1, 0] }}
    transition={{ 
      opacity: { repeat: Infinity, duration: 0.8, ease: "linear" },
      layout: editorTransition
    }}
    className="inline-block w-[2px] h-8 bg-black align-middle -mt-1"
  />
);

function App() {
  const { document: doc, insert, remove, isConnected } = useEditor();
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const syncingRef = useRef(false);

  const docTextRef = useRef('');
  const docText = doc.map(c => c.value).join('');
  const clampedCursor = Math.min(cursorPosition, doc.length);

  const focusTextarea = useCallback((e?: React.MouseEvent) => {
    textareaRef.current?.focus();
    if (e && e.target === e.currentTarget) {
      setCursorPosition(doc.length);
    }
  }, [doc.length]);

  const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorPosition(e.currentTarget.selectionStart);
  }, []);

  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
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
      remove(removeStart + i);
    }

    const insertStr = newVal.slice(prefix, suffixNew + 1);
    for (let i = 0; i < insertStr.length; i++) {
      insert(insertStr[i], prefix + i);
    }

    setCursorPosition(selStart);
  }, [insert, remove]);

  useEffect(() => {
    docTextRef.current = docText;
    if (!syncingRef.current && textareaRef.current) {
      const ta = textareaRef.current;
      if (ta.value !== docText) {
        syncingRef.current = true;
        ta.value = docText;
        const clamped = Math.min(cursorPosition, docText.length);
        ta.selectionStart = ta.selectionEnd = clamped;
        syncingRef.current = false;
      }
    }
  }, [docText, cursorPosition]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] flex flex-col items-center justify-start p-6 md:p-20 font-sans selection:bg-[#E5E7EB] selection:text-black">
      
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl flex items-center justify-between mb-24 border-b border-black/5 pb-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 flex items-center justify-center border border-black/10 rounded-full">
            <Feather className="w-4 h-4 text-black/40" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-semibold tracking-tight">LiveSync</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-black/30">Editorial Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 group cursor-help">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-black' : 'bg-red-500'} animate-pulse`} />
            <span className="text-[10px] font-bold tracking-widest uppercase opacity-30 group-hover:opacity-100 transition-opacity">
              {isConnected ? 'Synced' : 'Offline'}
            </span>
          </div>
          <Minimize2 className="w-4 h-4 text-black/20 hover:text-black transition-colors cursor-pointer" />
        </div>
      </motion.header>

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.2 }}
        className="w-full max-w-[65ch] z-10 p-12 bg-white rounded-[2rem] shadow-[0_1px_2px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.03)] border border-black/[0.03]"
      >
        <div className="relative min-h-[500px]">
          <textarea
            ref={textareaRef}
            defaultValue={docText}
            onInput={handleInput}
            onSelect={handleSelect}
            onClick={focusTextarea}
            autoFocus
            className="absolute inset-0 w-full h-full resize-none bg-transparent text-transparent caret-transparent outline-none z-20 cursor-text"
            aria-label="Collaborative editor"
            spellCheck
          />

          <div 
            className="relative min-h-[500px] pointer-events-none"
          >
            <div className="w-full text-editorial text-2xl md:text-3xl font-medium tracking-tight whitespace-pre-wrap break-all pr-4 flex flex-wrap items-baseline">
              <AnimatePresence initial={false}>
                {doc.map((char: Char, index: number) => {
                  const isCursorHere = clampedCursor === index;
                  return (
                    <Fragment key={`${char.id.userId}-${char.id.counter}-container`}>
                      {isCursorHere && <Cursor />}
                      <motion.span
                        key={`${char.id.userId}-${char.id.counter}`}
                        layout="position"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.05 } }}
                        transition={editorTransition}
                        className="inline-block select-none"
                      >
                        {char.value === ' ' ? '\u00A0' : char.value}
                      </motion.span>
                    </Fragment>
                  );
                })}
                {clampedCursor === doc.length && <Cursor />}
              </AnimatePresence>
            </div>

            {doc.length === 0 && (
              <div className="absolute top-0 left-0 opacity-10 font-serif italic text-2xl pointer-events-none select-none text-black/40">
                Start your narrative...
              </div>
            )}
          </div>
        </div>
      </motion.main>

      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-auto w-full max-w-2xl pt-12 border-t border-black/5 flex items-center justify-between text-black/20 text-[10px] font-bold tracking-[0.2em] uppercase"
      >
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Hash className="w-3 h-3" />
              <span>Words: {Math.max(0, doc.filter((c: Char) => c.value === ' ').length + (doc.length > 0 ? 1 : 0))}</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-emerald-600" />
              <span>A+ Sync Reliability</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Globe className="w-3 h-3" />
              <span>End-to-End Encryption</span>
            </div>
          </div>
          <p className="normal-case tracking-normal font-medium text-black/40 mt-2">
            Built for those who believe every word deserves a perfect space. Verified for Editorial Excellence 2026.
          </p>
        </div>
        
        <div className="flex items-center gap-2 group cursor-help transition-colors hover:text-black/60">
          <Globe className="w-3 h-3" />
          <span>Global Node 01</span>
        </div>
      </motion.footer>
    </div>
  );
}

export default App;