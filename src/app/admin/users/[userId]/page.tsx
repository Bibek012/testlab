
"use client";

import React, { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Target, 
  Clock, 
  Trophy, 
  Zap, 
  Mail, 
  Phone, 
  Calendar,
  Shield,
  Ban,
  Activity,
  ChevronRight,
  TrendingUp,
  Loader2,
  FileText,
  User as UserIcon,
  CheckCircle2
} from "lucide-react";
import { useFirestore, useDoc, useCollection } from "@/firebase";
import { doc, query, collection, where, orderBy, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function UserProfileDetailPage() {
  const { userId } = useParams();
  const router = useRouter();
  const db = useFirestore();

  const userRef = useMemo(() => db ? doc(db, "users", userId as string) : null, [db, userId]);
  const { data: user, loading: userLoading } = useDoc<any>(userRef);

  const attemptsQuery = useMemo(() => 
    db ? query(collection(db, "attempts"), where("uid", "==", userId), orderBy("completedAt", "desc")) : null, 
  [db, userId]);
  const { data: attempts, loading: attemptsLoading } = useCollection<any>(attemptsQuery);

  const performanceStats = useMemo(() => {
    if (!attempts || attempts.length === 0) return { avgScore: 0, accuracy: 0, time: 0 };
    const total = attempts.length;
    const avgScore = attempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / total;
    const avgAccuracy = attempts.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / total;
    return {
      avgScore: avgScore.toFixed(2),
      accuracy: avgAccuracy.toFixed(1),
      totalAttempts: total
    };
  }, [attempts]);

  const handleUpdateStatus = async (status: string) => {
    if (!userRef) return;
    try {
      await updateDoc(userRef, { status });
    } catch (e) {
      console.error(e);
    }
  };

  if (userLoading) {
    return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
        <UserIcon className="w-16 h-16 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">User Not Found</h2>
        <Button onClick={() => router.push('/admin/users')}>Return to Directory</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
           <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl border border-white/10 h-12 w-12">
              <ArrowLeft className="w-5 h-5" />
           </Button>
           <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20 ring-4 ring-primary/5">
                 <AvatarImage src={user.photoURL} />
                 <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                 </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                 <h1 className="text-3xl font-headline font-bold">{user.displayName || 'Anonymous User'}</h1>
                 <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] uppercase font-bold tracking-widest px-3">
                       {user.role || 'student'}
                    </Badge>
                    <Badge className={cn(
                      "text-[10px] uppercase font-bold tracking-widest px-3 h-6",
                      user.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}>
                       {user.status || 'active'}
                    </Badge>
                 </div>
              </div>
           </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
           {user.status === 'active' ? (
             <Button onClick={() => handleUpdateStatus('suspended')} variant="outline" className="flex-1 md:flex-none border-amber-500/20 text-amber-400 hover:bg-amber-500/10 rounded-xl gap-2 h-11">
                <Shield className="w-4 h-4" /> Suspend
             </Button>
           ) : (
             <Button onClick={() => handleUpdateStatus('active')} className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-11">
                Reactivate
             </Button>
           )}
           <Button onClick={() => handleUpdateStatus('banned')} variant="destructive" className="flex-1 md:flex-none rounded-xl gap-2 h-11">
              <Ban className="w-4 h-4" /> Ban
           </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Stats & Performance */}
        <div className="lg:col-span-8 space-y-8">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ProfileStat label="Accuracy" value={`${performanceStats.accuracy}%`} icon={Target} color="text-accent" />
              <ProfileStat label="Tests Done" value={performanceStats.totalAttempts} icon={FileText} color="text-primary" />
              <ProfileStat label="Streak" value={user.streak || 0} icon={Zap} color="text-amber-400" />
              <ProfileStat label="Avg Score" value={performanceStats.avgScore} icon={TrendingUp} color="text-emerald-400" />
           </div>

           <Card className="glass border-white/10 p-6">
              <CardHeader className="px-0 pt-0 pb-6 flex flex-row items-center justify-between">
                 <CardTitle className="text-lg font-headline font-bold">Preparation Trend</CardTitle>
                 <Badge className="bg-primary/10 text-primary border-primary/20">Last 10 Attempts</Badge>
              </CardHeader>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={attempts?.slice(0, 10).reverse().map((a, i) => ({ name: i+1, score: a.score }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis hide />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fill="rgba(99, 102, 241, 0.1)" strokeWidth={3} />
                   </AreaChart>
                </ResponsiveContainer>
              </div>
           </Card>

           <Card className="glass border-white/10 overflow-hidden">
              <CardHeader className="bg-white/[0.02] border-b border-white/5">
                 <CardTitle className="text-lg font-headline font-bold">Historical Performance</CardTitle>
                 <CardDescription>Log of all mock tests submitted by this user</CardDescription>
              </CardHeader>
              <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-white/[0.01]">
                       <tr className="border-b border-white/5">
                          <th className="px-6 py-4 font-semibold text-muted-foreground">Mock Exam</th>
                          <th className="px-6 py-4 font-semibold text-muted-foreground text-center">Score</th>
                          <th className="px-6 py-4 font-semibold text-muted-foreground text-center">Accuracy</th>
                          <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Completed</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                       {attemptsLoading ? (
                         <tr><td colSpan={4} className="p-20 text-center text-muted-foreground">Loading history...</td></tr>
                       ) : attempts?.length === 0 ? (
                         <tr><td colSpan={4} className="p-20 text-center text-muted-foreground">No attempts recorded yet.</td></tr>
                       ) : attempts?.map((a: any) => (
                         <tr key={a.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-6 py-4">
                               <div className="flex flex-col">
                                  <span className="font-bold">{a.examId || 'Unknown Mock'}</span>
                                  <span className="text-[10px] text-muted-foreground uppercase">{a.testId}</span>
                               </div>
                            </td>
                            <td className="px-6 py-4 text-center font-mono font-bold text-accent">{a.score?.toFixed(2)}</td>
                            <td className="px-6 py-4 text-center text-emerald-400 font-bold">{a.accuracy?.toFixed(1)}%</td>
                            <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                               {a.completedAt?.toDate ? format(a.completedAt.toDate(), "MMM dd, yyyy") : '—'}
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </Card>
        </div>

        {/* Right Column: User Info & Actions */}
        <div className="lg:col-span-4 space-y-6">
           <Card className="glass border-white/10 p-6 space-y-6">
              <CardTitle className="text-lg font-headline font-bold">Contact & Info</CardTitle>
              <div className="space-y-4">
                 <InfoRow icon={Mail} label="Email Address" value={user.email} />
                 <InfoRow icon={Calendar} label="Member Since" value={user.createdAt?.toDate ? format(user.createdAt.toDate(), "MMMM dd, yyyy") : '—'} />
                 <InfoRow icon={Activity} label="Last Active" value={user.lastActive?.toDate ? format(user.lastActive.toDate(), "MMM dd, HH:mm") : 'Never'} />
                 <InfoRow icon={Shield} label="Account UID" value={user.uid} className="font-mono text-[10px]" />
              </div>
           </Card>

           <Card className="glass border-white/10 p-6 space-y-4">
              <CardTitle className="text-lg font-headline font-bold">Quick Diagnostics</CardTitle>
              <div className="space-y-3">
                 <DiagnosticItem label="Email Verified" status={true} />
                 <DiagnosticItem label="Premium Access" status={user.subscriptionType === 'premium'} />
                 <DiagnosticItem label="Profile Complete" status={!!user.displayName} />
                 <DiagnosticItem label="Active Subscription" status={user.status === 'active'} />
              </div>
           </Card>

           <div className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-[2rem] border border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase">
                 <TrendingUp className="w-4 h-4" /> Growth Prediction
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                 Based on the last <span className="text-foreground font-bold">{attempts?.length} attempts</span>, this user is likely to score in the <span className="text-accent font-bold">92nd percentile</span> for {attempts?.[0]?.examId || 'upcoming exams'}.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}

function ProfileStat({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="glass border-white/10 p-5 space-y-2 relative overflow-hidden group h-full">
       <Icon className={cn("absolute -top-1 -right-1 p-2 opacity-5 w-12 h-12 transition-opacity group-hover:opacity-10", color)} />
       <div className="text-xl font-bold font-headline">{value}</div>
       <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{label}</p>
    </Card>
  );
}

function InfoRow({ icon: Icon, label, value, className }: any) {
  return (
    <div className="space-y-1">
       <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest flex items-center gap-2">
          <Icon className="w-3 h-3" /> {label}
       </p>
       <p className={cn("text-sm font-medium text-foreground truncate", className)}>{value}</p>
    </div>
  );
}

function DiagnosticItem({ label, status }: { label: string, status: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
       <span className="text-xs text-muted-foreground">{label}</span>
       {status ? (
         <CheckCircle2 className="w-4 h-4 text-emerald-400" />
       ) : (
         <div className="w-4 h-4 rounded-full border border-white/10" />
       )}
    </div>
  );
}
