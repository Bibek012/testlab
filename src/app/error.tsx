
"use client";

import React, { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an analytics service
    console.error("Critical Platform Error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#0b1120] text-foreground flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-rose-500/5 blur-[150px] -z-10" />

        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
          <div className="w-24 h-24 rounded-[2rem] bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto border border-rose-500/20 shadow-2xl shadow-rose-500/10">
            <ShieldAlert className="w-12 h-12" />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-headline font-bold">Something <span className="text-rose-500">Went Wrong</span></h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              We encountered an unexpected error while processing your request. Our engineering team has been notified.
            </p>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 font-mono text-[10px] text-muted-foreground text-left overflow-x-auto max-w-md mx-auto">
               <span className="text-rose-400 font-bold">Error:</span> {error.message || "Unknown system failure"}
               {error.digest && <div className="mt-1 opacity-50">Digest: {error.digest}</div>}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              onClick={() => reset()} 
              className="rounded-xl h-14 bg-white text-black hover:bg-white/90 px-10 font-bold gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="rounded-xl h-14 border-white/10 hover:bg-white/5 px-10 font-bold gap-2"
            >
              <Home className="w-5 h-5" />
              Return Home
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            If this persists, please contact <span className="text-primary underline">support@testlab.edu</span>
          </p>
        </div>
      </div>

      <Footer />
    </main>
  );
}
