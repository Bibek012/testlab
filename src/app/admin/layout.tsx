"use client";

import React, { useEffect, useState } from "react";

import { useRouter, usePathname } from "next/navigation";

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
  useMemoFirebase,
} from "@/firebase";

import { doc } from "firebase/firestore";

import { isAdmin, AdminRole } from "@/lib/rbac";

import {
  Loader2,
  ShieldAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } =
    useUser();

  const db = useFirestore();

  const router = useRouter();

  const pathname = usePathname();

  // Firestore profile reference
  const profileRef = useMemoFirebase(() => {
    if (!user || !db) return null;

    return doc(db, "users", user.uid);
  }, [user?.uid, !!db]);

  // Fetch profile
  const {
    data: profile,
    loading: profileLoading,
  } = useDoc<any>(profileRef);
  console.log("USER:", user);
console.log("PROFILE:", profile);
console.log("PROFILE LOADING:", profileLoading);
console.log("PROFILE REF:", profileRef);
  useEffect(() => {
  console.log("ROLE VALUE:", profile?.role);
}, [profile]);
  
  // Authorization state
  const [isAuthorized, setIsAuthorized] =
    useState<boolean | null>(null);

  useEffect(() => {
    // Wait for auth
    if (authLoading) return;

    // Not logged in
    if (!user) {
      router.replace(
        "/signin?callbackUrl=" +
          encodeURIComponent(pathname)
      );

      return;
    }

    // Wait for profile
    if (profileLoading) return;

    // No profile found
    if (!profile) {
      console.error(
        "AdminGate: Profile not found"
      );

      setIsAuthorized(false);

      router.replace("/");

      return;
    }

    // Check role
    const role = (
      profile.role || "student"
    ) as AdminRole;

    console.log("ADMIN ROLE:", role);

    // Authorized
    if (isAdmin(role)) {
      setIsAuthorized(true);
    }

    // Unauthorized
    else {
      setIsAuthorized(false);

      router.replace("/");
    }
  }, [
    user,
    profile,
    authLoading,
    profileLoading,
    pathname,
    router,
  ]);

  // Loading state
  if (
    authLoading ||
    profileLoading ||
    isAuthorized === null
  ) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0b1120] gap-4 p-6 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />

        <p className="text-muted-foreground animate-pulse text-sm font-medium">
          Synchronizing Secure Session...
        </p>
      </div>
    );
  }

  // Unauthorized screen
  if (isAuthorized === false) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0b1120] p-6 text-center">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6">
          <ShieldAlert className="w-8 h-8 md:w-10 md:h-10" />
        </div>

        <h1 className="text-xl md:text-2xl font-headline font-bold mb-2">
          Administrative Access Restricted
        </h1>

        <p className="text-muted-foreground max-w-md mb-8 text-sm md:text-base">
          The account{" "}
          <strong>{user?.email}</strong>{" "}
          does not have permissions to
          access the management console.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              router.push("/")
            }
          >
            Return Home
          </Button>

          <Button
            className="w-full"
            onClick={() =>
              router.push("/signin")
            }
          >
            Switch Account
          </Button>
        </div>
      </div>
    );
  }

  // Prevent rendering before auth check
  if (isAuthorized !== true) {
    return null;
  }

  // Authorized Layout
  return (
    <SidebarProvider>
      <AdminSidebar
        role={
          (profile?.role ||
            "student") as AdminRole
        }
      />

      <SidebarInset className="bg-[#0b1120] min-h-screen">
        <AdminNavbar
          profile={
            profile || {
              email: user?.email,
              role: "student",
            }
          }
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
