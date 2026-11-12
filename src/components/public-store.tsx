"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Package, Plus, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/api-config";
import type {
  CartLine,
  CatalogPublicPayload,
  CatalogPublicProduct,
} from "@/lib/catalog";
import { cn, formatMxn } from "@/lib/utils";

function productCover(p: CatalogPublicProduct): string | null {
  return p.images?.[0]?.dataUrl || p.imageDataUrl || null;
}

function withComercio(path: string): string {
  const base = apiUrl(path);
  if (typeof window === "undefined") return base;
  const fromQuery = new URLSearchParams(window.location.search).get(
    "comercioId"
  );
  const fromLs = localStorage.getItem("retail360.comercioId");
  const id = fromQuery || fromLs;
  if (!id) return base;
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}comercioId=${encodeURIComponent(id)}`;
}

export function PublicStore({
  fetchUrl = "/catalog/public",
  orderUrl = "/catalog/public/orders",
}: {
  fetchUrl?: string;
  orderUrl?: string;
}) {
  const [payload, setPayload] = useState<CatalogPublicPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [detail, setDetail] = useState<CatalogPublicProduct | null>(null);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerNote, setBuyerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(withComercio(fetchUrl));
        const data = (await res.json()) as CatalogPublicPayload & {
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "No se pudo cargar.");
        if (!cancelled) setPayload(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error de carga.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchUrl]);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 2800);
    return () => window.clearTimeout(t);
  }, [flash]);

  const cartCount = useMemo(
    () => cart.reduce((n, l) => n + l.quantity, 0),
    [cart]
  );
  const cartTotal = useMemo(
    () => cart.reduce((n, l) => n + l.unitPrice * l.quantity, 0),
    [cart]
  );

  function addToCart(p: CatalogPublicProduct, qty = 1) {
    setCart((prev) => {
      const i = prev.findIndex((l) => l.productId === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + qty };
        return next;
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          unitPrice: p.unitPrice,
          currency: p.currency,
          quantity: qty,
          imageDataUrl: productCover(p),
        },
      ];
    });
    setFlash(`${p.name} agregado al carrito`);
    setCartOpen(true);
  }

  function setQty(productId: string, quantity: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId
            ? { ...l, quantity: Math.max(0, quantity) }
            : l
        )
        .filter((l) => l.quantity > 0)
    );
  }

  async function submitOrder() {
    setSubmitting(true);
    try {
      const res = await fetch(withComercio(orderUrl), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          buyerName,
          buyerPhone,
          buyerNote,
          items: cart.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
          })),
        }),
      });
      const data = (await res.json()) as {
        order?: { id: string };
        waUrl?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "No se pudo crear el pedido.");
      setFlash(`Pedido ${data.order?.id || ""} listo`);
      setCheckoutOpen(false);
      setCart([]);
      setCartOpen(false);
      setBuyerName("");
      setBuyerPhone("");
      setBuyerNote("");
      if (data.waUrl) {
        window.open(data.waUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Error al pedir.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#1a1410] text-[#f0e6d8]">
        <p className="font-display text-lg tracking-wide">Cargando tienda…</p>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#1a1410] px-6 text-center text-[#f0e6d8]">
        <p>{error || "Tienda no disponible."}</p>
      </div>
    );
  }

  const brand = payload.branding.name || "Picardías";

  if (!payload.enabled) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#1a1410] text-[#f0e6d8]">
        <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
          <p className="font-display text-5xl font-semibold tracking-tight sm:text-7xl">
            {brand}
          </p>
          <p className="mt-4 max-w-md text-lg text-[#cbbba8]">
            La tienda pública está pausada por ahora.
          </p>
        </div>
      </div>
    );
  }

  const products = payload.products;
  const detailImages =
    detail?.images?.filter((i) => i.dataUrl)?.map((i) => i.dataUrl!) ||
    (detail?.imageDataUrl ? [detail.imageDataUrl] : []);

  return (
    <div className="relative min-h-screen bg-[#1a1410] text-[#f0e6d8]">
      {flash ? (
        <div className="fixed bottom-5 left-1/2 z-[60] max-w-sm -translate-x-1/2 rounded-full bg-[#f0e6d8] px-4 py-2 text-sm text-[#1a1410] shadow-lg">
          {flash}
        </div>
      ) : null}

      <header className="relative z-20 flex items-center justify-between px-5 py-4 sm:px-8">
        <p className="font-display text-xl font-semibold tracking-tight">
          {brand}
        </p>
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="relative inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm backdrop-blur transition hover:bg-white/10"
        >
          <ShoppingBag className="size-4" />
          Carrito
          {cartCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-amber-700 text-[11px] font-semibold text-white">
              {cartCount}
            </span>
          ) : null}
        </button>
      </header>

      <section className="relative z-10 min-h-[70vh] px-5 pb-16 pt-10 sm:px-8 sm:pt-16">
        <div className="mx-auto max-w-6xl">
          <p className="font-display text-[clamp(3rem,11vw,6.5rem)] font-semibold leading-[0.9] tracking-tight">
            {brand}
          </p>
          <p className="mt-5 max-w-xl text-base text-[#cbbba8] sm:text-lg">
            {payload.branding.tagline}. Armá el pedido y confirmalo por WhatsApp.
          </p>
          <a
            href="#catalogo"
            className="mt-8 inline-flex items-center rounded-full bg-amber-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-700"
          >
            Ver catálogo
          </a>
        </div>
      </section>

      <section id="catalogo" className="relative z-10 px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Catálogo
          </h2>
          {products.length === 0 ? (
            <p className="mt-10 text-[#a89884]">Todavía no hay productos.</p>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => {
                const cover = productCover(p);
                return (
                  <article
                    key={p.id}
                    className="group overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#241c16]/85 transition duration-300 hover:-translate-y-1 hover:border-amber-700/50"
                  >
                    <button
                      type="button"
                      className="block w-full text-left"
                      onClick={() => {
                        setDetail(p);
                        setGalleryIdx(0);
                      }}
                    >
                      <div className="aspect-[4/3] bg-black/40">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover}
                            alt={p.name}
                            className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="grid size-full place-items-center text-[#6f675c]">
                            <Package className="size-12 opacity-50" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 p-4">
                        <h3 className="font-medium leading-snug">{p.name}</h3>
                        <p className="font-display text-xl font-semibold tabular-nums">
                          {formatMxn(p.unitPrice)}
                        </p>
                      </div>
                    </button>
                    <div className="px-4 pb-4">
                      <Button
                        type="button"
                        className="w-full rounded-full bg-amber-800 text-white hover:bg-amber-700"
                        onClick={() => addToCart(p)}
                      >
                        Agregar
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {cartOpen ? (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/55"
            onClick={() => setCartOpen(false)}
          />
          <aside className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#221a14] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="font-display text-lg font-semibold">Carrito</h2>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="rounded-full p-2 hover:bg-white/10"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {cart.length === 0 ? (
                <p className="text-sm text-[#a89884]">Vacío por ahora.</p>
              ) : (
                cart.map((l) => (
                  <div
                    key={l.productId}
                    className="flex gap-3 rounded-xl border border-white/10 p-3"
                  >
                    <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-black/30">
                      {l.imageDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={l.imageDataUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{l.name}</p>
                      <p className="mt-0.5 text-sm tabular-nums text-[#cbbba8]">
                        {formatMxn(l.unitPrice)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-white/15 p-1"
                          onClick={() => setQty(l.productId, l.quantity - 1)}
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm tabular-nums">
                          {l.quantity}
                        </span>
                        <button
                          type="button"
                          className="rounded-md border border-white/15 p-1"
                          onClick={() => setQty(l.productId, l.quantity + 1)}
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-white/10 px-5 py-4">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-sm text-[#a89884]">Total</span>
                <span className="font-display text-xl font-semibold tabular-nums">
                  {formatMxn(cartTotal)}
                </span>
              </div>
              <Button
                type="button"
                className="w-full rounded-full bg-amber-800 text-white hover:bg-amber-700"
                disabled={
                  cart.length === 0 || !payload.settings.whatsappConfigured
                }
                onClick={() => setCheckoutOpen(true)}
              >
                Confirmar pedido
              </Button>
            </div>
          </aside>
        </div>
      ) : null}

      {checkoutOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/60"
            onClick={() => !submitting && setCheckoutOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#221a14] p-5 shadow-2xl">
            <h2 className="font-display text-xl font-semibold">Tu pedido</h2>
            <p className="mt-1 text-sm text-[#a89884]">
              Te abrimos WhatsApp con el detalle para el vendedor.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="buyer-name">Nombre</Label>
                <Input
                  id="buyer-name"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="mt-1 border-white/15 bg-black/20"
                />
              </div>
              <div>
                <Label htmlFor="buyer-phone">Teléfono</Label>
                <Input
                  id="buyer-phone"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="mt-1 border-white/15 bg-black/20"
                />
              </div>
              <div>
                <Label htmlFor="buyer-note">Nota (opcional)</Label>
                <Input
                  id="buyer-note"
                  value={buyerNote}
                  onChange={(e) => setBuyerNote(e.target.value)}
                  className="mt-1 border-white/15 bg-black/20"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-white/15 bg-transparent"
                disabled={submitting}
                onClick={() => setCheckoutOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-full bg-amber-800 text-white hover:bg-amber-700"
                disabled={submitting || !buyerName.trim() || !buyerPhone.trim()}
                onClick={() => void submitOrder()}
              >
                {submitting ? "Enviando…" : "Confirmar y WhatsApp"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-40 grid place-items-end p-0 sm:place-items-center sm:p-6">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/65"
            onClick={() => setDetail(null)}
          />
          <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#221a14] sm:rounded-3xl">
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/40 p-2"
            >
              <X className="size-4" />
            </button>
            <div className="aspect-[16/10] bg-black/40">
              {detailImages[galleryIdx] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detailImages[galleryIdx]}
                  alt={detail.name}
                  className="size-full object-cover"
                />
              ) : (
                <div className="grid size-full place-items-center text-[#6f675c]">
                  <Package className="size-16 opacity-40" />
                </div>
              )}
            </div>
            {detailImages.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto px-4 pt-3">
                {detailImages.map((src, i) => (
                  <button
                    key={`${src.slice(0, 24)}-${i}`}
                    type="button"
                    onClick={() => setGalleryIdx(i)}
                    className={cn(
                      "size-14 shrink-0 overflow-hidden rounded-lg border",
                      i === galleryIdx ? "border-amber-600" : "border-white/10"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
            <div className="space-y-3 p-5">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                {detail.name}
              </h2>
              <p className="font-display text-3xl font-semibold tabular-nums">
                {formatMxn(detail.unitPrice)}
              </p>
              {detail.description ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#cbbba8]">
                  {detail.description}
                </p>
              ) : null}
              <Button
                type="button"
                className="mt-2 w-full rounded-full bg-amber-800 text-white hover:bg-amber-700"
                onClick={() => {
                  addToCart(detail);
                  setDetail(null);
                }}
              >
                Agregar al carrito
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
