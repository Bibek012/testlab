"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, Award, FileText, ArrowRight, Play, RefreshCw } from "lucide-react";

interface MockTestListProps {
  tests: any[];
  attempts: any[];
  activeSessions: any[];
  category: string;
  examId: string;
}

export default function MockTestList({ tests, attempts, activeSessions, category, examId }: MockTestListProps) {
  
  // FIX 3: Robust Active Status Mapping with Client-side Local Storage fallbacks
  const mockStatusMap = useMemo(() => {
    const map: Record<string, { latestAttempt?: any; activeSession?: any }> = {};

    // 1. Cloud (Firestore) active mock sessions load
    activeSessions?.forEach((session) => {
      const key = session.id || session.mockId;
      if (key) {
        map[key] = { ...map[key], activeSession: session };
      }
    });

    // 2. LocalStorage active backup intercept logic
    if (typeof window !== "undefined") {
      tests?.forEach((test) => {
        const localActiveToken = localStorage.getItem(`test_active_${test.id}`);
        // Agar local token active hai par cloud par sync pipeline lag hai, create artificial session pointer
        if (localActiveToken === "true" && !map[test.id]?.activeSession) {
          map[test.id] = {
            ...map[test.id],
            activeSession: { id: test.id, isLocalFallback: true },
          };
        }
      });
    }

    // 3. User historic submission attempts mapping 
    attempts?.forEach((attempt) => {
      if (attempt.mockId) {
        const existing = map[attempt.mockId];
        // Only prioritize latest submitted timestamp record
        if (!existing?.latestAttempt || attempt.submittedAt > existing.latestAttempt.submittedAt) {
          map[attempt.mockId] = {
            ...map[attempt.mockId],
            latestAttempt: attempt,
          };
        }
      }
    });

    return map;
  }, [attempts, activeSessions, tests]);

  if (!tests || tests.length === 0) {
    return (
      <div className="text-center py-12 border rounded-xl bg-card/50">
        <FileText className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
        <h3 className="text-lg font-semibold">No Mock Tests Available</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">We are compiling question arrays for this exam syllabus. Check back shortly.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tests.map((test) => {
        const status = mockStatusMap[test.id];
        const hasActiveSession = !!status?.activeSession;
        const hasCompletedAttempt = !!status?.latestAttempt;

        return (
          <Card key={test.id} className="flex flex-col relative overflow-hidden group hover:shadow-md transition-all duration-200 border border-muted">
            {/* Action status ribbon markers */}
            {hasActiveSession && (
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-bl-lg uppercase tracking-wide animate-pulse">
                In Progress
              </div>
            )}
            
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs bg-accent/30 capitalize">{test.type || "Full Test"}</Badge>
                {hasCompletedAttempt && <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400">Attempted</Badge>}
              </div>
              <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1">{test.title}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Syllabus test coverage module packet</CardDescription>
            </CardHeader>

            <CardContent className="pb-5 flex-1 flex flex-col justify-between gap-5">
              {/* Feature Metrics metadata vectors rows */}
              <div className="grid grid-cols-2 gap-3 text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-2 bg-accent/40 p-2 rounded-lg">
                  <Clock className="w-4 h-4 text-primary/70 shrink-0" />
                  <span>{test.durationMinutes || 60} Minutes</span>
                </div>
                <div className="flex items-center gap-2 bg-accent/40 p-2 rounded-lg">
                  <BookOpen className="w-4 h-4 text-primary/70 shrink-0" />
                  <span>{test.totalQuestions || 100} Qs</span>
                </div>
              </div>

              {/* Conditional Action Render Button footer pipeline */}
              <div className="w-full pt-2 border-t flex flex-col gap-2">
                {hasActiveSession ? (
                  /* FIX 4: Corrected dynamic conditional routing paths button text */
                  <Link href={`/exams/${category}/${examId}/mock/${test.id}`} className="w-full">
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin-slow" />
                      Resume Test
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/exams/${category}/${examId}/mock/${test.id}`} className="w-full">
                    <Button variant={hasCompletedAttempt ? "outline" : "default"} className="w-full font-semibold flex items-center justify-center gap-2">
                      {hasCompletedAttempt ? (
                        <>
                          <RefreshCw className="w-4 h-4" /> Re-attempt Test
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" /> Start Test
                        </>
                      )}
                    </Button>
                  </Link>
                )}

                {hasCompletedAttempt && (
                  <Link href={`/exams/${category}/${examId}/mock/${test.id}/result/${status.latestAttempt.attemptId}`} className="w-full">
                    <Button variant="ghost" size="sm" className="w-full text-xs text-primary font-medium flex items-center justify-center gap-1.5 hover:bg-primary/5">
                      <Award className="w-3.5 h-3.5" /> View Last Performance Report <ArrowRight className="w-3 h-3 ml-0.5" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
