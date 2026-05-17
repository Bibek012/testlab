
"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Clock, 
  HelpCircle, 
  Star, 
  Play, 
  Users, 
  Filter 
} from "lucide-react";
import { MOCK_TESTS, TestType, SUBJECTS_BY_EXAM } from "@/lib/mock-test-data";
import { motion, AnimatePresence } from "framer-motion";

export const MockTestList = ({ examId }: { examId: string }) => {
  const [activeType, setActiveType] = useState<TestType | 'All'>('All');
  const [activeSubject, setActiveSubject] = useState<string | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState("");

  const types: (TestType | 'All')[] = ['All', 'Full Test', 'Chapter Test', 'Subject Test', 'Previous Year', 'Daily Quiz'];
  const subjects = ['All', ...(SUBJECTS_BY_EXAM[examId] || [])];

  const filteredTests = MOCK_TESTS.filter(test => {
    const matchesType = activeType === 'All' || test.type === activeType;
    const matchesSubject = activeSubject === 'All' || test.subject === activeSubject;
    const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSubject && matchesSearch;
  });

  return (
    <div className="space-y-10 py-12">
      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
        <div className="space-y-4 w-full lg:w-auto">
          <h2 className="text-3xl font-headline font-bold">Mock Test <span className="text-accent">Library</span></h2>
          <div className="flex flex-wrap gap-2">
            {types.map((type) => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  activeType === type 
                    ? 'bg-primary border-primary text-white' 
                    : 'bg-white/5 border-white/10 text-muted-foreground hover:border-white/20'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full lg:w-[350px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search specific test..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl h-12 pl-10 pr-4 outline-none focus:border-primary/50 transition-colors text-sm"
          />
        </div>
      </div>

      {/* Subject Pills */}
      <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
        {subjects.map((sub) => (
          <button
            key={sub}
            onClick={() => setActiveSubject(sub)}
            className={`flex-shrink-0 px-6 py-2 rounded-xl text-sm font-medium transition-all ${
              activeSubject === sub 
                ? 'bg-accent/20 text-accent border border-accent/30' 
                : 'bg-white/5 text-muted-foreground hover:bg-white/10'
            }`}
          >
            {sub}
          </button>
        ))}
      </div>

      {/* Test Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredTests.map((test) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={test.id}
              className="group relative glass border-white/10 rounded-[2rem] p-8 hover:border-primary/50 transition-all duration-500 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 flex gap-2">
                {test.isFree && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Free</Badge>}
                {test.isNew && <Badge className="bg-primary/20 text-primary border-primary/30">New</Badge>}
                {test.isPopular && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Popular</Badge>}
              </div>

              <div className="mb-6">
                <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">{test.type}</div>
                <h3 className="text-xl font-headline font-bold leading-tight group-hover:text-primary transition-colors">
                  {test.title}
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <HelpCircle className="w-3 h-3" />
                    <span className="text-[10px] uppercase font-bold tracking-tighter">Questions</span>
                  </div>
                  <div className="text-sm font-bold">{test.questions}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] uppercase font-bold tracking-tighter">Duration</span>
                  </div>
                  <div className="text-sm font-bold">{test.duration}m</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Star className="w-3 h-3" />
                    <span className="text-[10px] uppercase font-bold tracking-tighter">Rating</span>
                  </div>
                  <div className="text-sm font-bold text-amber-400">{test.rating}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{test.attempts.toLocaleString()} attempts</span>
                </div>
                <Button className="rounded-full bg-white/5 hover:bg-primary hover:text-white border-white/10 transition-all gap-2 px-6">
                  <Play className="w-4 h-4 fill-current" />
                  Start
                </Button>
              </div>

              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all" />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredTests.length === 0 && (
          <div className="col-span-full py-20 text-center text-muted-foreground glass border-white/5 rounded-3xl">
            No mock tests found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
};
