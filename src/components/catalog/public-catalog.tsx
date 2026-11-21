"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
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
import { CollectionArtwork } from "@/components/catalog/collection-artwork";
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
  const scope = useSearchParams().get("comercioId") ?? "";
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    attempt: number;
    scope: string;
    info?: CatalogInfo;
    error?: string;
    closed?: boolean;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    publicCatalogApi
      .info(controller.signal)
      .then((info) => {
        if (!controller.signal.aborted) setResult({ attempt, scope, info });
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setResult({
            attempt,
            scope,
            error:
              err instanceof Error
                ? err.message
                : "No pudimos cargar el catálogo.",
            closed: err instanceof PublicCatalogError && err.status === 404,
          });
      });
    return () => controller.abort();
  }, [attempt, scope]);
  const current =
    result?.attempt === attempt && result.scope === scope ? result : null;
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
  const collection = params.get("coleccion")?.slice(0, 36) || "";
  const search = params.get("buscar")?.slice(0, 100) || "";
  const category = params.get("categoria")?.slice(0, 64) || "";
  const defaultSort = collection ? "featured" : "name";
  const requestedSort = params.get("orden");
  const sort: CatalogFilters["sort"] = [
    "name",
    "price_asc",
    "price_desc",
    "recent",
    ...(collection ? ["featured"] : []),
  ].includes(requestedSort ?? "")
    ? (requestedSort as CatalogFilters["sort"])
    : defaultSort;
  const [searchDraft, setSearchDraft] = useState({
    base: search,
    value: search,
  });
  if (searchDraft.base !== search)
    setSearchDraft({
      base: search,
      value: searchDraft.value.trim() === search ? searchDraft.value : search,
    });
  const q =
    searchDraft.base === search || searchDraft.value.trim() === search
      ? searchDraft.value
      : search;
  function setQ(value: string) {
    setSearchDraft({ base: search, value });
  }
  const home =
    !collection && !search && !category && params.get("ver") !== "todos";
  const ProductsHeading = home ? "h2" : "h1";
  const selectedCollection = info.collections?.find(
    (item) => item.id === collection,
  );
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
      const url = new URL(window.location.href);
      if (q.trim()) url.searchParams.set("buscar", q.trim());
      else url.searchParams.delete("buscar");
      window.history.replaceState(null, "", url);
    }, 250);
    return () => clearTimeout(timeout);
  }, [q, search]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timeout);
  }, [notice]);
  const filterKey = JSON.stringify([
    search,
    category,
    sort,
    collection,
    info.currency,
  ]);
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
    collectionTitle?: string;
    error?: string;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    publicCatalogApi
      .products(
        { page, pageSize: 24, q: search, category, sort, collection },
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
            collectionTitle: data.collection?.title,
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
    const url = new URL(window.location.href);
    if (nextCategory) url.searchParams.set("categoria", nextCategory);
    else url.searchParams.delete("categoria");
    if (nextSort !== defaultSort) url.searchParams.set("orden", nextSort);
    else url.searchParams.delete("orden");
    window.history.replaceState(null, "", url);
  }
  function browseCollection(id: string | null) {
    const url = new URL(window.location.href);
    for (const key of [
      "producto",
      "categoria",
      "buscar",
      "orden",
      "coleccion",
      "ver",
    ])
      url.searchParams.delete(key);
    if (id) url.searchParams.set("coleccion", id);
    else if (id === "") url.searchParams.set("ver", "todos");
    setQ("");
    window.history.pushState(null, "", url);
    requestAnimationFrame(() => {
      document
        .getElementById(
          id === null ? "store-home-title" : "store-products-heading",
        )
        ?.focus({ preventScroll: true });
      if (id === null) window.scrollTo({ top: 0 });
      else
        document
          .getElementById("productos")
          ?.scrollIntoView({ block: "start" });
    });
  }
  const collectionTitle =
    selectedCollection?.title ||
    (result?.filters === filterKey ? result.collectionTitle : undefined) ||
    "Colección";
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
            href={`/tienda?comercioId=${encodeURIComponent(info.id)}`}
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
      <main className="mx-auto max-w-7xl px-3 sm:px-8">
        {home ? (
          <>
            <section className="py-7 sm:py-10">
              <p className="text-[10px] uppercase tracking-[.18em] text-[#7b866f]">
                Elegí con calma. Pedí fácil.
              </p>
              <h1
                id="store-home-title"
                tabIndex={-1}
                className="mt-2 max-w-3xl font-display text-3xl font-medium tracking-tight sm:text-4xl"
              >
                Encontrá tu próximo favorito.
              </h1>
              {info.welcomeText ? (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#72806e]">
                  {info.welcomeText}
                </p>
              ) : null}
            </section>
            {Boolean(info.collections?.length) ? (
              <section
                aria-labelledby="home-collections-title"
                className="pb-8 sm:pb-12"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2
                    id="home-collections-title"
                    className="font-display text-xl font-medium sm:text-2xl"
                  >
                    Elegí tu estilo
                  </h2>
                  <button
                    type="button"
                    onClick={() => browseCollection("")}
                    className="min-h-11 text-xs font-medium underline underline-offset-4"
                  >
                    Ver todos los productos
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-5 lg:grid-cols-3">
                  {info.collections.map((item, index) => (
                    <a
                      key={item.id}
                      href={`/tienda?${new URLSearchParams({ comercioId: info.id, coleccion: item.id })}`}
                      aria-label={`Ver colección ${item.title}`}
                      className="group block outline-none focus-visible:ring-2 focus-visible:ring-[#56744a] focus-visible:ring-offset-4"
                      onClick={(event) => {
                        if (
                          !event.metaKey &&
                          !event.ctrlKey &&
                          !event.shiftKey &&
                          !event.altKey &&
                          event.button === 0
                        ) {
                          event.preventDefault();
                          browseCollection(item.id);
                        }
                      }}
                    >
                      <CollectionArtwork
                        title={item.title}
                        imageUrl={item.imageUrl}
                        focalX={item.focalX}
                        focalY={item.focalY}
                        eager={index < 2}
                      />
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <button
            type="button"
            onClick={() => browseCollection(null)}
            className="my-4 flex min-h-11 items-center gap-2 text-xs text-[#66736b]"
          >
            <ArrowLeft className="size-4" />
            Volver al inicio
          </button>
        )}
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
              <ProductsHeading
                id="store-products-heading"
                tabIndex={-1}
                className="mt-1 font-display text-2xl font-medium sm:text-3xl"
              >
                {collection ? collectionTitle : "Todos los productos"}{" "}
                <span className="ml-1 align-middle font-sans text-sm font-normal text-[#8b957f]">
                  {collection
                    ? selectedCollection
                      ? `${selectedCollection.count} productos`
                      : ""
                    : `${info.total} productos`}
                </span>
              </ProductsHeading>
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
            {!collection ? (
              <div
                className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0"
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
            ) : null}
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
                {collection ? (
                  <option value="featured">Selección del local</option>
                ) : null}
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
            className="grid grid-cols-2 gap-x-2 gap-y-5 sm:gap-x-5 sm:gap-y-7 md:grid-cols-3 lg:grid-cols-4"
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
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-[1.35rem] border border-[#e9ecdf] bg-white transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_15px_40px_-25px_#4a633a55] sm:rounded-3xl">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ver ${product.name}`}
        className="relative block aspect-[3/4] w-full shrink-0 overflow-hidden bg-[#f0f1e9]"
      >
        <span className="absolute inset-0 block">
          <CatalogImage src={product.imageUrl} alt={product.name} />
        </span>
        {product.stock <= 5 ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-medium text-[#63794e] shadow-sm">
            Últimas {product.stock} unidades
          </span>
        ) : null}
      </button>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-4 sm:px-4 sm:pb-4">
        <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-[#8f9b7e]">
          {product.categoryName}
        </p>
        <h3 className="mt-1.5 h-10 overflow-hidden text-sm font-medium leading-5 text-[#354a32]">
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
