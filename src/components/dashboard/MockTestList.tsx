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

  // State for filtering
  const [selectedTypeId, setSelectedTypeId] = useState<string>("all");
  const [selectedSubTypeId, setSelectedSubTypeId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Fetch Dynamic Mock Types for this specific Exam
  const typesQuery = useMemoFirebase(() => 
    db ? query(collection(db, "exams", examId, "mockTypes"), orderBy("order", "asc")) : null,
  [db, examId]);
  const { data: mockTypes, loading: typesLoading } = useCollection<any>(typesQuery);

  // 2. Fetch Dynamic Sub-Types for the selected Primary Type
  const subTypesQuery = useMemoFirebase(() => 
    db && selectedTypeId !== "all" 
      ? query(collection(db, "exams", examId, "mockTypes", selectedTypeId, "subTypes"), orderBy("order", "asc")) 
      : null,
  [db, examId, selectedTypeId]);
  const { data: subTypes, loading: subTypesLoading } = useCollection<any>(subTypesQuery);

  // 3. Fetch all Published Mock Tests for this Exam
  const mocksQuery = useMemoFirebase(() => 
    db ? query(
      collection(db, "mockTests"), 
      where("examId", "==", examId), 
      where("status", "==", "Published"), 
      orderBy("title", "asc")
    ) : null,
  [db, examId]);
  const { data: tests, loading: testsLoading } = useCollection<any>(mocksQuery);

  // Client-side filtering logic
  const filteredTests = useMemo(() => {
    if (!tests) return [];
    return tests.filter(test => {
      const matchesType = selectedTypeId === "all" || test.typeId === selectedTypeId;
      const matchesSubType = selectedSubTypeId === "all" || test.subTypeId === selectedSubTypeId;
      const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSubType && matchesSearch;
    });
  }, [tests, selectedTypeId, selectedSubTypeId, searchQuery]);

  const handleTypeSelect = (id: string) => {
    setSelectedTypeId(id);
    setSelectedSubTypeId("all"); // Reset subtype on type change
  };

  if (typesLoading && !mockTypes) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest">Building Library Hierarchy...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 md:space-y-12 w-full overflow-hidden">
      {/* Search & Header */}
      <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
        <div className="space-y-4 w-full">
          <h2 className="text-xl md:text-3xl font-headline font-bold">Mock Test <span className="text-accent">Library</span></h2>
          
          {/* Primary Hierarchy Tabs - Horizontal Scroll Mobile */}
          <div className="flex overflow-x-auto hide-scrollbar -mx-6 px-6 sm:mx-0 sm:px-0 gap-2 pb-2">
            <button
              onClick={() => handleTypeSelect("all")}
              className={cn(
                "whitespace-nowrap px-5 py-2.5 rounded-xl text-xs font-bold transition-all border shrink-0",
                selectedTypeId === "all" 
                  ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                  : 'bg-white/5 border-white/10 text-muted-foreground hover:border-white/20'
              )}
            >
              All Tests
            </button>
            {mockTypes?.map((type) => (
              <button
                key={type.id}
                onClick={() => handleTypeSelect(type.id)}
                className={cn(
                  "whitespace-nowrap px-5 py-2.5 rounded-xl text-xs font-bold transition-all border shrink-0",
                  selectedTypeId === type.id 
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                    : 'bg-white/5 border-white/10 text-muted-foreground hover:border-white/20'
                )}
              >
                {type.title}
              </button>
            ))}
          </div>

          {/* Sub-Hierarchy Pills - Appear only when a type with subTypes is selected */}
          <AnimatePresence>
            {selectedTypeId !== "all" && subTypes && subTypes.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 overflow-x-auto hide-scrollbar -mx-6 px-6 sm:mx-0 sm:px-0 py-1"
              >
                <div className="flex items-center gap-2 pr-4 border-r border-white/10 shrink-0">
                   <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                   <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Filter By</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedSubTypeId("all")}
                    className={cn(
                      "whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border",
                      selectedSubTypeId === "all" 
                        ? 'bg-accent/20 border-accent/40 text-accent' 
                        : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'
                    )}
                  >
                    Entire {mockTypes?.find(t => t.id === selectedTypeId)?.title}
                  </button>
                  {subTypes.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubTypeId(sub.id)}
                      className={cn(
                        "whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border",
                        selectedSubTypeId === sub.id 
                          ? 'bg-accent/20 border-accent/40 text-accent' 
                          : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'
                      )}
                    >
                      {sub.title}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative w-full xl:w-80 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search test name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl h-11 md:h-12 pl-10 pr-4 outline-none focus:border-primary/40 transition-colors text-sm"
          />
        </div>
      </div>

      {/* Mock Grid */}
      {testsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-[2rem] bg-white/5 animate-pulse" />)}
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="py-24 text-center glass border-white/5 rounded-[3rem] space-y-4">
           <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-muted-foreground opacity-20" />
           </div>
           <div className="space-y-1">
              <h3 className="text-xl font-headline font-bold">No Tests Available</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                 We couldn't find any published tests for the selected hierarchy and search criteria.
              </p>
           </div>
           <Button variant="outline" className="rounded-xl border-white/10 mt-4" onClick={() => { setSelectedTypeId("all"); setSelectedSubTypeId("all"); setSearchQuery(""); }}>
              Reset Filters
           </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8">
          <AnimatePresence mode="popLayout">
            {filteredTests.map((test) => {
              const mockUrl = stateSlug 
                ? `/exams/state/${stateSlug}/${examId}/mock/${test.id}`
                : `/exams/${categorySlug}/${examId}/mock/${test.id}`;

              return (
                <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={test.id}
                  className="group relative glass border-white/10 rounded-[2rem] p-8 hover:border-primary/40 transition-all duration-500 flex flex-col h-full overflow-hidden shadow-2xl"
                >
                  {/* Decorative background accent */}
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                     <Layers className="w-16 h-16 text-primary" />
                  </div>

                  <div className="flex flex-col gap-4 mb-8">
                    <div className="flex items-center gap-2">
                       <Badge className="bg-primary/20 text-primary border-primary/10 text-[9px] uppercase tracking-widest px-2 h-5">
                          {test.typeName || "General Test"}
                       </Badge>
                       {test.subTypeName && (
                         <Badge variant="outline" className="text-accent border-accent/20 bg-accent/5 text-[9px] uppercase tracking-widest px-2 h-5">
                           {test.subTypeName}
                         </Badge>
                       )}
                    </div>
                    <h3 className="text-lg md:text-xl font-headline font-bold leading-tight group-hover:text-primary transition-colors pr-8">
                      {test.title}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-6 border-y border-white/5 mb-8">
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Items</div>
                      <div className="text-lg font-bold">{test.totalQuestions || 0} Questions</div>
                    </div>
                    <div className="space-y-1 border-l border-white/5 pl-4">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Duration</div>
                      <div className="text-lg font-bold">{test.durationMinutes || 0} Mins</div>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <Link href={mockUrl} className="w-full block">
                        <Button className="w-full rounded-2xl bg-white/5 hover:bg-primary text-foreground hover:text-white border border-white/10 hover:border-primary transition-all duration-300 gap-2 h-12 md:h-14 text-sm font-bold group/btn">
                          <Play className="w-4 h-4 fill-current group-hover/btn:scale-110 transition-transform" /> 
                          Start Practice
                          <ChevronRight className="w-4 h-4 ml-auto opacity-40" />
                        </Button>
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
