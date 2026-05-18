"use client";

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ExamCard } from "@/components/ExamCard";
import { ExamSidebar } from "@/components/ExamSidebar";
import { Search, Filter, SortAsc, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, where, limit } from "firebase/firestore";
import { CTASection } from "@/components/CTASection";
import { StatsSection } from "@/components/StatsSection";

export default function CategoryPage() {
  const params = useParams();
  const categorySlug = params.category as string;
  const [searchQuery, setSearchQuery] = useState("");
  const db = useFirestore();

  // Fetch Category Info
  const categoriesQuery = useMemo(() => 
    db ? query(collection(db, "examCategories"), where("slug", "==", categorySlug), limit(1)) : null, 
  [db, categorySlug]);
  const { data: categories, loading: catLoading } = useCollection<any>(categoriesQuery);
  const category = categories?.[0];

  // Fetch Exams in this Category
  const examsQuery = useMemo(() => 
    db && category ? query(collection(db, "exams"), where("categoryId", "==", category.id), where("isActive", "==", true)) : null, 
  [db, category]);
  const { data: exams, loading: examsLoading } = useCollection<any>(examsQuery);

  const filteredExams = useMemo(() => 
    exams?.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase())) || [],
    [exams, searchQuery]
  );

  if (catLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  if (!category) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Category not found.</p>
    </div>
  );

  return (
    <main className="min-h-screen">
      <Navbar />
      
      <div className="pt-32 pb-24 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-accent/10 rounded-full blur-[120px] -z-10" />

        <div className="container mx-auto px-6">
          <Breadcrumbs items={[{ label: category.title }]} />
          
          <div className="space-y-6 mb-16 max-w-3xl">
            <h1 className="text-5xl lg:text-7xl font-headline font-bold leading-[1.1] tracking-tight uppercase">
              {category.title} <span className="gradient-text">Preparation</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {category.description}. Select an exam to start mock tests, previous year questions, and personalized drills.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-12">
            <div className="flex-1 space-y-12">
              <div className="flex flex-col sm:flex-row gap-4 items-center p-4 glass border-white/10 rounded-2xl">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search exams..." 
                    className="pl-10 bg-transparent border-white/5 focus-visible:ring-primary h-12"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 transition-colors h-12">
                    <Filter className="w-3 h-3" /> Filter
                  </button>
                </div>
              </div>

              {examsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-64 rounded-3xl bg-white/5 animate-pulse" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {filteredExams.map((exam) => (
                    <ExamCard key={exam.id} exam={exam} categorySlug={categorySlug} />
                  ))}
                  {filteredExams.length === 0 && (
                    <div className="col-span-full py-20 text-center text-muted-foreground glass border-white/5 rounded-3xl">
                      No exams found matching your search in this category.
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
