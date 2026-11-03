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
};

export type MediaLibraryResponse = {
  items: MediaLibraryItem[];
  counts: MediaLibraryCounts;
};

export function formatBytes(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "0 KB";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(0)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
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
