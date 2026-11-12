import { apiUrl } from "@/lib/api-config";
import { BRANCHES_ENABLED } from "@/lib/features";
import type {
  AppFunctionMeta,
  Branch,
  Channel,
  ChannelConfig,
  ChannelLink,
  Client,
  Comercio,
  DashboardStats,
  DiscountBasis,
  DiscountMode,
  DiscountRule,
  DiscountTier,
  Order,
  OrderLine,
  PaymentMethod,
  PriceList,
  Product,
  ProductCategory,
  Quote,
  QuoteStatus,
  StockMode,
  StockShareGroup,
  StockShareMode,
  UserAccount,
  UserRole,
  VendorSalesRow,
} from "@/lib/types";

export type QuotePayload = {
  clientId?: string | null;
  clienteNombre?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  priceListId?: string | null;
  discountRuleId?: string | null;
  discountMode?: DiscountMode;
  discountBasis?: DiscountBasis;
  tiers?: DiscountTier[];
  descuentoManualPct?: number;
  status?: QuoteStatus;
  validezDias?: number;
  notas?: string;
  lines: Array<{
    productId?: string | null;
    sku?: string;
    nombre?: string;
    cantidad: number;
    precioUnitario?: number;
    lineDescuentoPct?: number;
  }>;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function activeComercioHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const id = localStorage.getItem("retail360.comercioId");
  return id ? { "X-Comercio-Id": id } : {};
}

function activeScopeHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const out: Record<string, string> = {};
  if (BRANCHES_ENABLED) {
    const branch = localStorage.getItem("retail360.branchScope");
    if (branch) out["X-Branch-Id"] = branch;
  }
  const vendedor = localStorage.getItem("retail360.vendedorId");
  if (vendedor) out["X-Vendedor-Id"] = vendedor;
  return out;
}

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...activeComercioHeader(),
      ...activeScopeHeaders(),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = { error: friendlyHttpError(res.status, text) };
    }
  }
  if (!res.ok) {
    const raw =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Error HTTP ${res.status}`;
    const msg = looksLikeHtml(raw)
      ? friendlyHttpError(res.status, raw)
      : raw;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

function looksLikeHtml(value: string): boolean {
  const t = value.trim().toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html");
}

function friendlyHttpError(status: number, body: string): string {
  if (status === 502 || /502\s*bad\s*gateway/i.test(body)) {
    return "API caída (502). En el VPS: pm2 status / pm2 logs y reiniciá el servicio.";
  }
  if (status === 503 || /503\s*service/i.test(body)) {
    return "API no disponible (503). Revisá PM2 en el VPS.";
  }
  if (status === 504 || /504\s*gateway/i.test(body)) {
    return "Timeout hacia la API (504).";
  }
  if (looksLikeHtml(body)) {
    return `Error HTTP ${status} (respuesta no JSON del proxy).`;
  }
  const trimmed = body.trim();
  return trimmed ? trimmed.slice(0, 200) : `Error HTTP ${status}`;
}

export const api = {
  health: () =>
    request<{ ok: boolean; db: boolean }>("/health"),

  dashboardStats: (day?: string) =>
    request<DashboardStats>(
      day
        ? `/dashboard/stats?day=${encodeURIComponent(day)}`
        : "/dashboard/stats"
    ),

  salesByVendor: (opts?: {
    from?: string;
    to?: string;
    canal?: "pos" | "pedido" | "mayorista";
  }) => {
    const q = new URLSearchParams();
    if (opts?.from) q.set("from", opts.from);
    if (opts?.to) q.set("to", opts.to);
    if (opts?.canal) q.set("canal", opts.canal);
    const qs = q.toString();
    return request<VendorSalesRow[]>(
      qs ? `/reports/sales-by-vendor?${qs}` : "/reports/sales-by-vendor"
    );
  },

  listPriceLists: (onlyActive = false) =>
    request<PriceList[]>(
      onlyActive ? "/price-lists?active=1" : "/price-lists"
    ),

  createPriceList: (body: {
    nombre: string;
    codigo?: string;
    activa?: boolean;
    esDefault?: boolean;
  }) =>
    request<PriceList>("/price-lists", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updatePriceList: (
    id: string,
    body: Partial<{
      nombre: string;
      codigo: string;
      activa: boolean;
      esDefault: boolean;
    }>
  ) =>
    request<PriceList>(`/price-lists/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  setDefaultPriceList: (id: string) =>
    request<PriceList>(`/price-lists/${id}/set-default`, {
      method: "POST",
    }),

  listProducts: () => request<Product[]>("/products"),

  importProductFromUrl: (url: string) =>
    request<{
      draft: {
        nombre: string;
        sku: string;
        descripcion: string;
        precio: number;
        categoria: ProductCategory;
        sourceUrl: string;
        images: Array<{
          filename: string;
          mime: string;
          dataUrl: string | null;
          sourceUrl: string;
        }>;
        warnings: string[];
      };
    }>("/products/import-from-url", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  getProduct: (id: string) => request<Product>(`/products/${id}`),

  createProduct: (body: {
    sku: string;
    nombre: string;
    categoria: ProductCategory;
    costo: number;
    stock: number;
    activo?: boolean;
    descripcion?: string;
    precios: Record<string, number>;
  }) =>
    request<Product>("/products", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateProduct: (
    id: string,
    body: {
      sku: string;
      nombre: string;
      categoria: ProductCategory;
      costo: number;
      stock: number;
      activo?: boolean;
      descripcion?: string;
      precios: Record<string, number>;
    }
  ) =>
    request<Product>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  listClients: () => request<Client[]>("/clients"),

  createClient: (body: Omit<Client, "id">) =>
    request<Client>("/clients", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateClient: (id: string, body: Omit<Client, "id">) =>
    request<Client>(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  listOrders: (canal?: "pos" | "pedido" | "mayorista") =>
    request<Order[]>(
      canal ? `/orders?canal=${canal}` : "/orders"
    ),

  getOrder: (id: string) => request<Order>(`/orders/${id}`),

  createPedido: (clientId: string, lines: OrderLine[]) =>
    request<Order>("/orders", {
      method: "POST",
      body: JSON.stringify({ clientId, lines }),
    }),

  posCheckout: (body: {
    lines: OrderLine[];
    clientId?: string | null;
    priceListId?: string | null;
    conEnvio?: boolean;
    envioCosto?: number;
    direccionEnvio?: string;
    telefonoContacto?: string;
    metodoPago: PaymentMethod;
    branchId?: string | null;
    vendedorId?: string | null;
  }) =>
    request<Order>("/pos/checkout", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listWholesaleOrders: () => request<Order[]>("/wholesale/orders"),

  createWholesaleOrder: (clientId: string, lines: OrderLine[]) =>
    request<Order>("/wholesale/orders", {
      method: "POST",
      body: JSON.stringify({ clientId, lines }),
    }),

  listBranches: (onlyActive = false) =>
    request<Branch[]>(
      onlyActive ? "/branches?active=1" : "/branches"
    ),

  createBranch: (body: {
    codigo: string;
    nombre: string;
    direccion?: string;
    rubro?: string;
    activa?: boolean;
    esDefault?: boolean;
  }) =>
    request<Branch>("/branches", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateBranch: (
    id: string,
    body: {
      codigo: string;
      nombre: string;
      direccion?: string;
      rubro?: string;
      activa?: boolean;
      esDefault?: boolean;
    }
  ) =>
    request<Branch>(`/branches/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  setDefaultBranch: (id: string) =>
    request<Branch>(`/branches/${id}/set-default`, { method: "POST" }),

  softDeleteBranch: (id: string) =>
    request<Branch>(`/branches/${id}`, { method: "DELETE" }),

  restoreBranch: (id: string) =>
    request<Branch>(`/branches/${id}/restore`, { method: "POST" }),

  listUsers: (onlyActive = false) =>
    request<UserAccount[]>(onlyActive ? "/users?active=1" : "/users"),

  listUserFunctions: () => request<AppFunctionMeta[]>("/users/functions"),

  createUser: (body: {
    email: string;
    nombre: string;
    password?: string;
    role: UserRole;
    activa?: boolean;
    branchIds?: string[];
    functions?: string[];
  }) =>
    request<UserAccount>("/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateUser: (
    id: string,
    body: {
      email: string;
      nombre: string;
      password?: string;
      role: UserRole;
      activa?: boolean;
      branchIds?: string[];
      functions?: string[];
    }
  ) =>
    request<UserAccount>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  softDeleteUser: (id: string) =>
    request<UserAccount>(`/users/${id}`, { method: "DELETE" }),

  restoreUser: (id: string) =>
    request<UserAccount>(`/users/${id}/restore`, { method: "POST" }),

  listChannels: () => request<ChannelConfig[]>("/channels"),

  getChannel: (channel: Channel) =>
    request<ChannelConfig>(`/channels/${channel}`),

  saveChannel: (
    channel: Channel,
    body: {
      enabled?: boolean;
      storeUrl?: string | null;
      consumerKey?: string | null;
      consumerSecret?: string | null;
      accessToken?: string | null;
      refreshToken?: string | null;
      sellerId?: string | null;
      siteId?: string | null;
      priceListId?: string | null;
      stockMode?: StockMode;
      stockBranchId?: string | null;
    }
  ) =>
    request<ChannelConfig>(`/channels/${channel}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  upsertProductChannelLink: (
    productId: string,
    channel: Channel,
    body: { externalId: string; externalSku?: string; syncEnabled?: boolean }
  ) =>
    request<ChannelLink>(`/products/${productId}/channels/${channel}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteProductChannelLink: (productId: string, channel: Channel) =>
    request<void>(`/products/${productId}/channels/${channel}`, {
      method: "DELETE",
    }),

  pushWooProduct: (
    productId: string,
    mode: "stock" | "price" | "both" | "full" = "both"
  ) =>
    request<{ externalId: string; stock: number; price: number }>(
      `/channels/woocommerce/products/${productId}/push`,
      { method: "POST", body: JSON.stringify({ mode }) }
    ),

  pushWooAll: (mode: "stock" | "price" | "both" | "full" = "both") =>
    request<{ results: Array<{ productId: string; ok: boolean; error?: string }> }>(
      "/channels/woocommerce/push-all",
      { method: "POST", body: JSON.stringify({ mode }) }
    ),

  linkWooBySku: () =>
    request<{ linked: number; skipped: number }>(
      "/channels/woocommerce/link-by-sku",
      { method: "POST" }
    ),

  pullWooProducts: (body?: {
    priceListId?: string | null;
    branchId?: string | null;
    comercioId?: string | null;
    dryRun?: boolean;
  }) =>
    request<{
      dryRun: boolean;
      found: number;
      eligible: number;
      matched: number;
      toCreate: number;
      created: number;
      updated: number;
      linked: number;
      skipped: number;
      imagesSynced: number;
      imagesMissing: number;
      skippedByType: Array<{
        type: string;
        label: string;
        count: number;
        explanation: string;
      }>;
      skipSummary: string;
      priceListId: string;
      branchId: string | null;
      comercio: { id: string; codigo: string; nombre: string };
      errors: Array<{ sku: string; error: string }>;
    }>("/channels/woocommerce/pull", {
      method: "POST",
      body: JSON.stringify(body ?? {}),
      headers: body?.comercioId
        ? { "X-Comercio-Id": body.comercioId }
        : undefined,
    }),

  migrateWooPrices: (body: {
    fromPriceListId: string;
    toPriceListId?: string | null;
    newListNombre?: string;
    newListCodigo?: string;
    onlyLinked?: boolean;
    setAsChannelList?: boolean;
  }) =>
    request<{
      copied: number;
      toPriceListId: string;
      toPriceListNombre: string;
    }>("/channels/woocommerce/migrate-prices", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  pushMeliProduct: (
    productId: string,
    mode: "stock" | "price" | "both" = "both"
  ) =>
    request<{ externalId: string; stock: number; price: number }>(
      `/channels/mercadolibre/products/${productId}/push`,
      { method: "POST", body: JSON.stringify({ mode }) }
    ),

  pushMeliAll: (mode: "stock" | "price" | "both" = "both") =>
    request<{ results: Array<{ productId: string; ok: boolean; error?: string }> }>(
      "/channels/mercadolibre/push-all",
      { method: "POST", body: JSON.stringify({ mode }) }
    ),

  pullMeliProducts: (body?: {
    priceListId?: string | null;
    comercioId?: string | null;
    dryRun?: boolean;
  }) =>
    request<{
      dryRun: boolean;
      found: number;
      eligible: number;
      matched: number;
      toCreate: number;
      created: number;
      updated: number;
      linked: number;
      skipped: number;
      imagesSynced: number;
      imagesMissing: number;
      skippedByType: Array<{
        type: string;
        label: string;
        count: number;
        explanation: string;
      }>;
      skipSummary: string;
      priceListId: string;
      priceListNombre: string;
      priceListCreated: boolean;
      branchId: string | null;
      sellerId: string;
      comercio: { id: string; codigo: string; nombre: string };
      errors: Array<{ sku: string; error: string }>;
    }>("/channels/mercadolibre/pull", {
      method: "POST",
      body: JSON.stringify(body ?? {}),
      headers: body?.comercioId
        ? { "X-Comercio-Id": body.comercioId }
        : undefined,
    }),

  meliNotificationsCallback: () =>
    request<{
      path: string;
      url: string | null;
      hint: string;
      topicsRecommended: string[];
    }>("/channels/mercadolibre/notifications/callback"),

  listMeliNotifications: (limit = 40) =>
    request<
      Array<{
        id: string;
        meliEventId: string | null;
        topic: string;
        resource: string;
        userId: string | null;
        status: "queued" | "processing" | "done" | "skipped" | "error";
        resultMessage: string | null;
        productId: string | null;
        receivedAt: string;
        processedAt: string | null;
      }>
    >(`/channels/mercadolibre/notifications?limit=${limit}`),

  listComercios: (onlyActive = false) =>
    request<Comercio[]>(
      onlyActive ? "/comercios?active=1" : "/comercios"
    ),

  createComercio: (body: {
    codigo: string;
    nombre: string;
    rubro?: string;
    direccion?: string;
    activa?: boolean;
    esDefault?: boolean;
  }) =>
    request<Comercio>("/comercios", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateComercio: (
    id: string,
    body: {
      codigo: string;
      nombre: string;
      rubro?: string;
      direccion?: string;
      activa?: boolean;
      esDefault?: boolean;
    }
  ) =>
    request<Comercio>(`/comercios/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  setDefaultComercio: (id: string) =>
    request<Comercio>(`/comercios/${id}/set-default`, { method: "POST" }),

  softDeleteComercio: (id: string) =>
    request<Comercio>(`/comercios/${id}`, { method: "DELETE" }),

  restoreComercio: (id: string) =>
    request<Comercio>(`/comercios/${id}/restore`, { method: "POST" }),

  listStockShareGroups: () =>
    request<StockShareGroup[]>("/stock-share-groups"),

  upsertStockShareGroup: (body: {
    id?: string;
    nombre: string;
    modo: StockShareMode;
    activa?: boolean;
    comercioIds: string[];
  }) =>
    body.id
      ? request<StockShareGroup>(`/stock-share-groups/${body.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      : request<StockShareGroup>("/stock-share-groups", {
          method: "POST",
          body: JSON.stringify(body),
        }),

  deleteStockShareGroup: (id: string) =>
    request<void>(`/stock-share-groups/${id}`, { method: "DELETE" }),

  transferStock: (body: {
    fromComercioId: string;
    toComercioId: string;
    sku: string;
    quantity: number;
  }) =>
    request<{ fromStock: number; toStock: number }>("/stock/transfer", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listDiscountRules: (onlyActive = false) =>
    request<DiscountRule[]>(
      onlyActive ? "/discount-rules?active=1" : "/discount-rules"
    ),

  upsertDiscountRule: (body: {
    id?: string;
    nombre: string;
    descripcion?: string;
    basis?: DiscountBasis;
    priceListId?: string | null;
    activa?: boolean;
    tiers: DiscountTier[];
  }) =>
    body.id
      ? request<DiscountRule>(`/discount-rules/${body.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      : request<DiscountRule>("/discount-rules", {
          method: "POST",
          body: JSON.stringify(body),
        }),

  deleteDiscountRule: (id: string) =>
    request<void>(`/discount-rules/${id}`, { method: "DELETE" }),

  listQuotes: (status?: QuoteStatus) =>
    request<Quote[]>(
      status ? `/quotes?status=${encodeURIComponent(status)}` : "/quotes"
    ),

  getQuote: (id: string) => request<Quote>(`/quotes/${id}`),

  previewQuote: (body: QuotePayload) =>
    request<{
      lines: Quote["lines"];
      subtotal: number;
      descuentoPctAplicado: number;
      descuentoMonto: number;
      total: number;
      tiers: DiscountTier[];
    }>("/quotes/preview", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  createQuote: (body: QuotePayload) =>
    request<Quote>("/quotes", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateQuote: (id: string, body: QuotePayload) =>
    request<Quote>(`/quotes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  setQuoteStatus: (id: string, status: QuoteStatus) =>
    request<Quote>(`/quotes/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),

  deleteQuote: (id: string) =>
    request<void>(`/quotes/${id}`, { method: "DELETE" }),

  listMedia: (params?: {
    kind?: "image" | "attachment" | "all";
    q?: string;
    productId?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params?.kind && params.kind !== "all") sp.set("kind", params.kind);
    if (params?.q) sp.set("q", params.q);
    if (params?.productId) sp.set("productId", params.productId);
    const qs = sp.toString();
    return request<{
      items: import("@/lib/media-library").MediaLibraryItem[];
      counts: import("@/lib/media-library").MediaLibraryCounts;
    }>(`/media${qs ? `?${qs}` : ""}`);
  },

  createMedia: (body: {
    productId?: string | null;
    kind?: "image" | "attachment";
    filename: string;
    mime: string;
    sizeBytes: number;
    dataUrl: string | null;
    title?: string;
    isPrimary?: boolean;
    sortOrder?: number;
  }) =>
    request<import("@/lib/media-library").MediaLibraryItem>("/media", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateMedia: (
    id: string,
    body: {
      productId?: string | null;
      title?: string;
      isPrimary?: boolean;
      sortOrder?: number;
    }
  ) =>
    request<import("@/lib/media-library").MediaLibraryItem>(`/media/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteMedia: (id: string) =>
    request<void>(`/media/${id}`, { method: "DELETE" }),

  listProductImages: (productId: string) =>
    request<{
      imagenPrincipal: import("@/lib/types").ProductImage | null;
      imagenesSecundarias: import("@/lib/types").ProductImage[];
      items: import("@/lib/types").ProductImage[];
    }>(`/products/${productId}/images`),

  setProductImagePrimary: (productId: string, mediaId: string) =>
    request<{
      imagenPrincipal: import("@/lib/types").ProductImage | null;
      imagenesSecundarias: import("@/lib/types").ProductImage[];
      items: import("@/lib/types").ProductImage[];
    }>(`/products/${productId}/images/primary`, {
      method: "POST",
      body: JSON.stringify({ mediaId }),
    }),

  getCatalogSettings: () =>
    request<{ settings: import("@/lib/catalog").CatalogSettings }>(
      "/catalog/settings"
    ).then((r) => r.settings),

  putCatalogSettings: (body: {
    whatsappPhone?: string;
    orderTtlHours?: number | string;
    publicEnabled?: boolean;
  }) =>
    request<{ settings: import("@/lib/catalog").CatalogSettings }>(
      "/catalog/settings",
      { method: "PUT", body: JSON.stringify(body) }
    ).then((r) => r.settings),

  listCatalogOrders: () =>
    request<{ orders: import("@/lib/catalog").CatalogOrder[] }>(
      "/catalog/orders"
    ).then((r) => r.orders),

  patchCatalogOrder: (
    id: string,
    status: import("@/lib/catalog").CatalogOrderStatus
  ) =>
    request<{ order: import("@/lib/catalog").CatalogOrder }>(
      `/catalog/orders/${id}`,
      { method: "PATCH", body: JSON.stringify({ status }) }
    ).then((r) => r.order),
};
