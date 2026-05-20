"use client";

import React, { useMemo, useEffect, useState, useRef } from "react";
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
  const saveInitiated = useRef(false);

  // DETERMINISTIC SCORING ENGINE
  const metrics = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    let totalScore = 0;
    let maxPossibleScore = 0;
    const analysis: any[] = [];

    testData.questions.forEach(q => {
      const resp = responses[q.id];
      // Priority: Question-level marks > Mock-level marks > Defaults
      const pos = q.marks?.positive ?? testData.marksPerQuestion ?? 1;
      const neg = q.marks?.negative ?? testData.negativeMarks ?? 0.33;
      const skip = q.marks?.skip ?? 0;

      maxPossibleScore += pos;

      const isCorrect = resp?.selectedOptionId === q.answer;
      const isWrong = resp?.selectedOptionId !== null && !isCorrect;
      let marksAwarded = 0;

      if (isCorrect) {
        correct++;
        totalScore += pos;
        marksAwarded = pos;
      } else if (isWrong) {
        incorrect++;
        totalScore -= neg;
        marksAwarded = -neg;
      } else {
        unattempted++;
        totalScore += skip;
        marksAwarded = skip;
      }

      analysis.push({
        questionId: q.id,
        selectedAnswer: resp?.selectedOptionId || null,
        correctAnswer: q.answer,
        isCorrect,
        isWrong,
        marksAwarded,
        timeTaken: resp?.timeSpentSeconds || 0
      });
    });

    const timeTaken = Math.floor((endTime - startTime) / 1000);
    const accuracy = (correct + incorrect > 0) ? (correct / (correct + incorrect)) * 100 : 0;
    const percentage = (totalScore / (maxPossibleScore || 1)) * 100;

    return { 
      correct, 
      incorrect, 
      unattempted, 
      totalScore, 
      maxPossibleScore,
      timeTaken, 
      accuracy, 
      percentage,
      totalQuestions: testData.questions.length,
      questionAnalysis: analysis
    };
  }, [testData, responses, startTime, endTime]);

  // Unified Persistence Logic
  useEffect(() => {
    const saveResult = async () => {
      if (user && db && !saveInitiated.current) {
        saveInitiated.current = true;
        setIsSaving(true);
        try {
          await addDoc(collection(db, 'attempts'), {
            uid: user.uid,
            mockId: testData.id,
            examId: testData.examId || 'unmapped',
            examName: testData.examName || 'Mock Test',
            
            totalQuestions: metrics.totalQuestions,
            attempted: metrics.correct + metrics.incorrect,
            correct: metrics.correct,
            wrong: metrics.incorrect,
            unattempted: metrics.unattempted,
            
            score: metrics.totalScore,
            totalMarks: metrics.maxPossibleScore,
            accuracy: metrics.accuracy,
            percentage: metrics.percentage,
            
            timeTakenSeconds: metrics.timeTaken,
            completedAt: serverTimestamp(),
            userLanguage,
            
            questionAnalysis: metrics.questionAnalysis,
            rawResponses: responses
          });
          console.log("ResultEngine: Analytics synchronized.");
        } catch (error) {
          console.error("ResultEngine: Persistence failure", error);
          saveInitiated.current = false;
        } finally {
          setIsSaving(false);
        }
      }
    };
    saveResult();
  }, [user, db, testData.id, metrics, responses]);

  const chartData = [
    { name: 'Correct', value: metrics.correct, color: '#10b981' },
    { name: 'Incorrect', value: metrics.incorrect, color: '#f43f5e' },
    { name: 'Skipped', value: metrics.unattempted, color: '#64748b' },
  ];

  return (
    <div className="min-h-screen bg-[#0b1120] pb-24 animate-in fade-in duration-700">
      <div className="relative pt-24 pb-12 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-accent/20 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-6 flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-2xl animate-float">
            <Trophy className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-3">
              <h1 className="text-3xl md:text-5xl font-headline font-bold">Analysis <span className="gradient-text">Report</span></h1>
              {isSaving && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
            </div>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto uppercase tracking-widest font-bold">
              Test Completed: <span className="text-foreground">{testData.title}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 max-w-6xl mt-12 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="glass border-white/10 p-6 space-y-3 relative overflow-hidden">
             <Target className="absolute -top-1 -right-1 w-16 h-16 opacity-5 text-primary" />
             <div className="text-3xl font-bold font-headline">{metrics.totalScore.toFixed(2)}</div>
             <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Score / {metrics.maxPossibleScore}</p>
          </Card>
          <Card className="glass border-white/10 p-6 space-y-3 relative overflow-hidden">
             <CheckCircle className="absolute -top-1 -right-1 w-16 h-16 opacity-5 text-emerald-400" />
             <div className="text-3xl font-bold font-headline text-emerald-400">{metrics.accuracy.toFixed(1)}%</div>
             <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Precision</p>
          </Card>
          <Card className="glass border-white/10 p-6 space-y-3 relative overflow-hidden">
             <TrendingUp className="absolute -top-1 -right-1 w-16 h-16 opacity-5 text-indigo-400" />
             <div className="text-3xl font-bold font-headline text-indigo-400">{metrics.percentage.toFixed(1)}%</div>
             <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Percentile</p>
          </Card>
          <Card className="glass border-white/10 p-6 space-y-3 relative overflow-hidden">
             <Clock className="absolute -top-1 -right-1 w-16 h-16 opacity-5 text-accent" />
             <div className="text-3xl font-bold font-headline text-accent">{(metrics.timeTaken / 60).toFixed(1)}m</div>
             <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Pace</p>
          </Card>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <Card className="glass border-white/10 p-8 lg:col-span-8">
            <CardHeader className="px-0 pt-0 pb-10">
              <CardTitle className="text-xl font-headline font-bold uppercase tracking-widest">Performance Metrics</CardTitle>
            </CardHeader>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 'bold' }} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={45}>
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
              <CardTitle className="text-lg font-headline font-bold mb-6">Review Action Center</CardTitle>
              <div className="space-y-3">
                <Button onClick={onViewSolutions} className="w-full bg-primary hover:bg-primary/90 h-14 rounded-2xl font-bold gap-3 shadow-lg shadow-primary/20">
                  <BookOpen className="w-5 h-5" /> View Step Solutions
                </Button>
                <Button variant="outline" onClick={onReattempt} className="w-full h-14 rounded-2xl border-white/10 hover:bg-white/5 font-bold gap-3">
                  <RotateCcw className="w-5 h-5" /> Retake Test
                </Button>
                <Link href={dashboardUrl} className="block">
                  <Button variant="ghost" className="w-full h-14 rounded-2xl text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
                    Return to Exam Dashboard
                  </Button>
                </Link>
              </div>
            </Card>
            
            <div className="p-8 bg-gradient-to-br from-indigo-500/10 to-accent/10 rounded-[2.5rem] border border-white/10 space-y-4">
               <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-[0.2em]">
                 <Zap className="w-4 h-4 fill-current" /> AI Lab Insights
               </div>
               <p className="text-xs text-muted-foreground leading-relaxed italic">
                 "You are dominating {testData.examName}. To hit the 95th percentile, reduce time spent on 'Easy' difficulty items by approximately <span className="text-white font-bold">12 seconds</span> each."
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
