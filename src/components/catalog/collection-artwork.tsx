import { CatalogImage } from "@/components/catalog/catalog-image";
export function CollectionArtwork({
  title,
  imageUrl,
  focalX,
  focalY,
  ratio = "responsive",
  eager = false,
}: {
  title: string;
  imageUrl: string | null;
  focalX: number;
  focalY: number;
  ratio?: "responsive" | "mobile" | "desktop";
  eager?: boolean;
}) {
  const publicImage = imageUrl?.includes("/api/catalog/public/collections/");
  return (
    <div
      className={`relative isolate overflow-hidden bg-[#e5e7df] ${ratio === "mobile" ? "aspect-[4/5]" : ratio === "desktop" ? "aspect-[4/3]" : "aspect-[4/5] sm:aspect-[4/3]"}`}
    >
      <CatalogImage
        src={imageUrl}
        alt={title ? `Colección ${title}` : "Portada de la colección"}
        position={`${focalX}% ${focalY}%`}
        eager={eager}
        smallSrc={publicImage ? `${imageUrl}&small=1` : undefined}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent"
      />
      <span className="absolute inset-x-3 bottom-4 break-words text-left text-sm font-semibold uppercase tracking-[.14em] text-white sm:inset-x-5 sm:bottom-5 sm:text-xl">
        {title || "Sin título"}
      </span>
    </div>
  );
}
