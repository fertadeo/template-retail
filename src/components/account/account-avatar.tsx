"use client";
import { useState } from "react";
import { UserRound } from "lucide-react";
export function AccountAvatar({
  src,
  name,
  large = false,
}: {
  src: string | null;
  name: string;
  large?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-muted-foreground ring-1 ring-border ${large ? "size-24" : "size-10"}`}
    >
      {src && failed !== src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Foto de ${name}`}
          onError={() => setFailed(src)}
          className="size-full object-cover"
        />
      ) : (
        <UserRound aria-label={name} className={large ? "size-10" : "size-5"} />
      )}
    </span>
  );
}
