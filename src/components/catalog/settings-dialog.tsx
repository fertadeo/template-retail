"use client";

import { useRef, useState, type FormEvent } from "react";
import { CatalogDialog } from "@/components/catalog/catalog-dialog";
import { Input } from "@/components/ui/input";
import { isApiMode } from "@/lib/api-config";
import { catalogPhoneValid, type CatalogSettings } from "@/lib/catalog";
import { privateCatalogApi } from "@/lib/private-catalog-api";

export function CatalogSettingsDialog({
  settings,
  onClose,
  onSaved,
}: {
  settings: CatalogSettings;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState({ ...settings });
  const [ttl, setTtl] = useState(String(settings.orderTtlHours));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const inFlight = useRef(false);
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(settings) ||
    ttl !== String(settings.orderTtlHours);
  function close() {
    if (inFlight.current) return;
    if (dirty) setConfirmClose(true);
    else onClose();
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    if (
      !Number.isInteger(Number(ttl)) ||
      Number(ttl) < 1 ||
      Number(ttl) > 168
    ) {
      setError("La vigencia debe ser un número entero entre 1 y 168 horas.");
      return;
    }
    if (
      isApiMode() &&
      draft.publicEnabled &&
      !catalogPhoneValid(draft.whatsappPhone)
    ) {
      setError(
        "Indicá el WhatsApp del local con código de país para publicar.",
      );
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await privateCatalogApi.save({ ...draft, orderTtlHours: Number(ttl) });
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos guardar la configuración.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <CatalogDialog
      title={confirmClose ? "¿Descartar los cambios?" : "Configurar catálogo"}
      subtitle="La información que van a ver tus clientes."
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
              Seguir editando
            </button>
            <button type="button" className="catalog-primary" onClick={onClose}>
              Descartar y cerrar
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="catalog-secondary"
              disabled={busy}
              onClick={close}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="catalog-settings"
              className="catalog-primary"
              disabled={busy}
            >
              {busy ? "Guardando…" : "Guardar configuración"}
            </button>
          </div>
        )
      }
    >
      {confirmClose ? (
        <p className="text-sm leading-6 text-[#66736b]">
          Los cambios que hiciste no se guardaron. ¿Querés cerrar de todos
          modos?
        </p>
      ) : (
        <form
          id="catalog-settings"
          onSubmit={(event) => void submit(event)}
          className="space-y-5"
        >
          {error ? (
            <p role="alert" className="catalog-error">
              {error}
            </p>
          ) : null}
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-[#eaf0e2] p-4">
            <input
              type="checkbox"
              checked={draft.publicEnabled}
              disabled={busy}
              onChange={(event) =>
                setDraft({ ...draft, publicEnabled: event.target.checked })
              }
              className="mt-1 size-4 accent-[#31563d]"
            />
            <span>
              <strong className="block text-sm">Publicar catálogo</strong>
              <span className="mt-1 block text-xs leading-5 text-[#6a7a60]">
                Permite que cualquier persona vea productos y prepare un pedido
                por WhatsApp. Podés pausarlo cuando lo necesites.
              </span>
            </span>
          </label>
          <label className="catalog-field">
            Nombre del catálogo
            <Input
              value={draft.displayName}
              onChange={(event) =>
                setDraft({ ...draft, displayName: event.target.value })
              }
              maxLength={100}
              disabled={busy}
              placeholder="Nombre del local"
            />
            <span className="text-xs font-normal text-[#788376]">
              Si queda vacío, usamos el nombre del local.
            </span>
          </label>
          <label className="catalog-field">
            Mensaje de bienvenida
            <textarea
              value={draft.welcomeText}
              onChange={(event) =>
                setDraft({ ...draft, welcomeText: event.target.value })
              }
              maxLength={240}
              rows={3}
              className="catalog-textarea"
              disabled={busy}
            />
          </label>
          <label className="catalog-field">
            WhatsApp del local
            <Input
              type="tel"
              inputMode="tel"
              value={draft.whatsappPhone}
              onChange={(event) =>
                setDraft({ ...draft, whatsappPhone: event.target.value })
              }
              maxLength={40}
              disabled={busy}
              placeholder="+54 9 11 1234 5678"
            />
            <span className="text-xs font-normal text-[#788376]">
              Número internacional con código de país. Los pedidos se preparan
              para este número.
            </span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="catalog-field">
              Moneda
              <select
                value={draft.currency}
                disabled={busy}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    currency: event.target.value as CatalogSettings["currency"],
                  })
                }
                className="h-10 rounded-lg border border-[#dce2d4] bg-white px-3"
              >
                <option value="ARS">ARS · Peso argentino</option>
                <option value="MXN">MXN · Peso mexicano</option>
                <option value="USD">USD · Dólar</option>
                <option value="UYU">UYU · Peso uruguayo</option>
              </select>
            </label>
            <label className="catalog-field">
              Vigencia del pedido (horas)
              <Input
                type="number"
                min={1}
                max={168}
                step={1}
                value={ttl}
                onChange={(event) => setTtl(event.target.value)}
                required
                disabled={busy}
              />
            </label>
          </div>
          <p className="text-xs leading-5 text-[#788376]">
            Se publican productos activos, con precio y stock, usando la lista
            de precios predeterminada del local. La moneda identifica esos
            precios; no hace una conversión de importes. Preparar un pedido no
            reserva stock ni genera un cobro.
          </p>
        </form>
      )}
    </CatalogDialog>
  );
}
