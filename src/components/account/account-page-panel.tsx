"use client";
import { useState } from "react";
import { Eye, KeyRound, Mail, Pencil, Phone, ShieldCheck } from "lucide-react";
import { AccountAvatar } from "@/components/account/account-avatar";
import { ProfileDialog } from "@/components/account/profile-dialog";
import { PasswordDialog } from "@/components/account/password-dialog";
import { ViewAsDialog } from "@/components/account/view-as-dialog";
import { useAccountSession } from "@/lib/account-session";
import { accountAvatarUrl } from "@/lib/account";
import { USER_ROLE_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
export function MyAccountPanel() {
  const { session, profile, loading, error, demo, reload } =
    useAccountSession();
  const [modal, setModal] = useState<"profile" | "password" | "view" | null>(
    null,
  );
  const [message, setMessage] = useState("");
  if (loading)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Cargando mi cuenta…
      </p>
    );
  const user = session?.user;
  const canEdit = Boolean(user && !session?.actor && !demo);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">
          Personal
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Mi cuenta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu perfil, información de contacto y seguridad.
        </p>
      </header>
      {error ? (
        <p role="alert" className="catalog-error">
          {error}
          <button className="ml-2 underline" onClick={() => void reload()}>
            Reintentar
          </button>
        </p>
      ) : null}
      {message ? (
        <p
          role="status"
          className="rounded-xl bg-teal/10 p-4 text-sm text-teal"
        >
          {message}
        </p>
      ) : null}
      {demo ? (
        <p className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">
          Esta es una demostración. Los perfiles y contraseñas se administran al
          conectar la API.
        </p>
      ) : null}
      {user ? (
        <>
          <section className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            <div
              aria-hidden="true"
              className="h-20 bg-gradient-to-r from-teal/25 via-teal/10 to-sand/30 sm:h-28"
            />
            <div className="px-5 pb-6 sm:px-8">
              <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
                <AccountAvatar
                  src={accountAvatarUrl(profile)}
                  name={user.nombre}
                  large
                />
                <Button
                  variant="outline"
                  disabled={!canEdit || !profile}
                  onClick={() => {
                    setMessage("");
                    setModal("profile");
                  }}
                >
                  <Pencil className="size-4" />
                  Editar perfil
                </Button>
              </div>
              <h2 className="mt-5 font-display text-2xl font-semibold">
                {user.nombre}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {USER_ROLE_LABELS[user.role]}
              </p>
              <dl className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="size-4" />
                    Email para iniciar sesión
                  </dt>
                  <dd className="mt-1 break-all text-sm font-medium">
                    {user.email}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="size-4" />
                    Teléfono de contacto
                  </dt>
                  <dd className="mt-1 break-words text-sm font-medium">
                    {profile?.phone || "Sin completar"}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="size-4" />
                    Email de contacto
                  </dt>
                  <dd className="mt-1 break-all text-sm font-medium">
                    {profile?.contactEmail || "Sin completar"}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
          <section className="flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-card p-5 ring-1 ring-border sm:p-8">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-1 size-5 text-teal" />
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Contraseña
                </h2>
                <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">
                  Elegí una contraseña propia. Para cambiarla, vas a necesitar
                  la actual.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              disabled={!canEdit}
              onClick={() => {
                setMessage("");
                setModal("password");
              }}
            >
              Cambiar contraseña
            </Button>
          </section>
          {["superadmin", "administrador"].includes(user.role) &&
          !session?.actor &&
          !demo ? (
            <section className="flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-teal/5 p-5 ring-1 ring-teal/20 sm:p-8">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 size-5 text-teal" />
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    Herramientas de administración
                  </h2>
                  <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">
                    Consultá cuentas de vendedores en modo solo lectura, sin
                    conocer su contraseña. El superadmin también puede consultar
                    los demás roles.
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setModal("view")}>
                <Eye className="size-4" />
                Ver como…
              </Button>
            </section>
          ) : null}
        </>
      ) : null}
      {modal === "profile" && canEdit && profile ? (
        <ProfileDialog
          profile={profile}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            setMessage("Tu perfil se actualizó.");
            void reload();
          }}
        />
      ) : null}
      {modal === "password" && canEdit ? (
        <PasswordDialog
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            setMessage(
              "Contraseña actualizada. Se cerraron tus otras sesiones.",
            );
            void reload();
          }}
        />
      ) : null}
      {modal === "view" &&
      user &&
      ["superadmin", "administrador"].includes(user.role) &&
      !session?.actor ? (
        <ViewAsDialog
          role={user.role}
          ownId={user.id}
          onClose={() => setModal(null)}
        />
      ) : null}
    </div>
  );
}
