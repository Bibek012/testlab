"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  MockTestData,
  UserResponse
} from "@/lib/mock-test-engine-data";
import { InstructionsStep } from "@/components/mock-test/InstructionsStep";
import { ConfigStep } from "@/components/mock-test/ConfigStep";
import { TestInterface } from "@/components/mock-test/TestInterface";
import { SolutionInterface } from "@/components/mock-test/SolutionInterface";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { doc, setDoc, deleteDoc, serverTimestamp, collection, query } from "firebase/firestore";
import { Button } from "@/components/ui/button";

export type TestStep = 'instructions' | 'config' | 'test' | 'solution';

export default function MockTestEnginePage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const mockId = params.mockId as string;
  const category = params.category as string;

  const { user, loading: userLoading } = useUser();
  const db = useFirestore();

  const [step, setStep] = useState<TestStep>('instructions');
  const [userLanguage, setUserLanguage] = useState<'en' | 'hn'>('en');
  const [responses, setResponses] = useState<Record<string, UserResponse>>({});
  const [startTime, setStartTime] = useState<number | null>(null);
  const [hasResumeData, setHasResumeData] = useState(false);

  // FETCH CORE DATA
  const mockRef = useMemoFirebase(() => db ? doc(db, "mockTests", mockId) : null, [db, mockId]);
  const { data: mockMetadata, loading: mockLoading } = useDoc<any>(mockRef);

  const sectionsQuery = useMemoFirebase(() => db ? query(collection(db, "mockTests", mockId, "sections")) : null, [db, mockId]);
  const { data: sections, loading: sectionsLoading } = useCollection<any>(sectionsQuery);

  const questionsQuery = useMemoFirebase(() => db ? query(collection(db, "mockTests", mockId, "questions")) : null, [db, mockId]);
  const { data: questions, loading: questionsLoading } = useCollection<any>(questionsQuery);

  // CRITICAL: ROBUST NORMALIZATION ENGINE
  const testData = useMemo<MockTestData | null>(() => {
    if (!mockMetadata || !questions) return null;

    return {
      id: mockMetadata.id,
      title: mockMetadata.title,
      examId: mockMetadata.examId,
      examName: mockMetadata.examName || mockMetadata.examId,
      durationMinutes: mockMetadata.durationMinutes || 90,
      marksPerQuestion: Number(mockMetadata.marksPerQuestion || 1),
      negativeMarks: Number(mockMetadata.negativeMarks || 0),
      fullMarks: Number(mockMetadata.fullMarks) || (questions.length * Number(mockMetadata.marksPerQuestion || 1)),

      sections: (sections && sections.length > 0) ? (sections || []).map((section: any, index: number) => ({
        ...section,
        id: section.id || `section_${index}`,
        title: section.title || { en: `Section ${index + 1}`, hn: `अनुभाग ${index + 1}` },
        questionCount: section.questionCount || 0,
      })) : [{ id: 'default', title: { en: 'General', hn: 'सामान्य' } }],

      questions: (questions || [])
        .filter((q: any) => q && (q.question || q.en || q.en_html))
        .map((q: any, index: number) => {
          const base = q.question || q;
          const sol = q.explanation || q.solution || { en: "", hn: "" };

          const options = (Array.isArray(q.options) ? q.options : []).map((opt: any, optIndex: number) => ({
            ...opt,
            id: opt.id !== undefined ? String(opt.id) : String(optIndex + 1),
          }));

          return {
            ...q,
            id: q.id || q.questionId || `question_${index}`,
            en: base.en || q.en || "",
            hn: base.hn || q.hn || "",
            en_html: base.en_html || q.en_html || "",
            hn_html: base.hn_html || q.hn_html || "",
            order: q.order || index + 1,
            sectionId: q.sectionId || "default",
            options,
            correctOptionId: String(q.correctOptionId || q.raw_answer_id || q.answer || ""),
            marks: {
              positive: Number(mockMetadata?.marksPerQuestion ?? 1),
              negative: Number(mockMetadata?.negativeMarks ?? 0),
              skip: Number(q?.marks?.skip ?? 0),
            },
            explanation: typeof sol === 'object' ? {
              en: sol.en || "",
              hn: sol.hn || "",
              en_html: sol.en_html || "",
              hn_html: sol.hn_html || ""
            } : { en: sol, hn: "" },
          };
        }).sort((a, b) => (a.order || 0) - (b.order || 0))
    };
  }, [mockMetadata, sections, questions]);

  const dashboardUrl = `/exams/${category || 'all'}/${examId}`;

  // INITIALIZE RESPONSES & CHECK RESUME
  useEffect(() => {
    if (!testData || !user || !db) return;

    if (Object.keys(responses).length === 0) {
      const initial: Record<string, UserResponse> = {};
      (testData.questions || []).forEach((q: any) => {
        initial[q.id] = {
          questionId: q.id,
          selectedOptionId: null,
          status: 'not-visited',
          timeSpentSeconds: 0
        };
      });
      setResponses(initial);
    }

    const checkResume = async () => {
      try {
        const snap = await doc(db, 'progress', user.uid, 'activeTests', mockId);
        const res = localStorage.getItem(`test_progress_${mockId}`);
        if (res || (await (await setDoc(snap, {}, {merge: true}) as any))) {
          setHasResumeData(true);
        }
      } catch (e) { }
    };
    checkResume();
  }, [testData, user, db, mockId]);

  const handleResume = async () => {
    if (!user || !db || !testData) return;
    const progressRef = doc(db, 'progress', user.uid, 'activeTests', mockId);
    const snap = await (await fetch(`/api/noop`)).status === 200 ? { exists: () => false, data: () => ({}) } : null; // Logic placeholder
    
    // In actual implementation, we read from Firestore
    // For brevity, using the doc fetch logic
    const actualSnap = await (await import('firebase/firestore')).getDoc(progressRef);

    if (actualSnap.exists()) {
      const data = actualSnap.data();
      setResponses(data.responses);
      setUserLanguage(data.userLanguage);
      setStartTime(data.startTime);
      setStep('test');
    }
  };

  const handleStartTest = (lang: 'en' | 'hn') => {
    setUserLanguage(lang);
    setStartTime(Date.now());
    setStep('test');
  };

  const handleSubmitTest = async () => {
    if (!user || !db || !testData) return;

    const attemptId = crypto.randomUUID();
    const endTime = Date.now();
    
    // Calculate basic stats for the attempt record
    let correct = 0, incorrect = 0, totalScore = 0;
    testData.questions.forEach(q => {
      const resp = responses[q.id];
      if (resp?.selectedOptionId === q.correctOptionId) {
        correct++;
        totalScore += testData.marksPerQuestion;
      } else if (resp?.selectedOptionId) {
        incorrect++;
        totalScore -= testData.negativeMarks;
      }
    });

    const attempted = correct + incorrect;
    const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;

    try {
      const attemptData = {
        mockId,
        examId: testData.examId,
        examName: testData.examName,
        totalQuestions: testData.questions.length,
        attempted,
        correct,
        wrong: incorrect,
        unattempted: testData.questions.length - attempted,
        score: totalScore,
        totalMarks: testData.fullMarks,
        accuracy,
        percentage: (totalScore / testData.fullMarks) * 100,
        timeTakenSeconds: Math.floor((endTime - (startTime || endTime)) / 1000),
        completedAt: serverTimestamp(),
        userLanguage,
        rawResponses: responses
      };

      await setDoc(doc(db, "users", user.uid, "attempts", attemptId), attemptData);
      await deleteDoc(doc(db, 'progress', user.uid, 'activeTests', mockId));
      localStorage.removeItem(`test_progress_${mockId}`);
      localStorage.removeItem(`test_end_${mockId}`);

      router.push(`${dashboardUrl}/mock/${mockId}/result/${attemptId}`);
    } catch (e) {
      console.error("Submission failed", e);
    }
  };

  if (userLoading || mockLoading || sectionsLoading || questionsLoading) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse text-xs font-bold uppercase tracking-widest">Loading Test...</p>
      </div>
    );
  }

  if (!testData || testData.questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-2xl font-bold">No Questions Found</h2>
        <Button onClick={() => router.push(dashboardUrl)}>Return to Dashboard</Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b1120] text-foreground">
      {hasResumeData && step === 'instructions' && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="glass border-white/10 p-8 rounded-[2.5rem] max-w-md w-full text-center space-y-6">
            <RefreshCw className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-2xl font-headline font-bold">Resume Attempt?</h2>
            <div className="flex flex-col gap-3">
              <Button onClick={handleResume} className="w-full h-12 bg-primary">Resume Test</Button>
              <Button onClick={() => setHasResumeData(false)} variant="outline" className="w-full h-12">Start Fresh</Button>
            </div>
          </div>
        </div>
      )}

      {step === 'instructions' && <InstructionsStep testData={testData} onNext={() => setStep('config')} />}
      {step === 'config' && <ConfigStep testData={testData} onBack={() => setStep('instructions')} onStart={handleStartTest} />}
      {step === 'test' && (
        <TestInterface
          testData={testData}
          userLanguage={userLanguage}
          responses={responses}
          setResponses={setResponses}
          onSubmit={handleSubmitTest}
        />
      )}
    </main>
  );
}
