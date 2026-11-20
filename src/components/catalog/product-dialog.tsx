"use client";

import { useEffect, useState } from "react";
import { Check, Plus, Share2, ShoppingBag } from "lucide-react";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { CatalogDialog } from "@/components/catalog/catalog-dialog";
import { publicCatalogApi } from "@/lib/public-catalog-api";
import { catalogMoney, type CatalogProduct } from "@/lib/catalog";

export function CatalogProductDialog({
  id,
  onClose,
  onAdd,
  inCart,
  onCart,
}: {
  id: string;
  onCart: () => void;
  inCart: number;
  onClose: () => void;
  onAdd: (product: CatalogProduct) => boolean;
}) {
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [error, setError] = useState("");
  const [image, setImage] = useState(0);
  const [added, setAdded] = useState(false);
  const [shared, setShared] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    publicCatalogApi
      .product(id, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setProduct(value);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error
              ? err.message
              : "No pudimos cargar este producto.",
          );
      });
    return () => controller.abort();
  }, [id]);
  const gallery = product?.images?.length
    ? product.images
    : product?.imageUrl
      ? [
          {
            id: "main",
            url: product.imageUrl,
            thumbnailUrl: product.imageUrl,
            alt: product.name,
          },
        ]
      : [];
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({
          title: product?.name,
          url: window.location.href,
        });
      else {
        await navigator.clipboard.writeText(window.location.href);
        setShared(true);
      }
    } catch {
      /* Dismissing the device share sheet leaves the detail open. */
    }
  }
  return (
    <CatalogDialog
      title={product?.name ?? "Detalle del producto"}
      subtitle={product ? product.categoryName : "Cargando…"}
      onClose={onClose}
      wide
      footer={
        product ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xl font-semibold tabular-nums">
                {catalogMoney(product.unitPrice, product.currency)}
              </p>
              {inCart ? (
                <p className="text-xs text-[#6d7c62]">
                  En tu carrito: {inCart}
                </p>
              ) : null}
            </div>
            <div
              className={`grid gap-2 ${inCart ? "grid-cols-2" : "grid-cols-1"}`}
            >
              {inCart ? (
                <button
                  type="button"
                  onClick={onCart}
                  className="catalog-secondary justify-center"
                >
                  <ShoppingBag className="size-4" />
                  Ver carrito
                </button>
              ) : null}
              <button
                type="button"
                disabled={inCart >= Math.min(product.stock, 99)}
                onClick={() => setAdded(onAdd(product))}
                className="catalog-primary justify-center"
              >
                {inCart >= Math.min(product.stock, 99) ? "Agregado" : "Agregar"}
                {inCart >= Math.min(product.stock, 99) ? (
                  <Check className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={onClose} className="catalog-secondary">
            Volver al catálogo
          </button>
        )
      }
    >
      {error ? (
        <p role="alert" className="catalog-error">
          {error}
        </p>
      ) : product ? (
        <div className="grid gap-7 sm:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden rounded-2xl bg-[#ecefe7]">
              <CatalogImage
                src={gallery[image]?.url ?? null}
                alt={gallery[image]?.alt || product.name}
                contain
                eager
              />
            </div>
            {gallery.length > 1 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {gallery.map((item, index) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-label={`Ver foto ${index + 1}`}
                    aria-pressed={image === index}
                    onClick={() => setImage(index)}
                    className={`size-16 shrink-0 overflow-hidden rounded-xl border-2 ${image === index ? "border-[#315f47]" : "border-transparent"}`}
                  >
                    <CatalogImage src={item.thumbnailUrl || item.url} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-5">
            <p className="inline-flex rounded-full bg-[#e7eddf] px-3 py-1 text-xs font-medium text-[#46673f]">
              {product.stock <= 5
                ? `Quedan ${product.stock} unidades`
                : "Disponible"}
            </p>
            <p className="whitespace-pre-line text-sm leading-7 text-[#66736b]">
              {product.description ||
                "Consultanos por WhatsApp si necesitás más información sobre este producto."}
            </p>
            <p className="text-xs text-[#7a847b]">Código: {product.sku}</p>
            <button
              type="button"
              onClick={() => void share()}
              className="catalog-secondary"
            >
              <Share2 className="size-4" />
              {shared ? "Enlace copiado" : "Compartir producto"}
            </button>
            {added ? (
              <p role="status" className="text-sm font-medium text-[#315f47]">
                Listo, lo agregamos a tu carrito.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div
          role="status"
          className="h-72 animate-pulse rounded-2xl bg-[#e8ece3]"
          aria-label="Cargando producto"
        />
      )}
    </CatalogDialog>
  );
}
