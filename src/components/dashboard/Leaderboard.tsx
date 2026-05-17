
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Star } from "lucide-react";
import { LEADERBOARD } from "@/lib/mock-test-data";

export const Leaderboard = () => {
  return (
    <Card className="glass border-white/10">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-headline flex items-center gap-2">
          <Medal className="w-5 h-5 text-amber-400" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {LEADERBOARD.map((user) => (
          <div key={user.rank} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group cursor-default">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-10 h-10 border border-white/10">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
                {user.rank <= 3 && (
                  <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full p-0.5">
                    <Trophy className="w-2.5 h-2.5 text-black" />
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-bold leading-none mb-1">{user.name}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{user.time} taken</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-accent">{user.score}</div>
              <div className="text-[10px] text-muted-foreground font-mono">Rank {user.rank}</div>
            </div>
          </div>
        ))}
        <button className="w-full py-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">
          View Full Leaderboard
        </button>
      </CardContent>
    </Card>
  );
};
