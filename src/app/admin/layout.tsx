"use client";

import React from "react";

import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";

import { AdminSidebar } from "@/components/admin/AdminSidebar";

import { AdminNavbar } from "@/components/admin/AdminNavbar";

import {
  useUser,
  useFirestore,
  useDoc,
} from "@/firebase";

import { doc } from "firebase/firestore";

import {
  isAdmin,
  AdminRole,
} from "@/lib/rbac";

import {
  Loader2,
  ShieldAlert,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } =
    useUser();

  const db = useFirestore();

  // Simple document reference
  const profileRef =
    user && db
      ? doc(db, "users", user.uid)
      : null;

  // Fetch profile
  const {
    data: profile,
    loading: profileLoading,
  } = useDoc<any>(profileRef);

  // Debug logs
  console.log("USER:", user);
  console.log("PROFILE:", profile);
  console.log(
    "PROFILE LOADING:",
    profileLoading
  );
  console.log(
    "ROLE:",
    profile?.role
  );

  // Loading state
  if (authLoading || profileLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0b1120] gap-4 p-6 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />

        <p className="text-muted-foreground animate-pulse text-sm font-medium">
          Synchronizing Secure Session...
        </p>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0b1120] text-white">
        Not logged in
      </div>
    );
  }

  // No profile
  if (!profile) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0b1120] text-white">
        Profile not found
      </div>
    );
  }

  // Authorization check
  const authorized = isAdmin(
    profile.role
  );

  console.log(
    "AUTHORIZED:",
    authorized
  );

  // Unauthorized
  if (!authorized) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0b1120] p-6 text-center">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6">
          <ShieldAlert className="w-8 h-8 md:w-10 md:h-10" />
        </div>

        <h1 className="text-xl md:text-2xl font-headline font-bold mb-2 text-white">
          Administrative Access Restricted
        </h1>

        <p className="text-muted-foreground max-w-md text-sm md:text-base">
          Your account does not have
          permission to access admin
          panel.
        </p>
      </div>
    );
  }

  // Authorized Layout
  return (
    <SidebarProvider>
      <AdminSidebar
        role={
          (profile.role ||
            "student") as AdminRole
        }
      />

      <SidebarInset className="bg-[#0b1120] min-h-screen">
        <AdminNavbar
          profile={profile}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
