"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowRight,
  Check,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { CatalogCartDialog } from "@/components/catalog/cart-dialog";
import { CatalogProductDialog } from "@/components/catalog/product-dialog";
import { publicCatalogApi, PublicCatalogError } from "@/lib/public-catalog-api";
import {
  catalogMoney,
  type CatalogCartLine,
  type CatalogCheckoutResult,
  type CatalogFilters,
  type CatalogInfo,
  type CatalogProduct,
} from "@/lib/catalog";
import {
  MAX_CART_LINES,
  cartLine,
  readCatalogCart,
  saveCatalogCart,
} from "@/lib/catalog-cart";

export function PublicCatalog() {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    attempt: number;
    info?: CatalogInfo;
    error?: string;
    closed?: boolean;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    publicCatalogApi
      .info(controller.signal)
      .then((info) => {
        if (!controller.signal.aborted) setResult({ attempt, info });
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setResult({
            attempt,
            error:
              err instanceof Error
                ? err.message
                : "No pudimos cargar el catálogo.",
            closed: err instanceof PublicCatalogError && err.status === 404,
          });
      });
    return () => controller.abort();
  }, [attempt]);
  const current = result?.attempt === attempt ? result : null;
  if (!current)
    return (
      <div className="catalog-surface flex min-h-dvh flex-col items-center justify-center gap-5">
        <ShoppingBag className="size-12 animate-pulse text-[#6c8b60]" />
        <p className="text-sm text-[#66736b]" role="status">
          Estamos abriendo el catálogo…
        </p>
      </div>
    );
  if (!current.info)
    return (
      <main className="catalog-surface flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-md text-center">
          <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-[#e8eddf]">
            <ShoppingBag className="size-8 text-[#6a835e]" />
          </span>
          <h1 className="mt-7 font-display text-3xl font-semibold">
            {current.closed
              ? "Volvemos pronto"
              : "No pudimos abrir el catálogo"}
          </h1>
          <p className="mt-4 text-base leading-7 text-[#66736b]">
            {current.closed
              ? "El local está preparando su catálogo. Volvé a visitarnos más tarde."
              : current.error}
          </p>
          <button
            type="button"
            className="catalog-secondary mx-auto mt-7"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Volver a intentar
          </button>
        </div>
      </main>
    );
  return <CatalogStorefront key={current.info.id} info={current.info} />;
}

function CatalogStorefront({ info }: { info: CatalogInfo }) {
  const params = useSearchParams();
  const [q, setQ] = useState(() => params.get("buscar")?.slice(0, 100) || "");
  const [search, setSearch] = useState(q);
  const [category, setCategory] = useState(
    () => params.get("categoria")?.slice(0, 64) || "",
  );
  const [sort, setSort] = useState<CatalogFilters["sort"]>(() => {
    const value = params.get("orden");
    return ["price_asc", "price_desc", "recent"].includes(value ?? "")
      ? (value as CatalogFilters["sort"])
      : "name";
  });
  const [lines, setLines] = useState<CatalogCartLine[]>(() =>
    readCatalogCart(info.id),
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<CatalogCheckoutResult | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const openedProduct = useRef(false);
  const productId = params.get("producto");
  useEffect(() => {
    saveCatalogCart(info.id, lines);
  }, [info.id, lines]);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(q.trim());
      const url = new URL(window.location.href);
      if (q.trim()) url.searchParams.set("buscar", q.trim());
      else url.searchParams.delete("buscar");
      window.history.replaceState(null, "", url);
    }, 250);
    return () => clearTimeout(timeout);
  }, [q]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timeout);
  }, [notice]);
  const filterKey = JSON.stringify([search, category, sort, info.currency]);
  const [cursor, setCursor] = useState({ key: filterKey, page: 1 });
  if (cursor.key !== filterKey) setCursor({ key: filterKey, page: 1 });
  const page = cursor.key === filterKey ? cursor.page : 1;
  const [retry, setRetry] = useState(0);
  const requestKey = `${filterKey}:${page}:${retry}`;
  const [result, setResult] = useState<{
    key: string;
    filters: string;
    items: CatalogProduct[];
    hasMore: boolean;
    error?: string;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    publicCatalogApi
      .products(
        { page, pageSize: 24, q: search, category, sort },
        controller.signal,
      )
      .then((data) => {
        if (controller.signal.aborted) return;
        setResult((previous) => {
          const items =
            page > 1 && previous?.filters === filterKey
              ? [...previous.items, ...data.items]
              : data.items;
          return {
            key: requestKey,
            filters: filterKey,
            items: [...new Map(items.map((item) => [item.id, item])).values()],
            hasMore: data.hasMore,
          };
        });
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setResult((previous) => ({
            key: requestKey,
            filters: filterKey,
            items: previous?.filters === filterKey ? previous.items : [],
            hasMore: true,
            error:
              err instanceof Error
                ? err.message
                : "No pudimos cargar los productos.",
          }));
      });
    return () => controller.abort();
    // requestKey includes all filters, page and retry. No private providers are mounted here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);
  const items = result?.filters === filterKey ? result.items : [];
  const loading = result?.key !== requestKey;
  const error = !loading ? result?.error : undefined;
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce(
    (sum, line) =>
      sum + (Math.round(line.unitPrice * 100) * line.quantity) / 100,
    0,
  );
  function filters(nextCategory: string, nextSort: CatalogFilters["sort"]) {
    setCategory(nextCategory);
    setSort(nextSort);
    const url = new URL(window.location.href);
    if (nextCategory) url.searchParams.set("categoria", nextCategory);
    else url.searchParams.delete("categoria");
    if (nextSort !== "name") url.searchParams.set("orden", nextSort);
    else url.searchParams.delete("orden");
    window.history.replaceState(null, "", url);
  }
  function openProduct(id: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("producto", id);
    openedProduct.current = true;
    window.history.pushState(null, "", url);
  }
  function closeProduct() {
    if (openedProduct.current) {
      openedProduct.current = false;
      window.history.back();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete("producto");
      window.history.replaceState(null, "", url);
    }
  }
  function add(product: CatalogProduct) {
    const existing = lines.find((line) => line.productId === product.id);
    if (!existing && lines.length >= MAX_CART_LINES) {
      setNotice("Podés elegir hasta 30 productos distintos por pedido.");
      return false;
    }
    if (existing && existing.quantity >= Math.min(product.stock, 99)) {
      setNotice(
        "Ya agregaste todas las unidades disponibles de este producto.",
      );
      return false;
    }
    setLines((previous) => {
      const found = previous.find((line) => line.productId === product.id);
      return found
        ? previous.map((line) =>
            line.productId === product.id
              ? {
                  ...cartLine(
                    product,
                    Math.min(found.quantity + 1, product.stock, 99),
                  ),
                }
              : line,
          )
        : [...previous, cartLine(product)];
    });
    setNotice(`${product.name} se agregó a tu carrito.`);
    return true;
  }
  return (
    <div className="catalog-surface min-h-dvh pb-28 sm:pb-10">
      {info.demo ? (
        <div className="bg-[#e9eddc] px-4 py-2 text-center text-xs text-[#64704e]">
          Catálogo de demostración · Los pedidos se habilitan en el catálogo
          conectado del local.
        </div>
      ) : null}
      <header className="sticky top-0 z-30 border-b border-[#e1e6da]/80 bg-[#faf9f6]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl sm:h-20 items-center justify-between gap-4 px-5 sm:px-8">
          <a
            href="/tienda"
            className="flex min-w-0 items-center gap-3"
            aria-label={`${info.name}, inicio del catálogo`}
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#2e523c] font-display text-xl text-[#f7f8ee]">
              {info.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0">
              <strong className="block truncate font-display text-lg font-semibold">
                {info.name}
              </strong>
              <span className="block text-[11px] uppercase tracking-[0.18em] text-[#7d8776]">
                Tienda online
              </span>
            </span>
          </a>
          <button
            type="button"
            className="catalog-secondary shrink-0 gap-2 !rounded-full"
            onClick={() => setCartOpen(true)}
            aria-label={`Abrir carrito, ${count} productos`}
          >
            <ShoppingBag className="size-[18px]" />
            <span className="hidden text-sm sm:inline">Mi carrito</span>
            <span className="flex min-w-6 items-center justify-center rounded-full bg-[#2e523c] px-1.5 py-0.5 text-xs font-semibold text-white">
              {count}
            </span>
          </button>
        </div>
        <label className="catalog-mobile-search relative mx-4 mb-3 block sm:hidden">
          <span className="sr-only">Buscar producto o código</span>
          <Search className="pointer-events-none absolute left-4 top-3.5 size-4 text-[#7b8a72]" />
          <input
            type="search"
            value={q}
            maxLength={100}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscá tu próximo favorito"
            className="h-11 w-full rounded-2xl border border-[#dce3d3] bg-white pl-11 pr-4 text-base outline-none focus:ring-2 focus:ring-[#9bb582]"
          />
        </label>
      </header>
      <main className="mx-auto max-w-7xl px-5 sm:px-8">
        <section className="grid items-center gap-8 py-7 sm:py-16 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20">
          <div>
            <p className="mb-3 flex items-center sm:mb-5 gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7c57]">
              <span className="size-1.5 rounded-full bg-[#7c9a64]" />
              Elegí con calma. Pedí fácil.
            </p>
            <h1 className="max-w-2xl font-display text-[clamp(2.15rem,5.2vw,4.5rem)] font-medium leading-[1.08] tracking-[-0.045em]">
              Tus favoritos,
              <br />
              <span className="text-[#648052]">a un mensaje.</span>
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 sm:mt-6 sm:text-base sm:leading-7 text-[#72806e] sm:text-lg">
              {info.welcomeText}
            </p>
            <div className="mt-4 flex flex-wrap sm:mt-7 items-center gap-x-5 gap-y-3 text-xs text-[#66736b]">
              <span className="flex items-center gap-1.5">
                <Check className="size-4 text-[#6d8857]" />
                Sin crear una cuenta
              </span>
              <span className="flex items-center gap-1.5">
                <MessageCircle className="size-4 text-[#6d8857]" />
                Atención directa del local
              </span>
            </div>
            <a
              href="#productos"
              className="catalog-primary mt-5 gap-3 !rounded-full sm:mt-8"
            >
              Explorar productos
              <ArrowDown className="size-4" />
            </a>
          </div>
          <div className="relative hidden min-h-72 overflow-hidden rounded-[2rem] bg-[#e8eddf] p-8 sm:block sm:min-h-64 lg:min-h-80 lg:p-10">
            <div
              aria-hidden="true"
              className="absolute -right-10 -top-14 size-52 rounded-full border-[30px] border-[#dce5cc]/80"
            />
            <MessageCircle
              aria-hidden="true"
              className="relative mb-6 size-10 text-[#5a7549]"
              strokeWidth={1.3}
            />
            <p className="relative max-w-xs font-display text-3xl font-medium leading-tight tracking-tight text-[#3e5636]">
              Un carrito.
              <br />
              Una conversación.
              <br />
              Tu próximo pedido.
            </p>
            <div className="relative mt-7 flex items-center gap-3 text-[11px] uppercase tracking-[0.12em] text-[#748366]">
              <span className="h-px w-8 bg-[#a5b58f]" />
              Hecho para comprar cerca
            </div>
          </div>
        </section>
        {lastOrder ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#e7eedf] px-5 py-4 text-sm">
            <span>
              Tu pedido{" "}
              <strong>#{lastOrder.order.id.slice(-8).toUpperCase()}</strong>{" "}
              está preparado para WhatsApp.
            </span>
            <a
              href={lastOrder.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-[#315f47]"
            >
              Volver a abrir
              <MessageCircle className="size-4" />
            </a>
          </div>
        ) : null}
        <section
          id="productos"
          className="scroll-mt-36 sm:scroll-mt-24 border-t border-[#e0e5d9] pt-8"
        >
          <div className="mb-4 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#87907b]">
                Encontrá eso que buscás
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
                Elegí tus favoritos{" "}
                <span className="ml-1 align-middle font-sans text-sm font-normal text-[#8b957f]">
                  {info.total} productos
                </span>
              </h2>
            </div>
            <label className="relative hidden w-full sm:block sm:max-w-sm">
              <span className="sr-only">Buscar por producto o código</span>
              <Search className="pointer-events-none absolute left-4 top-3.5 size-[18px] text-[#8c977f]" />
              <input
                type="search"
                value={q}
                maxLength={100}
                onChange={(event) => setQ(event.target.value)}
                placeholder="¿Qué estás buscando?"
                className="h-12 w-full rounded-full border border-[#dce3d3] bg-white pl-11 pr-5 text-sm outline-none transition focus:border-[#708a5a] focus:ring-2 focus:ring-[#dce7d2]"
              />
            </label>
          </div>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0"
              role="group"
              aria-label="Filtrar por categoría"
            >
              {[
                { id: "", name: "Todo", count: info.total },
                ...info.categories,
              ].map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => filters(cat.id, sort)}
                  aria-pressed={category === cat.id}
                  className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-medium transition ${category === cat.id ? "border-[#31523c] bg-[#31523c] text-white" : "border-[#e1e6d9] bg-transparent text-[#77826e] hover:border-[#a6b592]"}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <label className="flex shrink-0 items-center gap-2 text-xs text-[#78846d]">
              <SlidersHorizontal className="size-3.5" />
              <span className="sr-only">Ordenar productos</span>
              <select
                value={sort}
                onChange={(event) =>
                  filters(
                    category,
                    event.target.value as CatalogFilters["sort"],
                  )
                }
                className="max-w-full bg-transparent py-2 outline-none focus-visible:ring-2 focus-visible:ring-[#81996c]"
              >
                <option value="name">Nombre A–Z</option>
                <option value="recent">Más recientes</option>
                <option value="price_asc">Menor precio</option>
                <option value="price_desc">Mayor precio</option>
              </select>
            </label>
          </div>
          {search || category ? (
            <div className="mb-3 flex items-center sm:mb-5 justify-between gap-4 text-sm text-[#78846d]">
              <p>
                {search
                  ? `Resultados para “${search}”`
                  : info.categories.find((cat) => cat.id === category)?.name}
              </p>
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  filters("", sort);
                }}
                className="inline-flex shrink-0 items-center gap-1 underline underline-offset-4"
              >
                <X className="size-3.5" />
                Limpiar filtros
              </button>
            </div>
          ) : null}
          {error ? (
            <div
              role="alert"
              className="catalog-error mb-6 flex flex-wrap items-center justify-between gap-3"
            >
              <p>{error}</p>
              <button
                type="button"
                className="font-medium underline"
                onClick={() => setRetry((value) => value + 1)}
              >
                Reintentar
              </button>
            </div>
          ) : null}
          {!loading && !error && !items.length ? (
            <div className="rounded-3xl border border-dashed border-[#d7decb] py-20 text-center">
              <Search className="mx-auto size-9 text-[#a2ae95]" />
              <h3 className="mt-5 font-display text-xl">
                {search || category
                  ? "No encontramos coincidencias"
                  : "Estamos preparando nuestros productos"}
              </h3>
              <p className="mx-auto mt-2 max-w-sm px-5 text-sm leading-6 text-[#849079]">
                {search || category
                  ? "Probá con otro nombre, un código o explorá todas las categorías."
                  : "Volvé a visitarnos pronto para descubrir el catálogo."}
              </p>
              {search || category ? (
                <button
                  type="button"
                  className="catalog-secondary mx-auto mt-6"
                  onClick={() => {
                    setQ("");
                    filters("", "name");
                  }}
                >
                  Ver todos los productos
                </button>
              ) : null}
            </div>
          ) : null}
          <div
            className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
            aria-busy={loading}
          >
            {items.map((product) => {
              const inCart =
                lines.find((line) => line.productId === product.id)?.quantity ??
                0;
              return (
                <CatalogCard
                  key={product.id}
                  product={product}
                  inCart={inCart}
                  onOpen={() => openProduct(product.id)}
                  onAdd={() => add(product)}
                />
              );
            })}
            {loading && !items.length
              ? Array.from({ length: 8 }, (_, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-3xl bg-white p-3"
                    aria-hidden="true"
                  >
                    <div className="aspect-square animate-pulse rounded-2xl bg-[#e9ede2]" />
                    <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-[#e9ede2]" />
                    <div className="mb-3 mt-3 h-4 w-1/2 animate-pulse rounded bg-[#e9ede2]" />
                  </div>
                ))
              : null}
          </div>
          {loading ? (
            <p
              role="status"
              className="mt-6 text-center text-sm text-[#7c8c71]"
            >
              Cargando productos…
            </p>
          ) : result?.hasMore && !error ? (
            <div className="mt-10 text-center">
              <button
                type="button"
                className="catalog-secondary mx-auto gap-3 !rounded-full"
                onClick={() => setCursor({ key: filterKey, page: page + 1 })}
              >
                Ver más productos
                <Plus className="size-4" />
              </button>
              <p className="mt-3 text-xs text-[#8d987f]">
                Mostrando {items.length} productos
              </p>
            </div>
          ) : null}
        </section>
        <section
          className="my-14 grid gap-5 rounded-3xl bg-[#edeedf] p-6 sm:grid-cols-3 sm:p-8"
          aria-label="Cómo pedir"
        >
          {[
            {
              n: "01",
              title: "Encontrá tus favoritos",
              text: "Explorá por categoría o buscá por nombre y código.",
            },
            {
              n: "02",
              title: "Armá tu carrito",
              text: "Elegí las cantidades. Podés revisar todo antes de continuar.",
            },
            {
              n: "03",
              title: "Hablemos por WhatsApp",
              text: "Enviá tu pedido al local y coordiná los próximos pasos.",
            },
          ].map((step) => (
            <div key={step.n} className="flex gap-4">
              <span className="pt-0.5 font-display text-lg text-[#8a9977]">
                {step.n}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-[#465c3e]">
                  {step.title}
                </h3>
                <p className="mt-1 text-xs leading-6 text-[#869076]">
                  {step.text}
                </p>
              </div>
            </div>
          ))}
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-[#e0e5d9] py-8 text-xs text-[#87917c]">
          <p className="font-display text-base font-medium text-[#54694a]">
            {info.name}
          </p>
          {info.address ? (
            <p className="flex max-w-md items-center gap-2">
              <MapPin className="size-4 shrink-0" />
              {info.address}
            </p>
          ) : (
            <p>Comprá cerca. Coordiná directo con el local.</p>
          )}
          <span>Catálogo y pedidos por WhatsApp</span>
        </footer>
      </main>
      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-28 left-1/2 z-40 w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 rounded-2xl bg-[#243e2c] px-5 py-3 text-center text-sm text-white shadow-xl sm:bottom-7"
        >
          {notice}
        </div>
      ) : null}
      {count ? (
        <div className="catalog-cart-bar fixed inset-x-0 bottom-0 z-30 border-t border-[#d9e1ce] bg-[#faf9f6]/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:hidden">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="catalog-primary w-full justify-between !rounded-2xl"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="size-4" />
              Ver carrito <span className="text-xs opacity-70">({count})</span>
            </span>
            <span className="flex items-center gap-3 tabular-nums">
              {catalogMoney(total, info.currency)}
              <ArrowRight className="size-4" />
            </span>
          </button>
        </div>
      ) : null}
      {productId && !cartOpen ? (
        <CatalogProductDialog
          key={productId}
          id={productId}
          onClose={closeProduct}
          onAdd={add}
          onCart={() => {
            closeProduct();
            setCartOpen(true);
          }}
          inCart={
            lines.find((line) => line.productId === productId)?.quantity ?? 0
          }
        />
      ) : null}
      {cartOpen ? (
        <CatalogCartDialog
          info={info}
          lines={lines}
          onLines={setLines}
          onClose={() => setCartOpen(false)}
          onPrepared={setLastOrder}
        />
      ) : null}
    </div>
  );
}
function CatalogCard({
  product,
  inCart,
  onOpen,
  onAdd,
}: {
  product: CatalogProduct;
  inCart: number;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const maximum = inCart >= Math.min(product.stock, 99);
  return (
    <article className="group min-w-0 overflow-hidden rounded-[1.35rem] border border-[#e9ecdf] bg-white p-2.5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_15px_40px_-25px_#4a633a55] sm:rounded-3xl sm:p-3">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ver ${product.name}`}
        className="relative block aspect-square w-full overflow-hidden rounded-[1rem] bg-[#f0f1e9] sm:rounded-2xl"
      >
        <span className="block size-full p-3 transition duration-500 group-hover:scale-105">
          <CatalogImage src={product.imageUrl} alt={product.name} contain />
        </span>
        {product.stock <= 5 ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-medium text-[#63794e] shadow-sm">
            Últimas {product.stock} unidades
          </span>
        ) : null}
      </button>
      <div className="px-1 pb-1 pt-4 sm:px-2 sm:pb-2">
        <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-[#8f9b7e]">
          {product.categoryName}
        </p>
        <h3 className="mt-1.5 min-h-10 text-sm font-medium leading-5 text-[#354a32]">
          <button
            type="button"
            onClick={onOpen}
            className="line-clamp-2 text-left hover:underline"
          >
            {product.name}
          </button>
        </h3>
        <p className="mt-2 truncate text-base font-semibold tracking-tight tabular-nums text-[#30482c] sm:text-lg">
          {catalogMoney(product.unitPrice, product.currency)}
        </p>
        <button
          type="button"
          onClick={onAdd}
          disabled={maximum}
          aria-label={
            maximum
              ? `${product.name}, cantidad máxima agregada`
              : `Agregar ${product.name} al carrito`
          }
          className={`mt-4 flex min-h-11 w-full items-center justify-between gap-1 rounded-full px-3 py-2 text-xs font-medium transition disabled:cursor-default sm:px-4 sm:text-xs ${inCart ? "bg-[#e6eddd] text-[#537345]" : "bg-[#f0f2e9] text-[#5c754d] hover:bg-[#e1e9d5]"}`}
        >
          <span>{inCart ? `En carrito (${inCart})` : "Agregar"}</span>
          {maximum ? (
            <Check className="size-3.5 shrink-0" />
          ) : (
            <Plus className="size-3.5 shrink-0" />
          )}
        </button>
      </div>
    </article>
  );
}
