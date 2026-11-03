/**
 * Genera public/ejemplos/presupuesto-ejemplo.pdf para consultar el diseño.
 * Uso: npm install && node scripts/generate-presupuesto-sample.mjs
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { jsPDF } = require("jspdf");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "ejemplos");
const outFile = path.join(outDir, "presupuesto-ejemplo.pdf");

function hexRgb(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function money(n) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Monograma simple (sin canvas) alineado a la marca. */
function drawMark(doc, x, y, size) {
  const charcoal = hexRgb("#1f1c19");
  const teal = hexRgb("#0f766e");
  doc.setFillColor(...charcoal);
  doc.roundedRect(x, y, size, size, size * 0.18, size * 0.18, "F");
  doc.setFillColor(...teal);
  doc.triangle(
    x + size * 0.5,
    y + size * 0.22,
    x + size * 0.78,
    y + size * 0.72,
    x + size * 0.22,
    y + size * 0.72,
    "F"
  );
  doc.setFillColor(94, 234, 212);
  doc.circle(x + size * 0.5, y + size * 0.58, size * 0.07, "F");
}

const quote = {
  folio: "PRE-1001",
  clienteNombre: "Comercial del Valle SA",
  clienteEmail: "compras@valle.ejemplo",
  clienteTelefono: "11 5555-0102",
  priceListNombre: "Mayorista",
  notas:
    "Entrega estimada 5–7 días hábiles. Precios sujetos a stock. Forma de pago: transferencia a confirmar.",
  lines: [
    {
      sku: "GUI-010",
      nombre: "Guitarra acústica Dreadnought",
      cantidad: 2,
      precioUnitario: 185000,
      lineDescuentoPct: 0,
      importe: 370000,
    },
    {
      sku: "AMP-044",
      nombre: "Amplificador 40W combo",
      cantidad: 1,
      precioUnitario: 98000,
      lineDescuentoPct: 5,
      importe: 93100,
    },
    {
      sku: "CAB-120",
      nombre: "Cable instrumento 3m",
      cantidad: 4,
      precioUnitario: 8500,
      lineDescuentoPct: 0,
      importe: 34000,
    },
    {
      sku: "CAP-003",
      nombre: "Capodastro metálico",
      cantidad: 3,
      precioUnitario: 6200,
      lineDescuentoPct: 0,
      importe: 18600,
    },
  ],
  subtotal: 515700,
  descuentoPctAplicado: 10,
  descuentoMonto: 51570,
  total: 464130,
};

const charcoal = hexRgb("#1f1c19");
const teal = hexRgb("#0f766e");
const muted = hexRgb("#5c564e");
const lineCol = hexRgb("#cfc6b8");
const paper = hexRgb("#faf8f4");

const doc = new jsPDF({ unit: "mm", format: "a4" });
const pageW = doc.internal.pageSize.getWidth();
const pageH = doc.internal.pageSize.getHeight();
const m = 16;
const contentW = pageW - m * 2;

doc.setFillColor(...paper);
doc.rect(0, 0, pageW, pageH, "F");
doc.setFillColor(...charcoal);
doc.rect(0, 0, pageW, 3, "F");

drawMark(doc, m, 12, 12);

doc.setTextColor(...charcoal);
doc.setFont("helvetica", "bold");
doc.setFontSize(15);
doc.text("Aurix", m + 16, 17);
doc.setFont("helvetica", "normal");
doc.setFontSize(8);
doc.setTextColor(...muted);
doc.text("Presupuesto", m + 16, 22);

doc.setFont("helvetica", "bold");
doc.setFontSize(9);
doc.setTextColor(...teal);
doc.text(quote.folio, pageW - m, 16, { align: "right" });
doc.setFont("helvetica", "normal");
doc.setFontSize(8);
doc.setTextColor(...muted);
doc.text("29 oct 2026", pageW - m, 21, { align: "right" });

let y = 32;
doc.setDrawColor(...lineCol);
doc.setLineWidth(0.35);
doc.line(m, y, pageW - m, y);

y += 10;
doc.setFont("helvetica", "bold");
doc.setFontSize(18);
doc.setTextColor(...charcoal);
doc.text("Presupuesto", m, y);
doc.setFont("helvetica", "normal");
doc.setFontSize(8);
doc.setTextColor(...muted);
doc.text("Enviado", pageW - m, y - 1, { align: "right" });

y += 8;
doc.setFillColor(215, 235, 231);
doc.roundedRect(m, y - 4, contentW, 10, 1.5, 1.5, "F");
doc.setFontSize(8);
doc.setTextColor(...teal);
doc.setFont("helvetica", "bold");
doc.text(`Lista: ${quote.priceListNombre}`, m + 4, y + 2);
doc.setFont("helvetica", "normal");
doc.setTextColor(...muted);
doc.text("Válido hasta 13 de noviembre de 2026", pageW - m - 4, y + 2, {
  align: "right",
});

y += 14;
doc.setFont("helvetica", "bold");
doc.setFontSize(7);
doc.setTextColor(...muted);
doc.text("CLIENTE", m, y);
y += 5;
doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.setTextColor(...charcoal);
doc.text(quote.clienteNombre, m, y);
y += 5;
doc.setFont("helvetica", "normal");
doc.setFontSize(8);
doc.setTextColor(...muted);
doc.text(`${quote.clienteEmail}  ·  ${quote.clienteTelefono}`, m, y);

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

doc.setFillColor(...charcoal);
doc.roundedRect(m, y, contentW, rowH, 1, 1, "F");
doc.setFont("helvetica", "bold");
doc.setFontSize(7);
doc.setTextColor(250, 248, 244);
doc.text("#", cols.n + 2, y + 5);
doc.text("SKU", cols.sku, y + 5);
doc.text("Descripción", cols.desc, y + 5);
doc.text("Cant.", cols.qty + 10, y + 5, { align: "right" });
doc.text("P. unit.", cols.unit + 14, y + 5, { align: "right" });
doc.text("Dto%", cols.disc + 10, y + 5, { align: "right" });
doc.text("Importe", cols.imp, y + 5, { align: "right" });
y += rowH + 1;

doc.setFont("helvetica", "normal");
quote.lines.forEach((lineItem, idx) => {
  if (idx % 2 === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(m, y - 0.5, contentW, rowH, "F");
  }
  doc.setFontSize(7.5);
  doc.setTextColor(...muted);
  doc.text(String(idx + 1), cols.n + 2, y + 4.8);
  doc.text(lineItem.sku, cols.sku, y + 4.8);
  doc.setTextColor(...charcoal);
  doc.setFontSize(8);
  doc.text(lineItem.nombre, cols.desc, y + 4.8);
  doc.setFontSize(7.5);
  doc.text(String(lineItem.cantidad), cols.qty + 10, y + 4.8, {
    align: "right",
  });
  doc.text(money(lineItem.precioUnitario), cols.unit + 14, y + 4.8, {
    align: "right",
  });
  doc.setTextColor(...muted);
  doc.text(
    lineItem.lineDescuentoPct ? `${lineItem.lineDescuentoPct}%` : "—",
    cols.disc + 10,
    y + 4.8,
    { align: "right" }
  );
  doc.setTextColor(...charcoal);
  doc.setFont("helvetica", "bold");
  doc.text(money(lineItem.importe), cols.imp, y + 4.8, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += rowH;
});

y += 4;
doc.setDrawColor(...lineCol);
doc.setLineWidth(0.3);
doc.line(m + contentW * 0.5, y, pageW - m, y);

const totalsX = m + contentW * 0.52;
y += 7;
doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.setTextColor(...muted);
doc.text("Subtotal", totalsX, y);
doc.setTextColor(...charcoal);
doc.text(money(quote.subtotal), pageW - m, y, { align: "right" });
y += 6;
doc.setTextColor(...muted);
doc.text(`Descuento (${quote.descuentoPctAplicado}%)`, totalsX, y);
doc.setTextColor(...charcoal);
doc.text(`− ${money(quote.descuentoMonto)}`, pageW - m, y, { align: "right" });
y += 7;
doc.setFillColor(...teal);
doc.roundedRect(totalsX - 3, y - 5, pageW - m - (totalsX - 3), 11, 1.5, 1.5, "F");
doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.setTextColor(255, 255, 255);
doc.text("Total", totalsX, y + 2);
doc.text(money(quote.total), pageW - m - 3, y + 2, { align: "right" });
y += 14;

doc.setFont("helvetica", "bold");
doc.setFontSize(7);
doc.setTextColor(...muted);
doc.text("NOTAS", m, y);
y += 4;
doc.setFont("helvetica", "normal");
doc.setFontSize(8);
doc.setTextColor(...charcoal);
doc.text(doc.splitTextToSize(quote.notas, contentW), m, y);

const footerY = pageH - 16;
doc.setDrawColor(...lineCol);
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
doc.text("Aurix · aurixerp.com", pageW - m, footerY + 5, { align: "right" });

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, Buffer.from(doc.output("arraybuffer")));
console.log(`OK → ${outFile}`);
