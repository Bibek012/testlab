"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Files, HelpCircle, ArrowRight, Loader2, Star } from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, where, limit } from "firebase/firestore";
import { cn } from "@/lib/utils";

export const PopularExams = () => {
  const db = useFirestore();
  const popularExamsQuery = useMemo(() => 
    db ? query(collection(db, "exams"), where("isActive", "==", true), limit(8)) : null, 
  [db]);

  const { data: exams, loading } = useCollection<any>(popularExamsQuery);

  if (loading) {
    return (
      <div className="py-24 bg-white/[0.02]">
        <div className="container mx-auto px-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-20" />
        </div>
      </div>
    );
  }

  if (!exams || exams.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-white/[0.02] overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12 md:mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl font-headline font-bold">Trending Series</h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            Our most popular test series used by thousands of aspirants to secure their dream jobs.
          </p>
        </div>

        <div className="relative overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-4 md:gap-8 w-max pb-4">
            {exams.map((exam) => {
              const href = exam.stateSlug 
                ? `/exams/state/${exam.stateSlug}/${exam.id}`
                : `/exams/${exam.categoryId}/${exam.id}`;

              return (
                <div
                  key={exam.id}
                  className="w-[280px] md:w-[320px] bg-card border border-white/10 rounded-2xl p-6 md:p-8 hover:border-accent/40 transition-all duration-300 group shadow-lg flex flex-col"
                >
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-lg md:text-xl font-headline font-bold truncate pr-4">{exam.name}</h3>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[9px] md:text-[10px]",
                        exam.difficulty === 'Hard' ? 'text-red-400 border-red-400/30' : 
                        exam.difficulty === 'Intermediate' ? 'text-amber-400 border-amber-400/30' : 
                        'text-green-400 border-green-400/30'
                      )}
                    >
                      {exam.difficulty || 'Intermediate'}
                    </Badge>
                  </div>

                  <div className="space-y-3 mb-8 flex-1">
                    <div className="flex items-center gap-3 text-xs md:text-sm text-muted-foreground">
                      <Files className="w-4 h-4 text-primary" />
                      <span>{exam.testsCount || 0} Mock Tests</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs md:text-sm text-muted-foreground">
                      <HelpCircle className="w-4 h-4 text-accent" />
                      <span>{exam.questionsCount || 0} Questions</span>
                    </div>
                  </div>

                  <Link href={href} className="w-full">
                    <Button className="w-full bg-white/5 hover:bg-primary border border-white/10 group-hover:border-primary transition-all rounded-xl h-11 md:h-12 gap-2 text-xs md:text-sm font-bold">
                      Attempt Now
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
