/**
 * Calibrado de papel térmico por estación (localStorage).
 * Afecta tickets POS y etiquetas de producto.
 */

export type PaperPresetId = "58mm" | "80mm" | "custom";

export type PrintSettings = {
  preset: PaperPresetId;
  /** Ancho del rollo / página en mm. */
  paperWidthMm: number;
  /** Margen lateral/superior en mm. */
  marginMm: number;
  /** Ancho útil del contenido en mm (suele ser paper - 2*margen). */
  contentWidthMm: number;
  /** Escala tipográfica (1 = normal). */
  fontScale: number;
  /** Espacio extra al pie del ticket (mm), útil para corte / base. */
  footerMarginMm: number;
};

export const PAPER_PRESETS: Array<{
  id: Exclude<PaperPresetId, "custom">;
  label: string;
  paperWidthMm: number;
  marginMm: number;
  contentWidthMm: number;
}> = [
  {
    id: "58mm",
    label: "58 mm",
    paperWidthMm: 58,
    marginMm: 2,
    contentWidthMm: 48,
  },
  {
    id: "80mm",
    label: "80 mm",
    paperWidthMm: 80,
    marginMm: 2,
    contentWidthMm: 72,
  },
];

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  preset: "80mm",
  paperWidthMm: 80,
  marginMm: 2,
  contentWidthMm: 72,
  fontScale: 1,
  footerMarginMm: 8,
};

const STORAGE_KEY = "aurix.retail.printSettings.v1";

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function normalizePrintSettings(
  partial: Partial<PrintSettings> | null | undefined
): PrintSettings {
  const preset = partial?.preset ?? DEFAULT_PRINT_SETTINGS.preset;
  const fromPreset = PAPER_PRESETS.find((p) => p.id === preset);

  const fontScaleRaw = Number(partial?.fontScale);
  const fontScale = clamp(
    Number.isFinite(fontScaleRaw)
      ? fontScaleRaw
      : DEFAULT_PRINT_SETTINGS.fontScale,
    0.75,
    1.5
  );
  const footerRaw = Number(partial?.footerMarginMm);
  const footerMarginMm = clamp(
    Number.isFinite(footerRaw)
      ? footerRaw
      : DEFAULT_PRINT_SETTINGS.footerMarginMm,
    0,
    40
  );

  if (preset !== "custom" && fromPreset) {
    return {
      preset: fromPreset.id,
      paperWidthMm: fromPreset.paperWidthMm,
      marginMm: fromPreset.marginMm,
      contentWidthMm: fromPreset.contentWidthMm,
      fontScale,
      footerMarginMm,
    };
  }

  const paperWidthMm = clamp(
    Number(partial?.paperWidthMm) || DEFAULT_PRINT_SETTINGS.paperWidthMm,
    40,
    120
  );
  const marginMm = clamp(
    Number(partial?.marginMm) || DEFAULT_PRINT_SETTINGS.marginMm,
    0,
    10
  );
  const maxContent = Math.max(20, paperWidthMm - marginMm * 2);
  const contentWidthMm = clamp(
    Number(partial?.contentWidthMm) || maxContent,
    20,
    maxContent
  );

  return {
    preset: "custom",
    paperWidthMm,
    marginMm,
    contentWidthMm,
    fontScale,
    footerMarginMm,
  };
}

export function getPrintSettings(): PrintSettings {
  if (typeof window === "undefined") return DEFAULT_PRINT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRINT_SETTINGS;
    return normalizePrintSettings(JSON.parse(raw) as Partial<PrintSettings>);
  } catch {
    return DEFAULT_PRINT_SETTINGS;
  }
}

export function savePrintSettings(
  next: Partial<PrintSettings>
): PrintSettings {
  const current = getPrintSettings();
  const normalized = normalizePrintSettings({ ...current, ...next });
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function printSettingsSummary(settings: PrintSettings): string {
  const preset =
    settings.preset === "custom"
      ? "Personalizado"
      : PAPER_PRESETS.find((p) => p.id === settings.preset)?.label ??
        settings.preset;
  return `${preset} · papel ${settings.paperWidthMm} mm · útil ${settings.contentWidthMm} mm · pie ${settings.footerMarginMm} mm`;
}

/** CSS compartido para tickets/etiquetas según calibrado. */
export function printLayoutCss(settings?: PrintSettings): string {
  const s = settings ?? getPrintSettings();
  const fontPx = Math.round(12 * s.fontScale * 10) / 10;
  return `
    @page {
      size: ${s.paperWidthMm}mm auto;
      margin: ${s.marginMm}mm;
    }
    body {
      width: ${s.contentWidthMm}mm;
      margin: 0 auto;
      font-size: ${fontPx}px;
    }
    @media print {
      body { width: ${s.contentWidthMm}mm; }
    }
  `;
}
