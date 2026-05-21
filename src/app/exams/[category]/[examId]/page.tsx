
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
import { Rocket, Sparkles, BookOpen, Users, Play, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResourceNotFound } from "@/components/ResourceNotFound";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, where, limit, doc } from "firebase/firestore";

export default function ExamDashboardPage() {
  const params = useParams();
  const examIdParam = params.examId as string;
  const db = useFirestore();

  // Robust Resolver: Attempt to find exam by SLUG first
  const examBySlugQuery = useMemoFirebase(() => 
    db ? query(
      collection(db, "exams"), 
      where("slug", "==", examIdParam), 
      limit(1)
    ) : null,
  [db, examIdParam]);
  
  const { data: examsBySlug, loading: slugLoading } = useCollection<any>(examBySlugQuery);

  // Fallback: Attempt to fetch by Document ID
  const examByIdRef = useMemoFirebase(() => 
    db ? doc(db, "exams", examIdParam) : null, 
  [db, examIdParam]);
  const { data: examById, loading: idLoading } = useDoc<any>(examByIdRef);

  // Resolve the actual exam object
  const exam = (examsBySlug && examsBySlug.length > 0) ? examsBySlug[0] : examById;
  const loading = slugLoading && idLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-headline font-bold uppercase tracking-widest text-xs">Synchronizing Dashboard...</p>
      </div>
    );
  }

  if (!exam) {
    return <ResourceNotFound type="Exam" message={`The exam series '${examIdParam}' could not be found in our global registry.`} backUrl="/exams/all" />;
  }

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <div className="pt-24 md:pt-32 pb-16 md:pb-24 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 md:bg-primary/20 rounded-full blur-[100px] md:blur-[160px] -z-10 animate-pulse-slow" />
        <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-accent/10 md:bg-accent/20 rounded-full blur-[100px] md:blur-[160px] -z-10" />

        <div className="container mx-auto px-4 md:px-6">
          <Breadcrumbs items={[
            { label: "All Exams", href: "/exams/all" },
            { label: exam.name }
          ]} />

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-end mb-12 md:mb-16">
            <div className="lg:col-span-8 space-y-4 md:space-y-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-[1rem] md:rounded-[1.5rem] bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-2xl shrink-0">
                  <Rocket className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <div className="space-y-1 overflow-hidden">
                  <Badge variant="outline" className="text-[8px] md:text-[10px] uppercase font-bold tracking-widest text-accent border-accent/20">
                    {exam.difficulty || 'Bilingual'} Series
                  </Badge>
                  <h1 className="text-3xl md:text-4xl lg:text-6xl font-headline font-bold leading-tight tracking-tight truncate">
                    {exam.name} <span className="gradient-text">Dashboard</span>
                  </h1>
                </div>
              </div>
              <p className="text-sm md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {exam.description || `Master the ${exam.name} with AI-powered insights and comprehensive mock series.`}
              </p>
              
              <div className="flex flex-wrap gap-4 md:gap-6 pt-2">
                 <div className="flex items-center gap-2 text-xs md:text-sm font-medium">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span>{exam.mockCount || exam.testsCount || 0} Mocks Available</span>
                 </div>
                 <div className="flex items-center gap-2 text-xs md:text-sm font-medium">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span>{exam.questionCount || exam.questionsCount || 0} Questions</span>
                 </div>
                 <div className="flex items-center gap-2 text-xs md:text-sm font-medium">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Verified Content</span>
                 </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex justify-start lg:justify-end">
               <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white rounded-2xl h-14 md:h-16 px-8 md:px-10 font-bold text-base md:text-lg gap-3 shadow-xl shadow-primary/20 group">
                  <Play className="w-5 h-5 fill-current" />
                  Explore Mocks
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
               </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-12">
              <section>
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <h3 className="text-lg md:text-xl font-headline font-bold uppercase tracking-widest">Performance Insights</h3>
                  <Badge className="bg-white/5 border-white/10 text-[10px]">Real-time</Badge>
                </div>
                <PerformanceOverview />
              </section>

              <section className="pt-4 md:pt-8">
                <MockTestList 
                  examId={exam.id} 
                  examSlug={exam.slug || exam.id}
                  categorySlug={exam.categorySlug || 'all'} 
                />
              </section>
            </div>

            <div className="lg:col-span-4 space-y-6 md:space-y-8">
              <DailyGoal />
              
              <section className="p-6 md:p-8 glass border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform">
                   <Sparkles className="w-16 h-16 md:w-20 md:h-20 text-accent" />
                 </div>
                 <h4 className="text-lg font-headline font-bold mb-3 md:mb-4">Intelligence Feed</h4>
                 <p className="text-xs md:text-sm text-muted-foreground mb-6 leading-relaxed">
                    Personalized recommendations based on your performance in {exam.name} will appear here.
                 </p>
                 <Button variant="outline" className="w-full rounded-xl border-white/10 hover:bg-white/5 h-11 text-xs md:text-sm">
                    View Insights
                 </Button>
              </section>

              <Leaderboard />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
