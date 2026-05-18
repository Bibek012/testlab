
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Search, 
  X, 
  Briefcase, 
  FileText, 
  ArrowRight, 
  Clock, 
  TrendingUp,
  History,
  Command,
  Loader2
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, limit, orderBy } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearch = ({ isOpen, onClose }: Props) => {
  const router = useRouter();
  const db = useFirestore();
  const [queryText, setQueryText] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Real-time fetching of exams and mocks matching query stabilized with useMemoFirebase
  const examsQuery = useMemoFirebase(() => 
    db && queryText.length > 2 
      ? query(collection(db, "exams"), where("name", ">=", queryText), where("name", "<=", queryText + '\uf8ff'), limit(5))
      : null,
  [db, queryText]);
  const { data: exams } = useCollection<any>(examsQuery);

  const mocksQuery = useMemoFirebase(() => 
    db && queryText.length > 2 
      ? query(collection(db, "mockTests"), where("title", ">=", queryText), where("title", "<=", queryText + '\uf8ff'), limit(5))
      : null,
  [db, queryText]);
  const { data: mocks } = useCollection<any>(mocksQuery);

  useEffect(() => {
    const saved = localStorage.getItem("testlab_recent_searches");
    if (saved) setRecentSearches(JSON.parse(saved));

    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        isOpen ? onClose() : null; // Handled by trigger usually, but good for toggle
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText) return;
    
    // Save to recent
    const updated = [queryText, ...recentSearches.filter(s => s !== queryText)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("testlab_recent_searches", JSON.stringify(updated));

    router.push(`/search?q=${encodeURIComponent(queryText)}`);
    onClose();
  };

  const handleItemClick = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 glass border-white/10 overflow-hidden top-[20%] translate-y-0">
        <DialogHeader className="p-4 border-b border-white/5">
          <form onSubmit={handleSearch} className="relative flex items-center">
            <Search className="absolute left-3 w-5 h-5 text-muted-foreground" />
            <input
              autoFocus
              placeholder="Search for exams, mocks, subjects..."
              className="w-full bg-transparent border-none outline-none pl-11 pr-12 h-10 text-lg text-foreground placeholder:text-muted-foreground"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
            />
            <div className="absolute right-0 flex items-center gap-2 pr-2">
              {queryText && (
                <button 
                  type="button" 
                  onClick={() => setQueryText("")}
                  className="p-1 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
              <div className="hidden sm:flex items-center gap-1 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[10px] font-bold text-muted-foreground">
                <Command className="w-2.5 h-2.5" />
                K
              </div>
            </div>
          </form>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
          {queryText.length < 3 ? (
            <div className="p-6 space-y-8">
              {recentSearches.length > 0 && (
                <section className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <History className="w-3 h-3" /> Recent Searches
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((s, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className="bg-white/5 hover:bg-primary/20 hover:text-primary cursor-pointer transition-all px-3 py-1 rounded-lg border-white/5"
                        onClick={() => setQueryText(s)}
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-accent" /> Trending Exams
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['SSC CGL 2024', 'RRB NTPC Phase 1', 'IBPS PO Prelims', 'BPSC 70th Prelims'].map((exam) => (
                    <button
                      key={exam}
                      onClick={() => handleItemClick(`/search?q=${encodeURIComponent(exam)}`)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-primary/40 hover:bg-white/[0.08] transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium">{exam}</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="p-2">
              {(!exams || exams.length === 0) && (!mocks || mocks.length === 0) ? (
                <div className="p-12 text-center space-y-4">
                   <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto opacity-20">
                     <Search className="w-6 h-6" />
                   </div>
                   <p className="text-sm text-muted-foreground">No matches found for "<span className="text-foreground font-bold">{queryText}</span>"</p>
                   <Button variant="outline" size="sm" className="rounded-xl border-white/10" onClick={() => router.push(`/search?q=${queryText}`)}>
                     View all results
                   </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {exams && exams.length > 0 && (
                    <section className="p-2 space-y-1">
                      <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Exams</div>
                      {exams.map((e: any) => (
                        <SearchItem 
                          key={e.id} 
                          title={e.name} 
                          desc={`${e.testsCount || 0} Mock Series`} 
                          icon={Briefcase} 
                          onClick={() => handleItemClick(`/exams/${e.categoryId}/${e.id}`)} 
                        />
                      ))}
                    </section>
                  )}

                  {mocks && mocks.length > 0 && (
                    <section className="p-2 space-y-1 border-t border-white/5">
                      <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mock Tests</div>
                      {mocks.map((m: any) => (
                        <SearchItem 
                          key={m.id} 
                          title={m.title} 
                          desc={`${m.totalQuestions} Questions • ${m.type}`} 
                          icon={FileText} 
                          onClick={() => handleItemClick(`/exams/${m.categoryId}/${m.examId}/mock/${m.id}`)} 
                        />
                      ))}
                    </section>
                  )}
                  
                  <button 
                    onClick={handleSearch}
                    className="w-full flex items-center justify-center gap-2 p-4 text-xs font-bold text-primary hover:bg-primary/5 transition-colors border-t border-white/5"
                  >
                    View all results for "{queryText}" <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

function SearchItem({ title, desc, icon: Icon, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all group"
    >
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-all">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 text-left">
        <div className="text-sm font-bold leading-tight mb-0.5">{title}</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{desc}</div>
      </div>
      <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
    </button>
  );
}
