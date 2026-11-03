export type ProductCategory =
  | "bebidas"
  | "alimentos"
  | "limpieza"
  | "otros";

/** Lista de precios diferenciada (minorista, mayorista, custom…). */
export type PriceList = {
  id: string;
  nombre: string;
  codigo: string;
  activa: boolean;
  /** Una sola lista default para POS / precios sin cliente. */
  esDefault: boolean;
};

export type Channel = "woocommerce" | "mercadolibre";

export type StockMode = "total" | "default_branch" | "branch";

export type StockShareMode = "shared" | "rotate";

export type DiscountBasis = "amount" | "qty";
export type DiscountMode = "none" | "rule" | "manual";

export type DiscountTier = {
  desde: number;
  porcentaje: number;
};

export type DiscountRule = {
  id: string;
  comercioId?: string | null;
  nombre: string;
  descripcion: string;
  basis: DiscountBasis;
  priceListId: string | null;
  activa: boolean;
  tiers: DiscountTier[];
};

export type QuoteStatus =
  | "borrador"
  | "enviado"
  | "aceptado"
  | "rechazado"
  | "vencido"
  | "convertido";

export type QuoteLine = {
  productId: string | null;
  sku: string;
  nombre: string;
  cantidad: number;
  precioLista: number;
  precioUnitario: number;
  lineDescuentoPct: number;
  importe: number;
};

export type Quote = {
  id: string;
  comercioId?: string | null;
  folio: string;
  clientId: string | null;
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono: string;
  priceListId: string | null;
  discountRuleId: string | null;
  discountMode: DiscountMode;
  discountBasis: DiscountBasis;
  tiers: DiscountTier[];
  descuentoManualPct: number;
  status: QuoteStatus;
  validezDias: number;
  validezHasta: string | null;
  notas: string;
  subtotal: number;
  descuentoMonto: number;
  descuentoPctAplicado: number;
  total: number;
  lines: QuoteLine[];
  createdAt: string;
  updatedAt: string;
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
  vencido: "Vencido",
  convertido: "Convertido",
};

export type Comercio = {
  id: string;
  codigo: string;
  nombre: string;
  rubro: string;
  direccion: string;
  activa: boolean;
  esDefault: boolean;
};

export type StockShareGroup = {
  id: string;
  nombre: string;
  modo: StockShareMode;
  activa: boolean;
  comercioIds: string[];
};

export type Branch = {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  /** Rubro del local (p. ej. Tecnología, Bijouterie). */
  rubro: string;
  activa: boolean;
  esDefault: boolean;
};

export type UserRole =
  | "superadmin"
  | "administrador"
  | "vendedor"
  | "visitante";

export type AppFunctionCode =
  | "dashboard"
  | "productos"
  | "clientes"
  | "presupuestos"
  | "biblioteca"
  | "pedidos"
  | "mayorista"
  | "pos"
  | "comercios"
  | "sucursales"
  | "canales"
  | "configuracion";

export type AppFunctionMeta = {
  code: AppFunctionCode;
  label: string;
};

export type UserAccount = {
  id: string;
  email: string;
  nombre: string;
  role: UserRole;
  activa: boolean;
  branchIds: string[];
  functions: AppFunctionCode[];
  createdAt: string;
  updatedAt: string;
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  superadmin: "Superadmin",
  administrador: "Administrador",
  vendedor: "Vendedor",
  visitante: "Visitante",
};

export const APP_FUNCTIONS: AppFunctionMeta[] = [
  { code: "dashboard", label: "Inicio" },
  { code: "productos", label: "Productos" },
  { code: "clientes", label: "Clientes" },
  { code: "presupuestos", label: "Presupuestos" },
  { code: "biblioteca", label: "Biblioteca" },
  { code: "pedidos", label: "Pedidos" },
  { code: "mayorista", label: "Mayorista" },
  { code: "pos", label: "POS" },
  { code: "comercios", label: "Comercios" },
  { code: "sucursales", label: "Sucursales" },
  { code: "canales", label: "Canales" },
  { code: "configuracion", label: "Configuración" },
];

export type ChannelLink = {
  productId: string;
  channel: Channel;
  externalId: string;
  externalSku: string;
  syncEnabled: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
};

export type ChannelConfig = {
  channel: Channel;
  enabled: boolean;
  storeUrl: string | null;
  consumerKey: string | null;
  consumerSecretSet: boolean;
  consumerSecretMasked: string | null;
  accessTokenSet: boolean;
  accessTokenMasked: string | null;
  sellerId: string | null;
  siteId: string;
  priceListId: string | null;
  stockMode: StockMode;
  stockBranchId: string | null;
  lastSyncAt: string | null;
  configured: boolean;
};

export type ProductImage = {
  id: string;
  /** URL lista para <img src> (data URL o remota). */
  url?: string | null;
  dataUrl: string | null;
  sourceUrl?: string | null;
  title: string;
  filename: string;
  mime: string;
  isPrimary: boolean;
  sortOrder: number;
};

/** src usable en <img>: prioriza url → dataUrl → sourceUrl. */
export function productImageSrc(
  img: ProductImage | null | undefined
): string | null {
  if (!img) return null;
  return img.url || img.dataUrl || img.sourceUrl || null;
}

export type Product = {
  id: string;
  sku: string;
  nombre: string;
  categoria: ProductCategory;
  /** Precio de la lista default (atajo / compat). */
  precio: number;
  /** Precio por lista: priceListId → monto. */
  precios: Record<string, number>;
  costo: number;
  stock: number;
  stockByBranch?: Record<string, number>;
  activo: boolean;
  descripcion: string;
  comercioId?: string | null;
  stockShared?: boolean;
  channelLinks?: ChannelLink[];
  imagenPrincipal?: ProductImage | null;
  imagenesSecundarias?: ProductImage[];
  createdAt?: string;
  /** Unidades vendidas (pedidos no cancelados). */
  unitsSold?: number;
};

export type PaymentMethod = "efectivo" | "transferencia";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
};

export type Client = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  /** Dirección de entrega / domicilio. */
  direccion: string;
  rfc: string;
  notas: string;
  /** Lista de precios asignada; null = default del sistema. */
  priceListId: string | null;
};

export type OrderStatus =
  | "borrador"
  | "confirmado"
  | "preparando"
  | "entregado"
  | "cancelado";

export type OrderLine = {
  productId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
};

export type Order = {
  id: string;
  folio: string;
  clientId: string | null;
  clienteNombre: string;
  status: OrderStatus;
  lines: OrderLine[];
  createdAt: string;
  canal: "pos" | "pedido" | "mayorista";
  priceListId: string | null;
  /** Pedido POS (u otro) con entrega a domicilio. */
  conEnvio: boolean;
  envioCosto: number;
  direccionEnvio: string | null;
  telefonoContacto: string | null;
  metodoPago: PaymentMethod | null;
  branchId?: string | null;
  vendedorId?: string | null;
  branchNombre?: string | null;
  vendedorNombre?: string | null;
};

export type VendorSalesRow = {
  vendedorId: string | null;
  vendedorNombre: string;
  branchId: string | null;
  branchNombre: string | null;
  tickets: number;
  total: number;
};

export type DashboardStats = {
  productos: number;
  clientes: number;
  pedidosAbiertos: number;
  ventasHoy: number;
  stockBajo: number;
  scope?: "all" | "branch";
  branchId?: string | null;
  ventasPorVendedor?: VendorSalesRow[];
};

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  bebidas: "Bebidas",
  alimentos: "Alimentos",
  limpieza: "Limpieza",
  otros: "Otros",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  borrador: "Borrador",
  confirmado: "Confirmado",
  preparando: "Preparando",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function orderSubtotal(order: Order): number {
  return order.lines.reduce(
    (acc, l) => acc + l.cantidad * l.precioUnitario,
    0
  );
}

export function orderTotal(order: Order): number {
  return orderSubtotal(order) + (order.conEnvio ? order.envioCosto : 0);
}

export function productPrice(
  product: Product,
  priceListId: string | null | undefined
): number {
  if (priceListId && product.precios[priceListId] != null) {
    return product.precios[priceListId];
  }
  return product.precio;
}
