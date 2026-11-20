"use client";

import { useState } from "react";
import { Package } from "lucide-react";
export function CatalogImage({
  src,
  alt,
  contain = false,
  eager = false,
}: {
  src: string | null;
  alt: string;
  contain?: boolean;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src)
    return (
      <span
        className="flex size-full flex-col items-center justify-center gap-2 text-[#a5b096]"
        role="img"
        aria-label={`${alt || "Producto"}, sin foto disponible`}
      >
        <Package className="size-9" strokeWidth={1.2} />
      </span>
    );
  // Public URLs are scoped by the API; native images retain lazy loading and cookies are not needed.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(src)}
      className={`size-full ${contain ? "object-contain" : "object-cover"}`}
    />
  );
}
