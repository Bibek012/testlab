"use client";

import React, { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MockTestList } from "@/components/dashboard/MockTestList";
import { PerformanceOverview } from "@/components/dashboard/PerformanceOverview";
import { Leaderboard } from "@/components/dashboard/Leaderboard";
import { DailyGoal } from "@/components/dashboard/DailyGoal";
import { 
  ArrowLeft, 
  Search, 
  Loader2, 
  Rocket, 
  ChevronRight,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResourceNotFound } from "@/components/ResourceNotFound";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, limit, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";

export default function ExamDashboardPage() {
  const params = useParams();
  const router = useRouter();
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
    return <ResourceNotFound type="Exam" message={`The exam series '${examIdParam}' could not be found.`} backUrl="/exams/all" />;
  }

  return (
    <main className="min-h-screen bg-background text-foreground w-full overflow-x-hidden">
      <Navbar />

      {/* Sticky Header - FIXED LEFT PADDING & ALIGNMENT */}
      <div className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-white/5 pt-20 pb-3 px-3 sm:px-4 md:px-6">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-3 box-border">
          <div className="flex items-center gap-2 md:gap-3 overflow-hidden min-w-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.back()}
              className="rounded-lg h-9 w-9 shrink-0 border border-white/5"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xs md:text-lg font-headline font-bold truncate uppercase tracking-tight">
                {exam.name} <span className="text-primary">Series</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[8px] h-4 border-emerald-500/20 text-emerald-400 bg-emerald-500/5 px-1 uppercase">Live Now</Badge>
                <span className="text-[10px] text-muted-foreground hidden md:inline">Preparation Dashboard</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg border border-white/5">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6 md:py-8 box-border">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full">
          {/* Left Column: Test Library */}
          <div className="lg:col-span-8 space-y-6 md:space-y-10 w-full min-w-0">
            {/* Minimal Dashboard Overview - Higher Density */}
            <section className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hidden md:block">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Rocket className="w-3.5 h-3.5" /> Performance Analytics
                </h3>
                <Badge variant="ghost" className="text-[9px] h-5 px-2 bg-primary/10 text-primary">Last 30 Days</Badge>
              </div>
              <PerformanceOverview />
            </section>

            {/* Main Mock Test Library */}
            <section id="library" className="w-full">
              <MockTestList 
                examId={exam.id} 
                examSlug={exam.slug || exam.id}
                categorySlug={exam.categorySlug || 'all'} 
              />
            </section>
          </div>

          {/* Right Column: Sidebar Stats */}
          <aside className="lg:col-span-4 space-y-6 md:sticky md:top-40 w-full">
            <DailyGoal />
            
            <section className="p-5 border border-white/5 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-accent" />
                <h4 className="text-xs font-bold uppercase tracking-widest">Exam Updates</h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                New mocks for {exam.name} are added every Monday and Thursday. Bookmark important questions for quick revision.
              </p>
            </section>

            <Leaderboard />
          </aside>
        </div>
      </div>

      <Footer />
    </main>
  );
}
