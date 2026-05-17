
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, Zap, Clock, Trophy, BarChart3 } from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { cn } from "@/lib/utils";

const data = [
  { name: "Week 1", score: 65 },
  { name: "Week 2", score: 72 },
  { name: "Week 3", score: 68 },
  { name: "Week 4", score: 85 },
  { name: "Week 5", score: 92 },
];

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300 group overflow-hidden relative">
    <div className={cn("absolute top-0 right-0 w-24 h-24 blur-3xl -z-10", `bg-${color}/10`)} />
    <CardContent className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className={cn("p-2 rounded-lg bg-opacity-20", `bg-${color}`, `text-${color}`)}>
          <Icon className="w-4 h-4 md:w-5 md:h-5" />
        </div>
        {trend && (
          <span className="text-[9px] md:text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
            +{trend}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-xl md:text-2xl font-bold font-headline">{value}</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">{title}</div>
      </div>
    </CardContent>
  </Card>
);

export const PerformanceOverview = () => {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <StatCard title="Accuracy" value="94.8%" icon={Target} color="accent" trend="2.4" />
        <StatCard title="Attempts" value="42" icon={BarChart3} color="primary" trend="5" />
        <StatCard title="Avg Score" value="78/100" icon={TrendingUp} color="indigo-400" />
        <StatCard title="Current Rank" value="#2,451" icon={Trophy} color="amber-400" />
        <StatCard title="Time/Q" value="42s" icon={Clock} color="rose-400" />
        <StatCard title="Solved Qs" value="1,200+" icon={Zap} color="emerald-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <Card className="lg:col-span-2 glass border-white/10 p-4 md:p-6 overflow-hidden">
          <CardHeader className="px-0 pt-0 pb-6">
            <CardTitle className="text-lg font-headline flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Score Progression
            </CardTitle>
          </CardHeader>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="glass border-white/10 p-4 md:p-6">
          <CardHeader className="px-0 pt-0 pb-6">
            <CardTitle className="text-lg font-headline">Strengths & Gaps</CardTitle>
          </CardHeader>
          <div className="space-y-6">
            {[
              { label: 'Quantitative Aptitude', value: 85, color: 'bg-accent' },
              { label: 'General Reasoning', value: 62, color: 'bg-primary' },
              { label: 'General Awareness', value: 45, color: 'bg-rose-400' },
              { label: 'Science & Tech', value: 78, color: 'bg-emerald-400' },
            ].map((subject, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground truncate mr-2">{subject.label}</span>
                  <span>{subject.value}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${subject.color} rounded-full transition-all duration-1000`}
                    style={{ width: `${subject.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
