/** Shared catalog reads: server pagination in API mode, local pagination in demo. */
import { api, type ProductPageOptions } from "@/lib/api-client";
import { isApiMode } from "@/lib/api-config";
import * as memory from "@/lib/memory-store";
import { productHealth } from "@/lib/product-health";
import type { MediaKind, MediaLibraryItem, MediaLibraryCounts } from "@/lib/media-library";

function matchingProducts(q = "", category = "") {
  const term = q.trim().toLowerCase();
  return memory.listProducts().filter(p => (!category || p.categoria === category)
    && (!term || p.sku.toLowerCase().includes(term) || p.nombre.toLowerCase().includes(term)));
}

export async function listProductsPage(options: ProductPageOptions, signal?: AbortSignal) {
  if (isApiMode()) return api.listProductsPage(options, signal);
  let rows = matchingProducts(options.q, options.category);
  if (options.pos) {
    rows = rows.filter(p => p.activo && p.stock > 0);
    const exact = options.q && rows.find(p => p.sku.toLowerCase() === options.q!.trim().toLowerCase());
    if (exact) rows = [exact];
  } else if (options.health && options.health !== "all") {
    rows = rows.filter(p => productHealth(p).level === options.health);
  }
  rows.sort((a, b) => {
    switch (options.sort) {
      case "recent": return (b.createdAt ?? "").localeCompare(a.createdAt ?? "") || a.id.localeCompare(b.id);
      case "oldest": return (a.createdAt ?? "").localeCompare(b.createdAt ?? "") || a.id.localeCompare(b.id);
      case "sold_desc": return (b.unitsSold ?? 0) - (a.unitsSold ?? 0) || a.id.localeCompare(b.id);
      case "sold_asc": return (a.unitsSold ?? 0) - (b.unitsSold ?? 0) || a.id.localeCompare(b.id);
      default: return a.nombre.localeCompare(b.nombre, "es") || a.id.localeCompare(b.id);
    }
  });
  const pageSize = options.pageSize ?? 40;
  const offset = (options.page - 1) * pageSize;
  return { items: rows.slice(offset, offset + pageSize), page: options.page, pageSize, hasMore: rows.length > offset + pageSize };
}

export async function productHealthCounts(q: string, category: string, signal?: AbortSignal) {
  if (isApiMode()) return api.productHealthCounts(q, category, signal);
  const counts = { all: 0, ready: 0, attention: 0, critical: 0 };
  for (const product of matchingProducts(q, category)) {
    counts.all++; counts[productHealth(product).level]++;
  }
  return counts;
}

const demoMedia: MediaLibraryItem[] = [];
export async function listMediaPage(options: { kind: MediaKind; q: string; page: number; pageSize: number }, signal?: AbortSignal) {
  if (isApiMode()) return api.listMedia(options, signal);
  const term = options.q.toLowerCase();
  const all = demoMedia.filter(item => !term || [item.filename, item.title, item.subtitle, item.sourceLabel].join(" ").toLowerCase().includes(term));
  const counts: MediaLibraryCounts = { total: all.length, images: 0, attachments: 0, totalSizeBytes: 0, unknownSizeCount: 0 };
  for (const item of all) {
    if (item.kind === "image") counts.images++; else counts.attachments++;
    counts.totalSizeBytes += item.sizeBytes;
    if (item.sizeBytes <= 0) counts.unknownSizeCount++;
  }
  const rows = all.filter(item => item.kind === options.kind);
  const offset = (options.page - 1) * options.pageSize;
  return { items: rows.slice(offset, offset + options.pageSize), counts, page: options.page, pageSize: options.pageSize, hasMore: rows.length > offset + options.pageSize };
}

export async function createLibraryMedia(payload: { kind: MediaKind; filename: string; mime: string; sizeBytes: number; dataUrl: string; title: string }) {
  if (isApiMode()) return api.createMedia(payload);
  const item: MediaLibraryItem = {
    ...payload, id: `demo_${Date.now()}_${Math.random().toString(36).slice(2)}`, source: "library",
    sourceLabel: payload.kind === "image" ? "Imagen de biblioteca" : "Archivo de biblioteca",
    uploadedAt: new Date().toISOString().slice(0, 10), subtitle: "", entityHref: "/biblioteca", productId: null,
  };
  demoMedia.unshift(item);
  return item;
}

export async function deleteLibraryMedia(id: string) {
  if (isApiMode()) return api.deleteMedia(id);
  const index = demoMedia.findIndex(item => item.id === id);
  if (index >= 0) demoMedia.splice(index, 1);
}
