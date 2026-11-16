"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

type InputProps = ComponentProps<"input">;

function numericDisplay(value: InputProps["value"]): string {
  if (value === undefined || value === null) return "";
  const text = String(value);
  return text.trim() !== "" && Number(text) === 0 ? "" : text;
}

const inputClass = "flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-teal/35";

/** A local editing draft preserves decimals and deletion even with numeric parent state. */
function NumericInput({
  className,
  value,
  defaultValue,
  placeholder = "0",
  onFocus,
  onBlur,
  onChange,
  ...props
}: InputProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => numericDisplay(value ?? defaultValue));
  const controlled = value !== undefined;

  return (
    <input
      {...props}
      type="number"
      className={cn(inputClass, className)}
      placeholder={placeholder}
      value={editing || !controlled ? draft : numericDisplay(value)}
      onFocus={event => {
        setDraft(event.currentTarget.value);
        setEditing(true);
        onFocus?.(event);
      }}
      onChange={event => {
        setDraft(event.currentTarget.value);
        onChange?.(event);
      }}
      onBlur={event => {
        setDraft(numericDisplay(event.currentTarget.value));
        setEditing(false);
        onBlur?.(event);
      }}
    />
  );
}

export function Input({ className, ...props }: InputProps) {
  if (props.type === "number") return <NumericInput className={className} {...props} />;
  return <input className={cn(inputClass, className)} {...props} />;
}
