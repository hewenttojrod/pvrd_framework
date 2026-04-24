import { useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import Sidebar from "@templates/sidebar";


const SIDEBAR_WIDTH_DEFAULT = 288;
const SIDEBAR_WIDTH_MIN = 220;
const SIDEBAR_WIDTH_MAX = 520;
const SIDEBAR_WIDTH_COLLAPSED = 80;
const SIDEBAR_STORAGE_KEY = "pvrd.sidebar.width";

const clampSidebarWidth = (value: number): number => {
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, value));
};

export default function AppShell({ children }: PropsWithChildren) {
  const [collapsed, setCollapsed] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === "undefined") {
      return SIDEBAR_WIDTH_DEFAULT;
    }

    const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    const parsed = raw ? Number(raw) : SIDEBAR_WIDTH_DEFAULT;

    if (!Number.isFinite(parsed)) {
      return SIDEBAR_WIDTH_DEFAULT;
    }

    return clampSidebarWidth(parsed);
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  const resolvedSidebarWidth = useMemo(() => {
    return collapsed ? SIDEBAR_WIDTH_COLLAPSED : sidebarWidth;
  }, [collapsed, sidebarWidth]);
 
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
      />

      <main className="p-0" style={{ marginLeft: `${resolvedSidebarWidth}px` }}>
        {children}
      </main>
    </div>
  );
}