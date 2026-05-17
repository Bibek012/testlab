
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, CheckCircle2 } from "lucide-react";
import { DashboardMockup } from "./DashboardMockup";

export const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-accent/10 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wider uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Next-Gen Learning Experience
          </div>

          <h1 className="text-5xl lg:text-7xl font-headline font-bold leading-[1.1] tracking-tight">
            India’s Smartest Platform for{" "}
            <span className="gradient-text">Competitive Prep</span>
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
            Practice mock tests, previous year questions, quizzes, and full test
            series for SSC, Railway, Banking, UPSC, State Exams, and more. 
            Empowered by AI insights.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 gap-2 group">
              Start Practice
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8 gap-2 hover:bg-white/5">
              <Play className="w-4 h-4 fill-current" />
              Explore Exams
            </Button>
          </div>

          <div className="flex items-center gap-6 pt-4">
            {[
              "Real Exam Interface",
              "AI Performance Stats",
              "Top Rankers' Choice"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000">
           <DashboardMockup />
        </div>
      </div>
    </section>
  );
};
