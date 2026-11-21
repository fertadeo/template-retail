"use client";
import { useRef, useState, type FormEvent } from "react";
import { CatalogDialog } from "@/components/catalog/catalog-dialog";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api-config";
import { api } from "@/lib/api-client";
export function PasswordDialog({
  onClose,
  onSaved,
  mandatory = false,
}: {
  onClose: () => void;
  onSaved: () => void;
  mandatory?: boolean;
}) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [discard, setDiscard] = useState(false);
  const lock = useRef(false);
  function close() {
    if (lock.current || mandatory) return;
    if (current || password || confirmation) setDiscard(true);
    else onClose();
  }
  async function logout() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(apiUrl("/auth/logout"), { method: "POST" });
      if (!response.ok)
        throw new Error("No pudimos cerrar la sesión. Volvé a intentar.");
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No pudimos cerrar la sesión.",
      );
      lock.current = false;
      setBusy(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    if (password !== confirmation) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (password.trim().length < 8 || password.length > 128) {
      setError("Usá entre 8 y 128 caracteres.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await api.changeOwnPassword({
        currentPassword: current,
        newPassword: password,
      });
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos cambiar la contraseña.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <CatalogDialog
      title={
        mandatory
          ? "Creá tu contraseña"
          : discard
            ? "¿Descartar el cambio?"
            : "Cambiar contraseña"
      }
      subtitle={
        mandatory
          ? "Antes de ingresar al sistema, reemplazá la contraseña temporal por una propia."
          : undefined
      }
      hideClose={mandatory}
      onClose={close}
      busy={busy}
      footer={
        discard ? (
          <div className="flex flex-wrap justify-end gap-2">
            <button
              className="catalog-secondary"
              onClick={() => setDiscard(false)}
            >
              Seguir editando
            </button>
            <button className="catalog-primary" onClick={onClose}>
              Descartar y cerrar
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <button
              className="catalog-secondary"
              disabled={busy}
              onClick={mandatory ? () => void logout() : close}
            >
              {mandatory ? "Cerrar sesión" : "Cancelar"}
            </button>
            <button
              className="catalog-primary"
              type="submit"
              form="my-password"
              disabled={busy}
            >
              {busy ? "Guardando…" : "Cambiar contraseña"}
            </button>
          </div>
        )
      }
    >
      {discard ? (
        <p className="text-sm">Los datos que ingresaste no se guardaron.</p>
      ) : (
        <form
          id="my-password"
          onSubmit={(event) => void submit(event)}
          className="space-y-5"
        >
          {error ? (
            <p role="alert" className="catalog-error">
              {error}
            </p>
          ) : null}
          <label className="catalog-field">
            {mandatory ? "Contraseña temporal" : "Contraseña actual"}
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={current}
              maxLength={1024}
              disabled={busy}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label className="catalog-field">
            Nueva contraseña
            <Input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              value={password}
              disabled={busy}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">
              Entre 8 y 128 caracteres.
            </span>
          </label>
          <label className="catalog-field">
            Repetir nueva contraseña
            <Input
              type="password"
              autoComplete="new-password"
              required
              maxLength={128}
              value={confirmation}
              disabled={busy}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
          <p className="text-sm text-muted-foreground">
            Este navegador seguirá conectado. Se cerrarán tus otras sesiones.
          </p>
        </form>
      )}
    </CatalogDialog>
  );
}
