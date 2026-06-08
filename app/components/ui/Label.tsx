import React from "react";
import { cn } from "@/app/lib/cn";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label
      className={cn("block text-sm font-medium text-text-muted", className)}
      {...props}
    >
      {children}
    </label>
  );
}
