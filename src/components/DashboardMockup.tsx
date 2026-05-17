
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Target, Zap, Clock, Star } from "lucide-react";

export const DashboardMockup = () => {
  return (
    <div className="relative w-full max-w-2xl mx-auto perspective-1000">
      <div className="relative glass rounded-2xl overflow-hidden border border-white/20 shadow-3xl transform rotate-y-[-5deg] rotate-x-[5deg] animate-float">
        <div className="bg-white/5 border-b border-white/10 p-4 flex items-center justify-between">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/50" />
          </div>
          <div className="text-xs text-muted-foreground font-mono">TESTLAB ANALYTICS ENGINE v4.2</div>
          <div className="flex gap-4">
             <div className="w-4 h-4 rounded-full bg-primary/20" />
          </div>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          <Card className="bg-white/5 border-white/10 col-span-2">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Weekly Progress</CardTitle>
                <Badge variant="secondary" className="bg-accent/20 text-accent border-accent/20">
                  Top 2% Ranked
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-32">
                {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                  <div 
                    key={i} 
                    className="flex-1 bg-gradient-to-t from-primary to-accent rounded-t-sm transition-all duration-1000 hover:opacity-80 cursor-pointer" 
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-headline">94.8%</div>
                  <div className="text-[10px] text-muted-foreground">Accuracy Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-headline">42m</div>
                  <div className="text-[10px] text-muted-foreground">Avg Test Time</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="col-span-2 space-y-3 pt-2">
             <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Active Test Modules</div>
             {[
               { name: "Quantitative Aptitude", progress: 85, status: "In Progress" },
               { name: "Reasoning & Logic", progress: 62, status: "Practice" },
               { name: "General Awareness", progress: 91, status: "Complete" }
             ].map((test, i) => (
               <div key={i} className="flex items-center gap-4 bg-white/5 p-3 rounded-lg border border-white/5">
                 <div className="flex-1">
                    <div className="text-xs font-semibold">{test.name}</div>
                    <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
                       <div className="bg-primary h-full rounded-full" style={{ width: `${test.progress}%` }} />
                    </div>
                 </div>
                 <div className="text-[10px] font-mono text-accent">{test.progress}%</div>
               </div>
             ))}
          </div>
        </div>
      </div>
      
      {/* Decorative floating elements */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl animate-pulse-slow" />
    </div>
  );
};
