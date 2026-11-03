"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChartColumn,
  FileText,
  Images,
  LayoutDashboard,
  MapPin,
  Package,
  Radio,
  Settings,
  ShoppingBag,
  Store,
  Users,
  Warehouse,
} from "lucide-react";
import { BRANCHES_ENABLED } from "@/lib/features";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/presupuestos", label: "Presupuestos", icon: FileText },
  { href: "/biblioteca", label: "Biblioteca", icon: Images },
  { href: "/pedidos", label: "Pedidos", icon: Warehouse },
  { href: "/mayorista", label: "Mayorista", icon: Building2 },
  { href: "/pos", label: "POS", icon: ShoppingBag },
  { href: "/reportes", label: "Reportes", icon: ChartColumn },
  { href: "/comercios", label: "Comercios", icon: Store },
  ...(BRANCHES_ENABLED
    ? [{ href: "/sucursales", label: "Sucursales", icon: MapPin }]
    : []),
  { href: "/canales", label: "Canales", icon: Radio },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];
export function AppSidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-charcoal/40 lg:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-[16.5rem] shrink-0 flex-col border-r border-white/10 bg-[#2a2622] text-sand transition-transform duration-300 lg:static lg:h-full lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="border-b border-white/10 px-5 py-5">
          <Link href="/" onClick={onClose} className="block">
            <p className="font-display text-2xl font-semibold tracking-tight text-[#f2eee6]">
              Aurix<span className="text-[#5eead4]">.</span>
            </p>
            <p className="mt-0.5 text-xs text-sand/60">Retail · mostrador</p>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-teal/25 text-[#e7f8f5]"
                    : "text-sand/75 hover:bg-white/5 hover:text-[#f2eee6]"
                )}
              >
                <Icon className="size-4 shrink-0 opacity-80" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-4 py-4 text-xs text-sand/50">
          Retail 360 · WooCommerce · ML
        </div>
      </aside>
    </>
  );
}
