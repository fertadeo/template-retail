/**
 * Capa de datos del gold.
 * Con NEXT_PUBLIC_API_URL → API remota.
 * Sin env → memory-store (demo local).
 */
import { api } from "@/lib/api-client";
import { isApiMode } from "@/lib/api-config";
import * as memory from "@/lib/memory-store";
import type { ImportedProductDraft } from "@/lib/product-import";
import type {
  AppFunctionMeta,
  Branch,
  Channel,
  ChannelConfig,
  ChannelLink,
  Client,
  Order,
  PriceList,
  Product,
  ProductImage,
  StockMode,
  DashboardStats,
  UserAccount,
  UserRole,
  VendorSalesRow,
} from "@/lib/types";

export {
  PRICE_LIST_MAYORISTA,
  PRICE_LIST_MINORISTA,
} from "@/lib/memory-store";

export type { PosSaleOptions } from "@/lib/memory-store";
export { productPrice } from "@/lib/types";

export function usingRemoteApi(): boolean {
  return isApiMode();
}

export async function listPriceLists(
  onlyActive = false
): Promise<PriceList[]> {
  if (!isApiMode()) return memory.listPriceLists(onlyActive);
  return api.listPriceLists(onlyActive);
}

export async function getPriceList(
  id: string
): Promise<PriceList | undefined> {
  if (!isApiMode()) return memory.getPriceList(id);
  const lists = await api.listPriceLists(false);
  return lists.find((p) => p.id === id);
}

export async function getDefaultPriceListId(): Promise<string> {
  if (!isApiMode()) return memory.getDefaultPriceListId();
  const lists = await api.listPriceLists(true);
  return (
    lists.find((p) => p.esDefault)?.id ??
    lists[0]?.id ??
    memory.PRICE_LIST_MINORISTA
  );
}

export async function upsertPriceList(input: {
  id?: string;
  nombre: string;
  codigo?: string;
  activa?: boolean;
  esDefault?: boolean;
}): Promise<PriceList> {
  if (!isApiMode()) return memory.upsertPriceList(input);
  if (input.id) {
    return api.updatePriceList(input.id, {
      nombre: input.nombre,
      codigo: input.codigo,
      activa: input.activa,
      esDefault: input.esDefault,
    });
  }
  return api.createPriceList(input);
}

export async function setDefaultPriceList(id: string): Promise<PriceList> {
  if (!isApiMode()) return memory.setDefaultPriceList(id);
  return api.setDefaultPriceList(id);
}

export async function listProducts(): Promise<Product[]> {
  if (!isApiMode()) return memory.listProducts();
  return api.listProducts();
}

export async function getProduct(
  id: string
): Promise<Product | undefined> {
  if (!isApiMode()) return memory.getProduct(id);
  try {
    return await api.getProduct(id);
  } catch {
    return undefined;
  }
}

export async function importProductFromUrl(
  url: string
): Promise<ImportedProductDraft> {
  if (!isApiMode()) {
    throw new Error(
      "Importar desde URL requiere API remota (NEXT_PUBLIC_API_URL)."
    );
  }
  const { draft } = await api.importProductFromUrl(url);
  return draft;
}

export async function upsertProduct(
  input: Omit<Product, "id"> & { id?: string }
): Promise<Product> {
  if (!isApiMode()) return memory.upsertProduct(input);
  const body = {
    sku: input.sku,
    nombre: input.nombre,
    categoria: input.categoria,
    costo: input.costo,
    stock: input.stock,
    activo: input.activo,
    descripcion: input.descripcion,
    precios: input.precios,
  };
  if (input.id) return api.updateProduct(input.id, body);
  return api.createProduct(body);
}

export async function listProductImages(
  productId: string
): Promise<ProductImage[]> {
  if (!isApiMode()) return memory.listProductImages(productId);
  const res = await api.listProductImages(productId);
  return res.items;
}

export async function uploadProductImage(
  productId: string,
  payload: {
    filename: string;
    mime: string;
    sizeBytes: number;
    dataUrl: string;
    isPrimary?: boolean;
    title?: string;
  }
): Promise<ProductImage> {
  if (!isApiMode()) {
    return memory.addProductImage(productId, {
      filename: payload.filename,
      mime: payload.mime,
      dataUrl: payload.dataUrl,
      title: payload.title,
      isPrimary: payload.isPrimary,
    });
  }
  const created = await api.createMedia({
    productId,
    kind: "image",
    filename: payload.filename,
    mime: payload.mime,
    sizeBytes: payload.sizeBytes,
    dataUrl: payload.dataUrl,
    title: payload.title ?? payload.filename,
    isPrimary: payload.isPrimary,
  });
  return {
    id: created.id,
    url: created.dataUrl,
    dataUrl: created.dataUrl,
    sourceUrl: null,
    title: created.title,
    filename: created.filename,
    mime: created.mime,
    isPrimary: Boolean(created.isPrimary),
    sortOrder: Number(created.sortOrder) || 0,
  };
}

export async function setProductImagePrimary(
  productId: string,
  mediaId: string
): Promise<ProductImage[]> {
  if (!isApiMode()) {
    return memory.setProductImagePrimary(productId, mediaId);
  }
  const res = await api.setProductImagePrimary(productId, mediaId);
  return res.items;
}

export async function deleteProductImage(
  productId: string,
  mediaId: string
): Promise<void> {
  if (!isApiMode()) {
    memory.deleteProductImage(productId, mediaId);
    return;
  }
  await api.deleteMedia(mediaId);
}

export async function listClients(): Promise<Client[]> {
  if (!isApiMode()) return memory.listClients();
  return api.listClients();
}

export async function upsertClient(
  input: Omit<Client, "id"> & { id?: string }
): Promise<Client> {
  if (!isApiMode()) return memory.upsertClient(input);
  const body = {
    nombre: input.nombre,
    email: input.email,
    telefono: input.telefono,
    direccion: input.direccion,
    rfc: input.rfc,
    notas: input.notas,
    priceListId: input.priceListId,
  };
  if (input.id) return api.updateClient(input.id, body);
  return api.createClient(body);
}

export async function resolveClientPriceListId(
  clientId: string | null | undefined
): Promise<string> {
  if (!isApiMode()) return memory.resolveClientPriceListId(clientId);
  if (clientId) {
    const clients = await api.listClients();
    const c = clients.find((x) => x.id === clientId);
    if (c?.priceListId) {
      const list = await getPriceList(c.priceListId);
      if (list?.activa) return list.id;
    }
  }
  return getDefaultPriceListId();
}

export async function listOrders(
  canal?: "pos" | "pedido" | "mayorista"
): Promise<Order[]> {
  if (!isApiMode()) {
    const all = memory.listOrders();
    return canal ? all.filter((o) => o.canal === canal) : all;
  }
  return api.listOrders(canal);
}

export async function getOrder(id: string): Promise<Order | undefined> {
  if (!isApiMode()) return memory.getOrder(id);
  try {
    return await api.getOrder(id);
  } catch {
    return undefined;
  }
}

export async function addPosSale(
  lines: Order["lines"],
  options: memory.PosSaleOptions = {}
): Promise<Order> {
  if (!isApiMode()) return memory.addPosSale(lines, options);
  if (!options.metodoPago) {
    throw new Error("Elegí método de pago: efectivo o transferencia.");
  }
  return api.posCheckout({
    lines,
    clientId: options.clientId,
    priceListId: options.priceListId,
    conEnvio: options.conEnvio,
    envioCosto: options.envioCosto,
    direccionEnvio: options.direccionEnvio,
    telefonoContacto: options.telefonoContacto,
    metodoPago: options.metodoPago,
    branchId: options.branchId,
    vendedorId: options.vendedorId,
  });
}

export async function addPedido(
  clientId: string,
  lines: Order["lines"]
): Promise<Order> {
  if (!isApiMode()) return memory.addPedido(clientId, lines);
  return api.createPedido(clientId, lines);
}

export async function addMayoristaPedido(
  clientId: string,
  lines: Order["lines"]
): Promise<Order> {
  if (!isApiMode()) return memory.addMayoristaPedido(clientId, lines);
  return api.createWholesaleOrder(clientId, lines);
}

export async function listMayoristaOrders(): Promise<Order[]> {
  if (!isApiMode()) return memory.listMayoristaOrders();
  return api.listWholesaleOrders();
}

export async function dashboardStats(
  todayIso?: string
): Promise<DashboardStats> {
  if (!isApiMode()) return memory.dashboardStats(todayIso);
  return api.dashboardStats(todayIso);
}

export async function salesByVendor(opts?: {
  from?: string;
  to?: string;
  canal?: "pos" | "pedido" | "mayorista";
}): Promise<VendorSalesRow[]> {
  if (!isApiMode()) return memory.salesByVendor(opts);
  return api.salesByVendor(opts);
}

export async function listBranches(onlyActive = false): Promise<Branch[]> {
  if (!isApiMode()) return memory.listBranches(onlyActive);
  return api.listBranches(onlyActive);
}

export async function upsertBranch(input: {
  id?: string;
  codigo: string;
  nombre: string;
  direccion?: string;
  rubro?: string;
  activa?: boolean;
  esDefault?: boolean;
}): Promise<Branch> {
  if (!isApiMode()) return memory.upsertBranch(input);
  if (input.id) {
    return api.updateBranch(input.id, {
      codigo: input.codigo,
      nombre: input.nombre,
      direccion: input.direccion,
      rubro: input.rubro,
      activa: input.activa,
      esDefault: input.esDefault,
    });
  }
  return api.createBranch(input);
}

export async function setDefaultBranch(id: string): Promise<Branch> {
  if (!isApiMode()) return memory.setDefaultBranch(id);
  return api.setDefaultBranch(id);
}

export async function softDeleteBranch(id: string): Promise<Branch> {
  if (!isApiMode()) return memory.softDeleteBranch(id);
  return api.softDeleteBranch(id);
}

export async function restoreBranch(id: string): Promise<Branch> {
  if (!isApiMode()) return memory.restoreBranch(id);
  return api.restoreBranch(id);
}

export async function listUsers(onlyActive = false): Promise<UserAccount[]> {
  if (!isApiMode()) return memory.listUsers(onlyActive);
  return api.listUsers(onlyActive);
}

export async function listUserFunctions(): Promise<AppFunctionMeta[]> {
  if (!isApiMode()) return memory.listUserFunctions();
  return api.listUserFunctions();
}

export async function upsertUser(input: {
  id?: string;
  email: string;
  nombre: string;
  password?: string;
  role: UserRole;
  activa?: boolean;
  branchIds?: string[];
  functions?: string[];
}): Promise<UserAccount> {
  if (!isApiMode()) return memory.upsertUser(input);
  if (input.id) {
    return api.updateUser(input.id, {
      email: input.email,
      nombre: input.nombre,
      password: input.password,
      role: input.role,
      activa: input.activa,
      branchIds: input.branchIds,
      functions: input.functions,
    });
  }
  return api.createUser(input);
}

export async function softDeleteUser(id: string): Promise<UserAccount> {
  if (!isApiMode()) return memory.softDeleteUser(id);
  return api.softDeleteUser(id);
}

export async function restoreUser(id: string): Promise<UserAccount> {
  if (!isApiMode()) return memory.restoreUser(id);
  return api.restoreUser(id);
}

export async function listChannels(): Promise<ChannelConfig[]> {
  if (!isApiMode()) return memory.listChannels();
  return api.listChannels();
}

export async function saveChannel(
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
): Promise<ChannelConfig> {
  if (!isApiMode()) return memory.saveChannel(channel, body);
  return api.saveChannel(channel, body);
}

export async function upsertProductChannelLink(
  productId: string,
  channel: Channel,
  body: { externalId: string; externalSku?: string; syncEnabled?: boolean }
): Promise<ChannelLink> {
  if (!isApiMode()) {
    return memory.upsertProductChannelLink(productId, channel, body);
  }
  return api.upsertProductChannelLink(productId, channel, body);
}

export async function pushWooProduct(
  productId: string,
  mode: "stock" | "price" | "both" | "full" = "both"
) {
  if (!isApiMode()) throw new Error("Sync requiere API remota.");
  return api.pushWooProduct(productId, mode);
}

export async function pushMeliProduct(
  productId: string,
  mode: "stock" | "price" | "both" = "both"
) {
  if (!isApiMode()) throw new Error("Sync requiere API remota.");
  return api.pushMeliProduct(productId, mode);
}

export async function linkWooBySku() {
  if (!isApiMode()) throw new Error("Sync requiere API remota.");
  return api.linkWooBySku();
}

export async function pullWooProducts(body?: {
  priceListId?: string | null;
  branchId?: string | null;
  comercioId?: string | null;
  dryRun?: boolean;
}) {
  if (!isApiMode()) throw new Error("Sync requiere API remota.");
  return api.pullWooProducts(body);
}

export async function migrateWooPrices(body: {
  fromPriceListId: string;
  toPriceListId?: string | null;
  newListNombre?: string;
  newListCodigo?: string;
  onlyLinked?: boolean;
  setAsChannelList?: boolean;
}) {
  if (!isApiMode()) throw new Error("Sync requiere API remota.");
  return api.migrateWooPrices(body);
}

export async function pushWooAll(
  mode: "stock" | "price" | "both" | "full" = "both"
) {
  if (!isApiMode()) throw new Error("Sync requiere API remota.");
  return api.pushWooAll(mode);
}

export async function pushMeliAll(mode: "stock" | "price" | "both" = "both") {
  if (!isApiMode()) throw new Error("Sync requiere API remota.");
  return api.pushMeliAll(mode);
}

export async function pullMeliProducts(body?: {
  priceListId?: string | null;
  comercioId?: string | null;
  dryRun?: boolean;
}) {
  if (!isApiMode()) throw new Error("Sync requiere API remota.");
  return api.pullMeliProducts(body);
}

export async function meliNotificationsCallback() {
  if (!isApiMode()) throw new Error("Sync requiere API remota.");
  return api.meliNotificationsCallback();
}

export async function listMeliNotifications(limit = 40) {
  if (!isApiMode()) throw new Error("Sync requiere API remota.");
  return api.listMeliNotifications(limit);
}
