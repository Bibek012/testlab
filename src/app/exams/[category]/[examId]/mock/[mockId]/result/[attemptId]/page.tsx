"use client";

import React, { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, query, collection, where, orderBy, limit } from "firebase/firestore";
import { ResultPage } from "@/components/mock-test/ResultPage";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Loader2, History, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function AttemptResultPage() {
  const { category, examId, mockId, attemptId } = useParams();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();

  // 1. FETCH TARGET ATTEMPT
  const attemptRef = useMemoFirebase(() => 
    (db && user) ? doc(db, "users", user.uid, "mockAttempts", attemptId as string) : null,
  [db, user?.uid, attemptId]);
  const { data: attempt, loading: attemptLoading } = useDoc<any>(attemptRef);

  // 2. FETCH MOCK CONTENT (KEYS)
  const mockRef = useMemoFirebase(() => db ? doc(db, "mockTests", mockId as string) : null, [db, mockId]);
  const { data: mockMetadata, loading: mockLoading } = useDoc<any>(mockRef);

  const questionsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "mockTests", mockId as string, "questions")) : null, 
  [db, mockId]);
  const { data: questions, loading: questionsLoading } = useCollection<any>(questionsQuery);

  // 3. FETCH ATTEMPT HISTORY (Switcher)
  const historyQuery = useMemoFirebase(() => 
    (db && user) ? query(
      collection(db, "users", user.uid, "mockAttempts"),
      where("mockId", "==", mockId),
      orderBy("completedAt", "desc"),
      limit(10)
    ) : null,
  [db, user?.uid, mockId]);
  const { data: history } = useCollection<any>(historyQuery);

  const testData = useMemo(() => {
    if (!mockMetadata || !questions) return null;
    return {
      ...mockMetadata,
      questions: questions.map(q => ({
        ...q,
        correctOptionId: String(q.correctOptionId || q.raw_answer_id || q.answer || "")
      }))
    };
  }, [mockMetadata, questions]);

  if (userLoading || attemptLoading || mockLoading || questionsLoading) {
    return (
      <div className="h-screen bg-[#0b1120] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse text-xs font-bold uppercase tracking-widest">Generating Analysis...</p>
      </div>
    );
  }

  if (!attempt || !testData) {
    return (
      <div className="h-screen bg-[#0b1120] flex flex-col items-center justify-center p-6 text-center gap-4">
        <h2 className="text-2xl font-bold">Analysis Not Found</h2>
        <Button onClick={() => router.push(`/exams/${category}/${examId}`)}>Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1120]">
      <Navbar />
      
      {/* Attempt Switcher Floating Hub */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full glass border-white/10 rounded-full h-10 gap-2 font-bold text-[10px] uppercase tracking-widest shadow-2xl">
              <History className="w-3.5 h-3.5 text-primary" />
              Attempt: {attempt.completedAt?.toDate ? format(attempt.completedAt.toDate(), "MMM dd, HH:mm") : 'Processing'}
              <ChevronDown className="w-3.5 h-3.5 ml-auto opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[300px] glass border-white/10" align="center">
            {history?.map((h) => (
              <DropdownMenuItem 
                key={h.id} 
                className={cn(
                  "flex items-center justify-between py-3 cursor-pointer",
                  h.id === attemptId && "bg-primary/10"
                )}
                onClick={() => router.push(`/exams/${category}/${examId}/mock/${mockId}/result/${h.id}`)}
              >
                <div className="flex flex-col">
                  <span className="font-bold text-xs">{format(h.completedAt.toDate(), "MMM dd, yyyy")}</span>
                  <span className="text-[10px] text-muted-foreground">{format(h.completedAt.toDate(), "HH:mm")}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-accent">{h.score.toFixed(1)}</div>
                  <div className="text-[9px] text-muted-foreground">{h.accuracy.toFixed(0)}% Acc</div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ResultPage
        testData={testData as any}
        responses={attempt.rawResponses}
        startTime={0}
        endTime={0}
        userLanguage={attempt.userLanguage}
        onReattempt={() => router.push(`/exams/${category}/${examId}/mock/${mockId}`)}
        onViewSolutions={() => {}} 
        dashboardUrl={`/exams/${category}/${examId}`}
      />
      <Footer />
    </div>
  );
}
