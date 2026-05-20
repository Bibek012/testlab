
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Play, 
  CheckCircle2,
  BarChart3,
  RotateCcw,
  FileText,
  ChevronRight,
  Loader2,
  Layers,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";

interface MockTestListProps {
  examId: string;
  categorySlug: string;
  stateSlug?: string;
}

export const MockTestList = ({ examId, categorySlug, stateSlug }: MockTestListProps) => {
  const { user } = useUser();
  const db = useFirestore();

  const [selectedTypeId, setSelectedTypeId] = useState<string>("all");
  const [selectedSubTypeId, setSelectedSubTypeId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const typesQuery = useMemoFirebase(() => 
    db ? query(collection(db, "exams", examId, "mockTypes"), orderBy("order", "asc")) : null,
  [db, examId]);
  const { data: mockTypes, loading: typesLoading } = useCollection<any>(typesQuery);

  const subTypesQuery = useMemoFirebase(() => 
    db && selectedTypeId !== "all" 
      ? query(collection(db, "exams", examId, "mockTypes", selectedTypeId, "subTypes"), orderBy("order", "asc")) 
      : null,
  [db, examId, selectedTypeId]);
  const { data: subTypes } = useCollection<any>(subTypesQuery);

  // Corrected Query: Use Published status and specific examId
  const mocksQuery = useMemoFirebase(() => 
    db ? query(
      collection(db, "mockTests"), 
      where("examId", "==", examId), 
      where("status", "==", "Published")
    ) : null,
  [db, examId]);
  const { data: tests, loading: testsLoading } = useCollection<any>(mocksQuery);

  const filteredTests = useMemo(() => {
    if (!tests) return [];
    return tests.filter(test => {
      const matchesType = selectedTypeId === "all" || test.typeId === selectedTypeId;
      const matchesSubType = selectedSubTypeId === "all" || test.subTypeId === selectedSubTypeId;
      const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSubType && matchesSearch;
    });
  }, [tests, selectedTypeId, selectedSubTypeId, searchQuery]);

  if (typesLoading && !mockTypes) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" /></div>;
  }

  return (
    <div className="space-y-8 w-full overflow-hidden">
      <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
        <div className="space-y-4 w-full">
          <h2 className="text-xl md:text-3xl font-headline font-bold">Mock Test <span className="text-accent">Library</span></h2>
          
          <div className="flex overflow-x-auto hide-scrollbar -mx-6 px-6 sm:mx-0 sm:px-0 gap-2 pb-2">
            <button
              onClick={() => { setSelectedTypeId("all"); setSelectedSubTypeId("all"); }}
              className={cn(
                "whitespace-nowrap px-5 py-2.5 rounded-xl text-xs font-bold transition-all border",
                selectedTypeId === "all" ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white/5 border-white/10 text-muted-foreground'
              )}
            >
              All Tests
            </button>
            {mockTypes?.map((type) => (
              <button
                key={type.id}
                onClick={() => { setSelectedTypeId(type.id); setSelectedSubTypeId("all"); }}
                className={cn(
                  "whitespace-nowrap px-5 py-2.5 rounded-xl text-xs font-bold transition-all border",
                  selectedTypeId === type.id ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white/5 border-white/10 text-muted-foreground'
                )}
              >
                {type.title}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {selectedTypeId !== "all" && subTypes && subTypes.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 overflow-x-auto hide-scrollbar -mx-6 px-6 sm:mx-0 sm:px-0">
                <button
                  onClick={() => setSelectedSubTypeId("all")}
                  className={cn(
                    "whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-bold border",
                    selectedSubTypeId === "all" ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-white/5 border-white/5 text-muted-foreground'
                  )}
                >
                  Entire {mockTypes?.find(t => t.id === selectedTypeId)?.title}
                </button>
                {subTypes.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubTypeId(sub.id)}
                    className={cn(
                      "whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-bold border",
                      selectedSubTypeId === sub.id ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-white/5 border-white/5 text-muted-foreground'
                    )}
                  >
                    {sub.title}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative w-full xl:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search within series..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl h-12 pl-10 pr-4 outline-none focus:border-primary/40 transition-colors text-sm"
          />
        </div>
      </div>

      {testsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-[2rem] bg-white/5 animate-pulse" />)}
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="py-24 text-center glass border-white/5 rounded-[3rem] space-y-4">
           <FileText className="w-12 h-12 text-muted-foreground opacity-10 mx-auto" />
           <p className="text-muted-foreground font-bold tracking-widest text-xs uppercase">No matches in library</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8">
          {filteredTests.map((test) => {
            const mockUrl = stateSlug 
              ? `/exams/state/${stateSlug}/${examId}/mock/${test.id}`
              : `/exams/${categorySlug}/${examId}/mock/${test.id}`;

            return (
              <motion.div layout key={test.id}
                className="group glass border-white/10 rounded-[2rem] p-8 hover:border-primary/40 transition-all duration-500 flex flex-col h-full overflow-hidden shadow-2xl"
              >
                <div className="flex flex-col gap-4 mb-8">
                  <div className="flex items-center gap-2">
                     <Badge className="bg-primary/20 text-primary border-primary/10 text-[9px] uppercase tracking-widest px-2 h-5">{test.typeName || "Full Mock"}</Badge>
                     {test.isFree && <Badge variant="outline" className="text-emerald-400 border-emerald-400/20 bg-emerald-400/5 text-[9px] px-2 h-5">Free Asset</Badge>}
                  </div>
                  <h3 className="text-lg md:text-xl font-headline font-bold leading-tight group-hover:text-primary transition-colors">{test.title}</h3>
                </div>

                <div className="grid grid-cols-2 gap-4 py-6 border-y border-white/5 mb-8">
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Score Pool</div>
                    <div className="text-lg font-bold">{test.fullMarks || 0} Marks</div>
                  </div>
                  <div className="space-y-1 border-l border-white/5 pl-4">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Questions</div>
                    <div className="text-lg font-bold">{test.totalQuestions || 0} Qs</div>
                  </div>
                </div>

                <Link href={mockUrl} className="mt-auto block">
                    <Button className="w-full rounded-2xl bg-white/5 hover:bg-primary text-foreground hover:text-white border border-white/10 h-14 text-sm font-bold gap-2">
                      <Play className="w-4 h-4 fill-current" /> Start Practice
                    </Button>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
