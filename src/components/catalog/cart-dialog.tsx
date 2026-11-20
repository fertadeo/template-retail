"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  MessageCircle,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { CatalogQuantity } from "@/components/catalog/quantity";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { CatalogDialog } from "@/components/catalog/catalog-dialog";
import { Input } from "@/components/ui/input";
import {
  cartInput,
  catalogMoney,
  catalogPhoneValid,
  type CatalogCartLine,
  type CatalogCartReview,
  type CatalogCheckoutResult,
  type CatalogInfo,
} from "@/lib/catalog";
import { checkoutKey, finishCheckout } from "@/lib/catalog-cart";
import { publicCatalogApi, PublicCatalogError } from "@/lib/public-catalog-api";

export function CatalogCartDialog({
  info,
  lines,
  onLines,
  onClose,
  onPrepared,
}: {
  info: CatalogInfo;
  lines: CatalogCartLine[];
  onLines: (lines: CatalogCartLine[]) => void;
  onClose: () => void;
  onPrepared: (result: CatalogCheckoutResult) => void;
}) {
  const [step, setStep] = useState<"cart" | "contact" | "ready">("cart");
  const [review, setReview] = useState<CatalogCartReview | null>(null);
  const [result, setResult] = useState<CatalogCheckoutResult | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const intent = useRef<{ payload: string; key: string } | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const total = lines.reduce(
    (sum, line) =>
      sum + (Math.round(line.unitPrice * 100) * line.quantity) / 100,
    0,
  );
  function close() {
    if (inFlight.current) return;
    if (step === "contact" && (name || phone || note)) setConfirmClose(true);
    else onClose();
  }
  function applyReview(next: CatalogCartReview) {
    onLines(
      next.items.map((item) => ({
        ...item,
        name: item.available
          ? item.name
          : lines.find((line) => line.productId === item.productId)?.name ||
            item.name,
        unitPrice: item.available
          ? item.unitPrice
          : lines.find((line) => line.productId === item.productId)
              ?.unitPrice || 0,
      })),
    );
    setReview(next);
  }
  function update(id: string, quantity: number) {
    onLines(
      lines.map((line) =>
        line.productId === id ? { ...line, quantity } : line,
      ),
    );
    setReview(null);
    setError("");
  }
  async function continueOrder() {
    if (inFlight.current || !lines.length) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await publicCatalogApi.review(
        cartInput(lines, info.currency),
      );
      applyReview(next);
      if (next.valid) setStep("contact");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos revisar el carrito. Intentá nuevamente.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    if (name.trim().length < 2 || !catalogPhoneValid(phone)) {
      setError("Completá tu nombre y un teléfono válido con código de país.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...cartInput(lines, info.currency),
        buyerName: name.trim(),
        buyerPhone: phone.replace(/\D/g, ""),
        buyerNote: note.trim(),
      };
      const signature = JSON.stringify(payload);
      const key =
        intent.current?.payload === signature
          ? intent.current.key
          : await checkoutKey(info.id, payload);
      intent.current = { payload: signature, key };
      const prepared = await publicCatalogApi.checkout({
        ...payload,
        checkoutKey: key,
      });
      setResult(prepared);
      setStep("ready");
      onPrepared(prepared);
    } catch (err) {
      if (err instanceof PublicCatalogError && err.status === 410) {
        finishCheckout(info.id);
        intent.current = null;
        setStep("cart");
      }
      if (err instanceof PublicCatalogError && err.cart) {
        applyReview(err.cart);
        setStep("cart");
      }
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos preparar tu pedido. Podés volver a intentar.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  const issues = review?.issues ?? [];
  return (
    <CatalogDialog
      title={
        confirmClose
          ? "¿Cerrar el pedido?"
          : step === "ready"
            ? "Tu pedido está listo"
            : step === "contact"
              ? "Un último paso"
              : "Tu carrito"
      }
      subtitle={
        confirmClose
          ? "Tus productos seguirán guardados en el carrito."
          : step === "ready"
            ? "Solo falta enviarlo por WhatsApp."
            : step === "contact"
              ? "Dejanos tus datos para que el local pueda responderte."
              : `${lines.reduce((sum, line) => sum + line.quantity, 0)} productos elegidos`
      }
      onClose={close}
      busy={busy}
      footer={
        confirmClose ? (
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="catalog-secondary"
              onClick={() => setConfirmClose(false)}
            >
              Seguir completando
            </button>
            <button type="button" className="catalog-primary" onClick={onClose}>
              Cerrar y descartar datos
            </button>
          </div>
        ) : step === "ready" && result ? (
          <div className="space-y-3">
            <a
              className="catalog-primary w-full justify-center"
              href={result.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                onLines([]);
                finishCheckout(info.id);
              }}
            >
              <MessageCircle className="size-5" />
              Abrir WhatsApp y enviar
              <ArrowUpRight className="size-4" />
            </a>
            <button
              type="button"
              className="w-full py-1 text-sm text-[#66736b]"
              onClick={onClose}
            >
              Seguir viendo productos
            </button>
          </div>
        ) : lines.length ? (
          <div className="space-y-3">
            <div className="flex justify-between text-base">
              <span>
                {step === "cart" ? "Total estimado" : "Total de productos"}
              </span>
              <strong className="tabular-nums">
                {catalogMoney(total, info.currency)}
              </strong>
            </div>
            <p className="text-xs leading-5 text-[#788376]">
              El local confirmará disponibilidad y entrega. No se realiza ningún
              cobro en esta página.
            </p>
            {step === "cart" ? (
              <button
                type="button"
                className="catalog-primary w-full justify-center"
                disabled={busy || !info.whatsappConfigured}
                onClick={() => void continueOrder()}
              >
                {busy ? "Revisando disponibilidad…" : "Continuar con mi pedido"}
                <ArrowUpRight className="size-4" />
              </button>
            ) : (
              <button
                type="submit"
                form="catalog-contact"
                className="catalog-primary w-full justify-center"
                disabled={busy}
              >
                {busy
                  ? "Preparando tu pedido…"
                  : "Preparar pedido para WhatsApp"}
                <MessageCircle className="size-4" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="catalog-primary w-full justify-center"
            onClick={onClose}
          >
            Explorar productos
          </button>
        )
      }
    >
      {confirmClose ? (
        <p className="text-sm leading-6 text-[#66736b]">
          Se descartarán los datos de contacto de este formulario. El carrito se
          conserva para que puedas continuar después.
        </p>
      ) : step === "ready" && result ? (
        <div className="space-y-5">
          <div className="flex size-14 items-center justify-center rounded-full bg-[#e4eddd] text-[#315f47]">
            <Check className="size-7" />
          </div>
          <p className="text-sm leading-6 text-[#66736b]">
            Registramos tu pedido{" "}
            <strong className="text-[#22352f]">
              #{result.order.id.slice(-8).toUpperCase()}
            </strong>
            . Al abrir WhatsApp vas a encontrar el mensaje con todos los
            productos. Tocá <strong>Enviar</strong> allí para contactar al
            local.
          </p>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e2e7dc]">
            {result.order.items.map((item) => (
              <div
                key={item.productId}
                className="flex justify-between gap-4 py-1.5 text-sm"
              >
                <span>
                  {item.quantity} × {item.name}
                </span>
                <span className="shrink-0 tabular-nums">
                  {catalogMoney(item.lineTotal, result.order.currency)}
                </span>
              </div>
            ))}
            <div className="mt-3 flex justify-between border-t border-[#e6e9e2] pt-3 font-semibold">
              <span>Total</span>
              <span>
                {catalogMoney(result.order.total, result.order.currency)}
              </span>
            </div>
          </div>
          <p className="text-xs leading-5 text-[#788376]">
            Este pedido está pendiente de atención del local. No significa que
            el mensaje ya haya sido enviado ni que exista un pago. Referencia de
            precios válida hasta{" "}
            {new Date(result.order.expiresAt).toLocaleString("es-AR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
            .
          </p>
        </div>
      ) : !lines.length ? (
        <div className="flex flex-col items-center py-12 text-center">
          <ShoppingBag className="size-12 text-[#9ca68f]" />
          <h3 className="mt-5 font-display text-xl">
            Hay lugar para tus favoritos
          </h3>
          <p className="mt-2 max-w-xs text-sm leading-6 text-[#788376]">
            Agregá productos del catálogo y armá tu pedido sin registrarte.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {error ? (
            <div role="alert" className="catalog-error">
              {error}
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-2 block underline"
              >
                Actualizar catálogo
              </button>
            </div>
          ) : null}
          {step === "contact" ? (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm text-[#66736b]"
                disabled={busy}
                onClick={() => setStep("cart")}
              >
                <ArrowLeft className="size-4" />
                Revisar productos
              </button>
              <form
                id="catalog-contact"
                onSubmit={(event) => void submit(event)}
                className="space-y-5"
              >
                <label className="catalog-field">
                  Tu nombre
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    maxLength={100}
                    minLength={2}
                    required
                    disabled={busy}
                    autoFocus
                  />
                </label>
                <label className="catalog-field">
                  Tu teléfono
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={40}
                    required
                    disabled={busy}
                  />
                  <span className="text-xs font-normal text-[#788376]">
                    Con código de país. Por ejemplo: +54 9 11 1234 5678.
                  </span>
                </label>
                <label className="catalog-field">
                  Algo que quieras contarnos{" "}
                  <span className="font-normal text-[#788376]">(opcional)</span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={1000}
                    rows={3}
                    disabled={busy}
                    className="catalog-textarea"
                    placeholder="Consultas sobre el pedido, retiro o entrega…"
                  />
                </label>
                <p className="text-xs leading-5 text-[#788376]">
                  El local recibirá estos datos para atender tu pedido. No
                  necesitás crear una cuenta.
                </p>
              </form>
            </>
          ) : (
            <>
              {!info.whatsappConfigured ? (
                <p className="rounded-xl bg-[#f0eee5] p-3 text-sm text-[#66736b]">
                  {info.demo
                    ? "Esta es una vista de demostración. Los pedidos estarán disponibles en el catálogo conectado del local."
                    : "El local todavía no habilitó los pedidos por WhatsApp."}
                </p>
              ) : null}
              {issues.some((issue) => issue.kind === "price") ? (
                <p
                  role="status"
                  className="rounded-xl bg-[#f2eddd] p-3 text-sm text-[#6e5e31]"
                >
                  Actualizamos algunos precios. Revisá el total y continuá
                  cuando estés de acuerdo.
                </p>
              ) : null}
              <ul className="divide-y divide-[#e6e9e2]">
                {lines.map((line) => (
                  <li
                    key={line.productId}
                    className="flex gap-3 py-4 first:pt-0"
                  >
                    <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#edf0e9]">
                      <CatalogImage src={line.imageUrl} alt="" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold leading-5">
                        {line.name}
                      </h3>
                      <p className="mt-1 text-sm tabular-nums text-[#66736b]">
                        {catalogMoney(line.unitPrice, info.currency)} c/u
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <CatalogQuantity
                          name={line.name}
                          quantity={line.quantity}
                          maximum={Math.min(line.stock, 99)}
                          disabled={busy}
                          onChange={(quantity) =>
                            update(line.productId, quantity)
                          }
                        />
                        <button
                          type="button"
                          aria-label={`Quitar ${line.name} del carrito`}
                          disabled={busy}
                          onClick={() => {
                            onLines(
                              lines.filter(
                                (item) => item.productId !== line.productId,
                              ),
                            );
                            setReview(null);
                            setError("");
                          }}
                          className="flex size-10 items-center justify-center text-[#8a7767] hover:text-[#a64234]"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      {issues
                        .filter(
                          (issue) =>
                            issue.productId === line.productId &&
                            issue.kind !== "price",
                        )
                        .map((issue) => (
                          <p
                            key={issue.kind}
                            role="status"
                            className="mt-2 text-xs text-[#a64234]"
                          >
                            {issue.message}
                          </p>
                        ))}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </CatalogDialog>
  );
}
