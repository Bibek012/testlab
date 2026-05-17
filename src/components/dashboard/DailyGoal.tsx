
"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Target, Flame, Timer } from "lucide-react";

export const DailyGoal = () => {
  const goal = 50;
  const solved = 32;
  const progress = (solved / goal) * 100;

  return (
    <Card className="glass border-white/10 overflow-hidden relative">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
      <CardContent className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Daily Goal</h4>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Questions Target</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            <Flame className="w-4 h-4 fill-current" />
            <span className="text-xs font-bold">12 Day Streak</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-2xl font-bold font-headline">{solved} <span className="text-muted-foreground text-sm font-normal">/ {goal} solved</span></span>
            <span className="text-xs font-bold text-primary">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Timer className="w-3 h-3" /> 1h 20m today
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Zap className="w-3 h-3 text-accent" /> +150 XP earned
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
