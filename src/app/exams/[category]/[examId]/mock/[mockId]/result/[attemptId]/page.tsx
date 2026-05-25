"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, query, collection, where, orderBy, limit } from "firebase/firestore";
import { ResultPage } from "@/components/mock-test/ResultPage";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Loader2 } from "lucide-react";

export default function AttemptResultPage() {
  const { category, examId, mockId, attemptId } = useParams();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const [isSolutionsMode, setIsSolutionsMode] = useState(false);

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
        <button 
          onClick={() => router.push(`/exams/${category}/${examId}`)}
          className="px-6 py-2 bg-primary rounded-xl font-bold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1120]">
      {!isSolutionsMode && <Navbar />}
      
      <ResultPage
        testData={testData as any}
        responses={attempt.rawResponses}
        startTime={0}
        endTime={0}
        userLanguage={attempt.userLanguage}
        onReattempt={() => router.push(`/exams/${category}/${examId}/mock/${mockId}`)}
        onViewSolutions={() => {}} 
        dashboardUrl={`/exams/${category}/${examId}`}
        history={history || []}
        currentAttemptId={attemptId as string}
        onModeChange={setIsSolutionsMode}
      />

      {!isSolutionsMode && <Footer />}
    </div>
  );
}