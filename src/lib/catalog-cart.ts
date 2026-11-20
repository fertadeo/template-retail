import type { CatalogCartLine, CatalogProduct } from "@/lib/catalog";
export const MAX_CART_LINES = 30;
export const cartStorageKey = (id: string) => `aurix.catalog.cart.v1:${id}`;
export const checkoutStorageKey = (id: string) =>
  `aurix.catalog.checkout.v1:${id}`;
export function readCatalogCart(id: string): CatalogCartLine[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(cartStorageKey(id)) || "[]",
    );
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value
      .filter((item): item is CatalogCartLine => {
        if (!item || typeof item !== "object") return false;
        const p = item as CatalogCartLine;
        if (
          typeof p.productId !== "string" ||
          !p.productId.length ||
          p.productId.length > 40 ||
          seen.has(p.productId) ||
          typeof p.name !== "string" ||
          p.name.length > 200 ||
          typeof p.sku !== "string" ||
          !Number.isFinite(p.unitPrice) ||
          p.unitPrice <= 0 ||
          !Number.isInteger(p.quantity) ||
          p.quantity < 1 ||
          p.quantity > 99 ||
          !Number.isFinite(p.stock) ||
          p.stock < 0
        )
          return false;
        seen.add(p.productId);
        return true;
      })
      .slice(0, MAX_CART_LINES);
  } catch {
    return [];
  }
}
export function saveCatalogCart(id: string, lines: CatalogCartLine[]) {
  try {
    localStorage.setItem(
      cartStorageKey(id),
      JSON.stringify(
        lines.map((line) => ({
          ...line,
          // Never duplicate an embedded image inside persistent cart data.
          imageUrl: line.imageUrl?.startsWith("data:") ? null : line.imageUrl,
        })),
      ),
    );
  } catch {
    /* Storage may be disabled; the current in-memory cart remains usable. */
  }
}
export function cartLine(
  product: CatalogProduct,
  quantity = 1,
): CatalogCartLine {
  return {
    productId: product.id,
    name: product.name,
    sku: product.sku,
    quantity,
    unitPrice: product.unitPrice,
    stock: product.stock,
    imageUrl: product.imageUrl,
  };
}
export async function checkoutKey(id: string, payload: unknown) {
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  let fingerprint: string;
  if (crypto.subtle)
    fingerprint = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", encoded)),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
  else {
    // Compatibility for local HTTP previews. This fingerprint is not an auth token;
    // the API independently verifies the full payload with SHA-256.
    let a = 2166136261,
      b = 2246822519;
    for (const byte of encoded) {
      a = Math.imul(a ^ byte, 16777619);
      b = Math.imul(b ^ byte, 3266489917);
    }
    fingerprint = `${a >>> 0}:${b >>> 0}`;
  }
  try {
    const saved = JSON.parse(
      localStorage.getItem(checkoutStorageKey(id)) || "null",
    );
    if (
      saved?.fingerprint === fingerprint &&
      Date.now() - saved.createdAt >= 0 &&
      Date.now() - saved.createdAt < 24 * 60 * 60_000 &&
      typeof saved.key === "string" &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
        saved.key,
      )
    )
      return saved.key as string;
  } catch {
    /* Start a new intent when storage is unavailable or expired. */
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const key = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  try {
    localStorage.setItem(
      checkoutStorageKey(id),
      JSON.stringify({ key, fingerprint, createdAt: Date.now() }),
    );
  } catch {
    /* The dialog still keeps this key for immediate retries. */
  }
  return key;
}
export function finishCheckout(id: string) {
  try {
    localStorage.removeItem(checkoutStorageKey(id));
  } catch {
    /* Storage is optional. */
  }
}
