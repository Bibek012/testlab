
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import { isAdmin, hasPermission, AdminRole } from "@/lib/rbac";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  
  // Fetch the actual user profile from Firestore to get the role
  const profileRef = user && db ? doc(db, "users", user.uid) : null;
  const { data: profile, loading: profileLoading } = useDoc<any>(profileRef);

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading || profileLoading) return;

    if (!user) {
      router.push("/signin?callbackUrl=" + encodeURIComponent(pathname));
      return;
    }

    const role = (profile?.role || "student") as AdminRole;
    
    if (!isAdmin(role)) {
      setIsAuthorized(false);
      return;
    }

    // Secondary deep check for sensitive routes
    if (pathname.startsWith("/admin/settings") && !hasPermission(role, "canManageSettings")) {
      setIsAuthorized(false);
      return;
    }

    if (pathname.startsWith("/admin/users") && !hasPermission(role, "canManageUsers")) {
      setIsAuthorized(false);
      return;
    }

    setIsAuthorized(true);
  }, [user, profile, authLoading, profileLoading, pathname, router]);

  if (authLoading || profileLoading || isAuthorized === null) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0b1120] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse text-sm font-medium">Verifying Administrative Access...</p>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0b1120] p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-headline font-bold mb-2">Access Restricted</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Your account ({profile?.email}) does not have the required permissions to access this administrative module.
        </p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => router.push("/")}>Return to Home</Button>
          <Button onClick={() => window.location.href = "mailto:support@testlab.edu"}>Contact Support</Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-[#0b1120] text-foreground font-body w-full">
        <AdminSidebar role={profile?.role as AdminRole} />
        <SidebarInset className="flex flex-col min-h-screen">
          <AdminNavbar profile={profile} />
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
