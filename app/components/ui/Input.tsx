import React from "react";
import { cn } from "@/app/lib/cn";

const FIELD_BASE =
  "w-full rounded-md border bg-surface-sunken px-3 py-2 text-text placeholder:text-text-faint transition-colors focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent-ring disabled:cursor-not-allowed disabled:opacity-50";

function fieldClass(error: boolean | undefined, className?: string): string {
  return cn(FIELD_BASE, error ? "border-danger" : "border-border", className);
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ error, className, ...props }, ref) {
    return (
      <input ref={ref} className={fieldClass(error, className)} {...props} />
    );
  },
);

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ error, className, ...props }, ref) {
    return (
      <textarea ref={ref} className={fieldClass(error, className)} {...props} />
    );
  },
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ error, className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(fieldClass(error), "pr-8", className)}
        {...props}
      >
        {children}
      </select>
    );
  },
);
