import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingDialogProps {
  isOpen: boolean;
  message: string;
}

export default function LoadingDialog({ isOpen, message }: LoadingDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-800 rounded-lg p-6 flex flex-col items-center gap-4"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            <p className="text-white">{message}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 