
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { isAdmin, AdminRole } from "@/lib/rbac";
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
  
  const profileRef = user && db ? doc(db, "users", user.uid) : null;
  const { data: profile, loading: profileLoading } = useDoc<any>(profileRef);

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. Wait for Auth to resolve
    if (authLoading) return;

    // 2. Handle Unauthenticated
    if (!user) {
      console.log("AdminGate: Unauthenticated. Redirecting...");
      router.push("/signin?callbackUrl=" + encodeURIComponent(pathname));
      return;
    }

    // 3. Wait for Firestore Profile to resolve
    if (profileLoading) return;

    // 4. Handle Missing Firestore Profile (Auto-creation Fallback)
    if (!profile && db) {
      console.warn("AdminGate: Auth exists but Firestore profile is missing for", user.uid);
      const autoCreateProfile = async () => {
        try {
          await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || "Admin User",
            role: "super-admin", // Default for dev
            status: "active",
            subscriptionType: "free",
            createdAt: serverTimestamp(),
            lastActive: serverTimestamp()
          });
          console.log("AdminGate: Profile auto-created successfully.");
        } catch (e) {
          console.error("AdminGate: Failed to auto-create profile", e);
        }
      };
      autoCreateProfile();
      // Allow access immediately after initiating creation for dev speed
      setIsAuthorized(true);
      return;
    }

    // 5. Final Permission Check
    const role = (profile?.role || "student") as AdminRole;
    
    console.log("AdminGate Session Details:", {
      uid: user.uid,
      email: user.email,
      role: role,
      status: profile?.status
    });

    if (isAdmin(role)) {
      setIsAuthorized(true);
    } else {
      console.warn("AdminGate: Access denied for role:", role);
      setIsAuthorized(false);
    }

  }, [user, profile, authLoading, profileLoading, db, pathname, router]);

  if (authLoading || profileLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0b1120] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse text-sm font-medium">Synchronizing Profile...</p>
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
          The account <strong>{user?.email}</strong> does not have administrative permissions.
        </p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => router.push("/")}>Return Home</Button>
          <Button onClick={() => router.push("/signin")}>Switch Account</Button>
        </div>
      </div>
    );
  }

  // Handle initialization state (while isAuthorized is still null)
  if (isAuthorized === null) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0b1120]">
        <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-[#0b1120] text-foreground font-body w-full">
        <AdminSidebar role={(profile?.role || "super-admin") as AdminRole} />
        <SidebarInset className="flex flex-col min-h-screen">
          <AdminNavbar profile={profile || { email: user?.email, role: 'super-admin' }} />
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
