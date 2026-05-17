
"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StateCard } from "@/components/StateCard";
import { ExamSidebar } from "@/components/ExamSidebar";
import { STATES } from "@/lib/exam-data";
import { CTASection } from "@/components/CTASection";
import { StatsSection } from "@/components/StatsSection";

export default function StatesListPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      
      <div className="pt-32 pb-24 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] -z-10" />
        
        <div className="container mx-auto px-6">
          <Breadcrumbs items={[{ label: "State Exams" }]} />
          
          <div className="space-y-6 mb-16 max-w-3xl">
            <h1 className="text-5xl lg:text-7xl font-headline font-bold leading-[1.1] tracking-tight">
              State-Level <span className="text-accent">Excellence</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Access specialized content for state-specific administrative, police, and educational exams. Select your state to continue.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-12">
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {STATES.map((state) => (
                  <StateCard key={state.id} state={state} />
                ))}
              </div>
            </div>
            <div className="lg:w-[350px]">
              <ExamSidebar />
            </div>
          </div>
        </div>
      </div>

      <StatsSection />
      <CTASection />
      <Footer />
    </main>
  );
}
