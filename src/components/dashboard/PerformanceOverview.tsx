
"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Clock, BarChart3, Loader2 } from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300 group overflow-hidden h-full">
    <CardContent className="p-4 md:p-6 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2 rounded-lg bg-opacity-20", color)}>
          <Icon className="w-4 h-4 md:w-5 md:h-5" />
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-lg md:text-2xl font-bold font-headline">{value}</div>
        <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest truncate">{title}</div>
      </div>
    </CardContent>
  </Card>
);

export const PerformanceOverview = () => {
  const { user } = useUser();
  const db = useFirestore();

  const attemptsQuery = useMemoFirebase(() => 
    (db && user) ? query(collection(db, "attempts"), where("uid", "==", user.uid), orderBy("completedAt", "desc"), limit(10)) : null,
  [db, user?.uid]);

  const { data: attempts, loading } = useCollection<any>(attemptsQuery);

  const stats = useMemo(() => {
    if (!attempts || attempts.length === 0) return { accuracy: "0%", count: 0, avgScore: "0", speed: "0s/q" };
    
    const total = attempts.length;
    const avgAccuracy = attempts.reduce((acc: number, curr: any) => acc + (curr.accuracy || 0), 0) / total;
    const avgScore = attempts.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) / total;
    const avgTime = attempts.reduce((acc: number, curr: any) => acc + (curr.timeTakenSeconds || 0), 0) / total;

    return {
      accuracy: `${avgAccuracy.toFixed(1)}%`,
      count: total,
      avgScore: avgScore.toFixed(1),
      speed: `${(avgTime / (attempts[0]?.totalQuestions || 100)).toFixed(1)}s/q`
    };
  }, [attempts]);

  const chartData = useMemo(() => {
    if (!attempts) return [];
    return [...attempts].reverse().map((a, i) => ({
      name: `T${i+1}`,
      score: a.score
    }));
  }, [attempts]);

  if (loading) {
    return <div className="h-[300px] flex items-center justify-center opacity-20"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Avg Accuracy" value={stats.accuracy} icon={Target} color="bg-emerald-500/10 text-emerald-400" />
        <StatCard title="Tests Attempted" value={stats.count} icon={BarChart3} color="bg-primary/10 text-primary" />
        <StatCard title="Avg Score" value={stats.avgScore} icon={TrendingUp} color="bg-indigo-500/10 text-indigo-400" />
        <StatCard title="Pace" value={stats.speed} icon={Clock} color="bg-accent/10 text-accent" />
      </div>

      <Card className="glass border-white/10 p-6 overflow-hidden">
        <CardHeader className="px-0 pt-0 pb-8 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-headline uppercase tracking-widest text-muted-foreground">Preparation Trend</CardTitle>
          <Badge variant="outline" className="text-[9px] uppercase border-white/10">Last 10 Attempts</Badge>
        </CardHeader>
        
        <div className="h-[250px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-xs italic">
               No data history found for trend analysis.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
