"use client";

import React, { useMemo, useState } from "react";
import { MockTestData, UserResponse } from "@/lib/mock-test-engine-data";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, CheckCircle, Target, BookOpen, Zap, Loader2, ListTree } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { SolutionInterface } from "./SolutionInterface";

interface Props {
  testData: MockTestData;
  responses: Record<string, UserResponse>;
  startTime: number;
  endTime: number;
  userLanguage: 'en' | 'hn';
  onReattempt: () => void;
  onViewSolutions: () => void;
  dashboardUrl?: string;
}

export const ResultPage = ({
  testData,
  responses,
  userLanguage,
  onReattempt,
}: Props) => {
  const [viewMode, setViewMode] = useState<'stats' | 'solutions'>('stats');

  const metrics = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let totalScore = 0;
    let maxPossibleScore = 0;

    (testData.questions || []).forEach(q => {
      const resp = responses[q.id];
      const selectedId = resp?.selectedOptionId ? String(resp.selectedOptionId) : null;
      const correctId = String(q.correctOptionId);
      
      const pos = Number(testData.marksPerQuestion ?? 1);
      const neg = Number(testData.negativeMarks ?? 0);

      maxPossibleScore += pos;

      const isSkipped = !selectedId;
      const isCorrect = !isSkipped && selectedId === correctId;
      const isWrong = !isSkipped && !isCorrect;

      if (isCorrect) {
        correct++;
        totalScore += pos;
      } else if (isWrong) {
        incorrect++;
        totalScore -= neg;
      }
    });

    const accuracy = (correct + incorrect > 0) ? (correct / (correct + incorrect)) * 100 : 0;
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

    return {
      correct,
      incorrect,
      unattempted: testData.questions.length - (correct + incorrect),
      totalScore,
      maxPossibleScore,
      accuracy,
      percentage: percentage.toFixed(1),
      totalQuestions: testData.questions.length,
    };
  }, [testData, responses]);

  const chartData = [
    { name: 'Correct', value: metrics.correct, color: '#10b981' },
    { name: 'Wrong', value: metrics.incorrect, color: '#f43f5e' },
    { name: 'Skipped', value: metrics.unattempted, color: '#64748b' },
  ];

  if (viewMode === 'solutions') {
    return (
      <SolutionInterface 
        testData={testData} 
        responses={responses} 
        userLanguage={userLanguage} 
        onBack={() => setViewMode('stats')} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1120] pb-24 animate-in fade-in duration-700">
      <div className="relative pt-32 pb-12 overflow-hidden border-b border-white/5">
        <div className="container mx-auto px-6 flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-2xl">
            <Trophy className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-headline font-bold">Attempt <span className="gradient-text">Analysis</span></h1>
            <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
              {testData.title}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 max-w-6xl mt-12 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="glass border-white/10 p-6 space-y-2">
            <div className="text-3xl font-bold font-headline">{metrics.totalScore.toFixed(2)}</div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Score Obtained</p>
          </Card>
          <Card className="glass border-white/10 p-6 space-y-2">
            <div className="text-3xl font-bold font-headline text-emerald-400">{metrics.accuracy.toFixed(1)}%</div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Accuracy</p>
          </Card>
          <Card className="glass border-white/10 p-6 space-y-2">
            <div className="text-3xl font-bold font-headline text-indigo-400">{metrics.percentage}%</div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Percentage</p>
          </Card>
          <Card className="glass border-white/10 p-6 space-y-2">
            <div className="text-3xl font-bold font-headline text-accent">{metrics.correct}/{metrics.totalQuestions}</div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Correct Answers</p>
          </Card>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <Card className="glass border-white/10 p-8 lg:col-span-8">
            <CardHeader className="px-0 pt-0 pb-10">
              <CardTitle className="text-xl font-headline font-bold uppercase tracking-widest">Question Breakdown</CardTitle>
            </CardHeader>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={40}>
                    {chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="lg:col-span-4 space-y-6">
            <div className="p-8 bg-indigo-500/10 rounded-[2.5rem] border border-indigo-500/20 space-y-4">
              <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-widest">
                <Zap className="w-4 h-4 fill-current" /> Mastery Insight
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                "Based on this attempt, your accuracy is highest in the starting modules. Focus on speed in the final sections to improve your overall ranking."
              </p>
            </div>
            
            <div className="grid gap-3">
              <Button onClick={() => setViewMode('solutions')} className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-bold uppercase tracking-widest text-xs gap-2">
                <ListTree className="w-4 h-4" /> View Detailed Solutions
              </Button>
              <Button onClick={onReattempt} variant="outline" className="w-full h-14 rounded-2xl border-white/10 font-bold uppercase tracking-widest text-xs">
                Fresh Reattempt
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};