import Link from "next/link";
import { BranchesPanel } from "@/components/branches-panel";
import { BRANCHES_ENABLED } from "@/lib/features";

export default function SucursalesPage() {
  if (!BRANCHES_ENABLED) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Locales
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-charcoal">
            Sucursales deshabilitadas
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            En este proyecto cada <strong>comercio</strong> funciona como un
            local único (sin depósitos ni sucursales internas). Gestioná los
            locales desde Comercios.
          </p>
        </div>
        <Link
          href="/comercios"
          className="inline-flex h-10 items-center rounded-lg bg-teal px-4 text-sm font-medium text-white hover:bg-teal/90"
        >
          Ir a Comercios
        </Link>
      </div>
    );
  }
  return <BranchesPanel />;
}
