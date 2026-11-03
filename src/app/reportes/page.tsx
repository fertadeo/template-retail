import { Suspense } from "react";
import { SalesReportPanel } from "@/components/sales-report-panel";

export default function ReportesPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">Cargando reportes…</p>
      }
    >
      <SalesReportPanel />
    </Suspense>
  );
}
