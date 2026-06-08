"use client";

import React from "react";
import { cn } from "@/app/lib/cn";

export type IconButtonVariant = "secondary" | "ghost" | "danger";
export type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

const VARIANT_CLASS: Record<IconButtonVariant, string> = {
  secondary:
    "bg-surface-raised text-text border border-border hover:border-border-strong",
  ghost: "text-text-muted hover:text-text hover:bg-surface-raised",
  danger: "text-danger hover:bg-danger-bg",
};

const SIZE_CLASS: Record<IconButtonSize, string> = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { variant = "ghost", size = "md", className, children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          "disabled:cursor-not-allowed disabled:opacity-50",
          VARIANT_CLASS[variant],
          SIZE_CLASS[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
