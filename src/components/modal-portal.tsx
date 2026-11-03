"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renderiza el overlay en document.body para que `fixed` use el viewport.
 * Evita que ancestrales con transform/animación (p. ej. animate-aurix-fade)
 * encierren el modal y generen un scroll interminable.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
