import { productImageSrc, type Product } from "@/lib/types";

/** Semáforo de salubridad del producto (estilo Vercel Ready). */
export type ProductHealthLevel = "ready" | "attention" | "critical";

export type ProductHealth = {
  level: ProductHealthLevel;
  label: string;
  /** Motivo corto para la fila (uno). */
  detail: string;
  /** Todos los hallazgos. */
  issues: string[];
};

const LEVEL_META: Record<
  ProductHealthLevel,
  { label: string; priority: number }
> = {
  ready: { label: "Listo", priority: 0 },
  attention: { label: "Atención", priority: 1 },
  critical: { label: "Crítico", priority: 2 },
};

export function productHealth(p: Product): ProductHealth {
  const critical: string[] = [];
  const warnings: string[] = [];

  if (!p.sku?.trim()) critical.push("sin SKU");
  if (!p.nombre?.trim()) critical.push("sin nombre");
  if (!(p.precio > 0)) critical.push("sin precio");
  if (!productImageSrc(p.imagenPrincipal)) critical.push("sin foto");

  if (!p.descripcion?.trim()) warnings.push("sin descripción");
  if (p.stock <= 0) warnings.push("sin stock");
  if (!p.activo) warnings.push("inactivo");

  if (critical.length) {
    return {
      level: "critical",
      label: LEVEL_META.critical.label,
      detail: critical[0],
      issues: [...critical, ...warnings],
    };
  }
  if (warnings.length) {
    return {
      level: "attention",
      label: LEVEL_META.attention.label,
      detail: warnings[0],
      issues: warnings,
    };
  }
  return {
    level: "ready",
    label: LEVEL_META.ready.label,
    detail: "completo",
    issues: [],
  };
}

export const HEALTH_FILTERS: Array<{
  id: ProductHealthLevel | "all";
  label: string;
}> = [
  { id: "all", label: "Todos" },
  { id: "ready", label: "Listo" },
  { id: "attention", label: "Atención" },
  { id: "critical", label: "Crítico" },
];

export function healthDotClass(level: ProductHealthLevel): string {
  switch (level) {
    case "ready":
      return "bg-[#0f766e]";
    case "attention":
      return "bg-amber-500";
    case "critical":
      return "bg-destructive";
  }
}
