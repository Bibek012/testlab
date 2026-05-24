
"use client";

import React, { useMemo } from "react";
import { Question, UserResponse } from "@/lib/mock-test-engine-data";
import { cn } from "@/lib/utils";

interface Props {
  questions: Question[];
  responses: Record<string, UserResponse>;
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export const QuestionPalette = React.memo(({ questions, responses, currentIndex, onNavigate }: Props) => {
  const stats = useMemo(() => {
    const counts = {
      answered: 0,
      notAnswered: 0,
      notVisited: 0,
      marked: 0,
      answeredMarked: 0,
    };

    questions.forEach(q => {
      const r = responses[q.id];
      const status = r?.status || 'not-visited';

      if (status === 'answered') counts.answered++;
      else if (status === 'not-answered') counts.notAnswered++;
      else if (status === 'marked-review') counts.marked++;
      else if (status === 'answered-marked-review') counts.answeredMarked++;
      else counts.notVisited++;
    });

    return counts;
  }, [questions, responses]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/50">
      {/* Legend */}
      <div className="p-4 grid grid-cols-2 gap-2 border-b border-white/5 bg-slate-900/80">
        <LegendItem color="bg-emerald-500" label="Answered" count={stats.answered} />
        <LegendItem color="bg-rose-500" label="Not Answered" count={stats.notAnswered} />
        <LegendItem color="bg-slate-700" label="Not Visited" count={stats.notVisited} />
        <LegendItem color="bg-indigo-500" label="Marked" count={stats.marked} />
      </div>

      <div className="p-4 bg-slate-900/50 text-[10px] font-bold uppercase tracking-widest text-primary/70">Question Selection</div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, i) => {
            const resp = responses[q.id];
            return (
              <PaletteButton 
                key={q.id}
                index={i}
                status={resp?.status || 'not-visited'}
                isActive={currentIndex === i}
                onClick={() => onNavigate(i)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
});
QuestionPalette.displayName = "QuestionPalette";

const LegendItem = ({ color, label, count }: { color: string, label: string, count: number }) => (
  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
    <div className={cn("w-5 h-5 rounded shrink-0", color)} />
    <span>{label} ({count})</span>
  </div>
);

const PaletteButton = React.memo(({ index, status, isActive, onClick }: { index: number, status: string, isActive: boolean, onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all border-2 relative",
        isActive ? "border-primary scale-110 z-10 shadow-[0_0_10px_rgba(99,102,241,0.3)]" : "border-transparent",
        status === 'answered' ? "bg-emerald-500 text-white" :
        status === 'not-answered' ? "bg-rose-500 text-white" :
        status === 'marked-review' ? "bg-indigo-500 text-white rounded-full" :
        status === 'answered-marked-review' ? "bg-indigo-500 text-white rounded-full border-emerald-400" :
        "bg-slate-700 text-slate-300"
      )}
    >
      {index + 1}
      {status === 'answered-marked-review' && (
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-slate-900" />
      )}
    </button>
  );
});
PaletteButton.displayName = "PaletteButton";
