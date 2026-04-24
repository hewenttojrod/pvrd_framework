import type { ComponentType } from "react";

export type NavSection = "core" | "module";

export type ModuleRoute = {
  path: string;
  load: () => Promise<{ default: ComponentType }>
};

export interface SidebarNavItem {
  id: string;
  title: string;
  path?: string;
  icon?: string;
  order?: number;
  section?: NavSection;
  hidden?: boolean;
  children?: SidebarNavItem[];
}