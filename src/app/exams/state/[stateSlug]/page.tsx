
"use client";

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ExamCard } from "@/components/ExamCard";
import { ExamSidebar } from "@/components/ExamSidebar";
import { Search } from "lucide-react";
import { STATES, STATE_EXAMS } from "@/lib/exam-data";
import { CTASection } from "@/components/CTASection";
import { StatsSection } from "@/components/StatsSection";

export default function StateExamsPage() {
  const params = useParams();
  const stateSlug = params.stateSlug as string;
  const [searchQuery, setSearchQuery] = useState("");

  const state = useMemo(() => 
    STATES.find(s => s.slug === stateSlug), 
    [stateSlug]
  );

  const exams = useMemo(() => 
    STATE_EXAMS[stateSlug] || [], 
    [stateSlug]
  );

  const filteredExams = useMemo(() => 
    exams.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [exams, searchQuery]
  );

  if (!state) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">State not found.</p>
    </div>
  );

  return (
    <main className="min-h-screen">
      <Navbar />
      
      <div className="pt-32 pb-24 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] -z-10" />

        <div className="container mx-auto px-6">
          <Breadcrumbs items={[
            { label: "State Exams", href: "/exams/state" },
            { label: state.name }
          ]} />
          
          <div className="space-y-6 mb-16 max-w-3xl">
            <h1 className="text-5xl lg:text-7xl font-headline font-bold leading-[1.1] tracking-tight">
              {state.name} <span className="text-accent">Exams</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Prepare for {state.name}'s premier competitive exams with our curated mocks and PYQs.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-12">
            <div className="flex-1 space-y-12">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                <div className="relative flex items-center bg-card border border-white/10 rounded-2xl overflow-hidden h-14 px-6">
                  <Search className="w-5 h-5 text-muted-foreground mr-4" />
                  <input
                    type="text"
                    placeholder={`Search ${state.name} exams...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredExams.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} categorySlug="state" stateSlug={stateSlug} />
                ))}
                {filteredExams.length === 0 && (
                  <div className="col-span-full py-20 text-center text-muted-foreground glass border-white/5 rounded-3xl">
                    No exams found for this state.
                  </div>
                )}
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
