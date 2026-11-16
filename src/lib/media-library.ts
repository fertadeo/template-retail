export type MediaKind = "image" | "attachment";

export type MediaSourceType =
  | "product_image"
  | "product_attachment"
  | "library";

export type MediaLibraryItem = {
  id: string;
  kind: MediaKind;
  source: MediaSourceType;
  sourceLabel: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  dataUrl: string | null;
  thumbnailUrl?: string | null;
  uploadedAt: string;
  title: string;
  subtitle: string;
  entityHref: string;
  productId?: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
};

export type MediaLibraryCounts = {
  images: number;
  attachments: number;
  total: number;
  totalSizeBytes: number;
  unknownSizeCount: number;
};

export type MediaLibraryResponse = {
  items: MediaLibraryItem[];
  counts: MediaLibraryCounts;
};

export function formatBytes(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unit = Math.min(Math.floor(Math.log(sizeBytes) / Math.log(1024)), units.length - 1);
  const amount = new Intl.NumberFormat("es", { maximumFractionDigits: unit > 0 ? 1 : 0 }).format(sizeBytes / 1024 ** unit);
  return `${amount} ${units[unit]}`;
}

export function fileToMediaPayload(file: File): Promise<{
  filename: string;
  mime: string;
  sizeBytes: number;
  dataUrl: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      resolve({
        filename: file.name,
        mime: file.type || "application/octet-stream",
        sizeBytes: file.size,
        dataUrl: String(reader.result || ""),
      });
    };
    reader.readAsDataURL(file);
  });
}
