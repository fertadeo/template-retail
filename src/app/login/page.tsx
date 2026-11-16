"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { isApiMode, apiUrl } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(apiUrl("/auth/login"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }), credentials: "same-origin",
      });
      const result = await response.json().catch(() => ({ error: "No se pudo conectar con el servicio de acceso." }));
      if (!response.ok) throw new Error(result.error || "No se pudo iniciar sesión.");
      const next = new URLSearchParams(window.location.search).get("next");
      const target = next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") && !next.startsWith("/login") ? next : "/";
      window.location.assign(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
      setBusy(false);
    }
  }

  if (!isApiMode()) return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="space-y-4 text-center">
        <h1 className="font-display text-2xl font-semibold">Aurix Retail · Demo</h1>
        <p className="text-sm text-muted-foreground">Este entorno usa datos locales de demostración.</p>
        <Link href="/" className="text-teal underline">Abrir demo</Link>
      </div>
    </main>
  );

  return (
    <main className="aurix-atmosphere flex min-h-dvh items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl bg-card p-7 shadow-lg ring-1 ring-border">
        <div className="space-y-2">
          <p className="text-sm font-medium text-teal">Aurix Retail</p>
          <h1 className="font-display text-2xl font-semibold">Iniciar sesión</h1>
          <p className="text-sm text-muted-foreground">Ingresá con tu cuenta para acceder al sistema.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} autoFocus />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</Button>
      </form>
    </main>
  );
}
