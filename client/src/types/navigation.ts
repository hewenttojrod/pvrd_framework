/**
 * Navigation type sections for organizing sidebar items.
 * - "core": Built-in framework sections (home, admin, etc.)
 * - "module": Sections added by loaded modules
 */
import type { ComponentType } from "react";

export type NavSection = "core" | "module";

/**
 * Defines a route with its path and lazy-loaded component.
 * Used by modules to register pages in the main router.
 * @property path - Route path (e.g., "/Bookstore/catalog")
 * @property load - Async function returning component to render at this path
 */
export type ModuleRoute = {
  path: string;
  load: () => Promise<{ default: ComponentType }>
};

/**
 * Defines a navigation item in the sidebar, supporting hierarchical nested menus.
 * @property id - Unique identifier for this nav item
 * @property title - Display name shown in sidebar
 * @property path - Route path to navigate to (omit for group-only items)
 * @property icon - Optional icon identifier (currently unused)
 * @property order - Sort order within parent; lower numbers appear first
 * @property section - Navigation section ("core" or "module")
 * @property hidden - If true, item not displayed in sidebar
 * @property children - Optional nested submenu items
 */
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