import { AURIX_BRAND } from "@/lib/brand";
import { getPrintSettings, printLayoutCss } from "@/lib/print-settings";
import type { Order } from "@/lib/types";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  orderSubtotal,
  orderTotal,
} from "@/lib/types";
import { formatMxn } from "@/lib/utils";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}

function lineRow(left: string, right: string): string {
  return `<div class="row"><span>${esc(left)}</span><span>${esc(right)}</span></div>`;
}

function px(n: number, scale: number): number {
  return Math.round(n * scale * 10) / 10;
}

function buildTicketHtml(order: Order): string {
  const print = getPrintSettings();
  const scale = Math.max(1, print.fontScale);
  const sub = orderSubtotal(order);
  const total = orderTotal(order);
  const pago = order.metodoPago
    ? PAYMENT_METHOD_LABELS[order.metodoPago]
    : "—";

  const productRows = order.lines
    .map((l) => {
      const importe = l.cantidad * l.precioUnitario;
      return `
        <div class="item">
          <div class="item-name">${esc(l.nombre)}</div>
          <div class="row muted">
            <span>${l.cantidad} × ${esc(formatMxn(l.precioUnitario))}</span>
            <span>${esc(formatMxn(importe))}</span>
          </div>
        </div>`;
    })
    .join("");

  const envioBlock = order.conEnvio
    ? `
      <div class="sep"></div>
      <div class="section-title">ENTREGA</div>
      ${lineRow("Cliente", order.clienteNombre)}
      ${
        order.telefonoContacto
          ? lineRow("Teléfono", order.telefonoContacto)
          : ""
      }
      ${
        order.direccionEnvio
          ? `<div class="addr"><strong>Dirección</strong><br/>${esc(order.direccionEnvio)}</div>`
          : ""
      }
      ${lineRow("Costo envío", formatMxn(order.envioCosto))}
    `
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Ticket ${esc(order.folio)}</title>
  <style>
    ${printLayoutCss({ ...print, fontScale: scale })}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Courier New", Courier, "Noto Sans Mono", monospace;
      color: #000;
      font-weight: 700;
      line-height: 1.35;
      padding: 2mm 1mm ${Math.max(2, print.footerMarginMm)}mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      text-rendering: geometricPrecision;
      -webkit-font-smoothing: none;
    }
    .center { text-align: center; }
    .brand {
      font-size: ${px(18, scale)}px;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .tag {
      font-size: ${px(11, scale)}px;
      font-weight: 700;
      margin-top: 2px;
      color: #000;
    }
    .sep {
      border-top: 2px dashed #000;
      margin: 8px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      margin: 3px 0;
      font-weight: 700;
    }
    .muted {
      color: #000;
      font-size: ${px(12, scale)}px;
      font-weight: 700;
    }
    .section-title {
      font-weight: 900;
      font-size: ${px(12, scale)}px;
      margin: 4px 0 2px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .item { margin: 7px 0; }
    .item-name {
      font-weight: 900;
      font-size: ${px(13, scale)}px;
      line-height: 1.3;
    }
    .addr {
      margin: 4px 0;
      line-height: 1.35;
      word-break: break-word;
      font-weight: 700;
    }
    .total {
      font-size: ${px(16, scale)}px;
      font-weight: 900;
      margin-top: 5px;
    }
    .foot {
      margin-top: 10px;
      font-size: ${px(11, scale)}px;
      font-weight: 700;
      text-align: center;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="brand">${esc(AURIX_BRAND.name)}</div>
    <div class="tag">${esc(AURIX_BRAND.tagline)}</div>
    <div class="tag">${esc(AURIX_BRAND.contact.web)}</div>
  </div>
  <div class="sep"></div>
  ${lineRow("Folio", order.folio)}
  ${lineRow("Fecha", fmtDate(order.createdAt))}
  ${lineRow("Estado", ORDER_STATUS_LABELS[order.status])}
  ${lineRow("Pago", pago)}
  ${!order.conEnvio ? lineRow("Cliente", order.clienteNombre) : ""}
  <div class="sep"></div>
  <div class="section-title">PRODUCTOS</div>
  ${productRows}
  <div class="sep"></div>
  ${lineRow("Subtotal", formatMxn(sub))}
  ${order.conEnvio ? lineRow("Envío", formatMxn(order.envioCosto)) : ""}
  <div class="row total">
    <span>TOTAL</span>
    <span>${esc(formatMxn(total))}</span>
  </div>
  ${envioBlock}
  <div class="sep"></div>
  <div class="foot">
    Gracias por su compra<br/>
    ${esc(AURIX_BRAND.legalName)}
  </div>
</body>
</html>`;
}

/**
 * Imprime ticket térmico vía iframe oculto (ancho según Configuración → Impresora).
 * Evita pop-ups (window.open + noopener devolvía null y dejaba about:blank).
 */
export function printThermalTicket(order: Order): void {
  const html = buildTicketHtml(order);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", `Ticket ${order.folio}`);
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    throw new Error("No se pudo preparar la impresión del ticket.");
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
    window.setTimeout(runPrint, 50);
  } else {
    iframe.onload = () => window.setTimeout(runPrint, 50);
  }
}
