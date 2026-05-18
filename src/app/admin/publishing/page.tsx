
"use client";

import React, { useState, useMemo } from "react";
import { 
  Search, 
  Filter, 
  Send, 
  Clock, 
  Archive, 
  Eye, 
  EyeOff, 
  Shield, 
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronRight,
  Loader2
} from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";

export default function PublishingDashboard() {
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const { data: mockTests, loading } = useCollection(db ? query(collection(db, "mockTests"), orderBy("updatedAt", "desc")) : null);
  const { data: exams } = useCollection(db ? query(collection(db, "exams")) : null);

  const filteredMocks = useMemo(() => {
    if (!mockTests) return [];
    return mockTests.filter(mock => {
      const matchesSearch = mock.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === "all" || mock.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [mockTests, searchQuery, selectedStatus]);

  const stats = useMemo(() => {
    if (!mockTests) return { total: 0, published: 0, drafts: 0, scheduled: 0 };
    return {
      total: mockTests.length,
      published: mockTests.filter(m => m.status === 'Published').length,
      drafts: mockTests.filter(m => m.status === 'Draft').length,
      scheduled: mockTests.filter(m => m.status === 'Scheduled').length,
    };
  }, [mockTests]);

  const handleUpdateStatus = async (id: string, status: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "mockTests", id), { status, updatedAt: serverTimestamp() });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Publishing <span className="text-accent">Control</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Manage test availability, scheduling, and visibility across the platform.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryStat label="All Tests" value={stats.total} icon={Archive} color="text-slate-400" />
        <SummaryStat label="Live Tests" value={stats.published} icon={CheckCircle2} color="text-emerald-400" />
        <SummaryStat label="Drafts" value={stats.drafts} icon={AlertCircle} color="text-amber-400" />
        <SummaryStat label="Scheduled" value={stats.scheduled} icon={Clock} color="text-primary" />
      </div>

      {/* Filter Bar */}
      <Card className="glass border-white/10">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search tests to publish..." 
              className="pl-10 bg-white/5 border-white/5 h-11 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             {['all', 'Draft', 'Published', 'Scheduled', 'Archived'].map(s => (
               <Button 
                key={s}
                variant="ghost" 
                size="sm" 
                className={cn("rounded-lg text-[10px] font-bold uppercase", selectedStatus === s ? "bg-white/10 text-primary" : "text-muted-foreground")}
                onClick={() => setSelectedStatus(s)}
               >
                 {s}
               </Button>
             ))}
          </div>
        </CardContent>
      </Card>

      {/* Mock List */}
      <Card className="glass border-white/10 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                    <th className="px-6 py-4 font-semibold text-muted-foreground">Test Title & Exam</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground">Visibility</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground">Status</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground">Last Updated</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20" /></td></tr>
                  ) : filteredMocks.map(mock => (
                    <tr key={mock.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                           <span className="font-bold text-foreground">{mock.title}</span>
                           <span className="text-[10px] text-muted-foreground uppercase">{exams?.find(e => e.id === mock.examId)?.name || 'Generic'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                            {mock.visibility === 'Premium' ? <Shield className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-primary" />}
                            <span className="text-xs font-medium">{mock.visibility || 'Public'}</span>
                         </div>
                      </td>
                      <td className="px-6 py-4">
                         <Badge className={cn(
                           "h-6 gap-1.5",
                           mock.status === 'Published' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                           mock.status === 'Draft' ? "bg-slate-500/10 text-slate-400 border-slate-500/20" :
                           mock.status === 'Scheduled' ? "bg-primary/10 text-primary border-primary/20" :
                           "bg-rose-500/10 text-rose-400 border-rose-500/20"
                         )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", 
                              mock.status === 'Published' ? "bg-emerald-400" :
                              mock.status === 'Draft' ? "bg-slate-400" :
                              mock.status === 'Scheduled' ? "bg-primary" : "bg-rose-400"
                            )} />
                            {mock.status}
                         </Badge>
                      </td>
                      <td className="px-6 py-4">
                         <span className="text-xs text-muted-foreground">
                            {mock.updatedAt ? format(mock.updatedAt.toDate(), "MMM d, HH:mm") : 'Never'}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                           <Link href={`/admin/mock-tests/${mock.id}/publish`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10" title="Publishing Panel">
                                 <Send className="w-4 h-4 text-primary" />
                              </Button>
                           </Link>
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10">
                                    <MoreVertical className="w-4 h-4" />
                                 </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="glass border-white/10">
                                 <DropdownMenuItem onClick={() => handleUpdateStatus(mock.id, "Published")}>Publish Now</DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => handleUpdateStatus(mock.id, "Draft")}>Save Draft</DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => handleUpdateStatus(mock.id, "Hidden")}>Hide Test</DropdownMenuItem>
                                 <DropdownMenuItem className="text-destructive" onClick={() => handleUpdateStatus(mock.id, "Archived")}>Archive</DropdownMenuItem>
                              </DropdownMenuContent>
                           </DropdownMenu>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="glass border-white/10 p-6 space-y-2 relative overflow-hidden group">
       <Icon className={cn("absolute top-0 right-0 p-4 opacity-5 w-16 h-16 transition-opacity group-hover:opacity-10", color)} />
       <div className="text-2xl font-bold font-headline">{value}</div>
       <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{label}</p>
    </Card>
  );
}
