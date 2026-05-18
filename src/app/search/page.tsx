
"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { 
  Search, 
  Filter, 
  Briefcase, 
  FileText, 
  ChevronRight, 
  LayoutGrid, 
  List,
  Loader2,
  TrendingUp,
  Target,
  Clock,
  Sparkles
} from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const db = useFirestore();
  const queryParam = searchParams.get("q") || "";
  
  const [inputText, setInputText] = useState(queryParam);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [activeType, setActiveType] = useState<string>("all");

  const { data: exams, loading: examsLoading } = useCollection<any>(
    db ? query(collection(db, "exams"), limit(50)) : null
  );

  const { data: mocks, loading: mocksLoading } = useCollection<any>(
    db ? query(collection(db, "mockTests"), limit(100)) : null
  );

  const results = useMemo(() => {
    if (!exams || !mocks) return { exams: [], mocks: [] };

    const q =inputText.toLowerCase();
    
    const filteredExams = exams.filter(e => 
      e.name.toLowerCase().includes(q) || 
      e.slug.toLowerCase().includes(q)
    );

    const filteredMocks = mocks.filter(m => {
      const matchesSearch = m.title.toLowerCase().includes(q) || m.slug.toLowerCase().includes(q);
      const matchesType = activeType === "all" || m.type === activeType;
      return matchesSearch && matchesType;
    });

    return { exams: filteredExams, mocks: filteredMocks };
  }, [exams, mocks, inputText, activeType]);

  const totalResults = results.exams.length + results.mocks.length;

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-32 pb-24 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] -z-10" />

        <div className="container mx-auto px-6">
          <Breadcrumbs items={[{ label: "Search Results" }]} />

          <div className="max-w-4xl mx-auto space-y-12">
            {/* Main Search Input */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-3xl blur opacity-20 group-focus-within:opacity-40 transition duration-500" />
              <div className="relative flex items-center bg-card border border-white/10 rounded-2xl h-16 md:h-20 px-6 md:px-8">
                <Search className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground mr-4 md:mr-6" />
                <input
                  placeholder="Search exams, mocks, subjects..."
                  className="flex-1 bg-transparent border-none outline-none text-xl md:text-2xl font-headline font-bold text-foreground placeholder:text-muted-foreground"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                {totalResults > 0 && (
                  <Badge className="bg-primary/20 text-primary border-primary/20 hidden md:flex">
                    {totalResults} Results
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Sidebar Filters */}
              <aside className="w-full md:w-64 space-y-6">
                <div className="p-6 rounded-3xl glass border-white/10 space-y-6">
                   <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mock Type</h4>
                      <Filter className="w-3 h-3 text-muted-foreground" />
                   </div>
                   <div className="space-y-2">
                      {['all', 'Full Test', 'Subject Test', 'Chapter Test', 'PYQ'].map(type => (
                        <button
                          key={type}
                          onClick={() => setActiveType(type)}
                          className={cn(
                            "w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all border",
                            activeType === type 
                              ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                              : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                          )}
                        >
                          {type === 'all' ? 'All Content' : type}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-accent/10 to-primary/10 rounded-[2rem] border border-white/10 space-y-4">
                   <div className="flex items-center gap-2 text-accent font-bold text-[10px] uppercase tracking-wider">
                      <TrendingUp className="w-3 h-3" /> Smart Insights
                   </div>
                   <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                      "Looking for speed? Try subject-wise chapter tests to pinpoint your weak areas faster."
                   </p>
                </div>
              </aside>

              {/* Results Area */}
              <div className="flex-1 space-y-8">
                {examsLoading || mocksLoading ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-4 opacity-30">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-sm font-bold uppercase tracking-widest">Searching platform intelligence...</p>
                  </div>
                ) : totalResults === 0 ? (
                  <div className="h-96 glass rounded-[3rem] border-white/5 flex flex-col items-center justify-center text-center space-y-6 p-8">
                     <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                        <Search className="w-10 h-10 text-muted-foreground opacity-20" />
                     </div>
                     <div className="space-y-2">
                        <h3 className="text-2xl font-headline font-bold">No results found</h3>
                        <p className="text-muted-foreground max-w-xs mx-auto">We couldn't find anything matching your search. Try different keywords or browse categories.</p>
                     </div>
                     <Button className="bg-primary rounded-full px-8" onClick={() => setInputText("")}>
                        Clear Search
                     </Button>
                  </div>
                ) : (
                  <div className="space-y-12">
                    {results.exams.length > 0 && (
                      <section className="space-y-6">
                        <h3 className="text-lg font-headline font-bold flex items-center gap-2">
                           <Briefcase className="w-5 h-5 text-accent" /> Series Results
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                           {results.exams.map(exam => (
                             <ResultCard 
                                key={exam.id} 
                                title={exam.name} 
                                desc={exam.description} 
                                tags={[`${exam.testsCount || 0} Tests`, exam.difficulty || 'Intermediate']} 
                                href={`/exams/${exam.categoryId}/${exam.id}`}
                                icon={Briefcase}
                                color="accent"
                             />
                           ))}
                        </div>
                      </section>
                    )}

                    {results.mocks.length > 0 && (
                      <section className="space-y-6">
                        <h3 className="text-lg font-headline font-bold flex items-center gap-2">
                           <FileText className="w-5 h-5 text-primary" /> Mock Test Results
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                           {results.mocks.map(mock => (
                             <ResultCard 
                                key={mock.id} 
                                title={mock.title} 
                                desc={`${mock.totalQuestions} Questions • ${mock.durationMinutes} Minutes`} 
                                tags={[mock.type, mock.isFree ? 'Free' : 'Premium']} 
                                href={`/exams/${mock.categoryId}/${mock.examId}/mock/${mock.id}`}
                                icon={FileText}
                                color="primary"
                             />
                           ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

function ResultCard({ title, desc, tags, href, icon: Icon, color }: any) {
  return (
    <Link href={href} className="group">
       <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden relative">
          <div className={cn("absolute top-0 left-0 w-1 h-full", color === 'accent' ? "bg-accent" : "bg-primary")} />
          <CardContent className="p-6 flex items-center gap-6">
             <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform", color === 'accent' ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary")}>
                <Icon className="w-7 h-7" />
             </div>
             <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-4">
                   <h4 className="text-lg font-bold group-hover:text-foreground transition-colors">{title}</h4>
                   <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">{desc}</p>
                <div className="flex gap-2">
                   {tags.map((t: string, i: number) => (
                     <Badge key={i} variant="secondary" className="bg-white/5 text-[10px] uppercase font-bold tracking-wider rounded-lg h-6">
                        {t}
                     </Badge>
                   ))}
                </div>
             </div>
          </CardContent>
       </Card>
    </Link>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-background"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
      <SearchPageContent />
    </Suspense>
  );
}
