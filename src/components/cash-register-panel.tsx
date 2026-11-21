"use client";
import { useRef, useState, type FormEvent } from "react";
import { Banknote, RefreshCw } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import type { CashSession } from "@/lib/cash";
import { useAccountSession } from "@/lib/account-session";
import { catalogMoney } from "@/lib/catalog";
import { CatalogDialog } from "@/components/catalog/catalog-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function CashRegisterPanel({
  session,
  loading,
  error,
  onRefresh,
}: {
  session: CashSession | null;
  loading: boolean;
  error?: string;
  onRefresh: () => void;
}) {
  const account = useAccountSession();
  const user = account.session?.user;
  const allowed = Boolean(
    user &&
      ["superadmin", "administrador", "vendedor"].includes(user.role) &&
      !account.session?.actor &&
      !account.demo,
  );
  const canClose =
    allowed &&
    Boolean(
      session &&
        (session.openedBy === user?.id ||
          ["superadmin", "administrador"].includes(user?.role ?? "")),
    );
  const [modal, setModal] = useState<"open" | "close" | null>(null);
  const [message, setMessage] = useState("");
  if (account.demo)
    return (
      <section className="rounded-xl bg-secondary/50 p-4 text-sm text-muted-foreground">
        Modo demostración: las aperturas y los cierres reales de caja están
        deshabilitados.
      </section>
    );
  return (
    <section className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Banknote className="size-6 text-teal" />
          <div>
            <h2 className="font-display text-lg font-semibold">
              {loading
                ? "Consultando caja…"
                : session
                  ? "Caja abierta"
                  : "Caja cerrada"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {session
                ? `Abierta por ${session.openedByName} · ${new Date(session.openedAt).toLocaleString("es-AR")}`
                : "Abrí la caja del comercio antes de cobrar en POS."}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            disabled={loading}
            aria-label="Actualizar caja"
            onClick={onRefresh}
          >
            <RefreshCw className="size-4" />
          </Button>
          {session ? (
            <Button
              variant="outline"
              disabled={!canClose || loading}
              onClick={() => setModal("close")}
            >
              Cerrar caja
            </Button>
          ) : (
            <Button
              disabled={!allowed || loading || Boolean(error)}
              onClick={() => setModal("open")}
            >
              Abrir caja
            </Button>
          )}
        </div>
      </div>
      {session ? (
        <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-4">
          {[
            ["Monto inicial", session.openingAmount],
            ["Ventas en efectivo", session.cashSales],
            ["Transferencias", session.transferSales],
            ["Efectivo esperado", session.expectedAmount],
          ].map(([title, value]) => (
            <div key={String(title)}>
              <dt className="text-xs text-muted-foreground">{title}</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums">
                {catalogMoney(Number(value), session.currency)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-teal">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {modal && allowed ? (
        <CashDialog
          initial={modal === "close" ? session : null}
          onClose={() => setModal(null)}
          onSaved={(result) => {
            setModal(null);
            onRefresh();
            setMessage(
              result
                ? `Caja cerrada. Diferencia: ${catalogMoney(result.difference ?? 0, result.currency)}.`
                : "Caja abierta. Ya podés cobrar ventas.",
            );
          }}
        />
      ) : null}
    </section>
  );
}
function CashDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: CashSession | null;
  onClose: () => void;
  onSaved: (closed: CashSession | null) => void;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [discard, setDiscard] = useState(false);
  const lock = useRef(false);
  function close() {
    if (lock.current) return;
    if (amount || note) setDiscard(true);
    else onClose();
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    const value = amount.trim() ? Number(amount) : 0;
    if (!Number.isFinite(value) || value < 0 || value > 9999999999.99) {
      setError("Indicá un importe válido, mayor o igual a cero.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (snapshot) {
        const result = await api.closeCash(snapshot.id, {
          counted: value,
          version: snapshot.version,
          note,
        });
        onSaved(result);
      } else {
        await api.openCash(value);
        onSaved(null);
      }
    } catch (err) {
      if (snapshot && err instanceof ApiError && err.status === 409) {
        try {
          const latest = await api.currentCash();
          if (latest.session?.id === snapshot.id) setSnapshot(latest.session);
        } catch {
          /* Keep the draft when refreshing is unavailable. */
        }
      }
      setError(
        err instanceof Error ? err.message : "No pudimos guardar la caja.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const counted = Number(amount || 0);
  const difference =
    snapshot && Number.isFinite(counted)
      ? (Math.round(counted * 100) -
          Math.round(snapshot.expectedAmount * 100)) /
        100
      : null;
  return (
    <CatalogDialog
      title={
        discard
          ? "¿Descartar los datos?"
          : snapshot
            ? "Cerrar caja"
            : "Abrir caja"
      }
      onClose={close}
      busy={busy}
      footer={
        discard ? (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDiscard(false)}>
              Seguir editando
            </Button>
            <Button onClick={onClose}>Descartar y cerrar</Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" form="cash-session" disabled={busy}>
              {busy
                ? "Guardando…"
                : snapshot
                  ? "Confirmar cierre"
                  : "Abrir caja"}
            </Button>
          </div>
        )
      }
    >
      {discard ? (
        <p className="text-sm">Los importes ingresados no se guardaron.</p>
      ) : (
        <form
          id="cash-session"
          onSubmit={(event) => void submit(event)}
          className="space-y-5"
        >
          {error ? (
            <p role="alert" className="catalog-error">
              {error}
            </p>
          ) : null}
          {snapshot ? (
            <div className="rounded-xl bg-secondary/50 p-4 text-sm">
              <p>
                Efectivo esperado:{" "}
                <strong>
                  {catalogMoney(snapshot.expectedAmount, snapshot.currency)}
                </strong>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Monto inicial + ventas en efectivo. Las transferencias se
                registran por separado.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ingresá el efectivo que hay en la caja al iniciar el turno. La
              caja es compartida por los operadores de este comercio.
            </p>
          )}
          <label className="catalog-field">
            {snapshot ? "Efectivo contado" : "Monto inicial en efectivo"}
            <Input
              type="number"
              min={0}
              max={9999999999.99}
              step="0.01"
              placeholder="0"
              value={amount}
              disabled={busy}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          {snapshot ? (
            <>
              <p className="text-sm">
                Diferencia:{" "}
                <strong className={difference ? "text-amber-700" : "text-teal"}>
                  {catalogMoney(difference ?? 0, snapshot.currency)}
                </strong>
              </p>
              <label className="catalog-field">
                Observación de cierre
                <textarea
                  value={note}
                  maxLength={300}
                  rows={3}
                  disabled={busy}
                  className="catalog-textarea"
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>
            </>
          ) : null}
        </form>
      )}
    </CatalogDialog>
  );
}
