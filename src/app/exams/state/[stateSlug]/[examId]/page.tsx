
"use client";

import React, { useMemo } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PerformanceOverview } from "@/components/dashboard/PerformanceOverview";
import { MockTestList } from "@/components/dashboard/MockTestList";
import { DailyGoal } from "@/components/dashboard/DailyGoal";
import { Leaderboard } from "@/components/dashboard/Leaderboard";
import { STATES, STATE_EXAMS } from "@/lib/exam-data";
import { Rocket, Sparkles, BookOpen, Users, Play, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function StateExamDashboardPage() {
  const params = useParams();
  const stateSlug = params.stateSlug as string;
  const examId = params.examId as string;

  const state = useMemo(() => 
    STATES.find(s => s.slug === stateSlug), 
    [stateSlug]
  );

  const exam = useMemo(() => 
    (STATE_EXAMS[stateSlug] || []).find(e => e.id === examId),
    [stateSlug, examId]
  );

  if (!exam || !state) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Exam not found.</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="pt-32 pb-24 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[160px] -z-10 animate-pulse-slow" />

        <div className="container mx-auto px-6">
          <Breadcrumbs items={[
            { label: "State Exams", href: "/exams/state" },
            { label: state.name, href: `/exams/state/${state.slug}` },
            { label: exam.name }
          ]} />

          <div className="grid lg:grid-cols-12 gap-12 items-end mb-16">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-2xl">
                  <Rocket className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest text-accent border-accent/20">
                    State Selection Series
                  </Badge>
                  <h1 className="text-4xl lg:text-6xl font-headline font-bold leading-tight tracking-tight">
                    {exam.name} <span className="gradient-text">Dashboard</span>
                  </h1>
                </div>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                Master the {state.name} State {exam.name} with AI-powered insights and comprehensive mock series.
              </p>
              
              <div className="flex flex-wrap gap-6 pt-2">
                 <div className="flex items-center gap-2 text-sm font-medium">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span>{exam.tests} Mocks</span>
                 </div>
                 <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span>{exam.questions} Questions</span>
                 </div>
                 <div className="flex items-center gap-2 text-sm font-medium">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Active Aspirants</span>
                 </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex justify-end">
               <Button size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-16 px-10 font-bold text-lg gap-3 shadow-xl shadow-primary/20 group">
                  <Play className="w-5 h-5 fill-current" />
                  Continue Prep
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
               </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-12">
              <PerformanceOverview />
              <MockTestList examId={examId} />
            </div>

            <div className="lg:col-span-4 space-y-8">
              <DailyGoal />
              <Leaderboard />
              
              <div className="p-8 glass border-white/10 rounded-[2.5rem] relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform">
                   <Sparkles className="w-20 h-20 text-accent" />
                 </div>
                 <h4 className="text-lg font-headline font-bold mb-4">Recommended</h4>
                 <p className="text-sm text-muted-foreground mb-6">
                    Boost your {state.name} GK score with our specialized "State Culture" set.
                 </p>
                 <Button variant="outline" className="w-full rounded-xl border-white/10 hover:bg-white/5">
                    View Drill
                 </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
