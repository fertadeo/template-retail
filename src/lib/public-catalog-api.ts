import { apiUrl, isApiMode } from "@/lib/api-config";
import { listProducts, getDefaultPriceListId } from "@/lib/memory-store";
import { productPrice, productImageSrc } from "@/lib/types";
import type {
  CatalogInfo,
  CatalogPage,
  CatalogProduct,
  CatalogFilters,
  CatalogCartInput,
  CatalogCartReview,
  CatalogCheckout,
  CatalogCheckoutResult,
  CatalogSettings,
} from "@/lib/catalog";

function publicMediaUrls(value: unknown, field = ""): unknown {
  if (
    ["imageUrl", "url", "thumbnailUrl"].includes(field) &&
    typeof value === "string" &&
    value.startsWith("/api/catalog/public/media/")
  ) {
    return new URL(value, window.location.origin).href;
  }
  if (Array.isArray(value)) return value.map((item) => publicMediaUrls(item));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        publicMediaUrls(item, key),
      ]),
    );
  return value;
}

export class PublicCatalogError extends Error {
  constructor(
    public status: number,
    message: string,
    public cart?: CatalogCartReview,
  ) {
    super(message);
  }
}
async function publicRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 15000);
  const signal = options?.signal;
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    const response = await fetch(apiUrl(`/catalog/public${path}`), {
      ...options,
      signal: controller.signal,
      credentials: "omit",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok)
      throw new PublicCatalogError(
        response.status,
        data?.error || "No pudimos conectar con el local. Intentá nuevamente.",
        data?.cart,
      );
    if (!data)
      throw new PublicCatalogError(
        0,
        "No pudimos leer la respuesta del local. Intentá nuevamente.",
      );
    return publicMediaUrls(data) as T;
  } catch (err) {
    if (signal?.aborted || err instanceof PublicCatalogError) throw err;
    throw new PublicCatalogError(
      0,
      timedOut
        ? "La conexión está tardando demasiado. Tu carrito sigue guardado; podés volver a intentar."
        : "No pudimos conectar con el local. Revisá tu conexión y volvé a intentar.",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}
export const DEMO_CATALOG_SETTINGS: CatalogSettings = {
  publicEnabled: true,
  whatsappPhone: "",
  displayName: "Nuestro local",
  welcomeText: "Elegí tus favoritos. Coordinamos tu pedido por WhatsApp.",
  currency: "ARS",
  orderTtlHours: 24,
};
export function demoCatalogSettings(): CatalogSettings {
  try {
    const saved = JSON.parse(
      localStorage.getItem("aurix.demo.catalog.settings") || "{}",
    );
    return {
      ...DEMO_CATALOG_SETTINGS,
      publicEnabled:
        typeof saved.publicEnabled === "boolean" ? saved.publicEnabled : true,
      whatsappPhone:
        typeof saved.whatsappPhone === "string"
          ? saved.whatsappPhone.slice(0, 40)
          : "",
      displayName:
        typeof saved.displayName === "string" && saved.displayName.trim()
          ? saved.displayName.slice(0, 100)
          : DEMO_CATALOG_SETTINGS.displayName,
      welcomeText:
        typeof saved.welcomeText === "string"
          ? saved.welcomeText.slice(0, 240)
          : DEMO_CATALOG_SETTINGS.welcomeText,
      currency: ["ARS", "MXN", "USD", "UYU"].includes(saved.currency)
        ? saved.currency
        : "ARS",
      orderTtlHours:
        Number.isInteger(saved.orderTtlHours) &&
        saved.orderTtlHours >= 1 &&
        saved.orderTtlHours <= 168
          ? saved.orderTtlHours
          : 24,
    };
  } catch {
    return { ...DEMO_CATALOG_SETTINGS };
  }
}
function demoProducts(): CatalogProduct[] {
  const settings = demoCatalogSettings();
  const listId = getDefaultPriceListId();
  return listProducts()
    .filter((p) => p.activo && p.stock > 0 && productPrice(p, listId) > 0)
    .map((p) => ({
      id: p.id,
      name: p.nombre,
      sku: p.sku,
      category: p.categoria,
      categoryName: p.categoriaNombre || p.categoria,
      description: p.descripcion,
      unitPrice: productPrice(p, listId),
      currency: settings.currency,
      stock: p.stock,
      imageUrl: productImageSrc(p.imagenPrincipal),
      images: [p.imagenPrincipal, ...(p.imagenesSecundarias ?? [])]
        .filter((p) => p && productImageSrc(p))
        .map((p) => ({ id: p!.id, url: productImageSrc(p)!, alt: p!.title })),
    }));
}
export const publicCatalogApi = {
  info: async (signal?: AbortSignal): Promise<CatalogInfo> => {
    if (isApiMode()) return publicRequest("", { signal });
    const settings = demoCatalogSettings();
    if (!settings.publicEnabled)
      throw new PublicCatalogError(
        404,
        "El catálogo no está disponible por el momento.",
      );
    const products = demoProducts();
    const cats = new Map<string, { id: string; name: string; count: number }>();
    for (const p of products) {
      const cat = cats.get(p.category) ?? {
        id: p.category,
        name: p.categoryName,
        count: 0,
      };
      cat.count++;
      cats.set(cat.id, cat);
    }
    return {
      id: "demo",
      demo: true,
      name: settings.displayName,
      welcomeText: settings.welcomeText,
      address: "",
      currency: settings.currency,
      whatsappConfigured: false,
      orderTtlHours: settings.orderTtlHours,
      total: products.length,
      categories: [...cats.values()],
      checkout: { channel: "whatsapp", onlinePayments: false },
    };
  },
  products: async (
    options: CatalogFilters,
    signal?: AbortSignal,
  ): Promise<CatalogPage> => {
    if (isApiMode())
      return publicRequest(
        `/products?${new URLSearchParams(Object.entries(options).map(([k, v]) => [k, String(v)]))}`,
        { signal },
      );
    const q = options.q.toLowerCase();
    const rows = demoProducts().filter(
      (p) =>
        (!options.category || options.category === p.category) &&
        (!q || `${p.name} ${p.sku}`.toLowerCase().includes(q)),
    );
    rows.sort(
      (a, b) =>
        Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)) ||
        (options.sort === "price_asc"
          ? a.unitPrice - b.unitPrice
          : options.sort === "price_desc"
            ? b.unitPrice - a.unitPrice
            : a.name.localeCompare(b.name, "es")),
    );
    const offset = (options.page - 1) * options.pageSize;
    return {
      items: rows.slice(offset, offset + options.pageSize),
      page: options.page,
      pageSize: options.pageSize,
      hasMore: rows.length > offset + options.pageSize,
    };
  },
  product: async (
    id: string,
    signal?: AbortSignal,
  ): Promise<CatalogProduct> => {
    if (isApiMode())
      return publicRequest(`/products/${encodeURIComponent(id)}`, { signal });
    const product = demoProducts().find((p) => p.id === id);
    if (!product)
      throw new PublicCatalogError(404, "Este producto ya no está disponible.");
    return product;
  },
  review: (input: CatalogCartInput) =>
    publicRequest<CatalogCartReview>("/cart", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  checkout: (input: CatalogCheckout) =>
    publicRequest<CatalogCheckoutResult>("/orders", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
