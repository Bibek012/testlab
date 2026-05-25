"use client";

import React, { useMemo, useState, useEffect } from "react";
import { MockTestData, UserResponse } from "@/lib/mock-test-engine-data";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Target, Zap, ListTree, History, ChevronDown, Calendar } from "lucide-react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { SolutionInterface } from "./SolutionInterface";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";

interface Props {
  testData: MockTestData;
  responses: Record<string, UserResponse>;
  startTime: number;
  endTime: number;
  userLanguage: 'en' | 'hn';
  onReattempt: () => void;
  onViewSolutions: () => void;
  dashboardUrl?: string;
  history: any[];
  currentAttemptId: string;
  onModeChange?: (isSolutions: boolean) => void;
}

export const ResultPage = ({
  testData,
  responses,
  userLanguage,
  onReattempt,
  history,
  currentAttemptId,
  onModeChange,
  dashboardUrl
}: Props) => {
  const [viewMode, setViewMode] = useState<'stats' | 'solutions'>('stats');
  const { category, examId, mockId } = useParams();
  const router = useRouter();

  useEffect(() => {
    onModeChange?.(viewMode === 'solutions');
  }, [viewMode, onModeChange]);

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

  const currentAttempt = history?.find(h => h.id === currentAttemptId);
  const currentAttemptDate = currentAttempt?.completedAt?.toDate ? currentAttempt.completedAt.toDate() : null;

  if (viewMode === 'solutions') {
    return (
      <SolutionInterface
        testData={testData}
        responses={responses}
        userLanguage={userLanguage}
        onBack={() => setViewMode('stats')}
        history={history}
        currentAttemptId={currentAttemptId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1120] pb-24 animate-in fade-in duration-700">
      <div className="relative pt-32 pb-8 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 max-w-6xl mx-auto">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">
                <Trophy className="w-3 h-3" />
                Performance Report
              </div>
              <h1 className="text-3xl md:text-5xl font-headline font-bold">
                Attempt <span className="gradient-text">Analysis</span>
              </h1>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                {testData.title}
              </p>
            </div>

            {/* Compact Attempt Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="glass border-white/10 rounded-xl h-12 gap-3 px-5 hover:bg-white/5 group">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <History className="w-4 h-4" />
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase leading-none mb-1">Switch Attempt</p>
                    <p className="text-xs font-bold">{currentAttemptDate ? format(currentAttemptDate, "MMM dd, HH:mm") : 'Latest'}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[280px] glass border-white/10 p-1" align="end">
                {history?.map((h) => {
                  const date = h.completedAt?.toDate ? h.completedAt.toDate() : null;
                  return (
                    <Link
                      key={h.id}
                      href={`/exams/${category}/${examId}/mock/${mockId}/result/${h.id}`}
                    >
                      <DropdownMenuItem
                        className={cn(
                          "flex items-center justify-between py-3 px-4 cursor-pointer rounded-lg mb-1",
                          h.id === currentAttemptId
                            ? "bg-primary/20 text-primary"
                            : "hover:bg-white/5"
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-xs">
                            {date ? format(date, "MMM dd, yyyy") : "Recently"}
                          </span>
                          <span className="text-[10px] opacity-60">
                            {date ? format(date, "HH:mm") : ""}
                          </span>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-bold">
                            {Number(h.score || 0).toFixed(1)}
                          </div>
                          <div className="text-[9px] opacity-60">
                            {Number(h.accuracy || 0).toFixed(0)}% Acc
                          </div>
                        </div>
                      </DropdownMenuItem>
                    </Link>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 max-w-6xl mt-8 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <MetricCard label="Score" value={metrics.totalScore.toFixed(2)} color="text-foreground" />
          <MetricCard label="Accuracy" value={`${metrics.accuracy.toFixed(1)}%`} color="text-emerald-400" />
          <MetricCard label="Percentage" value={`${metrics.percentage}%`} color="text-indigo-400" />
          <MetricCard label="Correct" value={`${metrics.correct}/${metrics.totalQuestions}`} color="text-accent" />
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <Card className="glass border-white/10 p-8 lg:col-span-8">
            <CardHeader className="px-0 pt-0 pb-10">
              <CardTitle className="text-lg font-headline font-bold uppercase tracking-widest text-muted-foreground">Performance Breakdown</CardTitle>
            </CardHeader>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 'bold' }} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32}>
                    {chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="lg:col-span-4 space-y-6">
            <div className="p-8 bg-indigo-500/10 rounded-[2.5rem] border border-indigo-500/20 space-y-4">
              <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-widest">
                <Zap className="w-4 h-4 fill-current" /> AI Mastery Insight
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                "Your accuracy is trending upwards. To reach the next percentile, focus on reducing time spent on 'Unattempted' questions by practicing 5-minute timed drills."
              </p>
            </div>

            <div className="grid gap-3">
              <Button onClick={() => setViewMode('solutions')} className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-bold uppercase tracking-widest text-xs gap-2 shadow-xl shadow-primary/20">
                <ListTree className="w-4 h-4" /> View Detailed Solutions
              </Button>
              <Button onClick={onReattempt} variant="outline" className="w-full h-14 rounded-2xl border-white/10 font-bold uppercase tracking-widest text-xs hover:bg-white/5">
                Reattempt Test
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function MetricCard({ label, value, color }: { label: string, value: string | number, color: string }) {
  return (
    <Card className="glass border-white/10 p-6 space-y-1 group hover:border-primary/30 transition-all text-center md:text-left">
      <div className={cn("text-2xl md:text-3xl font-bold font-headline", color)}>{value}</div>
      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{label}</p>
    </Card>
  );
}
