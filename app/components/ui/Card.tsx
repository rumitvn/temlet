import React from "react";
import { cn } from "@/app/lib/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
  as?: React.ElementType;
}

export function Card({
  raised = false,
  as: Tag = "div",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-lg border border-border",
        raised
          ? "bg-surface-raised shadow-raised"
          : "bg-surface shadow-card",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
