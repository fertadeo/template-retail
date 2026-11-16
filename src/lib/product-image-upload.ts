import { fileToMediaPayload } from "@/lib/media-library";

export const MAX_PRODUCT_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 650 * 1024;

/** Keep base64 JSON below the API's 1 MiB request limit. */
export async function prepareProductImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error(`${file.name}: usá una imagen JPG, PNG o WebP.`);
  }
  if (file.size > MAX_PRODUCT_IMAGE_BYTES)
    throw new Error(`${file.name}: el máximo por imagen es 8 MB.`);
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la imagen.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.5]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      if (blob && blob.size <= MAX_UPLOAD_BYTES) {
        return fileToMediaPayload(
          new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {
            type: "image/webp",
          }),
        );
      }
    }
    throw new Error(
      `${file.name}: no se pudo optimizar. Probá una imagen más pequeña.`,
    );
  } finally {
    bitmap.close();
  }
}
