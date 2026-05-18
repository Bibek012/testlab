
"use client";

import React, { useMemo, useEffect, useState } from "react";
import { MockTestData, UserResponse } from "@/lib/mock-test-engine-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, CheckCircle, Clock, Target, RotateCcw, BookOpen, Zap, TrendingUp, Loader2 } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import Link from "next/link";
import { useUser, useFirestore } from "@/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

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
  startTime, 
  endTime, 
  userLanguage, 
  onReattempt, 
  onViewSolutions,
  dashboardUrl = "/"
}: Props) => {
  const { user } = useUser();
  const db = useFirestore();
  const [isSaving, setIsSaving] = useState(false);

  const metrics = useMemo(() => {
    const totalQuestions = testData.questions.length;
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    let totalScore = 0;

    testData.questions.forEach(q => {
      const resp = responses[q.id];
      if (resp?.selectedOptionId === q.answer) {
        correct++;
        totalScore += q.marks;
      } else if (resp?.selectedOptionId) {
        incorrect++;
        totalScore -= q.negativeMarks;
      } else {
        unattempted++;
      }
    });

    const timeTaken = Math.floor((endTime - startTime) / 1000);
    const accuracy = correct + incorrect > 0 ? (correct / (correct + incorrect)) * 100 : 0;
    const percentile = 84.5; 

    return { correct, incorrect, unattempted, totalScore, timeTaken, accuracy, totalQuestions, percentile };
  }, [testData, responses, startTime, endTime]);

  // Persist result to Firestore
  useEffect(() => {
    const saveResult = async () => {
      if (user && db && !isSaving) {
        setIsSaving(true);
        try {
          await addDoc(collection(db, 'attempts'), {
            uid: user.uid,
            testId: testData.id,
            examId: testData.examName,
            score: metrics.totalScore,
            correctCount: metrics.correct,
            incorrectCount: metrics.incorrect,
            unattemptedCount: metrics.unattempted,
            accuracy: metrics.accuracy,
            timeTakenSeconds: metrics.timeTaken,
            completedAt: serverTimestamp(),
            responses: responses
          });
        } catch (error) {
          console.error("Error saving result:", error);
        }
      }
    };
    saveResult();
  }, [user, db, testData.id, metrics, responses]);

  const chartData = [
    { name: 'Correct', value: metrics.correct, color: '#10b981' },
    { name: 'Incorrect', value: metrics.incorrect, color: '#f43f5e' },
    { name: 'Unattempted', value: metrics.unattempted, color: '#64748b' },
  ];

  const sectionData = useMemo(() => {
    return testData.sections.map(sec => {
      const secQs = testData.questions.filter(q => q.sectionId === sec.id);
      let secCorrect = 0;
      let secIncorrect = 0;
      secQs.forEach(q => {
        const resp = responses[q.id];
        if (resp?.selectedOptionId === q.answer) secCorrect++;
        else if (resp?.selectedOptionId) secIncorrect++;
      });
      return { 
        name: sec.title[userLanguage], 
        correct: secCorrect, 
        incorrect: secIncorrect,
        accuracy: (secCorrect + secIncorrect > 0) ? (secCorrect / (secCorrect + secIncorrect) * 100).toFixed(0) : 0
      };
    });
  }, [testData, responses, userLanguage]);

  return (
    <div className="min-h-screen bg-[#0b1120] pb-24">
      {/* Header with Save Status */}
      <div className="relative pt-24 pb-12 overflow-hidden border-b border-white/5">
        <div className="absolute top-0 left-0 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-accent/20 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-6 flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-2xl shadow-primary/20">
            <Trophy className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-3xl md:text-5xl font-headline font-bold">Analysis <span className="gradient-text">Report</span></h1>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Test Completed: <span className="text-foreground font-bold">{testData.title}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 max-w-6xl mt-12 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <ResultStatCard title="Overall Score" value={metrics.totalScore.toFixed(2)} icon={Target} color="primary" trend="+12%" />
          <ResultStatCard title="Accuracy" value={`${metrics.accuracy.toFixed(1)}%`} icon={CheckCircle} color="emerald-400" />
          <ResultStatCard title="Percentile" value={`${metrics.percentile}%`} icon={TrendingUp} color="indigo-400" />
          <ResultStatCard title="Speed" value={`${(metrics.timeTaken / metrics.totalQuestions).toFixed(1)}s/q`} icon={Clock} color="accent" />
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <Card className="glass border-white/10 p-6 lg:col-span-8">
            <CardHeader className="px-0 pt-0 pb-8 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-headline font-bold">Performance Breakdown</CardTitle>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Correct</div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400"><div className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Incorrect</div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><div className="w-2.5 h-2.5 rounded-full bg-slate-500" /> Skipped</div>
              </div>
            </CardHeader>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: -20, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={45}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="lg:col-span-4 space-y-6">
            <Card className="glass border-white/10 p-6">
              <CardTitle className="text-lg font-headline font-bold mb-6">Action Center</CardTitle>
              <div className="space-y-3">
                <Button onClick={onViewSolutions} className="w-full bg-primary h-12 rounded-xl font-bold shadow-lg shadow-primary/20 gap-2">
                  <BookOpen className="w-4 h-4" /> Review Test
                </Button>
                <Button variant="outline" onClick={onReattempt} className="w-full h-12 rounded-xl border-white/10 hover:bg-white/5 font-bold gap-2">
                  <RotateCcw className="w-4 h-4" /> Reattempt Test
                </Button>
                <Link href={dashboardUrl} className="block">
                  <Button variant="ghost" className="w-full h-12 rounded-xl text-muted-foreground font-bold">
                    Return to Dashboard
                  </Button>
                </Link>
              </div>
            </Card>

            <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-accent/10 rounded-3xl border border-white/10 space-y-4">
               <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase">
                 <Zap className="w-4 h-4 fill-current" /> AI Analytics Insight
               </div>
               <p className="text-xs text-muted-foreground leading-relaxed italic">
                 "Your accuracy in <span className="text-emerald-400">{sectionData[0]?.name || 'Math'}</span> is impressive! Your cloud-synced profile is ready for advanced level drills."
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ResultStatCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <Card className="glass border-white/10 p-6 space-y-3 relative overflow-hidden group">
    <div className={`absolute top-0 right-0 p-4 opacity-5 text-${color} group-hover:opacity-20 transition-opacity`}>
      <Icon className="w-16 h-16" />
    </div>
    <div className={`p-2 rounded-lg bg-${color}/10 text-${color} inline-block`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="relative">
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold font-headline">{value}</div>
        {trend && <span className="text-[10px] text-emerald-400 font-bold">{trend}</span>}
      </div>
      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{title}</div>
    </div>
  </Card>
);
