"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
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
  
  const profileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, "users", user.uid);
  }, [user?.uid, !!db]);

  const { data: profile, loading: profileLoading } = useDoc<any>(profileRef);

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [creationAttempted, setCreationAttempted] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/signin?callbackUrl=" + encodeURIComponent(pathname));
      return;
    }

    if (profileLoading) return;

    // Secure Auto-Creation: If a profile doesn't exist, create it as a 'student'.
    // They will then be redirected out by the next authorization check.
    if (!profile && db && !creationAttempted) {
      setCreationAttempted(true);
      const autoCreateProfile = async () => {
        try {
          await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || "User",
            role: "student", // Secure default role
            status: "active",
            subscriptionType: "free",
            createdAt: serverTimestamp(),
            lastActive: serverTimestamp(),
            preferredLanguage: "en"
          }, { merge: true });
          
          // After creation, the isAdmin check below will naturally fail for a 'student'.
          setIsAuthorized(false);
        } catch (e) {
          console.error("AdminGate: Profile creation failed:", e);
          setIsAuthorized(false);
        }
      };
      autoCreateProfile();
      return;
    }

    if (profile) {
      const role = (profile.role || "student") as AdminRole;
      if (isAdmin(role)) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    } else if (!profileLoading && creationAttempted) {
      setIsAuthorized(false);
    }
  }, [user, profile, authLoading, profileLoading, db, pathname, router, creationAttempted]);

  if (authLoading || (profileLoading && !isAuthorized)) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0b1120] gap-4 p-6 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse text-sm font-medium">Synchronizing Secure Session...</p>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0b1120] p-6 text-center">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6">
          <ShieldAlert className="w-8 h-8 md:w-10 md:h-10" />
        </div>
        <h1 className="text-xl md:text-2xl font-headline font-bold mb-2">Administrative Access Restricted</h1>
        <p className="text-muted-foreground max-w-md mb-8 text-sm md:text-base">
          The account <strong>{user?.email}</strong> does not have permissions to access the management console.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <Button variant="outline" className="w-full" onClick={() => router.push("/")}>Return Home</Button>
          <Button className="w-full" onClick={() => router.push("/signin")}>Switch Account</Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AdminSidebar role={(profile?.role || "super-admin") as AdminRole} />
      <SidebarInset className="bg-[#0b1120] min-h-screen">
        <AdminNavbar profile={profile || { email: user?.email, role: 'super-admin' }} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}