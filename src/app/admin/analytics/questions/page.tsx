"use client";

import React, { useMemo, useState } from "react";
import { 
  ArrowLeft, 
  Search, 
  Clock, 
  CheckCircle2, 
  TrendingDown,
  Loader2,
  ImageIcon,
  Languages
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, limit, collectionGroup } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function QuestionAnalyticsPage() {
  const router = useRouter();
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = useState("");

  // Use collectionGroup to aggregate attempts from all user subcollections
  const attemptsQuery = useMemoFirebase(() => db ? collectionGroup(db, "attempts") : null, [db]);
  const { data: attempts, loading: attemptsLoading } = useCollection<any>(attemptsQuery);

  const questionsQuery = useMemoFirebase(() => 
    db ? query(collectionGroup(db, "questions"), limit(100)) : null,
  [db]);
  const { data: questions, loading: qsLoading } = useCollection<any>(questionsQuery);

  const questionStats = useMemo(() => {
    if (!attempts || !questions) return [];

    return questions.map(q => {
      let correct = 0;
      let total = 0;
      let totalTime = 0;

      attempts.forEach(attempt => {
        const resp = attempt.rawResponses?.[q.id];
        if (resp) {
          total++;
          totalTime += resp.timeSpentSeconds || 0;
          if (resp.selectedOptionId === q.correctOptionId || resp.selectedOptionId === q.answer) correct++;
        }
      });

      const accuracy = total > 0 ? (correct / total) * 100 : 0;
      const avgTime = total > 0 ? (totalTime / total) : 0;

      return {
        ...q,
        totalAttempts: total,
        accuracy: accuracy.toFixed(1),
        avgTime: avgTime.toFixed(1),
        isProblematic: total > 5 && accuracy < 30
      };
    }).filter(q => (q.en || q.id).toLowerCase().includes(searchQuery.toLowerCase()));
  }, [attempts, questions, searchQuery]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl border border-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-headline font-bold">Item <span className="text-accent">Analysis</span></h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">Cross-User Difficulty Analytics</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass border-white/10 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-headline">{attempts?.length || 0}</div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Analyzed Attempts</p>
          </div>
        </Card>
        <Card className="glass border-white/10 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-headline">Syncing</div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Real-time Pulse</p>
          </div>
        </Card>
      </div>

      <Card className="glass border-white/10">
        <CardContent className="p-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search questions to analyze..." 
              className="pl-10 bg-white/5 border-white/5 h-11 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-6 py-4 font-semibold text-muted-foreground">Question Preview</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-center">Global Hits</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-center">Correct %</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-center">Avg Time</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Insight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {attemptsLoading || qsLoading ? (
                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20" /></td></tr>
              ) : questionStats.map((q) => (
                <tr key={q.id} className={cn("hover:bg-white/[0.02] transition-colors group", q.isProblematic && "bg-rose-500/[0.02]")}>
                  <td className="px-6 py-4 max-w-md">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                        <span>{q.id.slice(0, 12)}...</span>
                        {q.dom_images?.length > 0 && <ImageIcon className="w-3 h-3 text-accent" />}
                        <Languages className="w-3 h-3 text-primary" />
                      </div>
                      <p className="line-clamp-2 text-foreground font-medium">{q.en}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-mono">{q.totalAttempts}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center gap-1">
                      <span className={cn("text-xs font-bold", parseFloat(q.accuracy) < 40 ? "text-rose-400" : "text-emerald-400")}>
                        {q.accuracy}%
                      </span>
                      <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className={cn("h-full", parseFloat(q.accuracy) < 40 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${q.accuracy}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-muted-foreground font-mono">{q.avgTime}s</td>
                  <td className="px-6 py-4 text-right">
                    {q.isProblematic ? (
                      <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 gap-1.5">
                        <TrendingDown className="w-3 h-3" /> Review Key
                      </Badge>
                    ) : q.totalAttempts > 10 ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1.5">
                        <CheckCircle2 className="w-3 h-3" /> Calibrated
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">Low Sample</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}