import { jsPDF } from "jspdf";
import { AURIX_BRAND, aurixLogoDataUrl } from "@/lib/brand";
import type { PriceList, Quote } from "@/lib/types";
import { QUOTE_STATUS_LABELS } from "@/lib/types";

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function money(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function fmtLongDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(
      new Date(iso.includes("T") ? iso : `${iso}T12:00:00`)
    );
  } catch {
    return iso;
  }
}

export type PresupuestoPdfInput = {
  quote: Quote;
  priceList?: PriceList | null;
  /** Nombre comercial del emisor (reemplaza marca en clientes reales). */
  emisorNombre?: string;
};

/**
 * PDF de presupuesto — simple, claro, tipografía limpia.
 */
export function downloadPresupuestoPdf(input: PresupuestoPdfInput): void {
  const { quote } = input;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 16;
  const contentW = pageW - m * 2;
  const c = AURIX_BRAND.color;
  const charcoal = hexRgb(c.charcoal);
  const teal = hexRgb(c.teal);
  const muted = hexRgb(c.muted);
  const line = hexRgb(c.line);
  const paper = hexRgb(c.paper);
  const brandName = input.emisorNombre?.trim() || AURIX_BRAND.name;

  const paintPageBg = () => {
    doc.setFillColor(...paper);
    doc.rect(0, 0, pageW, pageH, "F");
  };
  paintPageBg();

  // —— Cabecera fina ——
  doc.setFillColor(...charcoal);
  doc.rect(0, 0, pageW, 3, "F");

  const logo = aurixLogoDataUrl(128);
  if (logo) {
    doc.addImage(logo, "PNG", m, 12, 12, 12);
  }

  doc.setTextColor(...charcoal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(brandName, m + 16, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text("Presupuesto", m + 16, 22);

  // Folio bloque derecha
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...teal);
  doc.text(quote.folio, pageW - m, 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text(fmtDate(quote.createdAt), pageW - m, 21, { align: "right" });

  let y = 32;
  doc.setDrawColor(...line);
  doc.setLineWidth(0.35);
  doc.line(m, y, pageW - m, y);

  // —— Título + meta ——
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...charcoal);
  doc.text("Presupuesto", m, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text(QUOTE_STATUS_LABELS[quote.status], pageW - m, y - 1, {
    align: "right",
  });

  y += 8;
  // Meta chips: lista · validez
  const listaNombre = input.priceList?.nombre ?? "Lista de precios";
  doc.setFillColor(215, 235, 231);
  doc.roundedRect(m, y - 4, contentW, 10, 1.5, 1.5, "F");
  doc.setFontSize(8);
  doc.setTextColor(...teal);
  doc.setFont("helvetica", "bold");
  doc.text(`Lista: ${listaNombre}`, m + 4, y + 2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  const validez = quote.validezHasta
    ? `Válido hasta ${fmtLongDate(quote.validezHasta)}`
    : `Validez ${quote.validezDias} días`;
  doc.text(validez, pageW - m - 4, y + 2, { align: "right" });

  // —— Cliente ——
  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...muted);
  doc.text("CLIENTE", m, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...charcoal);
  doc.text(quote.clienteNombre || "Cliente eventual", m, y);

  const contactBits = [
    quote.clienteEmail || null,
    quote.clienteTelefono || null,
  ].filter(Boolean) as string[];
  if (contactBits.length) {
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(contactBits.join("  ·  "), m, y);
  }

  // —— Tabla ——
  y += 10;
  const cols = {
    n: m,
    sku: m + 10,
    desc: m + 36,
    qty: m + 118,
    unit: m + 136,
    disc: m + 156,
    imp: pageW - m,
  };
  const rowH = 7.5;

  const drawTableHeader = (at: number) => {
    doc.setFillColor(...charcoal);
    doc.roundedRect(m, at, contentW, rowH, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(250, 248, 244);
    doc.text("#", cols.n + 2, at + 5);
    doc.text("SKU", cols.sku, at + 5);
    doc.text("Descripción", cols.desc, at + 5);
    doc.text("Cant.", cols.qty + 10, at + 5, { align: "right" });
    doc.text("P. unit.", cols.unit + 14, at + 5, { align: "right" });
    doc.text("Dto%", cols.disc + 10, at + 5, { align: "right" });
    doc.text("Importe", cols.imp, at + 5, { align: "right" });
    return at + rowH + 1;
  };

  y = drawTableHeader(y);
  doc.setFont("helvetica", "normal");

  quote.lines.forEach((line, idx) => {
    if (y > pageH - 55) {
      doc.addPage();
      paintPageBg();
      doc.setFillColor(...charcoal);
      doc.rect(0, 0, pageW, 3, "F");
      y = drawTableHeader(18);
      doc.setFont("helvetica", "normal");
    }

    if (idx % 2 === 0) {
      doc.setFillColor(255, 255, 255);
      doc.rect(m, y - 0.5, contentW, rowH, "F");
    }

    const nombre =
      line.nombre.length > 38 ? `${line.nombre.slice(0, 36)}…` : line.nombre;
    const sku =
      line.sku.length > 10 ? `${line.sku.slice(0, 9)}…` : line.sku || "—";

    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text(String(idx + 1), cols.n + 2, y + 4.8);
    doc.text(sku, cols.sku, y + 4.8);

    doc.setTextColor(...charcoal);
    doc.setFontSize(8);
    doc.text(nombre, cols.desc, y + 4.8);

    doc.setFontSize(7.5);
    doc.text(String(line.cantidad), cols.qty + 10, y + 4.8, { align: "right" });
    doc.text(money(line.precioUnitario), cols.unit + 14, y + 4.8, {
      align: "right",
    });
    doc.setTextColor(...muted);
    doc.text(
      line.lineDescuentoPct ? `${line.lineDescuentoPct}%` : "—",
      cols.disc + 10,
      y + 4.8,
      { align: "right" }
    );
    doc.setTextColor(...charcoal);
    doc.setFont("helvetica", "bold");
    doc.text(money(line.importe), cols.imp, y + 4.8, { align: "right" });
    doc.setFont("helvetica", "normal");

    y += rowH;
  });

  // —— Totales ——
  y += 4;
  doc.setDrawColor(...line);
  doc.setLineWidth(0.3);
  doc.line(m + contentW * 0.5, y, pageW - m, y);

  const totalsX = m + contentW * 0.52;
  const labelW = 38;
  y += 7;

  const rowTotal = (
    label: string,
    value: string,
    opts?: { bold?: boolean; accent?: boolean; size?: number }
  ) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.size ?? 9);
    doc.setTextColor(...(opts?.accent ? teal : muted));
    doc.text(label, totalsX, y);
    doc.setTextColor(...(opts?.accent ? teal : charcoal));
    doc.text(value, pageW - m, y, { align: "right" });
    y += 6;
  };

  rowTotal("Subtotal", money(quote.subtotal));
  if (quote.descuentoMonto > 0) {
    rowTotal(
      `Descuento (${quote.descuentoPctAplicado}%)`,
      `− ${money(quote.descuentoMonto)}`
    );
  }

  y += 1;
  doc.setFillColor(...teal);
  doc.roundedRect(totalsX - 3, y - 5, pageW - m - (totalsX - 3), 11, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("Total", totalsX, y + 2);
  doc.text(money(quote.total), pageW - m - 3, y + 2, { align: "right" });
  y += 12;

  // —— Notas ——
  if (quote.notas?.trim()) {
    y += 4;
    if (y > pageH - 35) {
      doc.addPage();
      paintPageBg();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text("NOTAS", m, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...charcoal);
    const noteLines = doc.splitTextToSize(quote.notas.trim(), contentW);
    doc.text(noteLines, m, y);
    y += noteLines.length * 4 + 2;
  }

  // —— Pie ——
  const footerY = pageH - 16;
  doc.setDrawColor(...line);
  doc.setLineWidth(0.25);
  doc.line(m, footerY, pageW - m, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...muted);
  doc.text(
    "Documento no válido como factura. Los precios y disponibilidad pueden variar.",
    m,
    footerY + 5,
    { maxWidth: contentW * 0.7 }
  );
  doc.text(`${brandName} · ${AURIX_BRAND.contact.web}`, pageW - m, footerY + 5, {
    align: "right",
  });

  doc.save(`presupuesto-${quote.folio}.pdf`);
}
