import type { SidebarNavItem } from "@app-types/navigation";
import { coreNav } from "@navigation/core-nav";

type ModuleEntry = {
  navItem?: SidebarNavItem;
};

type ModuleLoader = () => Promise<ModuleEntry>;

const moduleEntries = import.meta.glob("../../../modules/*/client/index.ts") as Record<
  string,
  ModuleLoader
>;

let navCache: SidebarNavItem[] | null = null;

export async function loadSidebarNav(): Promise<SidebarNavItem[]> {
  if (navCache) {
    return navCache;
  }

  const loaded = await Promise.all(
    Object.values(moduleEntries).map(async (loadModule) => {
      try {
        return await loadModule();
      } catch {
        return {} as ModuleEntry;
      }
    })
  );

  const moduleNav = loaded
    .map((entry) => entry.navItem)
    .filter((item): item is SidebarNavItem => Boolean(item));

  navCache = [...coreNav, ...moduleNav]
    .filter((item) => !item.hidden)
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

  return navCache;
}