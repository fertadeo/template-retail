"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Printer, QrCode, X } from "lucide-react";
import { ImageLightbox } from "@/components/image-lightbox";
import { ModalPortal } from "@/components/modal-portal";
import { ProductHealthDot } from "@/components/status-dot";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { productHealth } from "@/lib/product-health";
import { listChannels, listPriceLists } from "@/lib/store";
import { useRetailQuery } from "@/lib/use-retail-query";
import {
  barcodeSvgDataUrl,
  printProductLabel,
  productBarcodeValue,
  productQrPayload,
  qrDataUrl,
} from "@/lib/product-codes";
import {
  CATEGORY_LABELS,
  productImageSrc,
  type Product,
} from "@/lib/types";
import { cn, formatMxn } from "@/lib/utils";

/** URL pública del producto en WooCommerce (WP redirige ?p= al permalink). */
export function wooProductStoreUrl(
  storeUrl: string | null | undefined,
  externalId: string | null | undefined
): string | null {
  const base = (storeUrl ?? "").trim().replace(/\/$/, "");
  const id = (externalId ?? "").trim();
  if (!base || !id) return null;
  return `${base}/?p=${encodeURIComponent(id)}`;
}

export function ProductDetailModal({
  product,
  onClose,
  onEdit,
}: {
  product: Product;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [qrSrc, setQrSrc] = useState<string>("");
  const [barcodeSrc, setBarcodeSrc] = useState<string>("");
  const [copies, setCopies] = useState("1");
  const [printError, setPrintError] = useState<string | null>(null);
  const [printing, setPrinting] = useState<"barcode" | "qr" | null>(null);
  const [activeSrc, setActiveSrc] = useState<string | null>(
    productImageSrc(product.imagenPrincipal)
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const {
    data: lists,
    loading: listsLoading,
    error: listsError,
  } = useRetailQuery(() => listPriceLists(true), []);
  const { data: channels } = useRetailQuery(() => listChannels(), []);
  const code = productBarcodeValue(product);
  const health = useMemo(() => productHealth(product), [product]);

  const gallery = useMemo(() => {
    const items: Array<{ id: string; src: string; title: string }> = [];
    const primary = productImageSrc(product.imagenPrincipal);
    if (product.imagenPrincipal && primary) {
      items.push({
        id: product.imagenPrincipal.id,
        src: primary,
        title: product.imagenPrincipal.title || product.nombre,
      });
    }
    for (const img of product.imagenesSecundarias ?? []) {
      const src = productImageSrc(img);
      if (!src) continue;
      items.push({
        id: img.id,
        src,
        title: img.title || img.filename,
      });
    }
    return items;
  }, [product]);

  const wooStoreUrl = useMemo(() => {
    const woo = channels?.find((c) => c.channel === "woocommerce");
    const link = product.channelLinks?.find((l) => l.channel === "woocommerce");
    return wooProductStoreUrl(woo?.storeUrl, link?.externalId);
  }, [channels, product.channelLinks]);

  useEffect(() => {
    setActiveSrc(productImageSrc(product.imagenPrincipal) ?? gallery[0]?.src ?? null);
  }, [product, gallery]);

  useEffect(() => {
    let cancelled = false;
    setBarcodeSrc(barcodeSvgDataUrl(code));
    qrDataUrl(productQrPayload(product), 200)
      .then((url) => {
        if (!cancelled) setQrSrc(url);
      })
      .catch(() => {
        if (!cancelled) setQrSrc("");
      });
    return () => {
      cancelled = true;
    };
  }, [product, code]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && lightboxIndex == null) onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, lightboxIndex]);

  function openLightboxAtSrc(src: string) {
    const idx = gallery.findIndex((g) => g.src === src);
    setLightboxIndex(idx >= 0 ? idx : 0);
  }

  async function handlePrint(mode: "barcode" | "qr") {
    setPrintError(null);
    setPrinting(mode);
    try {
      await printProductLabel(product, {
        mode,
        copies: Number(copies) || 1,
      });
    } catch (e) {
      setPrintError(
        e instanceof Error ? e.message : "No se pudo imprimir la etiqueta."
      );
    } finally {
      setPrinting(null);
    }
  }

  return (
    <>
    <ModalPortal>
      <div
        className="fixed inset-0 z-[200] flex h-dvh w-screen flex-col bg-charcoal/55 p-0 backdrop-blur-[2px] sm:p-3"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
        onClick={() => {
          if (lightboxIndex == null) onClose();
        }}
      >
        <div
          className="flex h-full min-h-0 w-full max-w-none flex-1 flex-col overflow-hidden bg-card shadow-2xl ring-1 ring-border/80 sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Ficha de producto
              </p>
              <h2
                id="product-detail-title"
                className="font-display text-2xl font-semibold tracking-tight text-charcoal sm:text-3xl"
              >
                {product.nombre}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="font-mono text-xs text-teal">{product.sku}</p>
                <ProductHealthDot health={health} />
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid min-h-full gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <section className="space-y-3 border-b border-border/60 bg-muted/20 p-4 sm:p-6 lg:border-b-0 lg:border-r">
                <div className="overflow-hidden rounded-2xl bg-background ring-1 ring-border/70">
                  {activeSrc ? (
                    <button
                      type="button"
                      className="group relative block w-full cursor-zoom-in"
                      onClick={() => openLightboxAtSrc(activeSrc)}
                      title="Ver en pantalla completa"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeSrc}
                        alt={product.nombre}
                        className="aspect-[4/3] w-full object-contain bg-[#f7f4ee] sm:aspect-[16/11]"
                      />
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/50 to-transparent px-3 py-2 text-left text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                        Clic para pantalla completa
                        {gallery.length > 1
                          ? ` · ${gallery.length} fotos`
                          : ""}
                      </span>
                    </button>
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center text-sm text-muted-foreground sm:aspect-[16/11]">
                      Sin imagen
                    </div>
                  )}
                </div>
                {gallery.length > 1 ? (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {gallery.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setActiveSrc(img.src)}
                        onDoubleClick={() => openLightboxAtSrc(img.src)}
                        className={cn(
                          "size-16 shrink-0 overflow-hidden rounded-lg ring-1 transition sm:size-20",
                          activeSrc === img.src
                            ? "ring-teal"
                            : "ring-border/60 hover:ring-border"
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.src}
                          alt={img.title}
                          className="size-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}

                {product.descripcion ? (
                  <div className="rounded-xl bg-card/80 px-4 py-3 ring-1 ring-border/60">
                    <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                      Descripción
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-charcoal">
                      {product.descripcion}
                    </p>
                  </div>
                ) : null}
              </section>

              <section className="space-y-5 p-4 sm:p-6">
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div className="rounded-xl bg-muted/50 px-3 py-2.5">
                    <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                      Categoría
                    </dt>
                    <dd className="mt-0.5 font-medium">
                      {CATEGORY_LABELS[product.categoria]}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-muted/50 px-3 py-2.5">
                    <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                      Stock
                    </dt>
                    <dd className="mt-0.5 font-medium tabular-nums">
                      {product.stock}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-muted/50 px-3 py-2.5">
                    <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                      Precio default
                    </dt>
                    <dd className="mt-0.5 font-display text-lg font-semibold tabular-nums text-teal">
                      {formatMxn(product.precio)}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-muted/50 px-3 py-2.5">
                    <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                      Estado
                    </dt>
                    <dd className="mt-0.5 font-medium">
                      {product.activo ? "Activo" : "Inactivo"}
                    </dd>
                  </div>
                </dl>

                <div className="rounded-xl border border-border/70 bg-background/50 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                    Precios por lista
                  </p>
                  <ul className="mt-2 divide-y divide-border/50 text-sm">
                    {(lists ?? []).map((pl) => (
                      <li
                        key={pl.id}
                        className="flex justify-between gap-2 py-2 tabular-nums first:pt-0 last:pb-0"
                      >
                        <span className="text-muted-foreground">
                          {pl.nombre}
                          {pl.esDefault ? " · default" : ""}
                        </span>
                        <span className="font-medium">
                          {formatMxn(product.precios[pl.id] ?? product.precio)}
                        </span>
                      </li>
                    ))}
                    {listsLoading ? (
                      <li className="text-muted-foreground">Cargando…</li>
                    ) : listsError ? (
                      <li className="text-destructive">{listsError}</li>
                    ) : null}
                  </ul>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-white p-4 text-center">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                      Código de barras
                    </p>
                    {barcodeSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={barcodeSrc}
                        alt={`Código de barras ${code}`}
                        className="mx-auto h-auto w-full max-w-[280px]"
                      />
                    ) : (
                      <p className="py-8 text-xs text-muted-foreground">
                        Generando…
                      </p>
                    )}
                    <p className="mt-1 font-mono text-xs text-charcoal">{code}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-white p-4 text-center">
                    <p className="mb-2 flex items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                      <QrCode className="size-3" />
                      Código QR
                    </p>
                    {qrSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrSrc}
                        alt={`QR ${code}`}
                        className="mx-auto size-[160px]"
                      />
                    ) : (
                      <p className="py-8 text-xs text-muted-foreground">
                        Generando…
                      </p>
                    )}
                    <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                      {productQrPayload(product)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-teal/30 bg-teal-soft/40 px-4 py-4">
                  <p className="font-medium text-charcoal">
                    Imprimir etiquetas térmicas
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    80 mm · trabajos separados: barras CODE128 o QR · driver del
                    sistema
                  </p>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div className="w-20 space-y-1">
                      <label
                        className="text-[11px] text-muted-foreground"
                        htmlFor="label-copies"
                      >
                        Copias
                      </label>
                      <Input
                        id="label-copies"
                        type="number"
                        min={1}
                        max={20}
                        value={copies}
                        onChange={(e) => setCopies(e.target.value)}
                        className="h-9 tabular-nums"
                      />
                    </div>
                    <Button
                      type="button"
                      className="h-9 gap-1.5"
                      disabled={Boolean(printing)}
                      onClick={() => void handlePrint("barcode")}
                    >
                      <Printer className="size-3.5" />
                      {printing === "barcode"
                        ? "Preparando…"
                        : "Imprimir barras"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 gap-1.5"
                      disabled={Boolean(printing)}
                      onClick={() => void handlePrint("qr")}
                    >
                      <QrCode className="size-3.5" />
                      {printing === "qr" ? "Preparando…" : "Imprimir QR"}
                    </Button>
                  </div>
                  {printError ? (
                    <p className="mt-2 text-sm text-destructive">{printError}</p>
                  ) : null}
                </div>
              </section>
            </div>
          </div>

          <footer className="flex shrink-0 flex-wrap gap-2 border-t border-border/60 px-4 py-3 sm:px-6">
            {wooStoreUrl ? (
              <a
                href={wooStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir ficha en WooCommerce"
                className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
              >
                <ExternalLink className="size-3.5" />
                Ver en sitio web
              </a>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={onClose}
            >
              Cerrar
            </Button>
            <Button
              type="button"
              className="flex-1 sm:ml-auto sm:flex-none"
              onClick={onEdit}
            >
              Editar producto
            </Button>
          </footer>
        </div>
      </div>
    </ModalPortal>

    {lightboxIndex != null && gallery.length > 0 ? (
      <ImageLightbox
        images={gallery}
        index={lightboxIndex}
        subtitle={product.nombre}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    ) : null}
    </>
  );
}
