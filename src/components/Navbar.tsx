"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Rocket, Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
          <Button className="font-bold bg-primary hover:bg-primary/90 rounded-full px-6 shadow-lg shadow-primary/20">
            Sign Up
          </Button>
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
            <Button variant="outline" className="w-full h-12 rounded-xl border-white/10">
              Login
            </Button>
            <Button className="w-full bg-primary h-12 rounded-xl font-bold">Sign Up</Button>
          </div>
        </div>
      )}
    </nav>
  );
};