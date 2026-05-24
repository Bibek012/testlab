"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Play,
  FileText,
  Loader2,
  Clock,
  Target,
  ChevronRight,
  Zap,
  History,
  TrendingUp,
  LayoutGrid,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, deleteDoc, doc } from "firebase/firestore";

interface MockTestListProps {
  examId: string;
  examSlug: string;
  categorySlug: string;
}

export const MockTestList = ({ examId, examSlug, categorySlug }: MockTestListProps) => {
  const { user } = useUser();
  const db = useFirestore();

  const [selectedTypeId, setSelectedTypeId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // 1. FETCH METADATA HIERARCHY
  const typesQuery = useMemoFirebase(() =>
    db ? query(collection(db, "exams", examId, "mockTypes"), orderBy("order", "asc")) : null,
    [db, examId]);
  const { data: mockTypes, loading: typesLoading } = useCollection<any>(typesQuery);

  // 2. FETCH PUBLISHED MOCKS
  const mocksQuery = useMemoFirebase(() =>
    db ? query(
      collection(db, "mockTests"),
      where("examId", "==", examId),
      where("status", "==", "Published")
    ) : null,
    [db, examId]);
  const { data: tests, loading: testsLoading } = useCollection<any>(mocksQuery);

  // 3. FETCH ACTIVE SESSIONS (Resume Data)
  const activeTestsQuery = useMemoFirebase(() => 
    (db && user) ? query(collection(db, "progress", user.uid, "activeTests")) : null,
  [db, user?.uid]);
  const { data: activeTests } = useCollection<any>(activeTestsQuery);

  // 4. FETCH LATEST ATTEMPTS
  const attemptsQuery = useMemoFirebase(() =>
    (db && user) ? query(
      collection(db, "users", user.uid, "attempts"),
      where("examId", "==", examId),
      orderBy("completedAt", "desc")
    ) : null,
  [db, user?.uid, examId]);
  const { data: attempts } = useCollection<any>(attemptsQuery);

  // Transform attempts into a "Latest for Mock" map
  const mockStatusMap = useMemo(() => {
    const map: Record<string, { latestAttempt?: any; activeSession?: any }> = {};
    
    activeTests?.forEach(session => {
      map[session.id] = { ...map[session.id], activeSession: session };
    });

    attempts?.forEach(attempt => {
      if (!map[attempt.mockId]?.latestAttempt) {
        map[attempt.mockId] = { ...map[attempt.mockId], latestAttempt: attempt };
      }
    });

    return map;
  }, [activeTests, attempts]);

  const filteredTests = useMemo(() => {
    if (!tests) return [];
    return tests.filter(test => {
      const matchesType = selectedTypeId === "all" || test.typeId === selectedTypeId;
      const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [tests, selectedTypeId, searchQuery]);

  if (typesLoading && !mockTypes) {
    return <TestLibrarySkeleton />;
  }

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-headline font-bold flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-primary" /> Test Library
        </h2>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Find specific module..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-xl h-10 pl-9 pr-4 text-xs outline-none focus:border-primary/40 transition-all"
          />
        </div>
      </div>

      <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setSelectedTypeId("all")}
          className={cn(
            "flex-1 px-4 py-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap",
            selectedTypeId === "all" ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-white'
          )}
        >
          All Mocks
        </button>
        {mockTypes?.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedTypeId(type.id)}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap",
              selectedTypeId === type.id ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-white'
            )}
          >
            {type.title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {testsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />)
        ) : filteredTests.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl">
            <FileText className="w-10 h-10 text-muted-foreground opacity-10 mx-auto mb-3" />
            <p className="text-muted-foreground text-xs font-medium">No mocks available matching filters.</p>
          </div>
        ) : (
          filteredTests.map((test) => (
            <TestListItem
              key={test.id}
              test={test}
              status={mockStatusMap[test.id]}
              baseUrl={`/exams/${categorySlug}/${examSlug}/mock/${test.id}`}
              onClearSession={async () => {
                if (!user || !db) return;
                await deleteDoc(doc(db, 'progress', user.uid, 'activeTests', test.id));
                localStorage.removeItem(`test_progress_${test.id}`);
                localStorage.removeItem(`test_end_${test.id}`);
                window.location.reload();
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};

function TestListItem({ test, status, baseUrl, onClearSession }: any) {
  const { activeSession, latestAttempt } = status || {};

  return (
    <div className="group bg-card border border-white/5 rounded-xl p-4 md:p-5 hover:border-primary/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            {activeSession ? (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] h-4 px-1.5 uppercase font-bold animate-pulse">In Progress</Badge>
            ) : latestAttempt ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[8px] h-4 px-1.5 uppercase font-bold">Attempted</Badge>
            ) : test.isFree ? (
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[8px] h-4 px-1.5 uppercase font-bold">Free</Badge>
            ) : (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] h-4 px-1.5 uppercase font-bold">Live</Badge>
            )}
          </div>
          <h3 className="text-sm md:text-base font-bold leading-tight line-clamp-1">{test.title}</h3>
        </div>

        <div className="flex items-center gap-4 text-[10px] md:text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-primary/60" />
            <span>{test.totalQuestions} Questions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-accent/60" />
            <span>{test.durationMinutes} Mins</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Target className="w-3 h-3 text-emerald-400/60" />
            <span>{test.fullMarks} Marks</span>
          </div>
        </div>

        {latestAttempt && !activeSession && (
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Last Score: <span className="text-accent">{latestAttempt.score?.toFixed(1)}</span></span>
              <span className="text-[10px] text-muted-foreground">{latestAttempt.accuracy?.toFixed(0)}% Accuracy</span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${latestAttempt.accuracy}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-0 border-white/5">
        {activeSession ? (
          <Link href={baseUrl} className="w-full md:w-auto">
            <Button className="w-full bg-primary hover:bg-primary/90 text-white h-10 md:h-11 px-8 rounded-xl text-sm font-bold gap-2">
              <RefreshCw className="w-4 h-4" /> Resume Test
            </Button>
          </Link>
        ) : latestAttempt ? (
          <>
            <Button
              variant="outline"
              className="w-full md:w-auto border-white/10 h-10 rounded-xl text-xs font-bold gap-2"
              onClick={onClearSession}
            >
              <History className="w-3.5 h-3.5" /> Reattempt
            </Button>
            <Link href={`${baseUrl}/result/${latestAttempt.id}`} className="w-full md:w-auto">
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-10 rounded-xl text-xs font-bold gap-2">
                <TrendingUp className="w-3.5 h-3.5" /> Result
              </Button>
            </Link>
          </>
        ) : (
          <Link href={baseUrl} className="w-full md:w-auto">
            <Button className="w-full bg-primary hover:bg-primary/90 text-white h-10 md:h-11 px-8 rounded-xl text-sm font-bold gap-2 shadow-lg shadow-primary/20">
              <Play className="w-4 h-4 fill-current" /> Start Test
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function TestLibrarySkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
      <div className="h-12 w-full bg-white/5 rounded-xl animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 w-full bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
