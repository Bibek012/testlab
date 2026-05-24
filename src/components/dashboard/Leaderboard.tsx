"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Loader2, Inbox } from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { collectionGroup, query, orderBy, limit } from "firebase/firestore";

export const Leaderboard = () => {
  const db = useFirestore();

  // Fetch real top performers using collectionGroup across all user attempt subcollections
  const topAttemptsQuery = useMemo(() => 
    db ? query(collectionGroup(db, "attempts"), orderBy("score", "desc"), limit(5)) : null,
  [db]);

  const { data: attempts, loading } = useCollection<any>(topAttemptsQuery);

  if (loading) {
    return (
      <Card className="glass border-white/10 h-[400px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary opacity-20" />
      </Card>
    );
  }

  return (
    <Card className="glass border-white/10">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-headline flex items-center gap-2">
          <Medal className="w-5 h-5 text-amber-400" />
          Global Hall of Fame
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!attempts || attempts.length === 0 ? (
          <div className="py-12 text-center space-y-3 opacity-30">
            <Inbox className="w-10 h-10 mx-auto" />
            <p className="text-xs font-bold uppercase tracking-tighter">No rankings yet</p>
          </div>
        ) : attempts.map((attempt, index) => (
          <div key={attempt.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group cursor-default">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-10 h-10 border border-white/10">
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {(attempt.uid?.slice(0, 1) || 'U').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {index < 3 && (
                  <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full p-0.5">
                    <Trophy className="w-2.5 h-2.5 text-black" />
                  </div>
                )}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-bold leading-none mb-1 truncate max-w-[120px]">UID: {attempt.uid?.slice(0, 6)}...</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">{attempt.examName || 'Mock Test'}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-accent">{attempt.score?.toFixed(1)}</div>
              <div className="text-[10px] text-muted-foreground font-mono">Rank {index + 1}</div>
            </div>
          </div>
        ))}
        {attempts && attempts.length > 0 && (
          <button className="w-full py-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">
            View All Ranks
          </button>
        )}
      </CardContent>
    </Card>
  );
};