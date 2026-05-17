
"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin } from "lucide-react";
import { State } from "@/lib/exam-data";

export const StateCard = ({ state }: { state: State }) => {
  return (
    <Link 
      href={`/exams/state/${state.slug}`}
      className="group relative p-1 rounded-2xl bg-gradient-to-br from-white/10 to-transparent hover:from-primary/50 hover:to-accent/50 transition-all duration-500 block"
    >
      <div className="bg-card rounded-[calc(1rem-4px)] p-8 h-full flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center font-headline font-bold text-2xl text-accent border border-white/10">
              {state.code}
            </div>
            <Badge variant="outline" className="bg-white/5 border-white/10 text-muted-foreground">
              {state.examCount} Exams
            </Badge>
          </div>
          <h3 className="text-2xl font-headline font-bold mb-2">{state.name}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
            <MapPin className="w-3 h-3" />
            Specialized Preparation
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-4 transition-all">
          Browse State Exams <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
};
