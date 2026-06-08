"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { cn } from "@/app/lib/cn";
import { IconButton } from "./IconButton";

export type DialogSize = "sm" | "md" | "lg" | "xl" | "3xl";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  size?: DialogSize;
  showClose?: boolean;
  /** Disable backdrop-click + Esc close (e.g. while an action is in flight). */
  dismissible?: boolean;
  className?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const SIZE_CLASS: Record<DialogSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "3xl": "max-w-6xl",
};

export function Dialog({
  isOpen,
  onClose,
  title,
  size = "md",
  showClose = true,
  dismissible = true,
  className,
  footer,
  children,
}: DialogProps) {
  // Esc-to-close + scroll lock while open.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, dismissible, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (dismissible && e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            role="dialog"
            aria-modal="true"
            className={cn(
              "max-h-[90vh] w-full overflow-y-auto rounded-xl border border-border bg-surface p-6 text-text shadow-overlay",
              SIZE_CLASS[size],
              className,
            )}
          >
            {(title || showClose) && (
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-text">{title}</h2>
                {showClose && (
                  <IconButton
                    aria-label="Close dialog"
                    variant="ghost"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </IconButton>
                )}
              </div>
            )}
            {children}
            {footer && (
              <div className="mt-6 flex justify-end gap-3">{footer}</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
