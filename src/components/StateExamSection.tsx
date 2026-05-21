
"use client";

import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin, Loader2, BookOpen } from "lucide-react";
import Link from "next/link";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, where } from "firebase/firestore";

export const StateExamSection = () => {
  const db = useFirestore();
  
  // Unified query for all exams - states no longer silod
  const statesQuery = useMemoFirebase(() => 
    db ? query(
      collection(db, "exams"), 
      where("isActive", "==", true),
      orderBy("name", "asc"), 
      limit(6)
    ) : null, 
  [db]);

  const { data: exams, loading } = useCollection<any>(statesQuery);

  if (loading) return null;

  if (!exams || exams.length === 0) return null;

  return (
    <section id="state-exams" className="py-24 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 opacity-30">
         <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
          <div className="space-y-4">
            <h2 className="text-4xl font-headline font-bold">Preparation <span className="gradient-text">Excellence</span></h2>
            <p className="text-muted-foreground max-w-xl">
              Specialized preparation content curated for state-specific administrative, police, and educational exams.
            </p>
          </div>
          <Link href="/exams/all">
            <Badge variant="outline" className="px-6 py-2 rounded-full border-primary/30 text-primary cursor-pointer hover:bg-primary/10 h-10 font-bold uppercase tracking-widest text-[10px]">
              Explore Full Library
            </Badge>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {exams.map((exam) => (
            <Link 
              key={exam.id}
              href={`/exams/all/${exam.slug}`}
              className="group relative p-1 rounded-2xl bg-gradient-to-br from-white/10 to-transparent hover:from-primary/50 hover:to-accent/50 transition-all duration-500 block"
            >
              <div className="bg-card rounded-[calc(1rem-4px)] p-8 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center font-headline font-bold text-2xl text-accent border border-white/10 uppercase">
                      {exam.name.slice(0, 2)}
                    </div>
                    <Badge className="bg-white/5 border-white/10 text-muted-foreground uppercase text-[10px] tracking-widest">
                      {exam.mockCount || 0} Mocks
                    </Badge>
                  </div>
                  <h3 className="text-2xl font-headline font-bold mb-2 truncate">{exam.name}</h3>
                  <p className="text-sm text-muted-foreground mb-8 line-clamp-2">{exam.description || 'Access full test series and AI insights.'}</p>
                </div>
                
                <div className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-4 transition-all">
                  Start Practice <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
