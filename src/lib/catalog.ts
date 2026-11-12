export type CatalogOrderStatus =
  | "pendiente"
  | "confirmado"
  | "cobrado"
  | "cancelado"
  | "vencido";

export const CATALOG_ORDER_STATUS_LABELS: Record<CatalogOrderStatus, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  cobrado: "Cobrado",
  cancelado: "Cancelado",
  vencido: "Vencido",
};

export const CATALOG_ORDER_STATUSES: CatalogOrderStatus[] = [
  "pendiente",
  "confirmado",
  "cobrado",
  "cancelado",
  "vencido",
];

export type CatalogPublicProduct = {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  unitPrice: number;
  currency: string;
  imageDataUrl: string | null;
  images: Array<{
    filename: string;
    mime: string;
    dataUrl: string | null;
  }>;
};

export type CatalogSettings = {
  whatsappPhone: string;
  orderTtlHours: number;
  publicEnabled: boolean;
};

export type CatalogOrderItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  lineTotal: number;
};

export type CatalogOrder = {
  id: string;
  status: CatalogOrderStatus;
  expiresAt: string;
  buyerName: string;
  buyerPhone: string;
  buyerNote: string;
  items: CatalogOrderItem[];
  currency: string;
  total: number;
  whatsappSentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CatalogPublicPayload = {
  enabled: boolean;
  branding: { name: string; tagline: string };
  settings: { orderTtlHours: number; whatsappConfigured: boolean };
  products: CatalogPublicProduct[];
};

export type CartLine = {
  productId: string;
  name: string;
  unitPrice: number;
  currency: string;
  quantity: number;
  imageDataUrl: string | null;
};
