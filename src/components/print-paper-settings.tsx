"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AURIX_BRAND } from "@/lib/brand";
import {
  DEFAULT_PRINT_SETTINGS,
  PAPER_PRESETS,
  getPrintSettings,
  normalizePrintSettings,
  printSettingsSummary,
  savePrintSettings,
  type PaperPresetId,
  type PrintSettings,
} from "@/lib/print-settings";
import { cn } from "@/lib/utils";

/** Escala del preview en pantalla (~96dpi ≈ 3.78 px/mm). Más alto = más fidedigno. */
const PREVIEW_PX_PER_MM = 5.5;

function downloadSilentPrintShortcut() {
  const url = window.location.origin;
  const bat = `@echo off
REM Aurix Retail - impresion directa de tickets (sin dialogo de Windows)
REM 1) Deja la impresora termica como predeterminada en Windows
REM 2) Cerra Chrome/Edge por completo antes de usar este acceso
REM 3) Abrí el POS solo con este .bat

set "URL=${url}"
set "PROFILE=%LOCALAPPDATA%\\AurixRetailPrint"

if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
  start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --user-data-dir="%PROFILE%" "%URL%"
  exit /b 0
)
if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
  start "" "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --user-data-dir="%PROFILE%" "%URL%"
  exit /b 0
)
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
  start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk-printing --user-data-dir="%PROFILE%" "%URL%"
  exit /b 0
)
if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
  start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk-printing --user-data-dir="%PROFILE%" "%URL%"
  exit /b 0
)

echo No se encontro Chrome ni Edge.
pause
`;
  const blob = new Blob([bat.replace(/\n/g, "\r\n")], {
    type: "application/octet-stream",
  });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = "Aurix-POS-impresion-directa.bat";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

function TicketPreview({ settings }: { settings: PrintSettings }) {
  const paperW = Math.max(40, settings.paperWidthMm) * PREVIEW_PX_PER_MM;
  const contentW = Math.max(20, settings.contentWidthMm) * PREVIEW_PX_PER_MM;
  const sidePad = Math.max(0, (paperW - contentW) / 2);
  const fontPx = Math.round(12 * settings.fontScale * 10) / 10;
  const footerH = Math.max(0, settings.footerMarginMm) * PREVIEW_PX_PER_MM;

  return (
    <div className="overflow-x-auto">
      <div className="mx-auto flex min-w-0 justify-center px-2 py-2">
        <div
          className="relative shrink-0 bg-[#faf8f4] text-black shadow-[0_12px_40px_-20px_rgba(31,28,25,0.55)] ring-1 ring-black/15"
          style={{
            width: `${paperW}px`,
            paddingLeft: `${sidePad}px`,
            paddingRight: `${sidePad}px`,
            paddingTop: `${Math.max(2, settings.marginMm) * PREVIEW_PX_PER_MM}px`,
          }}
          aria-label={`Vista previa ticket ${settings.paperWidthMm} mm`}
        >
          <div
            className="mx-auto"
            style={{
              width: `${contentW}px`,
              fontFamily:
                '"Courier New", Courier, "Noto Sans Mono", monospace',
              fontSize: `${fontPx}px`,
              fontWeight: 700,
              lineHeight: 1.35,
            }}
          >
            <div className="text-center">
              <p
                className="uppercase tracking-[0.06em]"
                style={{
                  fontSize: `${Math.round(18 * settings.fontScale * 10) / 10}px`,
                  fontWeight: 900,
                }}
              >
                {AURIX_BRAND.name}
              </p>
              {AURIX_BRAND.contact.web ? (
                <p
                  className="mt-0.5"
                  style={{
                    fontSize: `${Math.round(11 * settings.fontScale * 10) / 10}px`,
                  }}
                >
                  {AURIX_BRAND.contact.web}
                </p>
              ) : null}
            </div>

            <div className="my-2 border-t-2 border-dashed border-black" />

            <div className="space-y-0.5">
              <div className="flex justify-between gap-2">
                <span>Folio</span>
                <span>T-00042</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Fecha</span>
                <span>13/11/26 18:00</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Pago</span>
                <span>Efectivo</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Cliente</span>
                <span>Mostrador</span>
              </div>
            </div>

            <div className="my-2 border-t-2 border-dashed border-black" />
            <p
              className="uppercase tracking-[0.08em]"
              style={{
                fontSize: `${Math.round(12 * settings.fontScale * 10) / 10}px`,
                fontWeight: 900,
              }}
            >
              Productos
            </p>

            <div className="mt-1.5 space-y-2">
              <div>
                <p
                  style={{
                    fontSize: `${Math.round(13 * settings.fontScale * 10) / 10}px`,
                    fontWeight: 900,
                  }}
                >
                  Producto de ejemplo
                </p>
                <div
                  className="flex justify-between gap-2"
                  style={{
                    fontSize: `${Math.round(12 * settings.fontScale * 10) / 10}px`,
                  }}
                >
                  <span>1 × $1.200</span>
                  <span>$1.200</span>
                </div>
              </div>
              <div>
                <p
                  style={{
                    fontSize: `${Math.round(13 * settings.fontScale * 10) / 10}px`,
                    fontWeight: 900,
                  }}
                >
                  Otro ítem demo
                </p>
                <div
                  className="flex justify-between gap-2"
                  style={{
                    fontSize: `${Math.round(12 * settings.fontScale * 10) / 10}px`,
                  }}
                >
                  <span>2 × $450</span>
                  <span>$900</span>
                </div>
              </div>
            </div>

            <div className="my-2 border-t-2 border-dashed border-black" />
            <div className="flex justify-between gap-2">
              <span>Subtotal</span>
              <span>$2.100</span>
            </div>
            <div
              className="mt-1 flex justify-between gap-2"
              style={{
                fontSize: `${Math.round(16 * settings.fontScale * 10) / 10}px`,
                fontWeight: 900,
              }}
            >
              <span>TOTAL</span>
              <span>$2.100</span>
            </div>

            <div className="my-2 border-t-2 border-dashed border-black" />
            <div
              className="text-center"
              style={{
                fontSize: `${Math.round(11 * settings.fontScale * 10) / 10}px`,
              }}
            >
              <p>Gracias por su compra</p>
              <p>{AURIX_BRAND.legalName}</p>
            </div>
          </div>

          <div
            className="relative mt-1 border-t border-dashed border-teal/50 bg-[repeating-linear-gradient(135deg,rgba(15,118,110,0.08),rgba(15,118,110,0.08)_6px,transparent_6px,transparent_12px)]"
            style={{ height: `${Math.max(footerH, 8)}px` }}
            title={`Margen de pie: ${settings.footerMarginMm} mm`}
          >
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-teal">
              Pie {settings.footerMarginMm} mm
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PrintPaperSettings() {
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS);
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettings(getPrintSettings());
    setReady(true);
  }, []);

  const preview = useMemo(() => normalizePrintSettings(settings), [settings]);

  function applyPreset(id: PaperPresetId) {
    setMessage(null);
    if (id === "custom") {
      setSettings((prev) =>
        normalizePrintSettings({
          ...prev,
          preset: "custom",
        })
      );
      return;
    }
    const preset = PAPER_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setSettings(
      normalizePrintSettings({
        preset: preset.id,
        paperWidthMm: preset.paperWidthMm,
        marginMm: preset.marginMm,
        contentWidthMm: preset.contentWidthMm,
        fontScale: settings.fontScale,
        footerMarginMm: settings.footerMarginMm,
      })
    );
  }

  function save() {
    const saved = savePrintSettings(settings);
    setSettings(saved);
    setMessage(`Guardado: ${printSettingsSummary(saved)}`);
  }

  function resetDefaults() {
    const saved = savePrintSettings(DEFAULT_PRINT_SETTINGS);
    setSettings(saved);
    setMessage("Se restauró el papel 80 mm.");
  }

  if (!ready) {
    return (
      <section className="rounded-xl bg-card/90 p-5 ring-1 ring-border/70 sm:p-6">
        <p className="text-sm text-muted-foreground">Cargando papel…</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-xl bg-card/90 p-5 ring-1 ring-border/70 sm:p-6">
      <div>
        <h2 className="font-display text-lg font-medium text-charcoal">
          Papel de impresora
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Calibrá el ancho del rollo térmico para tickets POS y etiquetas.
          Se guarda en este equipo.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PAPER_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p.id)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium ring-1 transition",
              settings.preset === p.id
                ? "bg-teal text-[#f2eee6] ring-teal"
                : "bg-background text-foreground ring-border/70 hover:ring-teal/40"
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => applyPreset("custom")}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium ring-1 transition",
            settings.preset === "custom"
              ? "bg-teal text-[#f2eee6] ring-teal"
              : "bg-background text-foreground ring-border/70 hover:ring-teal/40"
          )}
        >
          Personalizado
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="paper-width">Ancho papel (mm)</Label>
          <Input
            id="paper-width"
            type="number"
            min={40}
            max={120}
            step="1"
            value={settings.paperWidthMm}
            disabled={settings.preset !== "custom"}
            onChange={(e) =>
              setSettings((prev) =>
                normalizePrintSettings({
                  ...prev,
                  preset: "custom",
                  paperWidthMm: Number(e.target.value),
                })
              )
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paper-margin">Margen (mm)</Label>
          <Input
            id="paper-margin"
            type="number"
            min={0}
            max={10}
            step="0.5"
            value={settings.marginMm}
            disabled={settings.preset !== "custom"}
            onChange={(e) =>
              setSettings((prev) =>
                normalizePrintSettings({
                  ...prev,
                  preset: "custom",
                  marginMm: Number(e.target.value),
                })
              )
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paper-content">Ancho útil (mm)</Label>
          <Input
            id="paper-content"
            type="number"
            min={20}
            max={120}
            step="1"
            value={settings.contentWidthMm}
            disabled={settings.preset !== "custom"}
            onChange={(e) =>
              setSettings((prev) =>
                normalizePrintSettings({
                  ...prev,
                  preset: "custom",
                  contentWidthMm: Number(e.target.value),
                })
              )
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paper-font">Escala texto</Label>
          <Input
            id="paper-font"
            type="number"
            min={0.75}
            max={1.5}
            step="0.05"
            value={settings.fontScale}
            onChange={(e) =>
              setSettings((prev) =>
                normalizePrintSettings({
                  ...prev,
                  fontScale: Number(e.target.value),
                })
              )
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paper-footer">Margen pie (mm)</Label>
          <Input
            id="paper-footer"
            type="number"
            min={0}
            max={40}
            step="1"
            value={settings.footerMarginMm}
            onChange={(e) =>
              setSettings((prev) =>
                normalizePrintSettings({
                  ...prev,
                  footerMarginMm: Number(e.target.value),
                })
              )
            }
          />
          <p className="text-xs text-muted-foreground">
            Espacio extra al final del ticket (corte / base).
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-muted/40 px-3 py-4 sm:px-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Vista previa
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Escala ~{PREVIEW_PX_PER_MM} px/mm · papel {preview.paperWidthMm} mm
              · útil {preview.contentWidthMm} mm · pie {preview.footerMarginMm}{" "}
              mm
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-[#e8e2d8]/70 p-4 ring-1 ring-border/50 sm:p-6">
          <TicketPreview settings={preview} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save}>
          Guardar papel
        </Button>
        <Button type="button" variant="outline" onClick={resetDefaults}>
          Restaurar 80 mm
        </Button>
      </div>
      {message ? <p className="text-sm text-teal">{message}</p> : null}

      <div className="space-y-3 rounded-lg bg-background/70 p-4 ring-1 ring-border/60">
        <div>
          <h3 className="text-sm font-medium text-charcoal">
            Impresión directa (sin diálogo de Windows)
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Al cobrar, el POS ya dispara el ticket solo. El diálogo de Windows
            lo pone el navegador por seguridad: para saltarlo en la caja hay que
            abrir Chrome/Edge en modo impresión directa y dejar la térmica como
            impresora predeterminada.
          </p>
        </div>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>
            En Windows, poné la impresora térmica como{" "}
            <span className="font-medium text-foreground">predeterminada</span>.
          </li>
          <li>Cerrá Chrome/Edge por completo (también en la bandeja).</li>
          <li>
            Descargá el acceso directo y abrí el sistema solo con ese archivo.
          </li>
          <li>
            Al vender, el ticket sale directo a la térmica, sin elegir impresora.
          </li>
        </ol>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => {
            downloadSilentPrintShortcut();
            setMessage(
              "Descargado Aurix-POS-impresion-directa.bat. Abrí el POS con ese archivo."
            );
          }}
        >
          <Download className="size-4" />
          Descargar acceso directo de caja
        </Button>
      </div>
    </section>
  );
}
