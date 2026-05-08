import { motion } from "framer-motion";

const transition = {
  opacity: { repeat: Infinity, duration: 0.8, ease: "linear" },
  layout: { duration: 0.05, ease: [0.16, 1, 0.3, 1] },
} as const;

export function Cursor() {
  return (
    <motion.div
      key="editor-cursor"
      layout="position"
      animate={{ opacity: [1, 0] }}
      transition={transition}
      className="inline-block w-[2px] h-8 bg-black align-middle -mt-1"
    />
  );
}
