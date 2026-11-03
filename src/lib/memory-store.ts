/**
 * Store en memoria — fallback local cuando no hay NEXT_PUBLIC_API_URL.
 */

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
  UserAccount,
  UserRole,
} from "@/lib/types";
import { APP_FUNCTIONS, orderTotal, productPrice } from "@/lib/types";

export const PRICE_LIST_MINORISTA = "pl_minorista";
export const PRICE_LIST_MAYORISTA = "pl_mayorista";

const PRICE_LISTS: PriceList[] = [
  {
    id: PRICE_LIST_MINORISTA,
    nombre: "Minorista",
    codigo: "minorista",
    activa: true,
    esDefault: true,
  },
  {
    id: PRICE_LIST_MAYORISTA,
    nombre: "Mayorista",
    codigo: "mayorista",
    activa: true,
    esDefault: false,
  },
];

/** Sin datos de demo: el modo memoria arranca vacío (salvo listas de precio). */
const PRODUCTS: Product[] = [];
const CLIENTS: Client[] = [];
const ORDERS: Order[] = [];

const emptyEnvio = {
  conEnvio: false,
  envioCosto: 0,
  direccionEnvio: null as string | null,
  telefonoContacto: null as string | null,
  metodoPago: null as Order["metodoPago"],
};

let priceLists = structuredClone(PRICE_LISTS);
let products = structuredClone(PRODUCTS);
let clients = structuredClone(CLIENTS);
let orders = structuredClone(ORDERS);
let seq = 0;

function nextId(prefix: string) {
  seq += 1;
  return `${prefix}${seq}`;
}

function slugCodigo(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
}

export function listPriceLists(onlyActive = false): PriceList[] {
  const list = onlyActive ? priceLists.filter((p) => p.activa) : [...priceLists];
  return list.sort((a, b) => {
    if (a.esDefault !== b.esDefault) return a.esDefault ? -1 : 1;
    return a.nombre.localeCompare(b.nombre, "es");
  });
}

export function getDefaultPriceListId(): string {
  return (
    priceLists.find((p) => p.esDefault && p.activa)?.id ??
    priceLists.find((p) => p.activa)?.id ??
    PRICE_LIST_MINORISTA
  );
}

export function getPriceList(id: string): PriceList | undefined {
  return priceLists.find((p) => p.id === id);
}

export function upsertPriceList(input: {
  id?: string;
  nombre: string;
  codigo?: string;
  activa?: boolean;
  esDefault?: boolean;
}): PriceList {
  const nombre = input.nombre.trim();
  if (!nombre) throw new Error("Poné un nombre para la lista.");
  const codigo = (input.codigo?.trim() || slugCodigo(nombre)).toLowerCase();
  if (!codigo) throw new Error("Código inválido.");

  if (input.id) {
    const idx = priceLists.findIndex((p) => p.id === input.id);
    if (idx < 0) throw new Error("Lista no encontrada.");
    if (
      priceLists.some(
        (p) => p.id !== input.id && p.codigo === codigo
      )
    ) {
      throw new Error("Ya existe una lista con ese código.");
    }
    let next = [...priceLists];
    const updated: PriceList = {
      ...next[idx],
      nombre,
      codigo,
      activa: input.activa ?? next[idx].activa,
      esDefault: input.esDefault ?? next[idx].esDefault,
    };
    next[idx] = updated;
    if (updated.esDefault) {
      next = next.map((p) =>
        p.id === updated.id ? updated : { ...p, esDefault: false }
      );
    }
    if (!next.some((p) => p.esDefault && p.activa)) {
      throw new Error("Tiene que haber al menos una lista default activa.");
    }
    priceLists = next;
    syncProductDefaultPrices();
    return updated;
  }

  if (priceLists.some((p) => p.codigo === codigo)) {
    throw new Error("Ya existe una lista con ese código.");
  }
  const created: PriceList = {
    id: nextId("pl"),
    nombre,
    codigo,
    activa: input.activa ?? true,
    esDefault: Boolean(input.esDefault),
  };
  let next = [created, ...priceLists];
  if (created.esDefault) {
    next = next.map((p) =>
      p.id === created.id ? created : { ...p, esDefault: false }
    );
  }
  priceLists = next;
  // Sembrar precio = precio default en productos existentes
  products = products.map((p) => ({
    ...p,
    precios: {
      ...p.precios,
      [created.id]: p.precios[created.id] ?? p.precio,
    },
  }));
  return created;
}

export function setDefaultPriceList(id: string): PriceList {
  const target = priceLists.find((p) => p.id === id);
  if (!target) throw new Error("Lista no encontrada.");
  if (!target.activa) throw new Error("Activá la lista antes de ponerla default.");
  priceLists = priceLists.map((p) => ({
    ...p,
    esDefault: p.id === id,
  }));
  syncProductDefaultPrices();
  return getPriceList(id)!;
}

function syncProductDefaultPrices() {
  const def = getDefaultPriceListId();
  products = products.map((p) => ({
    ...p,
    precio: p.precios[def] ?? p.precio,
  }));
}

const productImages = new Map<string, ProductImage[]>();

function withImages(p: Product): Product {
  const imgs = [...(productImages.get(p.id) ?? [])].sort(
    (a, b) =>
      Number(b.isPrimary) - Number(a.isPrimary) ||
      a.sortOrder - b.sortOrder
  );
  const primary = imgs.find((i) => i.isPrimary) ?? imgs[0] ?? null;
  return {
    ...p,
    imagenPrincipal: primary
      ? { ...primary, isPrimary: true }
      : null,
    imagenesSecundarias: imgs
      .filter((i) => i.id !== primary?.id)
      .map((i) => ({ ...i, isPrimary: false })),
  };
}

function ensureMemoryPrimary(productId: string) {
  const imgs = productImages.get(productId) ?? [];
  if (!imgs.length) {
    productImages.set(productId, []);
    return;
  }
  if (imgs.some((i) => i.isPrimary)) return;
  productImages.set(
    productId,
    imgs.map((img, idx) => ({ ...img, isPrimary: idx === 0 }))
  );
}

export function listProductImages(productId: string): ProductImage[] {
  const p = withImages({
    id: productId,
    sku: "",
    nombre: "",
    categoria: "otros",
    precio: 0,
    precios: {},
    costo: 0,
    stock: 0,
    activo: true,
    descripcion: "",
  });
  return [
    ...(p.imagenPrincipal ? [p.imagenPrincipal] : []),
    ...(p.imagenesSecundarias ?? []),
  ];
}

export function addProductImage(
  productId: string,
  input: {
    filename: string;
    mime: string;
    dataUrl: string | null;
    title?: string;
    isPrimary?: boolean;
  }
): ProductImage {
  if (!getProductRaw(productId)) throw new Error("Producto no encontrado.");
  const imgs = [...(productImages.get(productId) ?? [])];
  const makePrimary = input.isPrimary === true || imgs.length === 0;
  const image: ProductImage = {
    id: nextId("media"),
    filename: input.filename,
    mime: input.mime,
    dataUrl: input.dataUrl,
    url: input.dataUrl,
    sourceUrl: null,
    title: input.title?.trim() || input.filename,
    isPrimary: makePrimary,
    sortOrder: imgs.length,
  };
  const next = makePrimary
    ? [...imgs.map((i) => ({ ...i, isPrimary: false })), image]
    : [...imgs, image];
  productImages.set(productId, next);
  return image;
}

export function setProductImagePrimary(
  productId: string,
  mediaId: string
): ProductImage[] {
  const imgs = productImages.get(productId) ?? [];
  if (!imgs.some((i) => i.id === mediaId)) {
    throw new Error("Imagen no encontrada en el producto.");
  }
  productImages.set(
    productId,
    imgs.map((i) => ({ ...i, isPrimary: i.id === mediaId }))
  );
  return listProductImages(productId);
}

export function deleteProductImage(productId: string, mediaId: string): void {
  const imgs = (productImages.get(productId) ?? []).filter(
    (i) => i.id !== mediaId
  );
  productImages.set(productId, imgs);
  ensureMemoryPrimary(productId);
}

function getProductRaw(id: string) {
  return products.find((p) => p.id === id);
}

export function listProducts() {
  return [...products]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    .map(withImages);
}

export function getProduct(id: string) {
  const p = getProductRaw(id);
  return p ? withImages(p) : undefined;
}

export function upsertProduct(
  input: Omit<Product, "id"> & { id?: string }
): Product {
  if (!input.nombre.trim()) throw new Error("El nombre es obligatorio.");
  if (!input.sku.trim()) throw new Error("El SKU es obligatorio.");

  const def = getDefaultPriceListId();
  const precios = { ...(input.precios ?? {}) };
  const lists = listPriceLists();
  for (const pl of lists) {
    if (precios[pl.id] == null) {
      precios[pl.id] = input.precio ?? 0;
    }
    if (precios[pl.id]! < 0) throw new Error("Precio inválido.");
  }
  const precio = precios[def] ?? input.precio ?? 0;

  if (input.id) {
    const idx = products.findIndex((p) => p.id === input.id);
    if (idx < 0) throw new Error("Producto no encontrado.");
    const updated: Product = {
      ...products[idx],
      ...input,
      id: input.id,
      precio,
      precios,
      descripcion: input.descripcion.trim(),
      sku: input.sku.trim().toUpperCase(),
      nombre: input.nombre.trim(),
    };
    products = [...products];
    products[idx] = updated;
    return withImages(updated);
  }

  const product: Product = {
    id: nextId("p"),
    sku: input.sku.trim().toUpperCase(),
    nombre: input.nombre.trim(),
    categoria: input.categoria,
    precio,
    precios,
    costo: input.costo,
    stock: input.stock,
    activo: input.activo,
    descripcion: input.descripcion.trim(),
  };
  products = [product, ...products];
  productImages.set(product.id, []);
  return withImages(product);
}

export function listClients() {
  return [...clients].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export function upsertClient(
  input: Omit<Client, "id"> & { id?: string }
): Client {
  if (!input.nombre.trim()) throw new Error("El nombre es obligatorio.");
  const priceListId =
    input.priceListId && getPriceList(input.priceListId)
      ? input.priceListId
      : null;

  if (input.id) {
    const idx = clients.findIndex((c) => c.id === input.id);
    if (idx < 0) throw new Error("Cliente no encontrado.");
    const updated: Client = {
      ...clients[idx],
      ...input,
      id: input.id,
      priceListId,
      nombre: input.nombre.trim(),
      email: input.email.trim(),
      telefono: input.telefono.trim(),
      direccion: (input.direccion ?? "").trim(),
      rfc: input.rfc.trim().toUpperCase(),
      notas: input.notas.trim(),
    };
    clients = [...clients];
    clients[idx] = updated;
    return updated;
  }
  const client: Client = {
    id: nextId("c"),
    nombre: input.nombre.trim(),
    email: input.email.trim(),
    telefono: input.telefono.trim(),
    direccion: (input.direccion ?? "").trim(),
    rfc: input.rfc.trim().toUpperCase(),
    notas: input.notas.trim(),
    priceListId,
  };
  clients = [client, ...clients];
  return client;
}

export function resolveClientPriceListId(
  clientId: string | null | undefined
): string {
  if (clientId) {
    const c = clients.find((x) => x.id === clientId);
    if (c?.priceListId && getPriceList(c.priceListId)?.activa) {
      return c.priceListId;
    }
  }
  return getDefaultPriceListId();
}

export function listOrders() {
  return [...orders].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export type PosSaleOptions = {
  clientId?: string | null;
  priceListId?: string | null;
  conEnvio?: boolean;
  envioCosto?: number;
  direccionEnvio?: string;
  telefonoContacto?: string;
  metodoPago?: Order["metodoPago"];
  branchId?: string | null;
  vendedorId?: string | null;
};

export function addPosSale(
  lines: Order["lines"],
  options: PosSaleOptions = {}
): Order {
  if (!lines.length) throw new Error("Agregá al menos un producto.");
  const clientId = options.clientId ?? null;
  const client = clientId ? clients.find((c) => c.id === clientId) : null;
  const listId =
    options.priceListId ||
    resolveClientPriceListId(clientId) ||
    getDefaultPriceListId();
  const conEnvio = Boolean(options.conEnvio);
  const envioCosto = conEnvio
    ? Math.max(0, Number(options.envioCosto) || 0)
    : 0;
  const direccionEnvio = conEnvio
    ? (options.direccionEnvio ?? client?.direccion ?? "").trim() || null
    : null;
  const telefonoContacto = conEnvio
    ? (options.telefonoContacto ?? client?.telefono ?? "").trim() || null
    : null;
  const metodoPago = options.metodoPago ?? null;

  if (conEnvio) {
    if (!client && !(options.direccionEnvio ?? "").trim()) {
      throw new Error("Para envío indicá cliente o dirección de entrega.");
    }
    if (!direccionEnvio) {
      throw new Error("La dirección de envío es obligatoria.");
    }
    if (!telefonoContacto) {
      throw new Error("El teléfono de contacto es obligatorio para envío.");
    }
  }
  if (!metodoPago) {
    throw new Error("Elegí método de pago: efectivo o transferencia.");
  }

  const order: Order = {
    id: nextId("o"),
    folio: `POS-${200 + seq}`,
    clientId: client?.id ?? null,
    clienteNombre: client?.nombre ?? "Mostrador",
    status: conEnvio ? "preparando" : "entregado",
    canal: "pos",
    branchId: options.branchId ?? null,
    vendedorId: options.vendedorId ?? null,
    branchNombre: null,
    vendedorNombre: null,
    createdAt: new Date().toISOString(),
    priceListId: listId,
    lines,
    conEnvio,
    envioCosto,
    direccionEnvio,
    telefonoContacto,
    metodoPago,
  };
  for (const line of lines) {
    const p = products.find((x) => x.id === line.productId);
    if (p) {
      p.stock = Math.max(0, p.stock - line.cantidad);
    }
  }
  products = [...products];
  orders = [order, ...orders];
  return order;
}

export function addPedido(
  clientId: string,
  lines: Order["lines"]
): Order {
  if (!clientId) throw new Error("Elegí un cliente.");
  if (!lines.length) throw new Error("Agregá líneas al pedido.");
  const client = clients.find((c) => c.id === clientId);
  if (!client) throw new Error("Cliente no encontrado.");
  const listId = resolveClientPriceListId(clientId);
  const order: Order = {
    id: nextId("o"),
    folio: `P-${1000 + seq}`,
    clientId: client.id,
    clienteNombre: client.nombre,
    status: "confirmado",
    canal: "pedido",
    createdAt: new Date().toISOString(),
    priceListId: listId,
    lines,
    ...emptyEnvio,
  };
  orders = [order, ...orders];
  return order;
}

/** Pedido forzado a lista mayorista (módulo Mayorista). */
export function addMayoristaPedido(
  clientId: string,
  lines: Order["lines"]
): Order {
  if (!clientId) throw new Error("Elegí un cliente.");
  if (!lines.length) throw new Error("Agregá líneas al pedido.");
  const client = clients.find((c) => c.id === clientId);
  if (!client) throw new Error("Cliente no encontrado.");
  const mayorista = priceLists.find(
    (p) => p.id === PRICE_LIST_MAYORISTA && p.activa
  );
  if (!mayorista) {
    throw new Error(
      "No hay lista Mayorista activa. Creala o activala en Configuración."
    );
  }
  // Validar que las líneas usan precio mayorista
  const normalized = lines.map((l) => {
    const p = products.find((x) => x.id === l.productId);
    const unit = p ? productPrice(p, PRICE_LIST_MAYORISTA) : l.precioUnitario;
    return { ...l, precioUnitario: unit };
  });
  for (const line of normalized) {
    const p = products.find((x) => x.id === line.productId);
    if (p) p.stock = Math.max(0, p.stock - line.cantidad);
  }
  products = [...products];
  const order: Order = {
    id: nextId("o"),
    folio: `M-${2000 + seq}`,
    clientId: client.id,
    clienteNombre: client.nombre,
    status: "confirmado",
    canal: "mayorista",
    createdAt: new Date().toISOString(),
    priceListId: PRICE_LIST_MAYORISTA,
    lines: normalized,
    ...emptyEnvio,
  };
  orders = [order, ...orders];
  return order;
}

export function getOrder(id: string): Order | undefined {
  return orders.find((o) => o.id === id);
}

export function listMayoristaOrders(): Order[] {
  return listOrders().filter((o) => o.canal === "mayorista");
}

export { productPrice };

export function dashboardStats(todayIso?: string) {
  const day = todayIso ?? "2026-10-27";
  const hoy = orders.filter(
    (o) =>
      o.createdAt.startsWith(day) &&
      o.status !== "cancelado" &&
      o.status !== "borrador"
  );
  const ventasHoy = hoy.reduce((acc, o) => acc + orderTotal(o), 0);
  const stockBajo = products.filter((p) => p.activo && p.stock <= 20).length;
  const byVendor = new Map<
    string,
    {
      vendedorId: string | null;
      vendedorNombre: string;
      branchId: string | null;
      branchNombre: string | null;
      tickets: number;
      total: number;
    }
  >();
  for (const o of hoy) {
    const key = o.vendedorId ?? "__sin__";
    const prev = byVendor.get(key) ?? {
      vendedorId: o.vendedorId ?? null,
      vendedorNombre: o.vendedorNombre ?? "Sin asignar",
      branchId: o.branchId ?? null,
      branchNombre: o.branchNombre ?? null,
      tickets: 0,
      total: 0,
    };
    prev.tickets += 1;
    prev.total += orderTotal(o);
    byVendor.set(key, prev);
  }
  return {
    productos: products.filter((p) => p.activo).length,
    clientes: clients.length,
    pedidosAbiertos: orders.filter(
      (o) => o.status === "confirmado" || o.status === "preparando"
    ).length,
    ventasHoy,
    stockBajo,
    scope: "all" as const,
    branchId: null,
    ventasPorVendedor: [...byVendor.values()].sort((a, b) => b.total - a.total),
  };
}

let branches: Branch[] = [
  {
    id: "br_musicanoba",
    codigo: "musicanoba",
    nombre: "Musicanoba",
    direccion: "",
    rubro: "Tecnología",
    activa: true,
    esDefault: true,
  },
  {
    id: "br_mi_espacio",
    codigo: "mi-espacio",
    nombre: "Mi Espacio",
    direccion: "",
    rubro: "Tecnología",
    activa: true,
    esDefault: false,
  },
  {
    id: "br_bella_dona",
    codigo: "bella-dona",
    nombre: "Bella Dona",
    direccion: "",
    rubro: "Bijouterie",
    activa: true,
    esDefault: false,
  },
];

let channelConfigs: ChannelConfig[] = [
  {
    channel: "woocommerce",
    enabled: false,
    storeUrl: null,
    consumerKey: null,
    consumerSecretSet: false,
    consumerSecretMasked: null,
    accessTokenSet: false,
    accessTokenMasked: null,
    sellerId: null,
    siteId: "MLA",
    priceListId: null,
    stockMode: "total",
    stockBranchId: null,
    lastSyncAt: null,
    configured: false,
  },
  {
    channel: "mercadolibre",
    enabled: false,
    storeUrl: null,
    consumerKey: null,
    consumerSecretSet: false,
    consumerSecretMasked: null,
    accessTokenSet: false,
    accessTokenMasked: null,
    sellerId: null,
    siteId: "MLA",
    priceListId: null,
    stockMode: "total",
    stockBranchId: null,
    lastSyncAt: null,
    configured: false,
  },
];

const productLinks = new Map<string, ChannelLink[]>();

export function listBranches(onlyActive = false): Branch[] {
  return onlyActive ? branches.filter((b) => b.activa) : [...branches];
}

export function upsertBranch(input: {
  id?: string;
  codigo: string;
  nombre: string;
  direccion?: string;
  rubro?: string;
  activa?: boolean;
  esDefault?: boolean;
}): Branch {
  const codigo = input.codigo.trim().toLowerCase().replace(/\s+/g, "-");
  if (
    branches.some(
      (b) => b.codigo === codigo && b.id !== input.id
    )
  ) {
    throw new Error(`Ya existe una sucursal con el código "${codigo}".`);
  }
  if (input.esDefault) {
    branches = branches.map((b) => ({ ...b, esDefault: false }));
  }
  if (input.id) {
    const idx = branches.findIndex((b) => b.id === input.id);
    if (idx < 0) throw new Error("Sucursal no encontrada.");
    const next: Branch = {
      ...branches[idx],
      codigo,
      nombre: input.nombre,
      direccion: input.direccion ?? "",
      rubro: input.rubro ?? branches[idx].rubro,
      activa: input.activa ?? true,
      esDefault: input.esDefault ?? branches[idx].esDefault,
    };
    branches[idx] = next;
    return next;
  }
  const created: Branch = {
    id: `br_${Date.now()}`,
    codigo,
    nombre: input.nombre,
    direccion: input.direccion ?? "",
    rubro: input.rubro ?? "",
    activa: input.activa ?? true,
    esDefault: Boolean(input.esDefault),
  };
  branches = [...branches, created];
  return created;
}

export function setDefaultBranch(id: string): Branch {
  const target = branches.find((b) => b.id === id);
  if (!target) throw new Error("Sucursal no encontrada.");
  if (!target.activa) {
    throw new Error("Reactivá la sucursal antes de marcarla como default.");
  }
  branches = branches.map((b) => ({
    ...b,
    esDefault: b.id === id,
  }));
  return branches.find((b) => b.id === id)!;
}

export function softDeleteBranch(id: string): Branch {
  const idx = branches.findIndex((b) => b.id === id);
  if (idx < 0) throw new Error("Sucursal no encontrada.");
  if (!branches[idx].activa) {
    throw new Error("La sucursal ya está desactivada.");
  }
  const others = branches.filter((b) => b.activa && b.id !== id);
  if (others.length === 0) {
    throw new Error(
      "No se puede desactivar la única sucursal activa. Creá o reactivá otra primero."
    );
  }
  const wasDefault = branches[idx].esDefault;
  branches[idx] = { ...branches[idx], activa: false, esDefault: false };
  if (wasDefault) {
    const nextDefault = others[0];
    branches = branches.map((b) =>
      b.id === nextDefault.id ? { ...b, esDefault: true } : b
    );
  }
  return branches[idx];
}

export function restoreBranch(id: string): Branch {
  const idx = branches.findIndex((b) => b.id === id);
  if (idx < 0) throw new Error("Sucursal no encontrada.");
  if (branches[idx].activa) {
    throw new Error("La sucursal ya está activa.");
  }
  branches[idx] = { ...branches[idx], activa: true };
  return branches[idx];
}

const nowIso = () => new Date().toISOString();

let users: UserAccount[] = [
  {
    id: "usr_superadmin",
    email: "superadmin@aurixerp.com",
    nombre: "Superadmin",
    role: "superadmin",
    activa: true,
    branchIds: [],
    functions: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

export function listUsers(onlyActive = false): UserAccount[] {
  return onlyActive ? users.filter((u) => u.activa) : [...users];
}

export function listUserFunctions(): AppFunctionMeta[] {
  return [...APP_FUNCTIONS];
}

export function upsertUser(input: {
  id?: string;
  email: string;
  nombre: string;
  password?: string;
  role: UserRole;
  activa?: boolean;
  branchIds?: string[];
  functions?: string[];
}): UserAccount {
  const email = input.email.trim().toLowerCase();
  const nombre = input.nombre.trim();
  if (!email || !nombre) throw new Error("Email y nombre son obligatorios.");
  if (!email.includes("@")) throw new Error("Email inválido.");
  if (!input.id && !input.password?.trim()) {
    throw new Error("La contraseña es obligatoria al crear el usuario.");
  }
  if (input.password !== undefined && input.password.trim().length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres.");
  }
  if (users.some((u) => u.email === email && u.id !== input.id)) {
    throw new Error(`Ya existe un usuario con el email "${email}".`);
  }

  const isVendedor = input.role === "vendedor";
  const branchIds = isVendedor
    ? [...new Set((input.branchIds ?? []).filter(Boolean))]
    : [];
  const functions = isVendedor
    ? ([...new Set(input.functions ?? [])] as UserAccount["functions"])
    : [];
  if (isVendedor && branchIds.length === 0) {
    // Sucursales opcionales (comercio = local único).
  }

  if (input.id) {
    const idx = users.findIndex((u) => u.id === input.id);
    if (idx < 0) throw new Error("Usuario no encontrado.");
    const next: UserAccount = {
      ...users[idx],
      email,
      nombre,
      role: input.role,
      activa: input.activa ?? true,
      branchIds,
      functions,
      updatedAt: nowIso(),
    };
    users[idx] = next;
    return next;
  }

  const created: UserAccount = {
    id: `usr_${Date.now()}`,
    email,
    nombre,
    role: input.role,
    activa: input.activa ?? true,
    branchIds,
    functions,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  users = [...users, created];
  return created;
}

export function softDeleteUser(id: string): UserAccount {
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("Usuario no encontrado.");
  if (!users[idx].activa) throw new Error("El usuario ya está desactivado.");
  if (users[idx].role === "superadmin") {
    const other = users.filter(
      (u) => u.role === "superadmin" && u.activa && u.id !== id
    );
    if (other.length === 0) {
      throw new Error("No se puede desactivar el único superadmin activo.");
    }
  }
  users[idx] = { ...users[idx], activa: false, updatedAt: nowIso() };
  return users[idx];
}

export function restoreUser(id: string): UserAccount {
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("Usuario no encontrado.");
  if (users[idx].activa) throw new Error("El usuario ya está activo.");
  users[idx] = { ...users[idx], activa: true, updatedAt: nowIso() };
  return users[idx];
}

export function salesByVendor(opts?: {
  from?: string;
  to?: string;
  canal?: "pos" | "pedido" | "mayorista";
}) {
  const filtered = orders.filter((o) => {
    if (o.status === "cancelado" || o.status === "borrador") return false;
    if (opts?.canal && o.canal !== opts.canal) return false;
    const day = o.createdAt.slice(0, 10);
    if (opts?.from && day < opts.from) return false;
    if (opts?.to && day > opts.to) return false;
    return true;
  });
  const byVendor = new Map<
    string,
    {
      vendedorId: string | null;
      vendedorNombre: string;
      branchId: string | null;
      branchNombre: string | null;
      tickets: number;
      total: number;
    }
  >();
  for (const o of filtered) {
    const key = `${o.vendedorId ?? "__sin__"}::${o.branchId ?? "__all__"}`;
    const prev = byVendor.get(key) ?? {
      vendedorId: o.vendedorId ?? null,
      vendedorNombre: o.vendedorNombre ?? "Sin asignar",
      branchId: o.branchId ?? null,
      branchNombre: o.branchNombre ?? null,
      tickets: 0,
      total: 0,
    };
    prev.tickets += 1;
    prev.total += orderTotal(o);
    byVendor.set(key, prev);
  }
  return [...byVendor.values()].sort((a, b) => b.total - a.total);
}

export function listChannels(): ChannelConfig[] {
  return channelConfigs.map((c) => ({ ...c }));
}

export function saveChannel(
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
): ChannelConfig {
  channelConfigs = channelConfigs.map((c) => {
    if (c.channel !== channel) return c;
    const next: ChannelConfig = {
      ...c,
      enabled: body.enabled ?? c.enabled,
      storeUrl: body.storeUrl !== undefined ? body.storeUrl : c.storeUrl,
      consumerKey:
        body.consumerKey !== undefined ? body.consumerKey : c.consumerKey,
      consumerSecretSet: body.consumerSecret
        ? true
        : c.consumerSecretSet,
      accessTokenSet: body.accessToken ? true : c.accessTokenSet,
      sellerId: body.sellerId !== undefined ? body.sellerId : c.sellerId,
      siteId: body.siteId ?? c.siteId,
      priceListId:
        body.priceListId !== undefined ? body.priceListId : c.priceListId,
      stockMode: body.stockMode ?? c.stockMode,
      stockBranchId:
        body.stockBranchId !== undefined
          ? body.stockBranchId
          : c.stockBranchId,
    };
    next.configured =
      channel === "woocommerce"
        ? Boolean(next.storeUrl && next.consumerKey && next.consumerSecretSet)
        : next.accessTokenSet;
    return next;
  });
  return channelConfigs.find((c) => c.channel === channel)!;
}

export function upsertProductChannelLink(
  productId: string,
  channel: Channel,
  body: { externalId: string; externalSku?: string; syncEnabled?: boolean }
): ChannelLink {
  const link: ChannelLink = {
    productId,
    channel,
    externalId: body.externalId,
    externalSku: body.externalSku ?? "",
    syncEnabled: body.syncEnabled !== false,
    lastSyncedAt: null,
    lastError: null,
  };
  const prev = (productLinks.get(productId) ?? []).filter(
    (l) => l.channel !== channel
  );
  productLinks.set(productId, [...prev, link]);
  return link;
}
