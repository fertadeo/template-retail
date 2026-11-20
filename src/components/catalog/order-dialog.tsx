"use client";

import { useRef, useState, type FormEvent } from "react";
import { MessageCircle } from "lucide-react";
import { CatalogDialog } from "@/components/catalog/catalog-dialog";
import { api } from "@/lib/api-client";
import {
  CATALOG_ORDER_STATUS_LABELS,
  catalogMoney,
  type CatalogOrder,
} from "@/lib/catalog";

export function CatalogOrderDialog({
  order,
  canEdit,
  onClose,
  onSaved,
}: {
  order: CatalogOrder;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(order.status);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const editable =
    canEdit && ["pendiente", "confirmado"].includes(order.status);
  function close() {
    if (saving.current) return;
    if (status !== order.status) setConfirmClose(true);
    else onClose();
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (
      saving.current ||
      !editable ||
      !["pendiente", "confirmado", "cancelado"].includes(status)
    )
      return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await api.patchCatalogOrder(
        order.id,
        status as "pendiente" | "confirmado" | "cancelado",
      );
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo actualizar el pedido.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const reply = `https://wa.me/${order.buyerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${order.buyerName}, te escribimos por tu pedido ${order.id}.`)}`;
  return (
    <CatalogDialog
      title={
        confirmClose
          ? "¿Descartar el cambio?"
          : `Pedido #${order.id.slice(-8).toUpperCase()}`
      }
      subtitle={
        confirmClose
          ? undefined
          : `${CATALOG_ORDER_STATUS_LABELS[order.status]} · ${new Date(order.createdAt).toLocaleString("es-AR")}`
      }
      onClose={close}
      busy={busy}
      footer={
        confirmClose ? (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="catalog-secondary"
              onClick={() => setConfirmClose(false)}
            >
              Seguir editando
            </button>
            <button type="button" className="catalog-primary" onClick={onClose}>
              Descartar y cerrar
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-between gap-3">
            <a
              href={reply}
              target="_blank"
              rel="noopener noreferrer"
              className="catalog-secondary"
            >
              <MessageCircle className="size-4" />
              Responder por WhatsApp
            </a>
            {editable ? (
              <button
                type="submit"
                form="catalog-order-status"
                className="catalog-primary"
                disabled={busy || status === order.status}
              >
                {busy ? "Guardando…" : "Guardar estado"}
              </button>
            ) : (
              <button
                type="button"
                className="catalog-primary"
                onClick={onClose}
              >
                Cerrar
              </button>
            )}
          </div>
        )
      }
    >
      {confirmClose ? (
        <p className="text-sm text-[#66736b]">
          El estado nuevo no se guardó. ¿Querés cerrar?
        </p>
      ) : (
        <div className="space-y-5">
          {error ? (
            <p role="alert" className="catalog-error">
              {error}
            </p>
          ) : null}
          <div>
            <p className="font-semibold">{order.buyerName}</p>
            <p className="mt-1 text-sm text-[#66736b]">{order.buyerPhone}</p>
            {order.buyerNote ? (
              <p className="mt-3 whitespace-pre-line rounded-xl bg-[#eeefe6] p-3 text-sm">
                {order.buyerNote}
              </p>
            ) : null}
          </div>
          <ul className="divide-y divide-[#e1e6d9]">
            {order.items.map((item, index) => (
              <li
                key={`${item.productId}-${index}`}
                className="flex justify-between gap-4 py-3 text-sm"
              >
                <span>
                  {item.quantity} × {item.name}
                  {item.sku ? (
                    <small className="mt-1 block text-[#87917c]">
                      {item.sku}
                    </small>
                  ) : null}
                </span>
                <span className="shrink-0 tabular-nums">
                  {catalogMoney(item.lineTotal, order.currency)}
                </span>
              </li>
            ))}
          </ul>
          <p className="flex justify-between border-t border-[#e1e6d9] pt-4 text-lg font-semibold">
            <span>Total de productos</span>
            <span>{catalogMoney(order.total, order.currency)}</span>
          </p>
          {editable ? (
            <form
              id="catalog-order-status"
              onSubmit={(event) => void submit(event)}
            >
              <label className="catalog-field">
                Estado del pedido
                <select
                  value={status}
                  disabled={busy}
                  onChange={(event) =>
                    setStatus(event.target.value as CatalogOrder["status"])
                  }
                  className="h-11 rounded-xl border border-[#dce2d4] bg-white px-3"
                >
                  {order.status === "pendiente" ? (
                    <option value="pendiente">Por atender</option>
                  ) : null}
                  <option value="confirmado">Confirmado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </label>
            </form>
          ) : null}
          <p className="text-xs leading-5 text-[#788376]">
            Preparado desde el catálogo público. El sistema no puede comprobar
            si el cliente envió el mensaje en WhatsApp. Confirmar aquí registra
            la atención del pedido; el cobro y la venta se registran en caja.
          </p>
          <p className="rounded-xl bg-[#eaf0e2] p-3 text-xs leading-5 text-[#667653]">
            {order.payment.status === "not_requested"
              ? order.status === "cobrado"
                ? "Pedido marcado como cobrado en la versión anterior. No tiene una transacción de pago en línea asociada."
                : "Pago a coordinar con el cliente. No se generó un cobro en línea."
              : `Estado del pago: ${order.payment.status}`}
            <br />
            Vigencia de referencia:{" "}
            {new Date(order.expiresAt).toLocaleString("es-AR")}.
          </p>
        </div>
      )}
    </CatalogDialog>
  );
}
