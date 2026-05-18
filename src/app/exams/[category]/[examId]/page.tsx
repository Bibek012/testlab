
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
import { Rocket, Sparkles, BookOpen, Clock, Users, Play, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResourceNotFound } from "@/components/ResourceNotFound";

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

  if (!category) {
    return <ResourceNotFound type="Category" backUrl="/#exams" />;
  }

  if (!exam) {
    return <ResourceNotFound type="Exam" message={`The exam series '${examId}' could not be found in our database.`} backUrl={`/exams/${categorySlug}`} />;
  }

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <div className="pt-24 md:pt-32 pb-16 md:pb-24 relative overflow-hidden">
        {/* Animated Dynamic Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 md:bg-primary/20 rounded-full blur-[100px] md:blur-[160px] -z-10 animate-pulse-slow" />
        <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-accent/10 md:bg-accent/20 rounded-full blur-[100px] md:blur-[160px] -z-10" />

        <div className="container mx-auto px-4 md:px-6">
          <Breadcrumbs items={[
            { label: category.title, href: `/exams/${category.slug}` },
            { label: exam.name }
          ]} />

          {/* Header Section */}
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-end mb-12 md:mb-16">
            <div className="lg:col-span-8 space-y-4 md:space-y-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-[1rem] md:rounded-[1.5rem] bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-2xl shrink-0">
                  <Rocket className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <div className="space-y-1 overflow-hidden">
                  <Badge variant="outline" className="text-[8px] md:text-[10px] uppercase font-bold tracking-widest text-accent border-accent/20">
                    Premium Test Series
                  </Badge>
                  <h1 className="text-3xl md:text-4xl lg:text-6xl font-headline font-bold leading-tight tracking-tight truncate">
                    {exam.name} <span className="gradient-text">Dashboard</span>
                  </h1>
                </div>
              </div>
              <p className="text-sm md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                Elevate your preparation with AI-powered analytics, high-yield mock tests, and real-time performance tracking for {exam.name}.
              </p>
              
              <div className="flex flex-wrap gap-4 md:gap-6 pt-2">
                 <div className="flex items-center gap-2 text-xs md:text-sm font-medium">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span>{exam.tests} Mocks</span>
                 </div>
                 <div className="flex items-center gap-2 text-xs md:text-sm font-medium">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span>{exam.questions} Questions</span>
                 </div>
                 <div className="flex items-center gap-2 text-xs md:text-sm font-medium">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Active Competition</span>
                 </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex justify-start lg:justify-end">
               <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white rounded-2xl h-14 md:h-16 px-8 md:px-10 font-bold text-base md:text-lg gap-3 shadow-xl shadow-primary/20 group">
                  <Play className="w-5 h-5 fill-current" />
                  Continue Prep
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
               </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-12">
              <section>
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <h3 className="text-lg md:text-xl font-headline font-bold uppercase tracking-widest">Performance Insights</h3>
                  <Badge className="bg-white/5 border-white/10 text-[10px]">Updated 5m ago</Badge>
                </div>
                <PerformanceOverview />
              </section>

              <section className="pt-4 md:pt-8">
                <MockTestList examId={examId} categorySlug={categorySlug} />
              </section>
            </div>

            <div className="lg:col-span-4 space-y-6 md:space-y-8">
              <DailyGoal />
              
              <section className="p-6 md:p-8 glass border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform">
                   <Sparkles className="w-16 h-16 md:w-20 md:h-20 text-accent" />
                 </div>
                 <h4 className="text-lg font-headline font-bold mb-3 md:mb-4">Recommended for You</h4>
                 <p className="text-xs md:text-sm text-muted-foreground mb-6 leading-relaxed">
                    Based on your weak performance in Reasoning, we recommend trying "Logical Deductions Set 4".
                 </p>
                 <Button variant="outline" className="w-full rounded-xl border-white/10 hover:bg-white/5 h-11 text-xs md:text-sm">
                    View Recommendation
                 </Button>
              </section>

              <Leaderboard />
              
              <div className="p-1 rounded-[1.5rem] md:rounded-[2.5rem] bg-gradient-to-br from-indigo-500/20 to-accent/20">
                <div className="glass bg-card/60 rounded-[1.4rem] md:rounded-[2.4rem] p-6 md:p-8 text-center space-y-4">
                   <h5 className="font-bold text-sm md:text-base">Unlock Full Access</h5>
                   <p className="text-[10px] md:text-xs text-muted-foreground">Get premium mocks, detailed solutions, and video courses for {exam.name}.</p>
                   <Button className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl h-11 md:h-12 font-bold shadow-lg shadow-accent/20">Go Premium</Button>
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
