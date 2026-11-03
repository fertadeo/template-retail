"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { ModalPortal } from "@/components/modal-portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useComercio } from "@/lib/comercio-context";
import { BRANCHES_ENABLED } from "@/lib/features";
import {
  linkWooBySku,
  listBranches,
  listChannels,
  listMeliNotifications,
  listPriceLists,
  meliNotificationsCallback,
  migrateWooPrices,
  pullMeliProducts,
  pullWooProducts,
  pushMeliAll,
  pushWooAll,
  saveChannel,
  usingRemoteApi,
} from "@/lib/store";
import type { Channel, ChannelConfig, Comercio, StockMode } from "@/lib/types";
import { useRetailQuery } from "@/lib/use-retail-query";

type PullSource = "woocommerce" | "mercadolibre";
type PullSummary =
  | Awaited<ReturnType<typeof pullWooProducts>>
  | Awaited<ReturnType<typeof pullMeliProducts>>;
type PullFeedback =
  | { kind: "ok"; text: string; result: PullSummary }
  | { kind: "error"; text: string };

export function ChannelsPanel() {
  const { comercio, comercios, setComercioId } = useComercio();
  const messageRef = useRef<HTMLParagraphElement | null>(null);
  const { data, loading, error, reload } = useRetailQuery(
    () =>
      Promise.all([
        listChannels(),
        listPriceLists(false),
        BRANCHES_ENABLED ? listBranches(true) : Promise.resolve([]),
      ]),
    []
  );
  const channels = data?.[0] ?? [];
  const lists = data?.[1] ?? [];
  const branches = data?.[2] ?? [];
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"ok" | "error">("ok");
  const [busy, setBusy] = useState<string | null>(null);
  const [pullModalOpen, setPullModalOpen] = useState(false);
  const [pullSource, setPullSource] = useState<PullSource | null>(null);
  const [pullPreview, setPullPreview] = useState<PullSummary | null>(null);
  const [pullComercioId, setPullComercioId] = useState<string>("");
  const [pullFeedback, setPullFeedback] = useState<PullFeedback | null>(null);

  function showMessage(text: string, tone: "ok" | "error" = "ok") {
    setMessageTone(tone);
    setMessage(text);
  }

  useEffect(() => {
    if (message) messageRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [message]);

  const woo = channels.find((c) => c.channel === "woocommerce");
  const meli = channels.find((c) => c.channel === "mercadolibre");

  function pullChannelLabel(source: PullSource | null): string {
    return source === "mercadolibre" ? "Mercado Libre" : "WooCommerce";
  }

  function formatPullResult(r: PullSummary, source: PullSource): string {
    const listName =
      ("priceListNombre" in r && r.priceListNombre) ||
      lists.find((l) => l.id === r.priceListId)?.nombre ||
      r.priceListId;
    const errN = r.errors.length;
    const label = pullChannelLabel(source);
    return (
      `${label} → comercio «${r.comercio.nombre}» (${r.comercio.codigo}): ` +
      `${r.found} encontrados, ${r.matched} ya coinciden, ${r.toCreate} nuevos. ` +
      `Lista «${listName}». ` +
      `Resultado: ${r.created} creados, ${r.updated} actualizados, ${r.linked} vinculados` +
      (r.skipped ? `, ${r.skipped} omitidos` : "") +
      `, imágenes: ${r.imagesSynced ?? 0} con foto` +
      ((r.imagesMissing ?? 0) > 0
        ? `, ${r.imagesMissing} sin imagen`
        : "") +
      (errN ? `, ${errN} con error` : "") +
      "." +
      (r.skipSummary ? ` ${r.skipSummary}` : "")
    );
  }

  async function startChannelPull(source: PullSource) {
    if (!usingRemoteApi()) {
      showMessage(
        "Conectá el API (NEXT_PUBLIC_API_URL) para sincronizar.",
        "error"
      );
      return;
    }
    if (source === "woocommerce") {
      if (!woo?.priceListId) {
        showMessage(
          "Antes de traer: guardá una lista de precios de destino en WooCommerce.",
          "error"
        );
        return;
      }
      if (
        BRANCHES_ENABLED &&
        !woo.stockBranchId &&
        woo.stockMode === "branch"
      ) {
        showMessage(
          "Elegí la sucursal destino del stock y guardá la config antes de importar.",
          "error"
        );
        return;
      }
    } else if (!meli?.accessTokenSet && !meli?.configured) {
      showMessage(
        "Antes de traer: cargá el access token de Mercado Libre y guardá.",
        "error"
      );
      return;
    } else if (!meli?.enabled) {
      showMessage("Habilitá el canal Mercado Libre y guardá.", "error");
      return;
    }

    const destId = comercio?.id ?? "";
    setPullSource(source);
    setPullComercioId(destId);
    setPullFeedback(null);
    setPullPreview(null);
    setPullModalOpen(true);
    setBusy("pull");
    setMessage(null);
    try {
      const preview =
        source === "woocommerce"
          ? await pullWooProducts({
              priceListId: woo!.priceListId,
              branchId: BRANCHES_ENABLED ? woo!.stockBranchId : null,
              comercioId: destId || null,
              dryRun: true,
            })
          : await pullMeliProducts({
              priceListId: meli?.priceListId || null,
              comercioId: destId || null,
              dryRun: true,
            });
      setPullPreview(preview);
    } catch (e) {
      const text =
        e instanceof Error
          ? e.message
          : `Error al consultar ${pullChannelLabel(source)}.`;
      setPullFeedback({ kind: "error", text });
      showMessage(text, "error");
    } finally {
      setBusy(null);
    }
  }

  async function runBulk(kind: "woo" | "meli" | "link") {
    if (!usingRemoteApi()) {
      showMessage(
        "Conectá el API (NEXT_PUBLIC_API_URL) para sincronizar.",
        "error"
      );
      return;
    }
    setBusy(kind);
    setMessage(null);
    try {
      if (kind === "link") {
        const r = await linkWooBySku();
        showMessage(
          `WooCommerce: ${r.linked} vinculados, ${r.skipped} omitidos.`
        );
        reload();
      } else if (kind === "woo") {
        const r = await pushWooAll("both");
        const ok = r.results.filter((x) => x.ok).length;
        showMessage(`WooCommerce push: ${ok}/${r.results.length} ok.`);
        reload();
      } else {
        const r = await pushMeliAll("both");
        const ok = r.results.filter((x) => x.ok).length;
        showMessage(`Mercado Libre push: ${ok}/${r.results.length} ok.`);
        reload();
      }
    } catch (e) {
      showMessage(
        e instanceof Error ? e.message : "Error de sync.",
        "error"
      );
    } finally {
      setBusy(null);
    }
  }

  async function refreshPullPreview(nextComercioId: string) {
    if (!pullSource) return;
    if (pullSource === "woocommerce" && !woo?.priceListId) return;
    setPullComercioId(nextComercioId);
    setPullFeedback(null);
    setBusy("pull-preview");
    try {
      const preview =
        pullSource === "woocommerce"
          ? await pullWooProducts({
              priceListId: woo!.priceListId,
              branchId: BRANCHES_ENABLED ? woo!.stockBranchId : null,
              comercioId: nextComercioId || null,
              dryRun: true,
            })
          : await pullMeliProducts({
              priceListId: meli?.priceListId || null,
              comercioId: nextComercioId || null,
              dryRun: true,
            });
      setPullPreview(preview);
    } catch (e) {
      const text =
        e instanceof Error
          ? e.message
          : `Error al consultar ${pullChannelLabel(pullSource)}.`;
      setPullFeedback({ kind: "error", text });
      showMessage(text, "error");
    } finally {
      setBusy(null);
    }
  }

  async function confirmPull() {
    if (!pullSource || !pullPreview) return;
    if (pullSource === "woocommerce" && !woo?.priceListId) return;
    if (pullFeedback?.kind === "ok") return;
    setBusy("pull");
    setPullFeedback(null);
    setMessage(null);
    try {
      const destId = pullComercioId || pullPreview.comercio.id;
      const r =
        pullSource === "woocommerce"
          ? await pullWooProducts({
              priceListId: woo!.priceListId,
              branchId: BRANCHES_ENABLED ? woo!.stockBranchId : null,
              comercioId: destId,
              dryRun: false,
            })
          : await pullMeliProducts({
              priceListId: meli?.priceListId || pullPreview.priceListId || null,
              comercioId: destId,
              dryRun: false,
            });
      const text = formatPullResult(r, pullSource);
      if (destId) setComercioId(destId);
      setPullFeedback({ kind: "ok", text, result: r });
      setPullPreview(r);
      showMessage(text, "ok");
      reload();
    } catch (e) {
      const text = e instanceof Error ? e.message : "Error de sync.";
      setPullFeedback({ kind: "error", text });
      showMessage(text, "error");
    } finally {
      setBusy(null);
    }
  }

  function closePullModal() {
    if (busy === "pull" || busy === "pull-preview") return;
    setPullModalOpen(false);
    setPullSource(null);
    setPullPreview(null);
    setPullFeedback(null);
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Integraciones
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-charcoal">
          Canales
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Conectá WooCommerce y Mercado Libre. Al traer el catálogo elegí el
          comercio destino y la lista de precios; después podés migrar esos
          precios a otra lista. Cada comercio funciona como local único.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando canales…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {message ? (
        <p
          ref={messageRef}
          role="status"
          className={`rounded-lg px-3 py-2 text-sm ${
            messageTone === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-tealSoft/60 text-charcoal"
          }`}
        >
          {message}
        </p>
      ) : null}

      {comercio ? (
        <p className="text-sm text-muted-foreground">
          Comercio activo (destino de importación):{" "}
          <span className="font-medium text-foreground">
            {comercio.nombre}
          </span>{" "}
          <span className="font-mono text-xs text-teal">
            ({comercio.codigo})
          </span>
        </p>
      ) : null}

      {pullModalOpen ? (
        <ChannelPullPreviewModal
          channelLabel={pullChannelLabel(pullSource)}
          preview={pullPreview}
          consulting={busy === "pull" && !pullPreview}
          comercios={comercios}
          selectedComercioId={
            pullComercioId || pullPreview?.comercio.id || comercio?.id || ""
          }
          listName={
            pullPreview
              ? ("priceListNombre" in pullPreview &&
                pullPreview.priceListNombre) ||
                lists.find((l) => l.id === pullPreview.priceListId)?.nombre ||
                pullPreview.priceListId
              : pullSource === "mercadolibre"
                ? lists.find((l) => l.id === meli?.priceListId)?.nombre ||
                  "Mercadolibre (auto)"
                : lists.find((l) => l.id === woo?.priceListId)?.nombre ||
                  woo?.priceListId ||
                  "—"
          }
          listNote={
            pullPreview &&
            "priceListCreated" in pullPreview &&
            pullPreview.priceListCreated
              ? "Se creó la lista Mercadolibre automáticamente."
              : pullSource === "mercadolibre" && !meli?.priceListId
                ? "Si no hay lista en el canal, se usa o crea «Mercadolibre»."
                : null
          }
          busy={busy === "pull" || busy === "pull-preview"}
          importing={busy === "pull" && Boolean(pullPreview)}
          feedback={pullFeedback}
          onCancel={closePullModal}
          onConfirm={() => void confirmPull()}
          onChangeComercio={(id) => void refreshPullPreview(id)}
        />
      ) : null}

      {woo ? (
        <>
          <ChannelForm
            title="WooCommerce"
            config={woo}
            lists={lists}
            branches={branches}
            onSaved={reload}
            actions={
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={Boolean(busy)}
                  onClick={() => void startChannelPull("woocommerce")}
                >
                  {busy === "pull" && pullSource === "woocommerce"
                    ? pullPreview
                      ? "Importando…"
                      : "Consultando WooCommerce…"
                    : "Traer de WooCommerce"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={Boolean(busy)}
                  onClick={() => void runBulk("link")}
                >
                  {busy === "link" ? "…" : "Vincular por SKU"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={Boolean(busy)}
                  onClick={() => void runBulk("woo")}
                >
                  {busy === "woo" ? "…" : "Push todos"}
                </Button>
              </div>
            }
          />
          <WooPriceMigrate
            lists={lists}
            defaultFromId={woo.priceListId}
            busy={busy}
            setBusy={setBusy}
            onDone={(msg) => {
              showMessage(msg, /error|falló|no se pudo/i.test(msg) ? "error" : "ok");
              reload();
            }}
          />
        </>
      ) : null}

      {meli ? (
        <>
          <ChannelForm
            title="Mercado Libre"
            config={meli}
            lists={lists}
            branches={branches}
            onSaved={reload}
            actions={
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={Boolean(busy)}
                  onClick={() => void startChannelPull("mercadolibre")}
                >
                  {busy === "pull" && pullSource === "mercadolibre"
                    ? pullPreview
                      ? "Importando…"
                      : "Consultando Mercado Libre…"
                    : "Traer de Mercado Libre"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={Boolean(busy)}
                  onClick={() => void runBulk("meli")}
                >
                  {busy === "meli" ? "…" : "Push todos"}
                </Button>
              </div>
            }
          />
          <MeliNotificationsPanel />
        </>
      ) : null}
    </div>
  );
}

function MeliNotificationsPanel() {
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);
  const [callbackHint, setCallbackHint] = useState<string>("");
  const [events, setEvents] = useState<
    Awaited<ReturnType<typeof listMeliNotifications>>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function reload() {
    if (!usingRemoteApi()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [cb, list] = await Promise.all([
        meliNotificationsCallback(),
        listMeliNotifications(25),
      ]);
      setCallbackUrl(cb.url);
      setCallbackHint(cb.hint);
      setEvents(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <section className="space-y-3 rounded-xl bg-card/90 p-5 ring-1 ring-border/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-charcoal">
            Notificaciones Mercado Libre
          </h2>
          <p className="text-xs text-muted-foreground">
            Pegá la URL en Developers → callbacks. Tópico: <strong>items</strong>.
            Aurix responde 200 al instante y actualiza productos vinculados.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void reload()}
        >
          Actualizar
        </Button>
      </div>

      <div className="rounded-lg bg-tealSoft/50 px-3 py-3 text-sm">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          Callback URL
        </p>
        {callbackUrl ? (
          <p className="mt-1 break-all font-mono text-xs text-charcoal">
            {callbackUrl}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            {callbackHint ||
              "Definí PUBLIC_BASE_URL en el API (https://tu-api…) y reiniciá."}
          </p>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-hidden rounded-lg ring-1 ring-border/60">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/60 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Cuándo</th>
              <th className="px-3 py-2 font-medium">Tópico</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-muted-foreground">
                  Cargando…
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-muted-foreground">
                  Todavía no llegó ninguna notificación.
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr key={ev.id}>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {new Date(ev.receivedAt).toLocaleString("es-AR")}
                  </td>
                  <td className="px-3 py-2 font-mono">{ev.topic}</td>
                  <td className="px-3 py-2">{ev.status}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {ev.resultMessage || ev.resource}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ChannelPullPreviewModal({
  channelLabel,
  preview,
  consulting,
  comercios,
  selectedComercioId,
  listName,
  listNote,
  busy,
  importing,
  feedback,
  onCancel,
  onConfirm,
  onChangeComercio,
}: {
  channelLabel: string;
  preview: PullSummary | null;
  consulting: boolean;
  comercios: Comercio[];
  selectedComercioId: string;
  listName: string;
  listNote?: string | null;
  busy: boolean;
  importing: boolean;
  feedback: PullFeedback | null;
  onCancel: () => void;
  onConfirm: () => void;
  onChangeComercio: (id: string) => void;
}) {
  const done = feedback?.kind === "ok";
  const result = feedback?.kind === "ok" ? feedback.result : null;
  const locked = consulting || importing;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !locked) onCancel();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [locked, onCancel]);

  const title = done
    ? "Importación completada"
    : consulting
      ? `Consultando ${channelLabel}…`
      : importing
        ? "Importando productos…"
        : "Resumen antes de cargar";

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[200] flex h-dvh w-screen items-center justify-center bg-charcoal/50 p-3 backdrop-blur-[2px] sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="channel-pull-preview-title"
        onClick={() => {
          if (!locked) onCancel();
        }}
      >
        <div
          className="flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-border/80"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Importación {channelLabel}
              </p>
              <h2
                id="channel-pull-preview-title"
                className="font-display text-xl font-semibold tracking-tight text-charcoal"
              >
                {title}
              </h2>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
              onClick={onCancel}
              disabled={locked}
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {consulting ? (
              <div
                role="status"
                className="space-y-3 rounded-xl bg-tealSoft/60 px-4 py-5 text-sm text-charcoal"
              >
                <p className="font-medium">
                  Estamos leyendo el catálogo de {channelLabel}…
                </p>
                <p className="text-muted-foreground">
                  Destino: comercio activo · lista «{listName}». Esto puede
                  tardar con muchos ítems; no cierres esta ventana.
                </p>
                {listNote ? (
                  <p className="text-xs text-muted-foreground">{listNote}</p>
                ) : null}
              </div>
            ) : null}

            {feedback?.kind === "error" ? (
              <div
                role="status"
                className="rounded-xl bg-destructive/10 px-3 py-3 text-sm text-destructive"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] opacity-80">
                  Error
                </p>
                <p className="mt-1 leading-relaxed">{feedback.text}</p>
              </div>
            ) : null}

            {done && result ? (
              <div className="space-y-4" role="status">
                <div className="rounded-xl bg-tealSoft/70 px-3 py-3 text-sm text-charcoal">
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] opacity-80">
                    Listo
                  </p>
                  <p className="mt-1 leading-relaxed">
                    Productos cargados en «{result.comercio.nombre}» (
                    {result.comercio.codigo}). Lista «{listName}».
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                  <Stat label="Creados" value={result.created} emphasize />
                  <Stat label="Actualizados" value={result.updated} emphasize />
                  <Stat label="Vinculados" value={result.linked} />
                  <Stat label="Con foto" value={result.imagesSynced ?? 0} />
                  <Stat label="Sin imagen WC" value={result.imagesMissing ?? 0} />
                  <Stat label="Omitidos" value={result.skipped} />
                </dl>
                {result.errors.length > 0 ? (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {result.errors.length} producto
                    {result.errors.length === 1 ? "" : "s"} con error al
                    importar. Revisá el detalle en el mensaje de la página.
                  </p>
                ) : null}
                {result.skipSummary ? (
                  <p className="text-xs text-muted-foreground">
                    {result.skipSummary}
                  </p>
                ) : null}
              </div>
            ) : null}

            {!done && preview ? (
              <>
                <div className="space-y-2 rounded-xl bg-tealSoft/50 px-3 py-3 text-sm">
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                    A qué comercio van a ser cargados
                  </p>
                  <select
                    className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-charcoal"
                    value={selectedComercioId}
                    disabled={busy}
                    onChange={(e) => onChangeComercio(e.target.value)}
                  >
                    {comercios.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                        {c.rubro ? ` · ${c.rubro}` : ""}
                        {c.esDefault ? " (default)" : ""}
                      </option>
                    ))}
                  </select>
                  <p className="font-mono text-xs text-teal">
                    {preview.comercio.codigo} · {preview.comercio.id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cada comercio es un local independiente (sin depósitos). Al
                    cambiar el destino se recalculan coincidencias por SKU.
                  </p>
                </div>

                <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <Stat label="Encontrados" value={preview.found} />
                  <Stat
                    label="Ya coinciden"
                    value={preview.matched}
                    emphasize
                  />
                  <Stat label="Nuevos" value={preview.toCreate} />
                  <Stat label="Omitidos" value={preview.skipped} />
                </dl>

                <p className="text-sm text-muted-foreground">
                  Elegibles:{" "}
                  <span className="font-medium text-foreground">
                    {preview.eligible}
                  </span>
                  . Lista de precios:{" "}
                  <span className="font-medium text-foreground">{listName}</span>.
                  Stock al comercio destino.
                  {listNote ? ` ${listNote}` : ""}
                </p>

                {(preview.imagesMissing ?? 0) > 0 ? (
                  <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {preview.imagesMissing}
                    </span>{" "}
                    ítems sin URL de imagen usable en el listado. Podés
                    reimportar después para completar fotos.
                  </p>
                ) : null}

                {preview.skipped > 0 ? (
                  <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                      Por qué se omiten
                    </p>
                    <p className="text-sm text-charcoal">
                      {preview.skipSummary ||
                        "Solo se importan productos WooCommerce de tipo «simple»."}
                    </p>
                    <ul className="space-y-2 text-sm">
                      {(preview.skippedByType ?? []).map((row) => (
                        <li
                          key={row.type}
                          className="rounded-lg bg-muted/40 px-2.5 py-2"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-medium">{row.label}</span>
                            <span className="tabular-nums text-muted-foreground">
                              {row.count}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {row.explanation}
                          </p>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground">
                      Los «ya coinciden» se actualizarán (precio/stock/imágenes).
                      Los «nuevos» se crearán. «Nuevos: 0» significa que todos
                      los simples ya existen por SKU en este comercio.
                    </p>
                  </div>
                ) : null}

                {importing ? (
                  <div
                    role="status"
                    className="space-y-1 rounded-xl bg-tealSoft/60 px-3 py-3 text-sm text-charcoal"
                  >
                    <p className="font-medium">
                      Importando {preview.eligible} productos elegibles…
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Con catálogos grandes (imágenes incluidas) puede tardar
                      varios minutos. No cierres esta ventana.
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          <footer className="flex shrink-0 flex-wrap gap-2 border-t border-border/60 px-5 py-3">
            {done || (feedback?.kind === "error" && !preview) ? (
              <Button type="button" onClick={onCancel}>
                Cerrar
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  disabled={busy || !preview}
                  onClick={onConfirm}
                >
                  {importing ? "Importando…" : "Confirmar importación"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={locked}
                  onClick={onCancel}
                >
                  Cancelar
                </Button>
              </>
            )}
          </footer>
        </div>
      </div>
    </ModalPortal>
  );
}

function Stat({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2.5">
      <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-0.5 font-display text-lg font-semibold tabular-nums ${
          emphasize ? "text-teal" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function WooPriceMigrate({
  lists,
  defaultFromId,
  busy,
  setBusy,
  onDone,
}: {
  lists: Array<{ id: string; nombre: string; codigo: string }>;
  defaultFromId: string | null;
  busy: string | null;
  setBusy: (v: string | null) => void;
  onDone: (msg: string) => void;
}) {
  const [fromId, setFromId] = useState(defaultFromId ?? "");
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [toId, setToId] = useState("");
  const [newNombre, setNewNombre] = useState("WooCommerce web");
  const [newCodigo, setNewCodigo] = useState("woocommerce");
  const [onlyLinked, setOnlyLinked] = useState(true);
  const [setAsChannel, setSetAsChannel] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultFromId) setFromId(defaultFromId);
  }, [defaultFromId]);

  async function run() {
    if (!usingRemoteApi()) {
      onDone("Conectá el API para migrar precios.");
      return;
    }
    if (!fromId) {
      setError("Elegí la lista de origen (la que recibió el import).");
      return;
    }
    setBusy("migrate");
    setError(null);
    try {
      const r = await migrateWooPrices({
        fromPriceListId: fromId,
        toPriceListId: mode === "existing" ? toId || null : null,
        newListNombre: mode === "new" ? newNombre : undefined,
        newListCodigo: mode === "new" ? newCodigo : undefined,
        onlyLinked,
        setAsChannelList: setAsChannel,
      });
      onDone(
        `Migración: ${r.copied} precios → «${r.toPriceListNombre}»` +
          (setAsChannel ? " (ahora es la lista del canal WC)." : ".")
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo migrar.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-4 rounded-xl bg-card/90 p-5 ring-1 ring-border/70">
      <div>
        <h2 className="font-display text-xl font-semibold text-charcoal">
          Migrar precios de WooCommerce
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Copiá los precios importados a otra lista (o creá una nueva) si el
          dueño quiere usarlos aparte del minorista/mayorista.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Lista origen</Label>
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
          >
            <option value="">—</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre} ({l.codigo})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Destino</Label>
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value as "existing" | "new")}
          >
            <option value="new">Crear lista nueva</option>
            <option value="existing">Lista existente</option>
          </select>
        </div>
      </div>

      {mode === "new" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Nombre de la nueva lista</Label>
            <Input
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              placeholder="WooCommerce web"
            />
          </div>
          <div>
            <Label>Código</Label>
            <Input
              value={newCodigo}
              onChange={(e) => setNewCodigo(e.target.value)}
              placeholder="woocommerce"
              className="font-mono text-sm"
            />
          </div>
        </div>
      ) : (
        <div>
          <Label>Lista destino</Label>
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={toId}
            onChange={(e) => setToId(e.target.value)}
          >
            <option value="">—</option>
            {lists
              .filter((l) => l.id !== fromId)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre} ({l.codigo})
                </option>
              ))}
          </select>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={onlyLinked}
          onChange={(e) => setOnlyLinked(e.target.checked)}
        />
        Solo productos vinculados a WooCommerce
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={setAsChannel}
          onChange={(e) => setSetAsChannel(e.target.checked)}
        />
        Usar la lista destino en el canal WC (import/push)
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="button"
        disabled={busy === "migrate"}
        onClick={() => void run()}
      >
        {busy === "migrate" ? "Migrando…" : "Migrar precios"}
      </Button>
    </section>
  );
}

function ChannelForm({
  title,
  config,
  lists,
  branches,
  onSaved,
  actions,
}: {
  title: string;
  config: ChannelConfig;
  lists: Array<{ id: string; nombre: string }>;
  branches: Array<{ id: string; nombre: string }>;
  onSaved: () => void;
  actions?: ReactNode;
}) {
  const [enabled, setEnabled] = useState(config.enabled);
  const [storeUrl, setStoreUrl] = useState(config.storeUrl ?? "");
  const [consumerKey, setConsumerKey] = useState(config.consumerKey ?? "");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [sellerId, setSellerId] = useState(config.sellerId ?? "");
  const [siteId, setSiteId] = useState(config.siteId || "MLA");
  const [priceListId, setPriceListId] = useState(config.priceListId ?? "");
  const [stockMode, setStockMode] = useState<StockMode>(config.stockMode);
  const [stockBranchId, setStockBranchId] = useState(
    config.stockBranchId ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(config.enabled);
    setStoreUrl(config.storeUrl ?? "");
    setConsumerKey(config.consumerKey ?? "");
    setSellerId(config.sellerId ?? "");
    setSiteId(config.siteId || "MLA");
    setPriceListId(config.priceListId ?? "");
    setStockMode(config.stockMode);
    setStockBranchId(config.stockBranchId ?? "");
  }, [config]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const channel = config.channel as Channel;
      await saveChannel(channel, {
        enabled,
        storeUrl: storeUrl || null,
        consumerKey: consumerKey || null,
        consumerSecret: consumerSecret || undefined,
        accessToken: accessToken || undefined,
        sellerId: sellerId || null,
        siteId,
        priceListId: priceListId || null,
        stockMode: BRANCHES_ENABLED ? stockMode : "total",
        stockBranchId: BRANCHES_ENABLED ? stockBranchId || null : null,
      });
      setConsumerSecret("");
      setAccessToken("");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  const isWoo = config.channel === "woocommerce";

  return (
    <section className="space-y-4 rounded-xl bg-card/90 p-5 ring-1 ring-border/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-charcoal">
            {title}
          </h2>
          <p className="text-xs text-muted-foreground">
            {config.configured
              ? `Configurado · última sync ${config.lastSyncAt ?? "—"}`
              : "Sin credenciales"}
            {config.consumerSecretMasked
              ? ` · secret ${config.consumerSecretMasked}`
              : null}
            {config.accessTokenMasked
              ? ` · token ${config.accessTokenMasked}`
              : null}
          </p>
        </div>
        {actions}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Canal habilitado
      </label>

      {isWoo ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>URL de la tienda</Label>
            <Input
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              placeholder="https://mitienda.com"
            />
          </div>
          <div>
            <Label>Consumer key</Label>
            <Input
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
            />
          </div>
          <div>
            <Label>Consumer secret (dejar vacío para no cambiar)</Label>
            <Input
              type="password"
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
              placeholder={config.consumerSecretSet ? "••••" : ""}
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Access token</Label>
            <Input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={config.accessTokenSet ? "••••" : "APP_USR-…"}
            />
          </div>
          <div>
            <Label>Seller ID</Label>
            <Input
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
            />
          </div>
          <div>
            <Label>Site ID</Label>
            <Input value={siteId} onChange={(e) => setSiteId(e.target.value)} />
          </div>
        </div>
      )}

      <div className="rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
        {isWoo
          ? BRANCHES_ENABLED
            ? "Import y push usan la misma lista y sucursal."
            : "Import y push usan la lista de precios del canal. El stock queda en el comercio destino (cada comercio = un local)."
          : "Al traer, si no elegís lista se crea/usa «Mercadolibre». Push usa esa misma lista para el precio."}
      </div>

      <div
        className={`grid gap-3 ${BRANCHES_ENABLED ? "sm:grid-cols-3" : "sm:grid-cols-1"}`}
      >
        <div>
          <Label>
            {isWoo
              ? "Lista de precios (traer / empujar)"
              : "Lista de precios (traer / empujar)"}
          </Label>
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={priceListId}
            onChange={(e) => setPriceListId(e.target.value)}
          >
            <option value="">
              {isWoo ? "Default del sistema" : "Auto: Mercadolibre"}
            </option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
              </option>
            ))}
          </select>
        </div>
        {BRANCHES_ENABLED ? (
          <>
            <div>
              <Label>
                {isWoo ? "Modo de stock (push)" : "Stock a publicar"}
              </Label>
              <select
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={stockMode}
                onChange={(e) => setStockMode(e.target.value as StockMode)}
              >
                <option value="total">Total (suma)</option>
                <option value="default_branch">Sucursal default</option>
                <option value="branch">Sucursal específica</option>
              </select>
            </div>
            <div>
              <Label>
                {isWoo
                  ? "Sucursal (import + push si aplica)"
                  : "Sucursal (si aplica)"}
              </Label>
              <select
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={stockBranchId}
                onChange={(e) => setStockBranchId(e.target.value)}
              >
                <option value="">— (default al importar)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" disabled={saving} onClick={() => void save()}>
        Guardar {title}
      </Button>
    </section>
  );
}
