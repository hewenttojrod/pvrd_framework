import type { SidebarNavItem } from "@app-types/navigation";

/**
 * Core application navigation items (not from modules).
 * Currently includes Home page.
 * Reserved for admin, analytics, and other built-in sections.
 */
export const coreNav: SidebarNavItem[] = [ 
  { 
    id: "home",     
    title: "Home",      
    path: "/",          
    section: "core",    
    order: 10 
  },  
  // {
  //   id: "admin-group",
  //   title: "Admin",
  //   section: "core",
  //   order: 20,
  //   children: [
  //     { 
  //       id: "admin-users", 
  //       title: "Users", 
  //       path: "/admin/users", 
  //       section: "core", 
  //       order: 21 },
  //     { 
  //       id: "admin-audit", 
  //       title: "Audit Log", 
  //       path: "/admin/audit", 
  //       section: "core", 
  //       order: 22 },
  //   ],
  // },
];