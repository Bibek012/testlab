
"use client";

import React, { useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ExamCard } from "@/components/ExamCard";
import { ExamSidebar } from "@/components/ExamSidebar";
import { Search, Loader2, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, where } from "firebase/firestore";
import { CTASection } from "@/components/CTASection";
import { StatsSection } from "@/components/StatsSection";

export default function StateExamsUnifiedPage() {
  const db = useFirestore();

  const examsQuery = useMemoFirebase(() => 
    db ? query(
      collection(db, "exams"), 
      where("isActive", "==", true),
      orderBy("name", "asc")
    ) : null, 
  [db]);
  
  const { data: exams, loading: examsLoading } = useCollection<any>(examsQuery);

  return (
    <main className="min-h-screen">
      <Navbar />
      
      <div className="pt-32 pb-24 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] -z-10" />
        
        <div className="container mx-auto px-6">
          <Breadcrumbs items={[{ label: "Examinations" }]} />
          
          <div className="space-y-6 mb-16 max-w-3xl">
            <h1 className="text-5xl lg:text-7xl font-headline font-bold leading-[1.1] tracking-tight">
              Universal <span className="text-accent">Library</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Explore our complete range of state and central government exam modules. 
              One unified platform for all your preparation needs.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-12">
            <div className="flex-1">
              {examsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 rounded-3xl bg-white/5 animate-pulse" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {exams?.map((exam) => (
                    <ExamCard key={exam.id} exam={exam} categorySlug={exam.categorySlug || 'general'} />
                  ))}
                  {(!exams || exams.length === 0) && (
                    <div className="col-span-full py-24 text-center glass border-white/5 rounded-[3rem] space-y-4">
                       <BookOpen className="w-12 h-12 mx-auto opacity-10" />
                       <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No exams available currently</p>
                    </div>
                  )}
                </div>
              )}
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
