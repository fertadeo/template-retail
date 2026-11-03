import { cn } from "@/lib/utils";
import {
  healthDotClass,
  type ProductHealth,
  type ProductHealthLevel,
} from "@/lib/product-health";

/** Punto + label estilo Vercel Ready. */
export function StatusDot({
  level,
  label,
  detail,
  className,
}: {
  level: ProductHealthLevel;
  label: string;
  detail?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-foreground",
        className
      )}
      title={detail}
    >
      <span
        className={cn("size-2 shrink-0 rounded-full", healthDotClass(level))}
        aria-hidden
      />
      <span className="font-medium">{label}</span>
      {detail ? (
        <span className="hidden text-muted-foreground sm:inline">{detail}</span>
      ) : null}
    </span>
  );
}

export function ProductHealthDot({
  health,
  className,
}: {
  health: ProductHealth;
  className?: string;
}) {
  return (
    <StatusDot
      level={health.level}
      label={health.label}
      detail={health.level === "ready" ? undefined : health.detail}
      className={className}
    />
  );
}
