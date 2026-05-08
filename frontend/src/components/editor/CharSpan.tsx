import { motion } from "framer-motion";
import type { Char } from "@/types";

const transition = {
  duration: 0.05,
  ease: [0.16, 1, 0.3, 1],
} as const;

interface CharSpanProps {
  char: Char;
  index: number;
}

export function CharSpan({ char }: CharSpanProps) {
  return (
    <motion.span
      key={`${char.id.userId}-${char.id.counter}`}
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.05 } }}
      transition={transition}
      className="inline-block select-none"
    >
      {char.value === " " ? "\u00A0" : char.value}
    </motion.span>
  );
}
