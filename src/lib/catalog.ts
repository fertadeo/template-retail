export type CatalogSettings = {
  publicEnabled: boolean;
  whatsappPhone: string;
  displayName: string;
  welcomeText: string;
  currency: "ARS" | "MXN" | "USD" | "UYU";
  orderTtlHours: number;
};
export type CatalogProduct = {
  id: string;
  name: string;
  sku: string;
  category: string;
  categoryName: string;
  description: string;
  unitPrice: number;
  currency: string;
  stock: number;
  imageUrl: string | null;
  images?: Array<{
    id: string;
    url: string;
    thumbnailUrl?: string;
    alt: string;
  }>;
};
export type CatalogInfo = {
  id: string;
  name: string;
  welcomeText: string;
  address: string;
  currency: string;
  whatsappConfigured: boolean;
  orderTtlHours: number;
  total: number;
  demo?: boolean;
  categories: Array<{ id: string; name: string; count: number }>;
  checkout: { channel: "whatsapp"; onlinePayments: boolean };
};
export type CatalogFilters = {
  page: number;
  pageSize: number;
  q: string;
  category: string;
  sort: "name" | "price_asc" | "price_desc" | "recent";
};
export type CatalogPage = {
  items: CatalogProduct[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};
export type CatalogCartLine = {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  stock: number;
  imageUrl: string | null;
};
export type CatalogCartInput = {
  items: Array<{
    productId: string;
    quantity: number;
    expectedUnitPrice: number;
  }>;
  expectedCurrency: string;
};
export type CatalogCartItem = CatalogCartLine & {
  available: boolean;
  lineTotal: number;
};
export type CatalogCartReview = {
  items: CatalogCartItem[];
  total: number;
  currency: string;
  valid: boolean;
  issues: Array<{
    productId: string;
    kind: "unavailable" | "stock" | "price";
    message: string;
  }>;
};
export type CatalogCheckout = CatalogCartInput & {
  checkoutKey: string;
  buyerName: string;
  buyerPhone: string;
  buyerNote: string;
};
export type CatalogOrderStatus =
  | "pendiente"
  | "en_preparacion"
  | "listo_para_entrega"
  | "entregado"
  | "devolucion"
  | "cancelado"
  | "cobrado";
export const CATALOG_ORDER_STATUS_LABELS: Record<CatalogOrderStatus, string> = {
  pendiente: "Pendiente",
  en_preparacion: "En preparación",
  listo_para_entrega: "Listo para entrega",
  entregado: "Entregado",
  devolucion: "Devolución",
  cancelado: "Cancelado",
  cobrado: "Cobrado (anterior)",
};
export type CatalogOrder = {
  id: string;
  status: CatalogOrderStatus;
  expiresAt: string;
  createdAt: string;
  buyerName: string;
  buyerPhone: string;
  buyerNote: string;
  items: CatalogCartItem[];
  currency: string;
  total: number;
  payment: { status: string; method: string | null; reference: string | null };
};
export type CatalogOrderPage = {
  orders: CatalogOrder[];
  page: number;
  hasMore: boolean;
};
export type CatalogCheckoutResult = {
  conflict: false;
  order: CatalogOrder;
  whatsappUrl: string;
};
export function catalogMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${Number(value).toFixed(2)}`;
  }
}
export const catalogPhoneValid = (phone: string) =>
  /^\+?[\d\s().-]+$/.test(phone.trim()) &&
  /^[1-9]\d{7,14}$/.test(phone.replace(/\D/g, ""));
export const cartInput = (
  lines: CatalogCartLine[],
  currency: string,
): CatalogCartInput => ({
  expectedCurrency: currency,
  items: lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    expectedUnitPrice: line.unitPrice,
  })),
});

export const CATALOG_ORDER_TRANSITIONS: Partial<
  Record<CatalogOrderStatus, CatalogOrderStatus[]>
> = {
  pendiente: ["en_preparacion", "cancelado"],
  en_preparacion: ["listo_para_entrega", "cancelado"],
  listo_para_entrega: ["en_preparacion", "entregado", "cancelado"],
  entregado: ["devolucion"],
};
