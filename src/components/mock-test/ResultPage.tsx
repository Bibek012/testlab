
"use client";

import React from "react";
import { MockTestData, UserResponse } from "@/lib/mock-test-engine-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, CheckCircle, XCircle, Clock, Target, ArrowLeft, RotateCcw, BarChart3, PieChart } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart as RePieChart, Pie
} from "recharts";
import Link from "next/link";

interface Props {
  testData: MockTestData;
  responses: Record<string, UserResponse>;
  startTime: number;
  endTime: number;
  userLanguage: 'en' | 'hn';
}

export const ResultPage = ({ testData, responses, startTime, endTime, userLanguage }: Props) => {
  const totalQuestions = testData.questions.length;
  let correct = 0;
  let incorrect = 0;
  let unattempted = 0;
  let totalScore = 0;

  testData.questions.forEach(q => {
    const resp = responses[q.id];
    if (resp.selectedOptionId === q.answer) {
      correct++;
      totalScore += q.marks;
    } else if (resp.selectedOptionId) {
      incorrect++;
      totalScore -= q.negativeMarks;
    } else {
      unattempted++;
    }
  });

  const timeTaken = Math.floor((endTime - startTime) / 1000);
  const accuracy = correct + incorrect > 0 ? (correct / (correct + incorrect)) * 100 : 0;

  const data = [
    { name: 'Correct', value: correct, color: '#10b981' },
    { name: 'Incorrect', value: incorrect, color: '#f43f5e' },
    { name: 'Unattempted', value: unattempted, color: '#64748b' },
  ];

  return (
    <div className="min-h-screen bg-[#0b1120] pb-24">
      <div className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-accent/20 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest">
            <Trophy className="w-4 h-4" />
            Mock Test Completed
          </div>
          <h1 className="text-4xl md:text-6xl font-headline font-bold">Analysis & <span className="gradient-text">Performance</span></h1>
          <p className="text-muted-foreground max-w-xl mx-auto">Great job completing the mock test! Review your detailed analytics below to identify your learning gaps.</p>
        </div>
      </div>

      <div className="container mx-auto px-6 max-w-6xl space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <ResultStatCard title="Total Score" value={totalScore.toFixed(2)} icon={Target} color="primary" />
          <ResultStatCard title="Accuracy" value={`${accuracy.toFixed(1)}%`} icon={CheckCircle} color="emerald-400" />
          <ResultStatCard title="Time Taken" value={`${Math.floor(timeTaken/60)}m ${timeTaken%60}s`} icon={Clock} color="accent" />
          <ResultStatCard title="Attempted" value={`${correct + incorrect}/${totalQuestions}`} icon={BarChart3} color="indigo-400" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="glass border-white/10 p-8 col-span-2">
            <CardHeader className="px-0 pt-0 pb-8 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-headline font-bold">Question Distribution</CardTitle>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-400"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Correct</div>
                <div className="flex items-center gap-2 text-xs font-medium text-rose-400"><div className="w-3 h-3 rounded-full bg-rose-500" /> Wrong</div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><div className="w-3 h-3 rounded-full bg-slate-500" /> Skipped</div>
              </div>
            </CardHeader>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ left: -20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={40}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="glass border-white/10 p-8">
            <CardTitle className="text-xl font-headline font-bold mb-8">Quick Action</CardTitle>
            <div className="space-y-4">
               <Button className="w-full bg-primary h-12 rounded-xl font-bold shadow-lg shadow-primary/20">
                 Review All Questions
               </Button>
               <Button variant="outline" className="w-full h-12 rounded-xl border-white/10 hover:bg-white/5 font-bold">
                 <RotateCcw className="w-4 h-4 mr-2" />
                 Attempt Again
               </Button>
               <Link href="/" className="block">
                 <Button variant="ghost" className="w-full h-12 rounded-xl text-muted-foreground font-bold">
                   Go to Dashboard
                 </Button>
               </Link>
            </div>
            
            <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/10 text-center space-y-2">
               <PieChart className="w-8 h-8 text-accent mx-auto mb-2" />
               <p className="text-xs text-muted-foreground leading-relaxed italic">
                 "You are stronger in {testData.sections[0].title[userLanguage]} than average students. Focus on speed in {testData.sections[1].title[userLanguage]}."
               </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const ResultStatCard = ({ title, value, icon: Icon, color }: any) => (
  <Card className="glass border-white/10 p-6 space-y-3 relative overflow-hidden group">
    <div className={`absolute top-0 right-0 p-4 opacity-5 text-${color} group-hover:opacity-20 transition-opacity`}>
      <Icon className="w-16 h-16" />
    </div>
    <div className={`p-2 rounded-lg bg-${color}/10 text-${color} inline-block`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <div className="text-2xl font-bold font-headline">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{title}</div>
    </div>
  </Card>
);
