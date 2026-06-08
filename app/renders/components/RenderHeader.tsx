import { motion } from "framer-motion";
import {
  PlusIcon,
} from "@heroicons/react/24/outline";
import {
  DocumentTextIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";

interface RenderHeaderProps {
  onCreate: () => void;
}

export default function RenderHeader({ onCreate }: RenderHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-between items-center mb-8 h-24 sticky top-0 z-40 bg-bg/95 backdrop-blur"
      style={{ backdropFilter: "blur(8px)" }}
    >
      <div>
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="text-5xl font-bold text-accent"
        >
          Temlet
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center gap-2 mt-1"
        >
          <span className="text-text-muted">made by</span>
          <motion.span
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
            }}
            className="text-accent font-medium"
          >
            rumitx
          </motion.span>
        </motion.div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-surface-raised border border-border hover:border-border-strong text-text px-4 py-2 rounded-lg transition-colors"
          onClick={() => (window.location.href = "/assets")}
        >
          <DocumentTextIcon className="w-5 h-5" />
          <span>Assets</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-surface-raised border border-border hover:border-border-strong text-text px-4 py-2 rounded-lg transition-colors"
          onClick={() => (window.location.href = "/crawlers")}
        >
          <ArrowPathIcon className="w-5 h-5" />
          <span>Crawlers</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-accent-fg px-4 py-2 rounded-lg transition-colors"
          onClick={onCreate}
        >
          <PlusIcon className="w-5 h-5" />
          <span>New Render</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
