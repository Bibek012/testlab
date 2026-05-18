
"use client";

import React, { useState, useMemo } from "react";
import { 
  Search, 
  Filter, 
  MoreVertical, 
  User as UserIcon, 
  Shield, 
  Ban, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Loader2,
  Mail,
  ChevronRight,
  Eye,
  Trash2
} from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";

export default function UserManagementPage() {
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: users, loading } = useCollection<any>(
    db ? query(collection(db, "users"), orderBy("createdAt", "desc")) : null
  );

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(user => {
      const matchesSearch = 
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.uid?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || user.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [users, searchQuery, filterStatus]);

  const stats = useMemo(() => {
    if (!users) return { total: 0, active: 0, premium: 0 };
    return {
      total: users.length,
      active: users.filter(u => u.status === 'active').length,
      premium: users.filter(u => u.subscriptionType === 'premium').length,
      admins: users.filter(u => u.role === 'admin' || u.role === 'super-admin').length
    };
  }, [users]);

  const handleUpdateStatus = async (uid: string, status: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "users", uid), { status });
    } catch (e) {
      console.error("Error updating user status:", e);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">User <span className="text-accent">Registry</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Manage accounts, monitor performance, and control platform access.</p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" className="border-white/10 rounded-xl gap-2 h-11">
              <Mail className="w-4 h-4" />
              Broadcast Email
           </Button>
           <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 h-11 shadow-lg shadow-primary/20">
              <Shield className="w-4 h-4" />
              Audit Logs
           </Button>
        </div>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Total Users" value={stats.total} icon={UserIcon} color="text-primary" />
        <MetricCard label="Active Students" value={stats.active} icon={CheckCircle2} color="text-emerald-400" />
        <MetricCard label="Premium Subscriptions" value={stats.premium} icon={TrendingUp} color="text-accent" />
        <MetricCard label="Admin Roles" value={stats.admins} icon={Shield} color="text-indigo-400" />
      </div>

      {/* Filter Bar */}
      <Card className="glass border-white/10">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, email or UID..." 
              className="pl-10 bg-white/5 border-white/5 h-11 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             {['all', 'active', 'suspended', 'banned'].map(s => (
               <Button 
                key={s}
                variant="ghost" 
                size="sm" 
                className={cn("rounded-lg text-[10px] font-bold uppercase", filterStatus === s ? "bg-white/10 text-primary" : "text-muted-foreground")}
                onClick={() => setFilterStatus(s)}
               >
                 {s}
               </Button>
             ))}
          </div>
        </CardContent>
      </Card>

      {/* User Table */}
      <Card className="glass border-white/10 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                    <th className="px-6 py-4 font-semibold text-muted-foreground">User Identity</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground text-center">Tests</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground text-center">Accuracy</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground">Status</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground">Subscription</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr><td colSpan={6} className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20" /></td></tr>
                  ) : filteredUsers.map(user => (
                    <tr key={user.uid} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <Avatar className="h-10 w-10 border border-white/10">
                              <AvatarImage src={user.photoURL} />
                              <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                                {(user.displayName || user.email || 'U')[0].toUpperCase()}
                              </AvatarFallback>
                           </Avatar>
                           <div className="flex flex-col">
                              <span className="font-bold text-foreground">{user.displayName || 'Anonymous'}</span>
                              <span className="text-[10px] text-muted-foreground">{user.email}</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold">
                        {user.testsAttempted || 0}
                      </td>
                      <td className="px-6 py-4 text-center">
                         <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-bold text-accent">{user.totalScore ? '78%' : '—'}</span>
                            <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="bg-primary h-full w-3/4" />
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-4">
                         <Badge className={cn(
                           "h-6 gap-1.5",
                           user.status === 'suspended' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                           user.status === 'banned' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                           "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                         )}>
                            {user.status || 'active'}
                         </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           {user.subscriptionType === 'premium' ? (
                             <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 gap-1.5 h-6">
                               <TrendingUp className="w-3 h-3" /> Premium
                             </Badge>
                           ) : (
                             <span className="text-[10px] text-muted-foreground uppercase font-bold">Free Plan</span>
                           )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                           <Link href={`/admin/users/${user.uid}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10" title="View Profile">
                                 <Eye className="w-4 h-4 text-primary" />
                              </Button>
                           </Link>
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10">
                                    <MoreVertical className="w-4 h-4" />
                                 </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="glass border-white/10 w-48">
                                 <DropdownMenuItem onClick={() => handleUpdateStatus(user.uid, "active")}>Reactivate</DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => handleUpdateStatus(user.uid, "suspended")}>Suspend Account</DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => handleUpdateStatus(user.uid, "banned")} className="text-destructive">Ban User</DropdownMenuItem>
                                 <DropdownMenuSeparator className="bg-white/5" />
                                 <DropdownMenuItem className="text-destructive">Delete Permanently</DropdownMenuItem>
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

function MetricCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="glass border-white/10 p-6 space-y-2 relative overflow-hidden group">
       <Icon className={cn("absolute top-0 right-0 p-4 opacity-5 w-16 h-16 transition-opacity group-hover:opacity-10", color)} />
       <div className="text-2xl font-bold font-headline">{value}</div>
       <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{label}</p>
    </Card>
  );
}
