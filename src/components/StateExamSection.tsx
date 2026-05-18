"use client";

import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin, Loader2 } from "lucide-react";
import Link from "next/link";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";

export const StateExamSection = () => {
  const db = useFirestore();
  
  // Fetch real state exams from the global database
  const statesQuery = useMemo(() => 
    db ? query(collection(db, "exams"), orderBy("name", "asc"), limit(6)) : null, 
  [db]);

  const { data: exams, loading } = useCollection<any>(statesQuery);

  // Filter only those with stateSlug
  const stateExams = useMemo(() => 
    exams?.filter(e => !!e.stateSlug) || [], 
  [exams]);

  if (loading) return null; // Keep it clean during load

  if (stateExams.length === 0) return null;

  return (
    <section id="state-exams" className="py-24 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 opacity-30">
         <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
          <div className="space-y-4">
            <h2 className="text-4xl font-headline font-bold">State-Level Excellence</h2>
            <p className="text-muted-foreground max-w-xl">
              Specialized preparation content curated for state-specific administrative, police, and educational exams.
            </p>
          </div>
          <Link href="/exams/state">
            <Badge variant="outline" className="px-6 py-2 rounded-full border-primary/30 text-primary cursor-pointer hover:bg-primary/10">
              View All States
            </Badge>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {stateExams.map((exam) => (
            <Link 
              key={exam.id}
              href={`/exams/state/${exam.stateSlug}/${exam.id}`}
              className="group relative p-1 rounded-2xl bg-gradient-to-br from-white/10 to-transparent hover:from-primary/50 hover:to-accent/50 transition-all duration-500 block"
            >
              <div className="bg-card rounded-[calc(1rem-4px)] p-8 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center font-headline font-bold text-2xl text-accent border border-white/10 uppercase">
                      {exam.stateSlug.slice(0, 2)}
                    </div>
                    <Badge className="bg-white/5 border-white/10 text-muted-foreground uppercase text-[10px] tracking-widest">{exam.stateSlug}</Badge>
                  </div>
                  <h3 className="text-2xl font-headline font-bold mb-2">{exam.name}</h3>
                  <p className="text-sm text-muted-foreground mb-8 line-clamp-2">{exam.description}</p>
                </div>
                
                <div className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-4 transition-all">
                  Browse Series <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
