
"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Rocket, Home, Search, ArrowLeft } from "lucide-react";

export default function GlobalNotFound() {
  return (
    <main className="min-h-screen bg-[#0b1120] text-foreground flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-accent/10 rounded-full blur-[120px] -z-10" />

        <div className="space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="relative inline-block">
             <div className="text-[12rem] font-headline font-bold leading-none opacity-5">404</div>
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-3xl bg-primary/20 flex items-center justify-center text-primary animate-bounce">
                   <Rocket className="w-12 h-12" />
                </div>
             </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-headline font-bold">Lost in <span className="text-accent">Space?</span></h1>
            <p className="text-muted-foreground max-w-md mx-auto text-lg">
              The page you're looking for has moved to a different orbit or never existed in this universe.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" className="rounded-xl h-12 border-white/10 hover:bg-white/5 px-8" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Link href="/">
              <Button className="rounded-xl h-12 bg-primary hover:bg-primary/90 px-8 font-bold shadow-lg shadow-primary/20">
                <Home className="w-4 h-4 mr-2" />
                Return Home
              </Button>
            </Link>
          </div>

          <div className="pt-12">
             <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <Link href="/#exams" className="hover:text-primary transition-colors">Browse Exams</Link>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <Link href="/search" className="hover:text-primary transition-colors">Search Library</Link>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <Link href="/signup" className="hover:text-primary transition-colors">Create Account</Link>
             </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
