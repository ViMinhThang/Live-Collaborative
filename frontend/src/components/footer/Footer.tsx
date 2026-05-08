import { motion } from "framer-motion";
import { Hash } from "lucide-react";
import type { Char, ConnectionState } from "@/types";

interface FooterProps {
  document: Char[];
  connectionState: ConnectionState;
}

export function Footer({ document, connectionState }: FooterProps) {
  const wordCount = document.length > 0
    ? document.filter((c) => c.value === " ").length + 1
    : 0;
  const charCount = document.length;

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="mt-auto w-full max-w-2xl pt-12 border-t border-black/5 flex items-center justify-between text-black/20 text-[10px] font-bold tracking-[0.2em] uppercase"
    >
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <Hash className="w-3 h-3" />
          <span>{wordCount} words</span>
        </div>
        <div className="flex items-center gap-2">
          <Hash className="w-3 h-3" />
          <span>{charCount} chars</span>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${connectionState === "connected" ? "bg-emerald-500" : "bg-red-500"}`} />
          <span>
            {connectionState === "connected"
              ? "Connected"
              : connectionState === "connecting"
                ? "Connecting..."
                : "Disconnected"}
          </span>
        </div>
      </div>

      <span className="text-black/40 font-medium normal-case tracking-normal">
        CRDT real-time sync
      </span>
    </motion.footer>
  );
}
