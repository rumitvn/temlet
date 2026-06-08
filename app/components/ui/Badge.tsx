import React from "react";
import { cn } from "@/app/lib/cn";
import {
  SemanticTone,
  TONE_CLASS,
  toneForStatus,
} from "@/app/theme/status";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** A pipeline/job status key — resolved to a tone via the central status map. */
  status?: string;
  /** Explicit tone override (used when there is no status string). */
  tone?: SemanticTone;
}

export function Badge({
  status,
  tone,
  className,
  children,
  ...props
}: BadgeProps) {
  const resolvedTone: SemanticTone =
    tone ?? (status ? toneForStatus(status) : "neutral");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium",
        TONE_CLASS[resolvedTone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
