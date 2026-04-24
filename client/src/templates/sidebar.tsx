import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { loadSidebarNav } from "@navigation/nav-registry";
import type { SidebarNavItem } from "@app-types/navigation";

type SidebarProps = {
  collapsed: boolean;
  onCollapsedChange: (next: boolean) => void;
  width: number;
  onWidthChange: (next: number) => void;
};

const SIDEBAR_WIDTH_MIN = 220;
const SIDEBAR_WIDTH_MAX = 520;

const clampSidebarWidth = (value: number): number => {
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, value));
};

function hasActiveDescendant(item: SidebarNavItem, pathname: string): boolean {
  if (item.path === pathname) {
    return true;
  }

  if (!item.children?.length) {
    return false;
  }

  return item.children.some((child) => hasActiveDescendant(child, pathname));
}

function sortItems(items: SidebarNavItem[]): SidebarNavItem[] {
  return [...items].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
}

export default function Sidebar({ collapsed, onCollapsedChange, width, onWidthChange }: SidebarProps) {
  const [mobileOpenAt, setMobileOpenAt] = useState<string | null>(null);
  const { pathname } = useLocation();
  const mobileOpen = mobileOpenAt === pathname;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [navItems, setNavItems] = useState<SidebarNavItem[]>([]);
  const [navLoading, setNavLoading] = useState(true);
  const [navError, setNavError] = useState<string | null>(null);

  const sortedNav = useMemo(() => sortItems(navItems), [navItems]);

  useEffect(() => {
  let mounted = true;

  const run = async () => {
      setNavLoading(true);
      setNavError(null);

      try {
        const items = await loadSidebarNav();
        if (mounted) {
          setNavItems(items);
        }
      } catch {
        if (mounted) {
          setNavError("Failed to load navigation.");
        }
      } finally {
        if (mounted) {
          setNavLoading(false);
        }
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, []);

  const autoOpenGroups = useMemo(() => {
    const result: Record<string, boolean> = {};
    for (const item of sortedNav) {
      if (item.children?.length && hasActiveDescendant(item, pathname)) {
        result[item.id] = true;
      }
    }
    return result;
  }, [sortedNav, pathname]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (collapsed) {
      return;
    }

    event.preventDefault();

    const startX = event.clientX;
    const startWidth = width;

    const handleMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      onWidthChange(clampSidebarWidth(startWidth + delta));
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const renderItem = (item: SidebarNavItem, depth = 0) => {
    const hasChildren = Boolean(item.children?.length);
    const isOpen = Boolean(openGroups[item.id] ?? autoOpenGroups[item.id]);
    const children = hasChildren ? sortItems(item.children!) : [];

    const paddingByDepth = depth === 0 ? "px-3" : depth === 1 ? "pl-8 pr-3" : "pl-12 pr-3";

    // var content_return = ""

    if (hasChildren) {
      return (
        <li key={item.id}>
          <button
            type="button"
            className={[
              "flex w-full items-center justify-between rounded-md py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
              paddingByDepth,
            ].join(" ")}
            onClick={() => toggleGroup(item.id)}
            aria-expanded={isOpen}
            aria-controls={`submenu-${item.id}`}
            title={collapsed ? item.title : undefined}
          >
            <span className="truncate">{collapsed ? item.title.slice(0, 1) : item.title}</span>
            {!collapsed && <span className="text-xs">{isOpen ? "-" : "+"}</span>}
          </button>

          {!collapsed && (
            <ul
              id={`submenu-${item.id}`}
              className={[
                "space-y-1 overflow-hidden transition-all duration-200",
                isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
              ].join(" ")}
            >
              {children.map((child) => renderItem(child, depth + 1))}
            </ul>
          )}
        </li>
      );
    }

    if (!item.path) {
      return null;
    }

    return (
      <li key={item.id}>
        <NavLink
          to={item.path}
            end
          className={({ isActive }) =>
            [
              "block rounded-md py-2 text-sm",
              paddingByDepth,
              isActive
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
            ].join(" ")
          }
          title={collapsed ? item.title : undefined}
        >
          {collapsed ? item.title.slice(0, 1) : item.title}
        </NavLink>
      </li>
    );
  };
  const resolvedSidebarWidth = collapsed ? 80 : width;
  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-40 rounded-md bg-slate-800 px-3 py-2 text-sm text-white md:hidden"
        onClick={() => setMobileOpenAt(pathname)}
        aria-expanded={mobileOpen}
        aria-controls="app-sidebar"
      >
        Menu
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpenAt(null)}
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        className={[
          "fixed left-0 top-0 z-40 h-screen border-r border-slate-200 bg-white transition-transform duration-300 dark:border-slate-700 dark:bg-slate-900",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
        style={{ width: `${resolvedSidebarWidth}px` }}
>
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
          <span className={["font-semibold", collapsed ? "hidden" : "block"].join(" ")}>Placeholder</span>
          <button
            type="button"
            className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600"
            onClick={() => onCollapsedChange(!collapsed)}
          >
            {collapsed ? ">" : "<"}
          </button>
        </div>

        <nav className="p-3">
          {navLoading && <p className="text-sm text-slate-500">Loading menu...</p>}

          {!navLoading && navError && (
            <div className="space-y-2">
              <p className="text-sm text-red-500">{navError}</p>
              <button
                type="button"
                className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600"
                onClick={async () => {
                  setNavLoading(true);
                  setNavError(null);
                  try {
                    const items = await loadSidebarNav();
                    setNavItems(items);
                  } catch {
                    setNavError("Failed to load navigation.");
                  } finally {
                    setNavLoading(false);
                  }
                }}
              >
                Retry
              </button>
            </div>
          )}

          {!navLoading && !navError && (
            <ul className="space-y-1">{sortedNav.map((item) => renderItem(item))}</ul>
          )}
        </nav>
        {!collapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-slate-300 dark:hover:bg-slate-600"
          onPointerDown={startResize}
        />
      )}
      </aside>
    </>
  );
}