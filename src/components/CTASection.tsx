
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

export const CTASection = () => {
  return (
    <section className="py-24 container mx-auto px-6">
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-primary via-indigo-900 to-accent p-12 lg:p-24 text-center space-y-8 shadow-2xl">
        {/* Animated Background shapes */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 animate-pulse-slow" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2 animate-pulse-slow" />

        <div className="relative space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold tracking-widest uppercase">
            <Sparkles className="w-4 h-4 text-accent" />
            Limited Time Offer
          </div>
          <h2 className="text-4xl lg:text-6xl font-headline font-bold text-white tracking-tight leading-tight">
            Start Your Exam Preparation Today
          </h2>
          <p className="text-white/80 text-lg">
            Unlock premium mock tests, analytics dashboard, and rank predictors. 
            Join 1M+ students already on the path to success.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 rounded-full px-10 h-14 font-bold text-lg gap-2 shadow-xl">
              Attempt Mock Test
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-full px-10 h-14 font-bold text-lg">
              Explore Exams
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
