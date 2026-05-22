
"use client";

import React, { useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Briefcase, 
  Files, 
  HelpCircle, 
  UploadCloud, 
  BarChart3, 
  Users, 
  FileWarning, 
  Settings,
  Rocket,
  ChevronLeft,
  Send,
  BellRing,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AdminRole, hasPermission } from "@/lib/rbac";

interface NavItem {
  title: string;
  icon: any;
  href: string;
  permission?: keyof Parameters<typeof hasPermission>[1];
}

const menuItems: NavItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { title: "Exams", icon: Briefcase, href: "/admin/exams", permission: "canManageExams" },
  { title: "Mock Tests", icon: Files, href: "/admin/mock-tests", permission: "canManageMocks" },
  { title: "Bulk Ingestion", icon: UploadCloud, href: "/admin/upload-json", permission: "canUploadContent" },
  { title: "Question Bank", icon: HelpCircle, href: "/admin/questions", permission: "canUploadContent" },
  { title: "Publishing", icon: Send, href: "/admin/publishing", permission: "canPublishTests" },
  { title: "Announcements", icon: BellRing, href: "/admin/announcements", permission: "canManageExams" },
  { title: "Analytics", icon: BarChart3, href: "/admin/analytics", permission: "canViewAnalytics" },
  { title: "Users", icon: Users, href: "/admin/users", permission: "canManageUsers" },
  { title: "Staff Roles", icon: ShieldCheck, href: "/admin/roles", permission: "canManageAdmins" },
  { title: "Audit Logs", icon: FileWarning, href: "/admin/audit-logs", permission: "canManageSettings" },
  { title: "Settings", icon: Settings, href: "/admin/settings", permission: "canManageSettings" },
];

export const AdminSidebar = ({ role = "student" }: { role?: AdminRole }) => {
  const pathname = usePathname();
  const { toggleSidebar, state, isMobile, setOpenMobile } = useSidebar();

  // Automatically close mobile sidebar when navigation occurs
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

  const filteredMenu = useMemo(() => {
    return menuItems.filter(item => {
      if (!item.permission) return true;
      return hasPermission(role, item.permission);
    });
  }, [role]);

  const isLinkActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <Link 
          href="/admin" 
          className="flex items-center gap-3 overflow-hidden group"
          onClick={handleLinkClick}
        >
          <div className="bg-primary p-2 rounded-lg shrink-0">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <span className={cn(
            "font-headline font-bold text-xl tracking-tighter uppercase whitespace-nowrap transition-all duration-300",
            state === "collapsed" && "opacity-0 w-0"
          )}>
            Admin <span className="text-accent">Lab</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] uppercase tracking-[0.2em] font-bold text-sidebar-foreground/50 mb-2">
            {state !== "collapsed" ? `Management (${role.replace('-', ' ')})` : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenu.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isLinkActive(item.href)}
                    tooltip={item.title}
                    className={cn(
                      "h-11 px-4 transition-all duration-200",
                      isLinkActive(item.href) 
                        ? "bg-primary/10 text-primary hover:bg-primary/20" 
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Link 
                      href={item.href} 
                      className="flex items-center gap-3"
                      onClick={handleLinkClick}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span className="font-medium text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleSidebar}
          className={cn(
            "w-full text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            state === "collapsed" ? "justify-center" : "justify-start px-4"
          )}
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", state === "collapsed" && "rotate-180")} />
          {state !== "collapsed" && <span className="ml-2">Collapse Sidebar</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
