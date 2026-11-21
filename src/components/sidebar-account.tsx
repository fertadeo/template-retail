"use client";
import Link from "next/link";
import { useState } from "react";
import { Eye } from "lucide-react";
import { apiUrl } from "@/lib/api-config";
import { USER_ROLE_LABELS } from "@/lib/types";
import { useAccountSession } from "@/lib/account-session";
import { accountAvatarUrl } from "@/lib/account";
import { AccountAvatar } from "@/components/account/account-avatar";
import { ViewAsDialog } from "@/components/account/view-as-dialog";
export function SidebarAccount({ onNavigate }: { onNavigate?: () => void }) {
  const { session, profile, loading, demo } = useAccountSession();
  const user = session?.user;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState(false);
  async function logout() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(apiUrl("/auth/logout"), { method: "POST" });
      if (!response.ok) throw new Error();
      // Drop cached private state when ending the session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    } catch {
      setError("No se pudo cerrar sesión. Intentá nuevamente.");
      setBusy(false);
    }
  }
  return (
    <section
      aria-label="Cuenta"
      className="shrink-0 border-t border-white/10 px-4 pb-4 pt-5"
    >
      <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[.2em] text-sand/45">
        Cuenta
      </h2>
      <Link
        href="/mi-cuenta"
        onClick={onNavigate}
        className="flex min-h-12 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-teal"
      >
        <AccountAvatar
          src={accountAvatarUrl(profile)}
          name={user?.nombre ?? "Mi cuenta"}
        />
        <span className="min-w-0">
          <strong className="block truncate text-sm text-[#f2eee6]">
            {user?.nombre ?? (loading ? "Cargando cuenta…" : "Mi cuenta")}
          </strong>
          <span className="mt-0.5 block text-xs text-sand/55">
            Mi cuenta{user ? ` · ${USER_ROLE_LABELS[user.role]}` : ""}
          </span>
        </span>
      </Link>
      {user?.role === "superadmin" && !session?.actor && !demo ? (
        <button
          type="button"
          onClick={() => setView(true)}
          className="mt-3 flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs text-sand/80 hover:bg-white/5"
        >
          <Eye className="size-4" />
          Ver como…
        </button>
      ) : null}
      {!demo ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void logout()}
          className="mt-4 min-h-10 rounded-lg border border-white/20 px-3 text-xs font-medium text-[#f2eee6] hover:bg-white/5 disabled:opacity-50"
        >
          {busy ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-xs text-red-300">
          {error}
        </p>
      ) : null}
      {view && user?.role === "superadmin" ? (
        <ViewAsDialog ownId={user.id} onClose={() => setView(false)} />
      ) : null}
    </section>
  );
}
