"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Play, 
  CheckCircle2,
  BarChart3,
  RotateCcw,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";

interface MockTestListProps {
  examId: string;
  categorySlug: string;
  stateSlug?: string;
}

export const MockTestList = ({ examId, categorySlug, stateSlug }: MockTestListProps) => {
  const [activeType, setActiveType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState("");
  const [attemptedIds, setAttemptedIds] = useState<Set<string>>(new Set());
  
  const { user } = useUser();
  const db = useFirestore();

  // Fetch Mock Tests for this Exam
  const testsQuery = useMemoFirebase(() => 
    db ? query(
      collection(db, "mockTests"), 
      where("examId", "==", examId), 
      where("status", "==", "Published"), 
      orderBy("title", "asc")
    ) : null,
  [db, examId]);

  const { data: tests, loading: testsLoading } = useCollection<any>(testsQuery);

  // Load attempted status from cloud
  useEffect(() => {
    const fetchAttempts = async () => {
      if (user && db) {
        try {
          const q = query(collection(db, 'attempts'), where('uid', '==', user.uid));
          const snap = await getDocs(q);
          const ids = new Set<string>();
          snap.forEach(doc => ids.add(doc.data().testId));
          setAttemptedIds(ids);
        } catch (e) {
          console.warn("MockTestList: Failed to fetch attempts.");
        }
      }
    };
    fetchAttempts();
  }, [user?.uid, !!db]);

  const filteredTests = useMemo(() => {
    if (!tests) return [];
    return tests.filter(test => {
      const matchesType = activeType === 'All' || test.type === activeType;
      const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [tests, activeType, searchQuery]);

  const types = ['All', 'Full Test', 'Subject Test', 'Chapter Test', 'Previous Year', 'Daily Quiz'];

  return (
    <div className="space-y-8 md:space-y-12 py-6 md:py-12 w-full overflow-hidden">
      <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
        <div className="space-y-4 w-full">
          <h2 className="text-xl md:text-3xl font-headline font-bold">Mock Test <span className="text-accent">Library</span></h2>
          <div className="flex overflow-x-auto hide-scrollbar -mx-6 px-6 sm:mx-0 sm:px-0 sm:flex-wrap gap-2 pb-2">
            {types.map((type) => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={cn(
                  "whitespace-nowrap px-4 py-2 rounded-full text-[10px] md:text-xs font-semibold transition-all border shrink-0",
                  activeType === type 
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                    : 'bg-white/5 border-white/10 text-muted-foreground hover:border-white/20'
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full xl:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search test name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl h-11 md:h-12 pl-10 pr-4 outline-none focus:border-primary/40 transition-colors text-sm"
          />
        </div>
      </div>

      {testsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-3xl bg-white/5 animate-pulse" />)}
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="py-20 text-center glass border-white/5 rounded-[2rem] space-y-4">
           <FileText className="w-12 h-12 mx-auto text-muted-foreground opacity-20" />
           <p className="text-muted-foreground font-medium">No mock tests available for the selected criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          <AnimatePresence mode="popLayout">
            {filteredTests.map((test) => {
              const isAttempted = attemptedIds.has(test.id);
              const mockUrl = stateSlug 
                ? `/exams/state/${stateSlug}/${examId}/mock/${test.id}`
                : `/exams/${categorySlug}/${examId}/mock/${test.id}`;

              return (
                <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={test.id}
                  className="group relative glass border-white/10 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 hover:border-primary/40 transition-all duration-300 flex flex-col h-full"
                >
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="text-[8px] md:text-[10px] font-bold text-accent uppercase tracking-widest">{test.type}</div>
                      <h3 className="text-base md:text-lg font-headline font-bold leading-tight group-hover:text-primary transition-colors">
                        {test.title}
                      </h3>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1 shrink-0">
                      {isAttempted && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[8px] px-1.5 h-4 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Attempted</Badge>}
                      {test.isFree && <Badge className="bg-white/5 text-muted-foreground border-white/10 text-[8px] px-1.5 h-4">Free</Badge>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-6 border-y border-white/5 mb-6">
                    <div className="text-center">
                      <div className="text-[8px] text-muted-foreground uppercase font-bold mb-1">Questions</div>
                      <div className="text-xs md:text-sm font-bold">{test.totalQuestions || 0}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[8px] text-muted-foreground uppercase font-bold mb-1">Duration</div>
                      <div className="text-xs md:text-sm font-bold">{test.durationMinutes || 0}m</div>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-4">
                    <Link href={mockUrl} className="w-full">
                      {isAttempted ? (
                        <div className="grid grid-cols-2 gap-2 w-full">
                           <Button variant="outline" className="rounded-xl border-white/10 text-muted-foreground h-10 px-0 text-[10px] font-bold gap-1">
                              <BarChart3 className="w-3 h-3" /> Result
                           </Button>
                           <Button className="rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white border-transparent h-10 px-0 text-[10px] font-bold gap-1">
                              <RotateCcw className="w-3 h-3" /> Reattempt
                           </Button>
                        </div>
                      ) : (
                        <Button className="w-full rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white border-transparent transition-all gap-2 h-11 text-sm font-bold">
                          <Play className="w-4 h-4 fill-current" /> Start Practice
                        </Button>
                      )}
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};