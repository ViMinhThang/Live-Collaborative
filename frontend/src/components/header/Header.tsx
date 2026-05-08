import { motion } from "framer-motion";
import { Feather, Minimize2 } from "lucide-react";
import type { ConnectionState } from "@/types";

interface HeaderProps {
  connectionState: ConnectionState;
  remoteCount: number;
}

export function Header({ connectionState, remoteCount }: HeaderProps) {
  const isConnected = connectionState === "connected";

  return (
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
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-black/30">
            Collaborative Editor
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {remoteCount > 0 && (
          <span className="text-[10px] font-bold tracking-widest uppercase opacity-30">
            {remoteCount} online
          </span>
        )}
        <div className="flex items-center gap-2 group cursor-help">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? "bg-emerald-500" : "bg-red-500"
            } animate-pulse`}
          />
          <span className="text-[10px] font-bold tracking-widest uppercase opacity-30 group-hover:opacity-100 transition-opacity">
            {isConnected ? "Live" : "Offline"}
          </span>
        </div>
        <Minimize2 className="w-4 h-4 text-black/20 hover:text-black transition-colors cursor-pointer" />
      </div>
    </motion.header>
  );
}
