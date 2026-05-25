
"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Files, HelpCircle, ArrowRight } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";

interface ExamCardProps {
  exam: any; // Using dynamic type for Firestore data
  categorySlug: string;
  stateSlug?: string;
}

const formatCompactNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace('.0', '') + 'M+';
  }

  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace('.0', '') + 'K+';
  }

  return String(num);
};

export const ExamCard = ({ exam, categorySlug, stateSlug }: ExamCardProps) => {
  const db = useFirestore();

  // Dynamically fetch mocks for this exam to calculate accurate statistics
  const mocksQuery = useMemoFirebase(() => 
    db ? query(
      collection(db, "mockTests"), 
      where("examId", "==", exam.id),
      where("status", "==", "Published")
    ) : null, 
  [db, exam.id]);

  const { data: mocks } = useCollection<any>(mocksQuery);

  const totalMocks = mocks?.length || 0;
  const totalQuestions = useMemo(() => {
    return mocks?.reduce(
      (sum, mock) => sum + (mock.totalQuestions || mock.questions?.length || 0),
      0
    ) || 0;
  }, [mocks]);

  const examSlug = exam.slug || exam.id;
  const href = stateSlug 
    ? `/exams/state/${stateSlug}/${examSlug}`
    : `/exams/${categorySlug}/${examSlug}`;

  return (
    <Link href={href} className="block group">
      <div className="relative p-8 rounded-2xl bg-card border border-white/10 hover:border-primary/50 transition-all duration-300 overflow-hidden glow-hover h-full flex flex-col">
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
            {exam.difficulty || 'Intermediate'}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground mb-8 leading-relaxed flex-1">
          {exam.description}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Files className="w-4 h-4 text-primary" />
            <span>{totalMocks} Mocks</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HelpCircle className="w-4 h-4 text-accent" />
            <span>{formatCompactNumber(totalQuestions)} Qs</span>
          </div>
        </div>

        <div className="w-full bg-white/5 group-hover:bg-primary text-foreground group-hover:text-white border border-white/10 group-hover:border-primary transition-all rounded-xl h-12 flex items-center justify-center gap-2 font-medium">
          Start Preparation
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>

        <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
      </div>
    </Link>
  );
};
