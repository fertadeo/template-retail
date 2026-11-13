import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { AURIX_BRAND } from "@/lib/brand";
import { getPrintSettings, printLayoutCss } from "@/lib/print-settings";
import type { Product } from "@/lib/types";
import { formatMxn } from "@/lib/utils";

export function productBarcodeValue(product: Product): string {
  return product.sku.trim().toUpperCase();
}

/** Payload QR: identificador escaneable del producto (SKU + id). */
export function productQrPayload(product: Product): string {
  return `aurix:product:${product.sku}:${product.id}`;
}

export async function qrDataUrl(
  text: string,
  size = 180
): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    color: {
      dark: AURIX_BRAND.color.charcoal,
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}

export function barcodeSvgDataUrl(value: string, width = 2, height = 64): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, value, {
    format: "CODE128",
    displayValue: true,
    fontSize: 14,
    height,
    width,
    margin: 8,
    background: "#ffffff",
    lineColor: AURIX_BRAND.color.charcoal,
  });
  const xml = new XMLSerializer().serializeToString(svg);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
}

export type LabelPrintMode = "barcode" | "qr";

export type LabelPrintOptions = {
  /** barcode y QR se imprimen en trabajos separados. */
  mode: LabelPrintMode;
  copies?: number;
};

/**
 * Etiqueta térmica: nombre, SKU, precio + barcode **o** QR (por separado).
 * Ancho según Configuración → Impresora. Usa iframe oculto (sin pop-up).
 */
export async function printProductLabel(
  product: Product,
  options: LabelPrintOptions
): Promise<void> {
  const print = getPrintSettings();
  const mode = options.mode;
  const copies = Math.max(1, Math.min(20, options.copies ?? 1));
  const code = productBarcodeValue(product);
  const title = mode === "barcode" ? `Barras ${code}` : `QR ${code}`;
  const barcodeMax = Math.max(24, print.contentWidthMm - 4);
  const qrSize = Math.min(32, Math.round(print.contentWidthMm * 0.45));

  let mediaBlock = "";
  if (mode === "barcode") {
    const barcodeSrc = barcodeSvgDataUrl(code, 2, 56);
    mediaBlock = `<img class="barcode" src="${barcodeSrc}" alt="barcode ${esc(code)}" />`;
  } else {
    const qrSrc = await qrDataUrl(productQrPayload(product), 140);
    mediaBlock = `<div class="qr-wrap"><img class="qr" src="${qrSrc}" alt="qr" /><div class="qr-hint">Escanear ficha</div></div>`;
  }

  const labelBody = `
    <div class="label">
      <div class="brand">${esc(AURIX_BRAND.name)}</div>
      <div class="name">${esc(product.nombre)}</div>
      <div class="meta">${esc(product.sku)} · ${esc(formatMxn(product.precio))}</div>
      ${mediaBlock}
    </div>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    ${printLayoutCss(print)}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Courier New", Courier, "Noto Sans Mono", monospace;
      color: #000;
      font-weight: 700;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .label {
      padding: 3mm 2mm 4mm;
      page-break-after: always;
      text-align: center;
    }
    .label:last-child { page-break-after: auto; }
    .brand {
      font-size: ${Math.round(13 * print.fontScale * 10) / 10}px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .name {
      margin-top: 4px;
      font-size: ${Math.round(14 * print.fontScale * 10) / 10}px;
      font-weight: 900;
      line-height: 1.25;
    }
    .meta {
      margin-top: 3px;
      font-size: ${Math.round(12 * print.fontScale * 10) / 10}px;
      font-weight: 700;
    }
    .barcode {
      display: block;
      width: 100%;
      max-width: ${barcodeMax}mm;
      height: auto;
      margin: 6px auto 2px;
    }
    .qr-wrap { margin-top: 8px; }
    .qr { width: ${qrSize}mm; height: ${qrSize}mm; }
    .qr-hint { font-size: ${Math.round(9 * print.fontScale * 10) / 10}px; margin-top: 2px; }
  </style>
</head>
<body>
  ${Array.from({ length: copies }, () => labelBody).join("")}
</body>
</html>`;

  printHtmlIframe(html, title);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function printHtmlIframe(html: string, title: string): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", title);
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    throw new Error("No se pudo preparar la impresión.");
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
  };

  const runPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      window.setTimeout(cleanup, 800);
    }
  };

  if (iframe.contentDocument?.readyState === "complete") {
    window.setTimeout(runPrint, 80);
  } else {
    iframe.onload = () => window.setTimeout(runPrint, 80);
  }
}
