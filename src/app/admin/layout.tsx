"use client";

import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminNavbar } from "@/components/admin/AdminNavbar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Basic Admin Protection Placeholder
  // In a real app, check for admin custom claims or a specific UID here
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-[#0b1120] text-foreground font-body w-full">
        <AdminSidebar />
        <SidebarInset className="flex flex-col min-h-screen">
          <AdminNavbar />
          <main className="flex-1 overflow-y-auto bg-[#0b1120]/20 p-6">
            <div className="max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}