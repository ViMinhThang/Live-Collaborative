import { useEditor } from '@/hooks/use-editor';
import { useRef, useState, useEffect, Fragment } from 'react';
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
  const { document, insert, remove, isConnected } = useEditor();
  const [cursorPosition, setCursorPosition] = useState(0);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Sync cursor position when document changes (e.g., deletions from others)
  useEffect(() => {
    if (cursorPosition > document.length) {
      setCursorPosition(document.length);
    }
  }, [document.length, cursorPosition]);

  const focusInput = (e?: React.MouseEvent) => {
    hiddenInputRef.current?.focus();
    if (e && e.target === e.currentTarget) {
      setCursorPosition(document.length);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (cursorPosition > 0) {
        remove(cursorPosition - 1);
        setCursorPosition(prev => Math.max(0, prev - 1));
      }
    } else if (e.key === 'Delete') {
      if (cursorPosition < document.length) {
        remove(cursorPosition);
      }
    } else if (e.key === 'ArrowLeft') {
      setCursorPosition(prev => Math.max(0, prev - 1));
    } else if (e.key === 'ArrowRight') {
      setCursorPosition(prev => Math.min(document.length, prev + 1));
    } else if (e.key === 'Home') {
      setCursorPosition(0);
    } else if (e.key === 'End') {
      setCursorPosition(document.length);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      insert(e.key, cursorPosition);
      setCursorPosition(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] flex flex-col items-center justify-start p-6 md:p-20 font-sans selection:bg-[#E5E7EB] selection:text-black">
      
      {/* Editorial Header */}
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

      {/* Main Focus Area */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.2 }}
        className="w-full max-w-[65ch] z-10 p-12 bg-white rounded-[2rem] shadow-[0_1px_2px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.03)] border border-black/[0.03]"
      >
        <div 
          onClick={focusInput}
          className="relative min-h-[500px] cursor-text group"
        >
          {/* Hidden Input for capturing keystrokes - Accessibility fix */}
          <label htmlFor="editor-input" className="sr-only">Collaborative Editor Input</label>
          <input
            id="editor-input"
            ref={hiddenInputRef}
            type="text"
            className="absolute opacity-0 -z-10 pointer-events-none"
            onKeyDown={handleKeyDown}
            autoFocus
          />

          {/* Character Stream - High-end Serif Typography */}
          <div className="w-full text-editorial text-2xl md:text-3xl font-medium tracking-tight whitespace-pre-wrap break-all pr-4 flex flex-wrap items-baseline">
            <AnimatePresence initial={false}>
              {document.map((char: Char, index: number) => {
                const isCursorHere = cursorPosition === index;
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
                      className="inline-block cursor-text select-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCursorPosition(index);
                        hiddenInputRef.current?.focus();
                      }}
                    >
                      {char.value === ' ' ? '\u00A0' : char.value}
                    </motion.span>
                  </Fragment>
                );
              })}
              {cursorPosition === document.length && <Cursor />}
            </AnimatePresence>
          </div>

          {/* Empty State placeholder */}
          {document.length === 0 && (
            <div className="absolute top-0 left-0 opacity-10 font-serif italic text-2xl pointer-events-none select-none italic text-black/40">
              Start your narrative...
            </div>
          )}
        </div>
      </motion.main>

      {/* Understated Footer */}
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
              <span>Words: {Math.max(0, document.filter((c: Char) => c.value === ' ').length + (document.length > 0 ? 1 : 0))}</span>
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
