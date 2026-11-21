import { apiUrl } from "@/lib/api-config";
import type { UserRole } from "@/lib/types";
export type AccountUser = {
  id: string;
  nombre: string;
  email: string;
  role: UserRole;
};
export type AccountSession = { user: AccountUser; actor: AccountUser | null };
export type AccountProfile = AccountUser & {
  phone: string;
  contactEmail: string;
  hasAvatar: boolean;
  avatarVersion: string | null;
};
export type ProfileDraft = Pick<
  AccountProfile,
  "nombre" | "phone" | "contactEmail"
> & { avatarDataUrl?: string | null };
export function accountAvatarUrl(profile: AccountProfile | null) {
  return profile?.hasAvatar
    ? apiUrl(
        `/auth/profile/avatar?v=${encodeURIComponent(profile.avatarVersion ?? "")}`,
      )
    : null;
}
export async function prepareAvatar(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Elegí una foto JPG, PNG o WebP.");
  if (file.size > 8 * 1024 * 1024)
    throw new Error("La foto debe pesar menos de 8 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (!side) throw new Error("La imagen no se pudo leer.");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.min(side, 512);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No pudimos preparar la foto.");
    context.drawImage(
      image,
      (image.naturalWidth - side) / 2,
      (image.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    return canvas.toDataURL("image/webp", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
