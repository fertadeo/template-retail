"use client";
import { useRef, useState, type FormEvent } from "react";
import { Camera, Trash2 } from "lucide-react";
import { CatalogDialog } from "@/components/catalog/catalog-dialog";
import { AccountAvatar } from "@/components/account/account-avatar";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import {
  accountAvatarUrl,
  prepareAvatar,
  type AccountProfile,
  type ProfileDraft,
} from "@/lib/account";
export function ProfileDialog({
  profile,
  onClose,
  onSaved,
}: {
  profile: AccountProfile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<ProfileDraft>({
    nombre: profile.nombre,
    phone: profile.phone,
    contactEmail: profile.contactEmail,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [discard, setDiscard] = useState(false);
  const lock = useRef(false);
  const dirty =
    draft.nombre !== profile.nombre ||
    draft.phone !== profile.phone ||
    draft.contactEmail !== profile.contactEmail ||
    draft.avatarDataUrl !== undefined;
  const avatar =
    draft.avatarDataUrl === undefined
      ? accountAvatarUrl(profile)
      : draft.avatarDataUrl;
  function close() {
    if (lock.current) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  async function photo(file?: File) {
    if (!file || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const dataUrl = await prepareAvatar(file);
      setDraft((old) => ({ ...old, avatarDataUrl: dataUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos leer la foto.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await api.updateAccountProfile({
        ...draft,
        nombre: draft.nombre.trim(),
        phone: draft.phone.trim(),
        contactEmail: draft.contactEmail.trim(),
      });
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No pudimos guardar tus datos.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <CatalogDialog
      title={discard ? "¿Descartar los cambios?" : "Editar mi perfil"}
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
              onClick={close}
            >
              Cancelar
            </button>
            <button
              className="catalog-primary"
              type="submit"
              form="my-profile"
              disabled={busy}
            >
              {busy ? "Preparando…" : "Guardar cambios"}
            </button>
          </div>
        )
      }
    >
      {discard ? (
        <p className="text-sm">
          Tu foto y los cambios de contacto todavía no se guardaron.
        </p>
      ) : (
        <form
          id="my-profile"
          onSubmit={(event) => void save(event)}
          className="space-y-5"
        >
          {error ? (
            <p role="alert" className="catalog-error">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-5">
            <AccountAvatar src={avatar} name={draft.nombre} large />
            <div className="space-y-3">
              <label
                className={`catalog-secondary cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}
              >
                <Camera className="size-4" />
                Elegir foto
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={busy}
                  onChange={(event) => {
                    void photo(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
              {avatar ? (
                <button
                  type="button"
                  disabled={busy}
                  className="flex min-h-10 items-center gap-2 text-sm text-muted-foreground"
                  onClick={() =>
                    setDraft((old) => ({ ...old, avatarDataUrl: null }))
                  }
                >
                  <Trash2 className="size-4" />
                  Quitar foto
                </button>
              ) : null}
              <p className="text-xs text-muted-foreground">
                JPG, PNG o WebP · Hasta 8 MB
              </p>
            </div>
          </div>
          <label className="catalog-field">
            Nombre
            <Input
              autoComplete="name"
              value={draft.nombre}
              onChange={(event) =>
                setDraft({ ...draft, nombre: event.target.value })
              }
              required
              maxLength={160}
              disabled={busy}
            />
          </label>
          <label className="catalog-field">
            Teléfono de contacto
            <Input
              type="tel"
              autoComplete="tel"
              value={draft.phone}
              maxLength={40}
              disabled={busy}
              onChange={(event) =>
                setDraft({ ...draft, phone: event.target.value })
              }
            />
          </label>
          <label className="catalog-field">
            Email de contacto
            <Input
              type="email"
              autoComplete="email"
              value={draft.contactEmail}
              maxLength={254}
              disabled={busy}
              onChange={(event) =>
                setDraft({ ...draft, contactEmail: event.target.value })
              }
            />
            <span className="text-xs text-muted-foreground">
              Este dato de contacto no cambia el email con el que iniciás
              sesión.
            </span>
          </label>
        </form>
      )}
    </CatalogDialog>
  );
}
