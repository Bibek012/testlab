
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
import { CATEGORIES, EXAMS_BY_CATEGORY } from "@/lib/exam-data";
import { Rocket, Sparkles, BookOpen, Clock, Users, Play, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ExamDashboardPage() {
  const params = useParams();
  const categorySlug = params.category as string;
  const examId = params.examId as string;

  const category = useMemo(() => 
    CATEGORIES.find(c => c.slug === categorySlug), 
    [categorySlug]
  );

  const exam = useMemo(() => 
    (EXAMS_BY_CATEGORY[categorySlug] || []).find(e => e.id === examId),
    [categorySlug, examId]
  );

  if (!exam || !category) return null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="pt-32 pb-24 relative overflow-hidden">
        {/* Animated Dynamic Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[160px] -z-10 animate-pulse-slow" />
        <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[160px] -z-10" />

        <div className="container mx-auto px-6">
          <Breadcrumbs items={[
            { label: category.title, href: `/exams/${category.slug}` },
            { label: exam.name }
          ]} />

          {/* Header Section */}
          <div className="grid lg:grid-cols-12 gap-12 items-end mb-16">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-2xl">
                  <Rocket className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest text-accent border-accent/20">
                    Premium Test Series
                  </Badge>
                  <h1 className="text-4xl lg:text-6xl font-headline font-bold leading-tight tracking-tight">
                    {exam.name} <span className="gradient-text">Dashboard</span>
                  </h1>
                </div>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                Elevate your preparation with AI-powered analytics, high-yield mock tests, and real-time performance tracking for {exam.name}.
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
                    <span>Active Competition</span>
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
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-headline font-bold uppercase tracking-widest">Performance Insights</h3>
                  <Badge className="bg-white/5 border-white/10">Updated 5m ago</Badge>
                </div>
                <PerformanceOverview />
              </section>

              <section className="pt-8">
                <MockTestList examId={examId} />
              </section>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <DailyGoal />
              
              <section className="p-8 glass border-white/10 rounded-[2.5rem] relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform">
                   <Sparkles className="w-20 h-20 text-accent" />
                 </div>
                 <h4 className="text-lg font-headline font-bold mb-4">Recommended for You</h4>
                 <p className="text-sm text-muted-foreground mb-6">
                    Based on your weak performance in Reasoning, we recommend trying "Logical Deductions Set 4".
                 </p>
                 <Button variant="outline" className="w-full rounded-xl border-white/10 hover:bg-white/5">
                    View Recommendation
                 </Button>
              </section>

              <Leaderboard />
              
              <div className="p-1 rounded-[2.5rem] bg-gradient-to-br from-indigo-500/20 to-accent/20">
                <div className="glass bg-card/60 rounded-[2.4rem] p-8 text-center space-y-4">
                   <h5 className="font-bold">Unlock Full Access</h5>
                   <p className="text-xs text-muted-foreground">Get premium mocks, detailed solutions, and video courses for {exam.name}.</p>
                   <Button className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl">Go Premium</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
