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
import { ResultPage } from "@/components/mock-test/ResultPage";
import { SolutionInterface } from "@/components/mock-test/SolutionInterface";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp, collection, query } from "firebase/firestore";
import { Button } from "@/components/ui/button";

export type TestStep = 'instructions' | 'config' | 'test' | 'result' | 'solution';

export default function MockTestEnginePage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const mockId = params.mockId as string;
  
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();

  const [step, setStep] = useState<TestStep>('instructions');
  const [userLanguage, setUserLanguage] = useState<'en' | 'hn'>('en');
  const [responses, setResponses] = useState<Record<string, UserResponse>>({});
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [hasResumeData, setHasResumeData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // REAL DATA FETCHING
  const mockRef = useMemoFirebase(() => db ? doc(db, "mockTests", mockId) : null, [db, mockId]);
  const { data: mockMetadata, loading: mockLoading } = useDoc<any>(mockRef);

  const sectionsQuery = useMemoFirebase(() => db ? query(collection(db, "mockTests", mockId, "sections")) : null, [db, mockId]);
  const { data: sections, loading: sectionsLoading } = useCollection<any>(sectionsQuery);

  const questionsQuery = useMemoFirebase(() => db ? query(collection(db, "mockTests", mockId, "questions")) : null, [db, mockId]);
  const { data: questions, loading: questionsLoading } = useCollection<any>(questionsQuery);

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
      fullMarks:
        Number(mockMetadata.fullMarks) ||
        (questions || []).reduce(
          (acc: number, q: any) =>
            acc +
            Number(
              q?.marks?.positive ??
              q?.positiveMarks ??
              mockMetadata?.marksPerQuestion ??
              1
            ),
          0
        ),
      // Normalize sections
      sections: (sections && sections.length > 0) ? (sections || []).map((section: any, index: number) => ({
        ...section,
        id: section.id || `section_${index}`,
        title: section.title || { en: `Section ${index + 1}`, hn: `अनुभाग ${index + 1}` },
        questionCount: section.questionCount || 0,
      })) : [
        { id: 'default', title: { en: 'General', hn: 'सामान्य' } }
      ],
      // Normalize questions with robust mapping for Testbook-style JSON
      questions: (questions || [])
        .filter((q: any) => q && (q.question || q.en || q.en_html))
        .map((q: any, index: number) => {
          const base = q.question || q;
          const sol = q.explanation || q.solution || { en: "", hn: "" };
          
          return {
            ...q,
            id: q.id || q.questionId || `question_${index}`,
            en: base.en || q.en || "",
            hn: base.hn || q.hn || "",
            en_html: base.en_html || q.en_html || "",
            hn_html: base.hn_html || q.hn_html || "",
            order: q.order || index + 1,
            sectionId: q.sectionId || "default",
            options: (Array.isArray(q.options) ? q.options : []).map((option: any, optIndex: number) => ({
              ...option,
              id: Number(option.id) || optIndex + 1,
            })),
            answer: q.raw_answer_id ?? q.answer ?? null,
            correctOptionId: Number(q.raw_answer_id ?? q.answer ?? 0),
            marks: {
              positive:
                Number(
                  q?.marks?.positive ??
                  q?.positiveMarks ??
                  mockMetadata?.marksPerQuestion ??
                  1
                ),
              negative:
                Number(
                  q?.marks?.negative ??
                  q?.negativeMarks ??
                  mockMetadata?.negativeMarks ??
                  0
                ),
              skip:
                Number(
                  q?.marks?.skip ?? 0
                ),
            },
            positiveMarks:
              Number(
                q?.marks?.positive ??
                q?.positiveMarks ??
                mockMetadata?.marksPerQuestion ??
                1
              ),
            negativeMarks:
              Number(
                q?.marks?.negative ??
                q?.negativeMarks ??
                mockMetadata?.negativeMarks ??
                0
              ),
            explanation: typeof sol === 'object' ? {
              en: sol.en || "",
              hn: sol.hn || "",
              en_html: sol.en_html || "",
              hn_html: sol.hn_html || ""
            } : { en: sol, hn: "" }
          };
        })
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
    };
  }, [mockMetadata, sections, questions]);

  const dashboardUrl = `/exams/${examId}`;

  // Check for resume data and initialize responses
  useEffect(() => {
    const initialize = async () => {
      if (!testData || !user || !db) return;
      
      // Initialize default empty responses if not already set
      if (Object.keys(responses).length === 0) {
        const initialResponses: Record<string, UserResponse> = {};
        (testData.questions || []).forEach((q: any) => {
          initialResponses[q.id] = {
            questionId: q.id || q.questionId || crypto.randomUUID(),
            selectedOptionId: null,
            status: 'not-visited',
            timeSpentSeconds: 0
          };
        });
        setResponses(initialResponses);
      }

      // Check cloud progress
      try {
        const progressRef = doc(db, 'progress', user.uid, 'activeTests', mockId);
        const progressSnap = await getDoc(progressRef);
        if (progressSnap.exists() && step === 'instructions') {
          setHasResumeData(true);
        }
      } catch (e) {
        console.warn("MockEngine: Failed to fetch cloud progress.");
      }
    };

    initialize();
  }, [testData, user, db, mockId]);

  // Periodic Auto-Save
  useEffect(() => {
    if (step === 'test' && user && db && testData) {
      const interval = setInterval(async () => {
        try {
          const progressRef = doc(db, 'progress', user.uid, 'activeTests', mockId);
          await setDoc(progressRef, {
            uid: user.uid,
            testId: mockId,
            responses,
            userLanguage,
            startTime,
            lastUpdated: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.warn("MockEngine: Auto-save failed.");
        }
      }, 30000); 
      return () => clearInterval(interval);
    }
  }, [step, user, db, mockId, responses, userLanguage, startTime, testData]);

  const handleResume = async () => {
    if (!user || !db || !testData) return;
    try {
      const progressRef = doc(db, 'progress', user.uid, 'activeTests', mockId);
      const snap = await getDoc(progressRef);
      if (snap.exists()) {
        const data = snap.data();
        setResponses(data.responses);
        setUserLanguage(data.userLanguage);
        setStartTime(data.startTime);
        
        const duration = testData.durationMinutes * 60 * 1000;
        const testEndTime = (data.startTime || Date.now()) + duration;
        localStorage.setItem(`test_end_${mockId}`, testEndTime.toString());
        setStep('test');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartTest = (lang: 'en' | 'hn') => {
    if (!testData) return;
    setUserLanguage(lang);
    setStartTime(Date.now());
    const testEndTime = Date.now() + (testData.durationMinutes * 60 * 1000);
    localStorage.setItem(`test_end_${mockId}`, testEndTime.toString());
    setStep('test');
  };

  const handleSubmitTest = async () => {
    setEndTime(Date.now());
    localStorage.removeItem(`test_end_${mockId}`);
    if (user && db) {
      try {
        await deleteDoc(doc(db, 'progress', user.uid, 'activeTests', mockId));
      } catch (e) {}
    }
    setStep('result');
  };

  const handleReattempt = async () => {
    if (user && db) {
      try {
        await deleteDoc(doc(db, 'progress', user.uid, 'activeTests', mockId));
      } catch (e) {}
    }
    localStorage.removeItem(`test_end_${mockId}`);
    setResponses({});
    setStartTime(null);
    setEndTime(null);
    setHasResumeData(false);
    setStep('instructions');
  };

  const isLoading = userLoading || mockLoading || sectionsLoading || questionsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse text-xs font-bold uppercase tracking-widest">Loading Test Content...</p>
      </div>
    );
  }

  // PREVENT EMPTY TEST CRASH
  if (!testData || !testData.questions || testData.questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-2xl font-bold">No Questions Found</h2>
        <p className="text-muted-foreground max-w-md">
          This mock test exists but no valid questions were loaded.
          The uploaded content may be malformed or incomplete.
        </p>
        <Button onClick={() => router.push(dashboardUrl)}>Return to Dashboard</Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b1120] text-foreground">
      {hasResumeData && step === 'instructions' && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="glass border-white/10 p-8 rounded-[2.5rem] max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto text-primary">
              <RefreshCw className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-headline font-bold">Resume Ongoing Test?</h2>
            <p className="text-muted-foreground text-sm">
              We found an ongoing attempt for <strong>{testData.title}</strong>. Would you like to pick up where you left off?
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={handleResume} className="w-full h-12 rounded-xl bg-primary font-bold">Resume Attempt</Button>
              <Button onClick={handleReattempt} variant="outline" className="w-full h-12 rounded-xl border-white/10">Start Fresh</Button>
            </div>
          </div>
        </div>
      )}

      {step === 'instructions' && (
        <InstructionsStep 
          testData={testData} 
          onNext={() => setStep('config')} 
        />
      )}
      
      {step === 'config' && (
        <ConfigStep 
          testData={testData} 
          onBack={() => setStep('instructions')}
          onStart={handleStartTest}
        />
      )}

      {step === 'test' && (
        <TestInterface 
          testData={testData}
          userLanguage={userLanguage}
          responses={responses}
          setResponses={setResponses}
          onSubmit={handleSubmitTest}
        />
      )}

      {step === 'result' && (
        <ResultPage 
          testData={testData}
          responses={responses}
          startTime={startTime!}
          endTime={endTime!}
          userLanguage={userLanguage}
          onReattempt={handleReattempt}
          onViewSolutions={() => setStep('solution')}
          dashboardUrl={dashboardUrl}
        />
      )}

      {step === 'solution' && (
        <SolutionInterface 
          testData={testData}
          userLanguage={userLanguage}
          responses={responses}
          onBack={() => setStep('result')}
        />
      )}
    </main>
  );
}