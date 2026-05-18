
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, Rocket, Search, Bell, LogOut, User, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, loading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Exams", href: "/#exams" },
    { name: "Mock Tests", href: "/#exams" },
    { name: "State Exams", href: "/exams/state" },
  ];

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] transition-all duration-300 px-4 md:px-6",
        isScrolled ? "py-3 glass shadow-2xl mt-2 mx-4 rounded-2xl border-white/10" : "py-5 md:py-8 bg-transparent"
      )}
    >
      <div className="container mx-auto flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="bg-primary p-1.5 md:p-2 rounded-lg group-hover:rotate-12 transition-transform">
            <Rocket className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <span className="text-lg md:text-2xl font-headline font-bold tracking-tighter uppercase whitespace-nowrap">
            TESTLAB
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-4">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Search className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Bell className="w-5 h-5" />
          </Button>
          <div className="h-4 w-px bg-white/10 mx-2" />
          
          {loading ? (
            <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 overflow-hidden ring-primary/20 hover:ring-2 transition-all">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                      {(user.displayName || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 glass border-white/10" align="end">
                <DropdownMenuLabel className="font-headline">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{user.displayName}</span>
                    <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="focus:bg-white/5 cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-white/5 cursor-pointer">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={handleLogout} className="focus:bg-destructive/20 text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/signin">
                <Button variant="ghost" className="font-bold text-sm">Log In</Button>
              </Link>
              <Link href="/signup">
                <Button className="font-bold bg-primary hover:bg-primary/90 rounded-full px-6 shadow-lg shadow-primary/20">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="flex lg:hidden items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9">
            <Search className="w-5 h-5" />
          </Button>
          <button
            className="text-foreground p-2 rounded-lg bg-white/5 border border-white/10 active:scale-95 transition-transform"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-4 top-20 z-[101] glass border border-white/10 p-6 rounded-3xl flex flex-col gap-4 animate-in slide-in-from-top-4 fade-in duration-300">
          {user && (
            <div className="flex items-center gap-4 p-2 border-b border-white/5 mb-2">
              <Avatar className="h-12 w-12 border border-primary/20">
                <AvatarImage src={user.photoURL || undefined} />
                <AvatarFallback>{(user.displayName || "U")[0]}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-bold">{user.displayName}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </div>
            </div>
          )}
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-lg font-medium py-3 hover:text-primary transition-colors border-b border-white/5 last:border-0"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          <div className="flex flex-col gap-3 pt-4">
            {user ? (
              <>
                <Button variant="outline" className="w-full h-12 rounded-xl border-white/10" onClick={() => router.push('/dashboard')}>
                  Dashboard
                </Button>
                <Button variant="destructive" className="w-full h-12 rounded-xl" onClick={handleLogout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link href="/signin" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full h-12 rounded-xl border-white/10">
                    Login
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full bg-primary h-12 rounded-xl font-bold">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
