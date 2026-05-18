"use client";

import React, { useMemo } from "react";
import { 
  Briefcase, 
  Files, 
  HelpCircle, 
  Users, 
  Plus, 
  UploadCloud, 
  Activity,
  ArrowUpRight,
  Clock,
  FileWarning,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, collectionGroup } from "firebase/firestore";
import Link from "next/link";
import { format } from "date-fns";

export default function AdminDashboard() {
  const db = useFirestore();

  const examsQuery = useMemoFirebase(() => db ? collection(db, "exams") : null, [db]);
  const { data: exams, loading: examsLoading } = useCollection(examsQuery);

  const mocksQuery = useMemoFirebase(() => db ? collection(db, "mockTests") : null, [db]);
  const { data: mocks, loading: mocksLoading } = useCollection(mocksQuery);

  const usersQuery = useMemoFirebase(() => db ? collection(db, "users") : null, [db]);
  const { data: users, loading: usersLoading } = useCollection(usersQuery);

  const auditLogsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), limit(6)) : null,
  [db]);
  const { data: auditLogs, loading: logsLoading } = useCollection<any>(auditLogsQuery);

  const stats = useMemo(() => [
    { label: "Total Exams", value: exams?.length || 0, icon: Briefcase, color: "text-blue-400" },
    { label: "Mock Tests", value: mocks?.length || 0, icon: Files, color: "text-accent" },
    { label: "Active Users", value: users?.length || 0, icon: Users, color: "text-purple-400" },
    { label: "Audit Logs", value: auditLogs?.length || 0, icon: FileWarning, color: "text-amber-400" },
  ], [exams, mocks, users, auditLogs]);

  if (examsLoading || mocksLoading || usersLoading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse text-xs font-bold uppercase tracking-widest">Gathering Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Admin <span className="text-accent">Overview</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time status of your examination platform.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/upload-json">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 rounded-xl gap-2 font-bold h-11">
              <UploadCloud className="w-4 h-4" />
              Content Ingestion
            </Button>
          </Link>
          <Link href="/admin/mock-tests">
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 font-bold h-11 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              New Mock Test
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="glass border-white/10 overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-white/5 ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-headline font-bold">{stat.value}</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 glass border-white/10 p-6">
          <CardHeader className="px-0 pt-0 pb-8 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-headline font-bold">Platform Pulse</CardTitle>
              <CardDescription className="text-xs">Visual trends of student activity and uploads</CardDescription>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20">Live Sync</Badge>
          </CardHeader>
          <div className="h-[300px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
            <div className="flex flex-col items-center text-muted-foreground gap-4">
              <Activity className="w-12 h-12 opacity-20" />
              <p className="text-sm font-medium">Aggregating Global Metrics...</p>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-4 glass border-white/10 p-6">
          <CardHeader className="px-0 pt-0 pb-6">
            <CardTitle className="text-lg font-headline font-bold">Audit History</CardTitle>
            <CardDescription className="text-xs">Recent management actions</CardDescription>
          </CardHeader>
          <div className="space-y-6">
            {auditLogs?.map((log) => (
              <div key={log.id} className="flex gap-4 group">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 space-y-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">
                    <span className="text-foreground font-bold">{log.adminName}</span>
                    <span className="text-accent"> {log.action.replace('_', ' ')}</span>
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-bold">
                    <Clock className="w-3 h-3" />
                    {log.timestamp?.toDate ? format(log.timestamp.toDate(), "MMM dd, HH:mm") : 'Recent'}
                  </div>
                </div>
              </div>
            ))}
            {auditLogs?.length === 0 && <div className="py-10 text-center text-muted-foreground text-xs italic">No activity yet.</div>}
            <Link href="/admin/audit-logs">
              <Button variant="ghost" className="w-full text-xs font-bold text-muted-foreground hover:text-foreground mt-4">
                View All Logs <ArrowUpRight className="w-3 h-3 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}