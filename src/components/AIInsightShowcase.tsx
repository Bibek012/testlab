
"use client";

import React from "react";
import { BrainCircuit, Sparkles, TrendingUp, Lightbulb, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const AIInsightShowcase = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold tracking-wider uppercase">
              <Sparkles className="w-4 h-4" />
              AI Powered Insights
            </div>
            <h2 className="text-4xl lg:text-5xl font-headline font-bold leading-tight">
              Identify Your <span className="text-accent">Gaps</span> With AI Analytics
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Our advanced AI Analyst interprets your mock test data to pinpoint exactly where you lose marks. 
              Get hyper-personalized recommendations on study material and strategy.
            </p>
            
            <ul className="space-y-4">
              {[
                "Pinpoint weak topics in real-time",
                "Personalized practice module suggestions",
                "Time-management optimization strategies",
                "Percentile ranking benchmarks against millions"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-medium">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-full px-8">
              Try AI Analysis
            </Button>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative">
              {/* Glass AI Card */}
              <Card className="glass border-white/20 p-8 rounded-[2rem] shadow-2xl relative z-10 overflow-hidden group">
                <div className="absolute top-0 right-0 p-6">
                  <BrainCircuit className="w-12 h-12 text-accent opacity-20 group-hover:opacity-40 transition-opacity" />
                </div>
                
                <CardContent className="p-0 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                      AI
                    </div>
                    <div>
                      <h4 className="font-bold">Insight Analyst</h4>
                      <p className="text-xs text-muted-foreground">Active Analysis • SSC CGL Mock 12</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase mb-2">
                        <TrendingUp className="w-3 h-3" />
                        Critical Gap Found
                      </div>
                      <p className="text-sm font-medium">"Algebraic Identities" accuracy is below 45%. Review the Level-2 Module for significant score boost.</p>
                    </div>

                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase mb-2">
                        <Lightbulb className="w-3 h-3" />
                        Strategy Suggestion
                      </div>
                      <p className="text-sm font-medium">You spend 40s more than average on DI sets. Practice 5-minute drills to improve speed by 15%.</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">Estimated Rank Improvement</div>
                    <div className="text-lg font-bold font-headline text-accent">+2,450 Ranks</div>
                  </div>
                </CardContent>
              </Card>

              {/* Background decorative elements */}
              <div className="absolute -top-12 -left-12 w-64 h-64 bg-primary/30 rounded-full blur-[100px] -z-10 animate-pulse-slow" />
              <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-accent/30 rounded-full blur-[100px] -z-10 animate-pulse-slow" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
