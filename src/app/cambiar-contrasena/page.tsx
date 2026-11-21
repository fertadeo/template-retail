"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { PasswordDialog } from "@/components/account/password-dialog";
export default function FirstPasswordPage() {
  const [status, setStatus] = useState<"loading" | "required" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api
      .getSession()
      .then(async (session) => {
        if (cancelled) return;
        if (session.actor?.mustChangePassword) {
          await api.stopViewAs();
          session = await api.getSession();
          if (cancelled) return;
        }
        if ((session.actor ?? session.user).mustChangePassword)
          setStatus("required");
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        else window.location.assign("/");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  return (
    <main className="aurix-atmosphere flex min-h-dvh items-center justify-center p-6">
      {status === "loading" ? (
        <p role="status" className="text-sm">
          Preparando tu primer acceso…
        </p>
      ) : null}
      {status === "error" ? (
        <div role="alert" className="rounded-xl bg-card p-6 text-sm">
          <p>No pudimos verificar tu cuenta.</p>
          <button
            type="button"
            className="mt-3 underline"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Reintentar
          </button>
        </div>
      ) : null}
      {status === "required" ? (
        <PasswordDialog
          mandatory
          onClose={() => {}}
          onSaved={() => {
            // Clear the limited session's client state after receiving the renewed cookie.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.assign("/");
          }}
        />
      ) : null}
    </main>
  );
}
