
"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Files, HelpCircle, ArrowRight } from "lucide-react";

const exams = [
  { id: "cgl", category: "ssc", name: "SSC CGL", tests: "250+", questions: "15,000+", difficulty: "Intermediate" },
  { id: "ntpc", category: "railway", name: "RRB NTPC", tests: "180+", questions: "10,000+", difficulty: "Intermediate" },
  { id: "sbi-po", category: "banking", name: "SBI PO", tests: "150+", questions: "12,000+", difficulty: "Hard" },
  { id: "chsl", category: "ssc", name: "SSC CHSL", tests: "200+", questions: "14,000+", difficulty: "Easy" },
  { id: "bpsc", category: "state", state: "bihar", name: "BPSC", tests: "100+", questions: "7,000+", difficulty: "Hard" },
  { id: "bihar-police", category: "state", state: "bihar", name: "Bihar Police", tests: "80+", questions: "5,000+", difficulty: "Easy" },
  { id: "ntpc", category: "railway", name: "RRB NTPC", tests: "180+", questions: "10,000+", difficulty: "Intermediate" },
];

export const PopularExams = () => {
  return (
    <section className="py-24 bg-white/[0.02]">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl font-headline font-bold">Trending Exam Series</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our most popular test series used by thousands of aspirants to secure their dream jobs.
          </p>
        </div>

        <div className="relative overflow-x-auto hide-scrollbar pb-8">
          <div className="flex gap-8 w-max px-4">
            {exams.map((exam, i) => {
              const href = exam.category === "state" 
                ? `/exams/state/${exam.state}/${exam.id}`
                : `/exams/${exam.category}/${exam.id}`;

              return (
                <div
                  key={i}
                  className="w-[320px] bg-card border border-white/10 rounded-2xl p-8 hover:border-accent/50 transition-all duration-300 group shadow-lg flex flex-col"
                >
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xl font-headline font-bold">{exam.name}</h3>
                    <Badge 
                      variant="outline" 
                      className={`
                        ${exam.difficulty === 'Hard' ? 'text-red-400 border-red-400/30 bg-red-400/5' : 
                          exam.difficulty === 'Intermediate' ? 'text-amber-400 border-amber-400/30 bg-amber-400/5' : 
                          'text-green-400 border-green-400/30 bg-green-400/5'}
                      `}
                    >
                      {exam.difficulty}
                    </Badge>
                  </div>

                  <div className="space-y-4 mb-8 flex-1">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Files className="w-4 h-4 text-primary" />
                      <span>{exam.tests} Mock Tests</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <HelpCircle className="w-4 h-4 text-accent" />
                      <span>{exam.questions} Questions</span>
                    </div>
                  </div>

                  <Link href={href} className="w-full">
                    <Button className="w-full bg-white/5 hover:bg-primary border border-white/10 group-hover:border-primary transition-all rounded-xl h-12 gap-2">
                      Attempt Now
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="flex justify-center mt-10">
           <div className="flex gap-2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`h-1.5 rounded-full ${i === 0 ? 'w-8 bg-primary' : 'w-2 bg-white/10'}`} />
              ))}
           </div>
        </div>
      </div>
    </section>
  );
};
