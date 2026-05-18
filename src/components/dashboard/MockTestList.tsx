
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Play, 
  Users,
  CheckCircle2,
  BarChart3,
  RotateCcw
} from "lucide-react";
import { MOCK_TESTS, TestType, SUBJECTS_BY_EXAM } from "@/lib/mock-test-data";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUser, useFirestore } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

interface MockTestListProps {
  examId: string;
  categorySlug: string;
  stateSlug?: string;
}

export const MockTestList = ({ examId, categorySlug, stateSlug }: MockTestListProps) => {
  const [activeType, setActiveType] = useState<TestType | 'All'>('All');
  const [activeSubject, setActiveSubject] = useState<string | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState("");
  const [attemptedIds, setAttemptedIds] = useState<Set<string>>(new Set());

  const { user } = useUser();
  const db = useFirestore();

  // Load attempted status from cloud
  useEffect(() => {
    const fetchAttempts = async () => {
      if (user && db) {
        const q = query(collection(db, 'attempts'), where('uid', '==', user.uid));
        const snap = await getDocs(q);
        const ids = new Set<string>();
        snap.forEach(doc => ids.add(doc.data().testId));
        setAttemptedIds(ids);
      }
    };
    fetchAttempts();
  }, [user, db]);

  const types: (TestType | 'All')[] = ['All', 'Full Test', 'Chapter Test', 'Subject Test', 'Previous Year', 'Daily Quiz'];
  const subjects = ['All', ...(SUBJECTS_BY_EXAM[examId] || [])];

  const filteredTests = MOCK_TESTS.filter(test => {
    const matchesType = activeType === 'All' || test.type === activeType;
    const matchesSubject = activeSubject === 'All' || test.subject === activeSubject;
    const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSubject && matchesSearch;
  });

  const showSubjectFilters = activeType === 'Subject Test' || activeType === 'Chapter Test';

  return (
    <div className="space-y-8 md:space-y-12 py-6 md:py-12 w-full overflow-hidden">
      <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
        <div className="space-y-4 w-full">
          <h2 className="text-xl md:text-3xl font-headline font-bold">Mock Test <span className="text-accent">Library</span></h2>
          <div className="flex overflow-x-auto hide-scrollbar -mx-6 px-6 sm:mx-0 sm:px-0 sm:flex-wrap gap-2 pb-2">
            {types.map((type) => (
              <button
                key={type}
                onClick={() => {
                  setActiveType(type);
                  setActiveSubject('All');
                }}
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

      <AnimatePresence>
        {showSubjectFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-6 px-6 sm:mx-0 sm:px-0 pb-4">
              {subjects.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setActiveSubject(sub)}
                  className={cn(
                    "flex-shrink-0 px-5 py-2 rounded-xl text-[10px] md:text-xs font-medium transition-all border",
                    activeSubject === sub ? 'bg-accent/20 text-accent border-accent/40' : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'
                  )}
                >
                  {sub}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    {isAttempted && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[8px] px-1.5 h-4 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Done</Badge>}
                    {test.isFree && <Badge className="bg-white/5 text-muted-foreground border-white/10 text-[8px] px-1.5 h-4">Free</Badge>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 py-6 border-y border-white/5 mb-6">
                  <div className="text-center">
                    <div className="text-[8px] text-muted-foreground uppercase font-bold mb-1">Qs</div>
                    <div className="text-xs md:text-sm font-bold">{test.questions}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-muted-foreground uppercase font-bold mb-1">Mins</div>
                    <div className="text-xs md:text-sm font-bold">{test.duration}m</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-muted-foreground uppercase font-bold mb-1">Rating</div>
                    <div className="text-xs md:text-sm font-bold text-amber-400">{test.rating}</div>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span>{test.attempts.toLocaleString()}</span>
                  </div>
                  <Link href={mockUrl} className="shrink-0 flex gap-2">
                    {isAttempted ? (
                      <>
                        <Button variant="outline" className="rounded-full border-white/10 text-muted-foreground h-9 px-4 text-xs font-bold gap-2">
                          <BarChart3 className="w-3.5 h-3.5" /> Analysis
                        </Button>
                        <Button className="rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white border-transparent h-9 px-4 text-xs font-bold gap-2">
                          <RotateCcw className="w-3.5 h-3.5" /> Reattempt
                        </Button>
                      </>
                    ) : (
                      <Button className="rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white border-transparent transition-all gap-2 h-9 px-6 text-xs font-bold">
                        <Play className="w-3.5 h-3.5 fill-current" /> Start
                      </Button>
                    )}
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
