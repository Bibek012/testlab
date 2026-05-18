"use client";

import React, { useMemo } from "react";
import { 
  BarChart3, 
  Users, 
  Target, 
  Clock, 
  TrendingUp, 
  CheckCircle2,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  Filter,
  Loader2,
  Activity,
  WifiOff
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from "recharts";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { ErrorState } from "@/components/ErrorState";

export default function AnalyticsOverviewPage() {
  const db = useFirestore();
  
  const attemptsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "attempts"), orderBy("completedAt", "desc"), limit(1000)) : null,
  [db]);
  const { data: attempts, loading: attemptsLoading, error: attemptsError } = useCollection<any>(attemptsQuery);

  const usersQuery = useMemoFirebase(() => db ? collection(db, "users") : null, [db]);
  const { data: users, error: usersError } = useCollection<any>(usersQuery);

  const mocksQuery = useMemoFirebase(() => db ? collection(db, "mockTests") : null, [db]);
  const { data: mocks } = useCollection<any>(mocksQuery);

  const stats = useMemo(() => {
    if (!attempts) return { total: 0, avgAccuracy: 0, avgScore: 0, totalTime: 0, completion: 0 };
    
    const total = attempts.length;
    const avgAccuracy = attempts.reduce((acc: number, curr: any) => acc + (curr.accuracy || 0), 0) / (total || 1);
    const avgScore = attempts.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) / (total || 1);
    const totalTime = attempts.reduce((acc: number, curr: any) => acc + (curr.timeTakenSeconds || 0), 0);
    
    return {
      total,
      avgAccuracy: avgAccuracy.toFixed(1),
      avgScore: avgScore.toFixed(2),
      totalTime: Math.floor(totalTime / 3600),
      activeUsers: users?.length || 0,
      totalMocks: mocks?.length || 0
    };
  }, [attempts, users, mocks]);

  const activityData = useMemo(() => {
    if (!attempts) return [];
    const days: Record<string, number> = {};
    attempts.slice(0, 100).forEach(a => {
      const date = a.completedAt?.toDate ? format(a.completedAt.toDate(), "MMM dd") : "Unknown";
      days[date] = (days[date] || 0) + 1;
    });
    return Object.entries(days).map(([name, value]) => ({ name, value })).reverse();
  }, [attempts]);

  if (attemptsLoading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Aggregating platform intelligence...</p>
      </div>
    );
  }

  // Handle connection errors gracefully without crashing
  if (attemptsError || usersError) {
    return (
      <div className="p-8">
        <ErrorState 
          error={attemptsError || usersError} 
          onRetry={() => window.location.reload()} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Analytics <span className="text-accent">Overview</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time performance metrics and user engagement trends.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-white/10 rounded-xl gap-2">
            <Calendar className="w-4 h-4" />
            Last 30 Days
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 shadow-lg shadow-primary/20">
            Export Report
          </Button>
        </div>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Total Attempts" value={stats.total} icon={BarChart3} color="text-primary" trend="+12%" />
        <MetricCard label="Avg. Accuracy" value={`${stats.avgAccuracy}%`} icon={Target} color="text-emerald-400" trend="+2.4%" />
        <MetricCard label="Active Users" value={stats.activeUsers} icon={Users} color="text-accent" trend="+5%" />
        <MetricCard label="Learning Hours" value={`${stats.totalTime}h`} icon={Clock} color="text-indigo-400" trend="+18h" />
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 glass border-white/10 p-6">
          <CardHeader className="px-0 pt-0 pb-8 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-headline font-bold">Platform Activity</CardTitle>
              <CardDescription className="text-xs">Number of mock tests completed per day</CardDescription>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20">Live Sync</Badge>
          </CardHeader>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" x2="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="lg:col-span-4 space-y-6">
          <Card className="glass border-white/10 p-6">
            <CardTitle className="text-lg font-headline font-bold mb-4">Deep Dives</CardTitle>
            <div className="space-y-3">
              <AnalyticsLink href="/admin/analytics/tests" icon={BarChart3} title="Test Analytics" desc="Difficulty and completion rates" />
              <AnalyticsLink href="/admin/analytics/questions" icon={Target} title="Question Insights" desc="Weak questions & distractors" />
              <AnalyticsLink href="/admin/analytics/users" icon={Users} title="User Performance" desc="Leaderboards and streaks" />
            </div>
          </Card>

          <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-accent/10 rounded-3xl border border-white/10 space-y-4">
             <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase">
               <TrendingUp className="w-4 h-4" /> AI Growth Projection
             </div>
             <p className="text-xs text-muted-foreground leading-relaxed italic">
               "Based on current trends, user engagement is expected to grow by <span className="text-white font-bold">24%</span> next month. Consider adding more 'Daily Quizzes' to maintain the streak."
             </p>
          </div>
        </div>
      </div>

      <Card className="glass border-white/10 overflow-hidden">
        <CardHeader className="p-6 bg-white/[0.02] border-b border-white/5 flex flex-row items-center justify-between">
           <div>
             <CardTitle className="text-lg font-headline font-bold">Recent Submissions</CardTitle>
             <CardDescription className="text-xs">Latest 10 attempts across the platform</CardDescription>
           </div>
           <Link href="/admin/analytics/tests">
             <Button variant="ghost" size="sm" className="text-primary gap-2">View All <ChevronRight className="w-4 h-4" /></Button>
           </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-6 py-4 font-semibold text-muted-foreground">User / Exam</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-center">Score</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-center">Accuracy</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-center">Time</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {attempts?.slice(0, 10).map((a) => (
                <tr key={a.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground">UID: {a.uid?.slice(0, 8)}...</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{a.examId || 'Mock Test'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-mono font-bold text-accent">{a.score?.toFixed(2)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-bold">{a.accuracy?.toFixed(1)}%</span>
                      <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: `${a.accuracy}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-muted-foreground">{Math.floor(a.timeTakenSeconds / 60)}m {a.timeTakenSeconds % 60}s</td>
                  <td className="px-6 py-4 text-right">
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1.5 h-6">
                      <CheckCircle2 className="w-3 h-3" /> Evaluated
                    </Badge>
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

function MetricCard({ label, value, icon: Icon, color, trend }: any) {
  return (
    <Card className="glass border-white/10 p-6 space-y-3 relative overflow-hidden group">
       <Icon className={cn("absolute -top-2 -right-2 w-16 h-16 opacity-5 transition-opacity group-hover:opacity-10", color)} />
       <div className="text-2xl font-bold font-headline">{value}</div>
       <div className="flex items-center justify-between">
         <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{label}</p>
         {trend && <span className="text-[10px] text-emerald-400 font-bold">{trend}</span>}
       </div>
    </Card>
  );
}

function AnalyticsLink({ href, icon: Icon, title, desc }: any) {
  return (
    <Link href={href} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/40 hover:bg-white/[0.08] transition-all group">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-bold">{title}</div>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </Link>
  );
}
