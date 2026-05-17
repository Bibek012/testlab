
"use client";

import React from "react";
import { Trophy, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const ExamSidebar = () => {
  const trending = ["SSC CGL 2024", "RRB NTPC Phase 1", "IBPS Clerk Prelims", "BPSC 70th CCE"];

  return (
    <aside className="space-y-8">
      <Card className="glass border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-accent">
            <TrendingUp className="w-4 h-4" />
            <CardTitle className="text-sm font-headline font-bold uppercase tracking-widest">Trending Now</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {trending.map((item, i) => (
            <div key={i} className="flex items-center justify-between group cursor-pointer">
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{item}</span>
              <Badge variant="secondary" className="bg-white/5 text-[10px] px-2 py-0">Hot</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass border-white/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Trophy className="w-16 h-16 text-primary" />
        </div>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-primary">
            <Zap className="w-4 h-4" />
            <CardTitle className="text-sm font-headline font-bold uppercase tracking-widest">Top Performers</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Join 1,200+ students who cleared their exams last month using Testlab's specialized AI drills.
          </p>
        </CardContent>
      </Card>
    </aside>
  );
};
