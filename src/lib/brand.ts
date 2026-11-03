/**
 * Identidad de plantilla Aurix.
 * En clientes reales se reemplaza por la marca del negocio.
 */
export const AURIX_BRAND = {
  name: "Aurix",
  tagline: "Retail 360",
  legalName: "Aurix ERP — Fenec Studio",
  color: {
    charcoal: "#1f1c19",
    teal: "#0f766e",
    tealSoft: "#d7ebe7",
    sand: "#e5e0d6",
    muted: "#5c564e",
    line: "#cfc6b8",
    paper: "#faf8f4",
  },
  contact: {
    web: "aurixerp.com",
    mail: "hola@aurixerp.com",
    note: "Documento de plantilla. Sustituí logo y datos por la identidad del cliente.",
  },
} as const;

/** Dibuja el monograma Aurix (triángulo + punto) en un canvas 2D. */
export function drawAurixMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const s = size;
  ctx.save();
  ctx.translate(x, y);

  // Fondo redondeado charcoal
  const r = s * 0.18;
  ctx.fillStyle = AURIX_BRAND.color.charcoal;
  roundRect(ctx, 0, 0, s, s, r);
  ctx.fill();

  // Triángulo teal (marca)
  ctx.fillStyle = AURIX_BRAND.color.teal;
  ctx.beginPath();
  ctx.moveTo(s * 0.5, s * 0.22);
  ctx.lineTo(s * 0.78, s * 0.72);
  ctx.lineTo(s * 0.22, s * 0.72);
  ctx.closePath();
  ctx.fill();

  // Punto acento
  ctx.fillStyle = "#5eead4";
  ctx.beginPath();
  ctx.arc(s * 0.5, s * 0.58, s * 0.07, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Genera PNG dataURL del logo Aurix para embeber en PDF. */
export function aurixLogoDataUrl(px = 128): string {
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  drawAurixMark(ctx, 0, 0, px);
  return canvas.toDataURL("image/png");
}
