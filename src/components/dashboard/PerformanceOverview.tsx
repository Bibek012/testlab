"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Zap, Clock, Trophy, BarChart3, Loader2 } from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300 group overflow-hidden relative h-full">
    <CardContent className="p-4 md:p-6 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <div className={cn("p-1.5 md:p-2 rounded-lg bg-opacity-20", `bg-${color} text-${color}`)}>
          <Icon className="w-4 h-4 md:w-5 md:h-5" />
        </div>
        {trend && (
          <span className="text-[8px] md:text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
            +{trend}%
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        <div className="text-lg md:text-2xl font-bold font-headline">{value}</div>
        <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest truncate">{title}</div>
      </div>
    </CardContent>
  </Card>
);

export const PerformanceOverview = () => {
  const { user } = useUser();
  const db = useFirestore();

  // Fetch recent attempts for charts and aggregate stats
  const attemptsQuery = useMemo(() => 
    (db && user) ? query(collection(db, "attempts"), where("uid", "==", user.uid), orderBy("completedAt", "desc"), limit(10)) : null,
  [db, user]);

  const { data: attempts, loading } = useCollection<any>(attemptsQuery);

  const stats = useMemo(() => {
    if (!attempts || attempts.length === 0) return { accuracy: "0%", count: 0, avgScore: "0", speed: "0s/q" };
    
    const total = attempts.length;
    const avgAccuracy = attempts.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / total;
    const avgScore = attempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / total;
    const avgTime = attempts.reduce((acc, curr) => acc + (curr.timeTakenSeconds || 0), 0) / total;

    return {
      accuracy: `${avgAccuracy.toFixed(1)}%`,
      count: total,
      avgScore: avgScore.toFixed(1),
      speed: `${(avgTime / 100).toFixed(1)}s/q`
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
    return (
      <div className="h-[400px] flex items-center justify-center glass border-white/5 rounded-[2.5rem]">
        <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Dynamic Grid for Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="Accuracy" value={stats.accuracy} icon={Target} color="emerald-400" />
        <StatCard title="Total Mocks" value={stats.count} icon={BarChart3} color="primary" />
        <StatCard title="Avg Score" value={stats.avgScore} icon={TrendingUp} color="indigo-400" />
        <StatCard title="Speed" value={stats.speed} icon={Clock} color="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-12 glass border-white/10 p-4 md:p-6 overflow-hidden">
          <CardHeader className="px-0 pt-0 pb-8 flex flex-row items-center justify-between">
            <CardTitle className="text-base md:text-lg font-headline flex items-center gap-2">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-accent" />
              Preparation Progress
            </CardTitle>
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest">Last 10 Attempts</Badge>
          </CardHeader>
          
          {chartData.length > 0 ? (
            <div className="h-[250px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] flex flex-col items-center justify-center gap-4 text-muted-foreground italic text-sm">
               Attempt your first mock test to see performance trends.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
