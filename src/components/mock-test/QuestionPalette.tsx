
"use client";

import React from "react";
import { Question, UserResponse } from "@/lib/mock-test-engine-data";
import { cn } from "@/lib/utils";

interface Props {
  questions: Question[];
  responses: Record<string, UserResponse>;
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export const QuestionPalette = ({ questions, responses, currentIndex, onNavigate }: Props) => {
  const stats = {
    answered: Object.values(responses).filter(r => r.status === 'answered' || r.status === 'answered-marked-review').length,
    notAnswered: Object.values(responses).filter(r => r.status === 'not-answered').length,
    notVisited: Object.values(responses).filter(r => r.status === 'not-visited').length,
    marked: Object.values(responses).filter(r => r.status === 'marked-review').length,
    answeredMarked: Object.values(responses).filter(r => r.status === 'answered-marked-review').length,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Legend */}
      <div className="p-4 grid grid-cols-2 gap-2 border-b border-white/5">
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
          <div className="w-5 h-5 rounded bg-emerald-500 shrink-0" />
          <span>Answered ({stats.answered})</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
          <div className="w-5 h-5 rounded bg-rose-500 shrink-0" />
          <span>Not Answered ({stats.notAnswered})</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
          <div className="w-5 h-5 rounded bg-slate-700 shrink-0" />
          <span>Not Visited ({stats.notVisited})</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
          <div className="w-5 h-5 rounded bg-indigo-500 shrink-0" />
          <span>Marked ({stats.marked})</span>
        </div>
      </div>

      <div className="p-4 bg-slate-900/50 text-[10px] font-bold uppercase tracking-widest text-primary">Question Selection</div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, i) => {
            const resp = responses[q.id];
            return (
              <button
                key={q.id}
                onClick={() => onNavigate(i)}
                className={cn(
                  "h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all border-2 relative",
                  currentIndex === i ? "border-primary scale-110 z-10" : "border-transparent",
                  resp.status === 'answered' ? "bg-emerald-500 text-white" :
                  resp.status === 'not-answered' ? "bg-rose-500 text-white" :
                  resp.status === 'marked-review' ? "bg-indigo-500 text-white rounded-full" :
                  resp.status === 'answered-marked-review' ? "bg-indigo-500 text-white rounded-full border-emerald-400" :
                  "bg-slate-700 text-slate-300"
                )}
              >
                {i + 1}
                {resp.status === 'answered-marked-review' && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-slate-900" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
