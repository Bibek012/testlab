
"use client";

import React, { useMemo, useState } from "react";
import { 
  BarChart3, 
  ArrowLeft, 
  Search, 
  Filter, 
  Target, 
  Clock, 
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Loader2,
  LayoutGrid,
  List
} from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function TestAnalyticsPage() {
  const router = useRouter();
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const { data: attempts, loading: attemptsLoading } = useCollection<any>(
    db ? collection(db, "attempts") : null
  );

  const { data: mocks } = useCollection<any>(
    db ? query(collection(db, "mockTests"), orderBy("title", "asc")) : null
  );

  const testStats = useMemo(() => {
    if (!attempts || !mocks) return [];

    return mocks.map(mock => {
      const mockAttempts = attempts.filter(a => a.testId === mock.id);
      const total = mockAttempts.length;
      if (total === 0) return { ...mock, attemptsCount: 0, avgScore: 0, avgAccuracy: 0 };

      const avgScore = mockAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / total;
      const avgAccuracy = mockAttempts.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / total;
      const avgTime = mockAttempts.reduce((acc, curr) => acc + (curr.timeTakenSeconds || 0), 0) / total;

      return {
        ...mock,
        attemptsCount: total,
        avgScore: avgScore.toFixed(2),
        avgAccuracy: avgAccuracy.toFixed(1),
        avgTime: Math.floor(avgTime / 60)
      };
    }).filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [attempts, mocks, searchQuery]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl border border-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-headline font-bold">Test <span className="text-accent">Intelligence</span></h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">Difficulty & Performance Metrics</p>
          </div>
        </div>
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
          <Button 
            variant="ghost" size="icon" 
            className={cn("h-8 w-8 rounded-lg", viewMode === 'table' ? "bg-white/10 text-primary" : "text-muted-foreground")}
            onClick={() => setViewMode('table')}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" size="icon" 
            className={cn("h-8 w-8 rounded-lg", viewMode === 'grid' ? "bg-white/10 text-primary" : "text-muted-foreground")}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="glass border-white/10">
        <CardContent className="p-4 flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search mock tests by title..." 
              className="pl-10 bg-white/5 border-white/5 h-11 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="border-white/10 h-11 px-6 rounded-xl gap-2">
            <Filter className="w-4 h-4" /> Filter By Exam
          </Button>
        </CardContent>
      </Card>

      {attemptsLoading ? (
        <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" /></div>
      ) : viewMode === 'table' ? (
        <Card className="glass border-white/10 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                    <th className="px-6 py-4 font-semibold text-muted-foreground">Mock Test Title</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground text-center">Attempts</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground text-center">Avg Score</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground text-center">Accuracy</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground text-center">Avg Time</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Difficulty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {testStats.map((test) => (
                    <tr key={test.id} className="hover:bg-white/[0.02] transition-colors group cursor-default">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{test.title}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{test.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <div className="flex items-center justify-center gap-2">
                            <BarChart3 className="w-3.5 h-3.5 text-primary opacity-50" />
                            <span className="font-mono">{test.attemptsCount}</span>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-accent">{test.avgScore}</td>
                      <td className="px-6 py-4 text-center">
                         <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-bold">{test.avgAccuracy}%</span>
                            <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full" style={{ width: `${test.avgAccuracy}%` }} />
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-center text-muted-foreground">{test.avgTime}m</td>
                      <td className="px-6 py-4 text-right">
                        <Badge className={cn(
                          "h-6",
                          parseFloat(test.avgAccuracy) < 50 ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                          parseFloat(test.avgAccuracy) < 75 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        )}>
                          {parseFloat(test.avgAccuracy) < 50 ? 'Hard' : parseFloat(test.avgAccuracy) < 75 ? 'Moderate' : 'Easy'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           {testStats.map(test => (
             <Card key={test.id} className="glass border-white/10 p-6 space-y-6 group hover:border-primary/40 transition-all">
                <div className="flex justify-between items-start">
                   <div>
                      <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{test.title}</h3>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">{test.type}</p>
                   </div>
                   <Badge variant="outline" className="bg-white/5">{test.attemptsCount} Attempts</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Avg Score</div>
                      <div className="text-xl font-bold text-accent">{test.avgScore}</div>
                   </div>
                   <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Accuracy</div>
                      <div className="text-xl font-bold text-emerald-400">{test.avgAccuracy}%</div>
                   </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase">
                   <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {test.avgTime}m Avg</div>
                   <div className="flex items-center gap-1.5">
                      {parseFloat(test.avgAccuracy) < 60 ? <AlertTriangle className="w-3 h-3 text-rose-400" /> : <CheckCircle className="w-3 h-3 text-emerald-400" />}
                      {parseFloat(test.avgAccuracy) < 60 ? 'High Difficulty' : 'Standard'}
                   </div>
                </div>
             </Card>
           ))}
        </div>
      )}
    </div>
  );
}
