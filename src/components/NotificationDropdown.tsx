
"use client";

import React, { useMemo } from "react";
import { 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Zap, 
  Trophy,
  ChevronRight,
  Loader2,
  Inbox
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy, limit, doc, updateDoc, writeBatch } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const NotificationDropdown = () => {
  const { user } = useUser();
  const db = useFirestore();

  const notificationsQuery = useMemo(() => 
    user && db ? query(
      collection(db, "users", user.uid, "notifications"), 
      orderBy("createdAt", "desc"), 
      limit(20)
    ) : null, 
  [user, db]);

  const { data: notifications, loading } = useCollection<any>(notificationsQuery);

  const unreadCount = useMemo(() => 
    notifications?.filter(n => !n.isRead).length || 0, 
  [notifications]);

  const handleMarkAsRead = async (id: string) => {
    if (!user || !db) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "notifications", id), { isRead: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user || !db || !notifications) return;
    const batch = writeBatch(db);
    notifications.forEach(n => {
      if (!n.isRead) {
        batch.update(doc(db, "users", user.uid, "notifications", n.id), { isRead: true });
      }
    });
    await batch.commit();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] glass border-white/10 p-0 overflow-hidden shadow-2xl">
        <DropdownMenuLabel className="p-4 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-headline font-bold text-sm uppercase tracking-widest">Notifications</h4>
            {unreadCount > 0 && <Badge className="bg-primary h-5 min-w-5 flex items-center justify-center p-0 rounded-full">{unreadCount}</Badge>}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleMarkAllAsRead}
            className="h-7 text-[10px] uppercase font-bold text-muted-foreground hover:text-primary p-0 px-2"
            disabled={unreadCount === 0}
          >
            Mark all read
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/5 m-0" />
        
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 opacity-20">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-[10px] font-bold uppercase tracking-tighter">Syncing alerts...</p>
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                <Inbox className="w-6 h-6 text-muted-foreground opacity-20" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">All caught up!</p>
                <p className="text-[10px] text-muted-foreground">We'll notify you about new mocks and results.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((n) => (
                <DropdownMenuItem 
                  key={n.id} 
                  className={cn(
                    "p-4 flex gap-4 cursor-pointer focus:bg-white/5 transition-colors",
                    !n.isRead && "bg-primary/[0.03]"
                  )}
                  onClick={() => handleMarkAsRead(n.id)}
                >
                  <NotificationIcon type={n.type} />
                  <div className="flex-1 space-y-1 overflow-hidden">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-xs font-bold leading-tight", !n.isRead ? "text-foreground" : "text-muted-foreground")}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {n.createdAt?.toDate ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    {n.link && (
                      <Link href={n.link} className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline mt-1">
                        View Details <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </div>
        
        <DropdownMenuSeparator className="bg-white/5 m-0" />
        <Link href="/dashboard">
          <Button variant="ghost" className="w-full h-11 rounded-none text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-foreground">
            Go to Student Dashboard
          </Button>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const NotificationIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'exam': return <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0"><AlertCircle className="w-4 h-4" /></div>;
    case 'result': return <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0"><CheckCircle2 className="w-4 h-4" /></div>;
    case 'mock': return <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0"><Zap className="w-4 h-4" /></div>;
    case 'streak': return <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0"><Trophy className="w-4 h-4" /></div>;
    default: return <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground shrink-0"><Info className="w-4 h-4" /></div>;
  }
};
