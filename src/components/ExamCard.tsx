
"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Files, HelpCircle, ArrowRight } from "lucide-react";
import { Exam } from "@/lib/exam-data";

export const ExamCard = ({ exam }: { exam: Exam }) => {
  return (
    <div className="group relative p-8 rounded-2xl bg-card border border-white/10 hover:border-primary/50 transition-all duration-300 overflow-hidden glow-hover">
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

      <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
        {exam.description}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Files className="w-4 h-4 text-primary" />
          <span>{exam.tests} Mocks</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HelpCircle className="w-4 h-4 text-accent" />
          <span>{exam.questions} Qs</span>
        </div>
      </div>

      <Button className="w-full bg-white/5 hover:bg-primary border border-white/10 group-hover:border-primary transition-all rounded-xl h-12 gap-2">
        Start Preparation
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Button>

      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
    </div>
  );
};
