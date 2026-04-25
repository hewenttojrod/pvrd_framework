/**
 * Navigation registry system.
 * Dynamically loads navigation items from core and all active modules,
 * merges them, filters hidden items, and sorts by order.
 * Caches results after first load.
 */
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

/**
 * Loads and merges navigation items from core and all active modules.
 * 
 * Execution flow:
 * 1. Returns cached result if already loaded
 * 2. Dynamically imports all module index.ts files
 * 3. Extracts navItem from each module
 * 4. Merges with coreNav
 * 5. Filters out hidden items
 * 6. Sorts by order property
 * 7. Caches result for subsequent calls
 * 
 * @returns Promise<SidebarNavItem[]> - Merged and sorted navigation items
 */
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