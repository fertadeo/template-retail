"use client";

import { useState } from "react";
import { Package } from "lucide-react";
export function CatalogImage({
  src,
  alt,
  contain = false,
  eager = false,
  position,
  smallSrc,
  natural = false,
}: {
  src: string | null;
  alt: string;
  contain?: boolean;
  eager?: boolean;
  position?: string;
  smallSrc?: string;
  natural?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src)
    return (
      <span
        className={`flex ${natural ? "aspect-square w-full" : "size-full"} flex-col items-center justify-center gap-2 text-[#a5b096]`}
        role="img"
        aria-label={`${alt || "Producto"}, sin foto disponible`}
      >
        <Package className="size-9" strokeWidth={1.2} />
      </span>
    );
  // Public URLs are scoped by the API; native images retain lazy loading and cookies are not needed.
  return (
    <picture className={natural ? "block w-full" : "block size-full"}>
      {smallSrc ? (
        <source media="(max-width: 639px)" srcSet={smallSrc} />
      ) : null}
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={position ? { objectPosition: position } : undefined}
        onError={() => setFailed(src)}
        className={`${natural ? "block h-auto w-full" : "size-full"} ${contain ? "object-contain" : "object-cover"}`}
      />
    </picture>
  );
}
