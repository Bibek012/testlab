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
      
      sections: (sections && sections.length > 0) ? sections.map((s: any, i: number) => ({
        ...s,
        id: s.id || `section_${i}`,
        title: s.title || { en: `Section ${i + 1}`, hn: `अनुभाग ${i + 1}` },
      })) : [{ id: 'default', title: { en: 'General', hn: 'सामान्य' } }],

      questions: questions.map((q: any, index: number) => {
        const base = q.question || q;
        const sol = q.explanation || q.solution || { en: "", hn: "" };
        
        // 1. Normalize Options: Ensure every option has a numeric ID
        const options = (Array.isArray(q.options) ? q.options : []).map((opt: any, optIndex: number) => ({
          ...opt,
          id: opt.id !== undefined ? Number(opt.id) : optIndex + 1,
        }));

        // 2. Resolve Correct Answer ID: STRATEGIC LOOKUP
        let resolvedCorrectId = 0;
        const rawId = q.raw_answer_id;
        const rawAns = q.answer;

        if (rawId !== undefined && rawId !== null && !isNaN(Number(rawId))) {
          // Priority 1: raw_answer_id (Numeric ID)
          resolvedCorrectId = Number(rawId);
        } else if (rawAns !== undefined && rawAns !== null) {
          // Priority 2: Match answer text to option text to find ID
          const answerText = String(rawAns).trim().toLowerCase();
          const match = options.find(o => 
            String(o.en || "").trim().toLowerCase() === answerText || 
            String(o.hn || "").trim().toLowerCase() === answerText ||
            String(o.text || "").trim().toLowerCase() === answerText
          );
          if (match) {
            resolvedCorrectId = Number(match.id);
          } else if (!isNaN(Number(rawAns))) {
            // Fallback: If text is actually a number, use it as ID
            resolvedCorrectId = Number(rawAns);
          }
        }

        return {
          ...q,
          id: q.id,
          en: base.en || q.en || "",
          hn: base.hn || q.hn || "",
          en_html: base.en_html || q.en_html || "",
          hn_html: base.hn_html || q.hn_html || "",
          order: q.order || index + 1,
          sectionId: q.sectionId || "default",
          options,
          correctOptionId: resolvedCorrectId,
          marks: {
            positive: Number(q?.marks?.positive ?? mockMetadata?.marksPerQuestion ?? 1),
            negative: Number(q?.marks?.negative ?? mockMetadata?.negativeMarks ?? 0),
            skip: Number(q?.marks?.skip ?? 0),
          },
          explanation: typeof sol === 'object' ? {
            en: sol.en || "",
            hn: sol.hn || "",
            en_html: sol.en_html || "",
            hn_html: sol.hn_html || ""
          } : { en: sol, hn: "" }
        };
      }).sort((a, b) => a.order - b.order)
    };
  }, [mockMetadata, sections, questions]);

  const dashboardUrl = `/exams/all/${mockMetadata?.slug || ''}`;

  // INITIALIZE RESPONSES
  useEffect(() => {
    if (!testData || !user || !db) return;
    
    if (Object.keys(responses).length === 0) {
      const initial: Record<string, UserResponse> = {};
      testData.questions.forEach(q => {
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
        const snap = await getDoc(doc(db, 'progress', user.uid, 'activeTests', mockId));
        if (snap.exists() && step === 'instructions') setHasResumeData(true);
      } catch (e) {}
    };
    checkResume();
  }, [testData, user, db, mockId]);

  const handleResume = async () => {
    if (!user || !db || !testData) return;
    const snap = await getDoc(doc(db, 'progress', user.uid, 'activeTests', mockId));
    if (snap.exists()) {
      const data = snap.data();
      setResponses(data.responses);
      setUserLanguage(data.userLanguage);
      setStartTime(data.startTime);
      localStorage.setItem(`test_end_${mockId}`, (data.startTime + (testData.durationMinutes * 60 * 1000)).toString());
      setStep('test');
    }
  };

  const handleStartTest = (lang: 'en' | 'hn') => {
    setUserLanguage(lang);
    setStartTime(Date.now());
    localStorage.setItem(`test_end_${mockId}`, (Date.now() + (testData!.durationMinutes * 60 * 1000)).toString());
    setStep('test');
  };

  const handleSubmitTest = async () => {
    setEndTime(Date.now());
    localStorage.removeItem(`test_end_${mockId}`);
    if (user) await deleteDoc(doc(db, 'progress', user.uid, 'activeTests', mockId)).catch(() => {});
    setStep('result');
  };

  const handleReattempt = () => {
    setResponses({});
    setStartTime(null);
    setEndTime(null);
    setHasResumeData(false);
    setStep('instructions');
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
        <h2 className="text-2xl font-bold">Incomplete Data</h2>
        <p className="text-muted-foreground">The test questions could not be resolved correctly.</p>
        <Button onClick={() => router.push('/exams/all')}>Return Home</Button>
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
              <Button onClick={handleReattempt} variant="outline" className="w-full h-12">Start Fresh</Button>
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