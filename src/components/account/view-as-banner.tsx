"use client";
import { useRef, useState } from "react";
import { Eye } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAccountSession } from "@/lib/account-session";
export function ViewAsBanner() {
  const { session } = useAccountSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  if (!session?.actor) return null;
  async function stop() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await api.stopViewAs();
      // Clear all cached user-specific state when returning to the real account.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/mi-cuenta");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No pudimos volver a tu cuenta.",
      );
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm">
          <Eye className="size-4 shrink-0" />
          <span>
            {session.user.id === session.actor.id ? (
              "La cuenta consultada ya no está disponible"
            ) : (
              <>
                Viendo como <strong>{session.user.nombre}</strong>
              </>
            )}{" "}
            · Solo lectura
          </span>
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void stop()}
          className="min-h-10 rounded-lg border border-amber-300 px-3 text-sm font-medium disabled:opacity-50"
        >
          {busy ? "Volviendo…" : "Volver a mi cuenta"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
