import { api } from "@/lib/api-client";
import { isApiMode } from "@/lib/api-config";
import { demoCatalogSettings } from "@/lib/public-catalog-api";
import type { CatalogSettings, CatalogOrderPage } from "@/lib/catalog";
export const privateCatalogApi = {
  settings: async () =>
    isApiMode() ? api.getCatalogSettings() : demoCatalogSettings(),
  save: async (settings: CatalogSettings) => {
    if (isApiMode()) return api.putCatalogSettings(settings);
    localStorage.setItem(
      "aurix.demo.catalog.settings",
      JSON.stringify(settings),
    );
    return settings;
  },
  orders: async (
    options: { page: number; status?: string; q?: string },
    signal?: AbortSignal,
  ): Promise<CatalogOrderPage> =>
    isApiMode()
      ? api.listCatalogOrders(options, signal)
      : { orders: [], page: options.page, hasMore: false },
  meta: async () => {
    const [settings, role] = await Promise.all([
      privateCatalogApi.settings(),
      isApiMode()
        ? api.getSession().then((result) => result.user.role)
        : Promise.resolve("superadmin" as const),
    ]);
    return { settings, role };
  },
};
