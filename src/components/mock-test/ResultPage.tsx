"use client";

import React, { useMemo, useEffect, useState, useRef } from "react";
import { MockTestData, UserResponse } from "@/lib/mock-test-engine-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, CheckCircle, Clock, Target, RotateCcw, BookOpen, Zap, TrendingUp, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
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

  // CRITICAL: UNIFIED SCORING ENGINE
  const metrics = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    let totalScore = 0;
    let maxPossibleScore = 0;
    const analysis: any[] = [];

    (testData.questions || []).forEach(q => {
      const resp = responses[q.id];
      const selectedId = (resp?.selectedOptionId !== null && resp?.selectedOptionId !== undefined)
        ? Number(resp.selectedOptionId)
        : null;

      const correctId = Number(q.correctOptionId);
      console.log(correctId)
      const pos = Number(testData.marksPerQuestion ?? 1);
      const neg = Number(testData.negativeMarks ?? 0);
      const skipPenalty = Number(q.marks?.skip ?? 0);

      maxPossibleScore += pos;

      const isSkipped = selectedId === null || isNaN(selectedId);
      const isCorrect = !isSkipped && selectedId === correctId;
      const isWrong = !isSkipped && !isCorrect;

      let awarded = 0;
      if (isCorrect) {
        correct++;
        totalScore += pos;
        awarded = pos;
      } else if (isWrong) {
        incorrect++;
        totalScore -= neg;
        awarded = -neg;
      } else {
        unattempted++;
        totalScore += skipPenalty;
        awarded = skipPenalty;
      }

      analysis.push({
        questionId: q.id,
        selectedAnswer: selectedId,
        correctAnswer: correctId,
        isCorrect,
        isWrong,
        marksAwarded: awarded,
        timeTaken: resp?.timeSpentSeconds || 0
      });
    });

    const timeTaken = Math.floor((endTime - startTime) / 1000);
    const accuracy = (correct + incorrect > 0) ? (correct / (correct + incorrect)) * 100 : 0;
    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

    return {
      correct,
      incorrect,
      unattempted,
      totalScore,
      maxPossibleScore,
      timeTaken,
      accuracy,
      percentage: percentage.toFixed(2),
      totalQuestions: testData.questions.length,
      questionAnalysis: analysis
    };
  }, [testData, responses, startTime, endTime]);

  // PERSISTENCE LOGIC
  useEffect(() => {
    const saveResult = async () => {
      if (user && db && !saveInitiated.current) {
        saveInitiated.current = true;
        setIsSaving(true);
        try {
          const normalizedResponses = Object.fromEntries(
            Object.entries(responses || {}).map(([k, v]: any) => [
              k,
              { ...v, selectedOptionId: v.selectedOptionId ? String(v.selectedOptionId) : null }
            ])
          );

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
            rawResponses: normalizedResponses
          });
        } catch (error) {
          console.error("ResultEngine: Persistence failure", error);
          saveInitiated.current = false;
        } finally {
          setIsSaving(false);
        }
      }
    };
    saveResult();
  }, [user, db, testData, metrics, responses, userLanguage]);

  const chartData = [
    { name: 'Correct', value: metrics.correct, color: '#10b981' },
    { name: 'Wrong', value: metrics.incorrect, color: '#f43f5e' },
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
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-2xl">
            <Trophy className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-3">
              <h1 className="text-3xl md:text-5xl font-headline font-bold">Analysis <span className="gradient-text">Report</span></h1>
              {isSaving && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
            </div>
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
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Performance</p>
          </Card>
          <Card className="glass border-white/10 p-6 space-y-2">
            <div className="text-3xl font-bold font-headline text-accent">{(metrics.timeTaken / 60).toFixed(1)}m</div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Time Taken</p>
          </Card>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <Card className="glass border-white/10 p-8 lg:col-span-8">
            <CardHeader className="px-0 pt-0 pb-10">
              <CardTitle className="text-xl font-headline font-bold uppercase tracking-widest">Score Distribution</CardTitle>
            </CardHeader>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={40}>
                    {chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="lg:col-span-4 space-y-6">
            <Card className="glass border-white/10 p-6">
              <CardTitle className="text-lg font-headline font-bold mb-6">Next Steps</CardTitle>
              <div className="space-y-3">
                <Button onClick={onViewSolutions} className="w-full bg-primary h-14 rounded-2xl font-bold gap-3">
                  <BookOpen className="w-5 h-5" /> View Solutions
                </Button>
                <Button variant="outline" onClick={onReattempt} className="w-full h-14 rounded-2xl border-white/10">
                  <RotateCcw className="w-5 h-5 mr-2" /> Retake Test
                </Button>
                <Link href={dashboardUrl} className="block">
                  <Button variant="ghost" className="w-full h-14 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </Card>

            <div className="p-8 bg-indigo-500/10 rounded-[2.5rem] border border-indigo-500/20 space-y-4">
              <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-widest">
                <Zap className="w-4 h-4 fill-current" /> AI Lab Insights
              </div>
              <p className="text-xs text-muted-foreground italic">
                "Based on your accuracy, focus on improving speed in {testData.examName} to boost your percentile rank."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};