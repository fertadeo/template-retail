export type StoreCollection = {
  id: string;
  title: string;
  imageUrl: string;
  focalX: number;
  focalY: number;
  count: number;
};
export type CollectionMeta = {
  id: string;
  title: string;
  imageUrl: string | null;
  focalX: number;
  focalY: number;
  position: number;
  revision: number;
  publishedRevision: number | null;
  publishedTitle: string | null;
  active: boolean;
  productCount: number;
  hasUnpublishedChanges: boolean;
};
export type CollectionDetail = CollectionMeta & { productIds: string[] };
export type CollectionInput = {
  title: string;
  focalX: number;
  focalY: number;
  position: number;
  productIds: string[];
  imageDataUrl?: string | null;
  baseRevision: number;
  action: "draft" | "publish";
};
export type PickerProduct = {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  stock: number;
  available: boolean;
  imageUrl: string | null;
};
export type PickerPage = {
  items: PickerProduct[];
  page: number;
  hasMore: boolean;
};
export async function prepareCollectionImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Elegí una portada JPG, PNG o WebP.");
  if (file.size > 8 * 1024 * 1024)
    throw new Error("La portada debe pesar menos de 8 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(
      1,
      1600 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No pudimos preparar la portada.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL("image/webp", 0.82);
    if (result.length > 700000)
      throw new Error(
        "La portada tiene demasiado detalle. Probá con una imagen más liviana.",
      );
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}
