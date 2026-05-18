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
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp, collection, query, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";

export type TestStep = 'instructions' | 'config' | 'test' | 'result' | 'solution';

export default function MockTestEnginePage() {
  const params = useParams();
  const router = useRouter();
  const category = params.category as string;
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

  const sectionsQuery = useMemoFirebase(() => db ? query(collection(db, "mockTests", mockId, "sections"), orderBy("id", "asc")) : null, [db, mockId]);
  const { data: sections, loading: sectionsLoading } = useCollection<any>(sectionsQuery);

  const questionsQuery = useMemoFirebase(() => db ? query(collection(db, "mockTests", mockId, "questions"), orderBy("id", "asc")) : null, [db, mockId]);
  const { data: questions, loading: questionsLoading } = useCollection<any>(questionsQuery);

  const testData = useMemo<MockTestData | null>(() => {
    if (!mockMetadata || !sections || !questions) return null;
    return {
      id: mockMetadata.id,
      title: mockMetadata.title,
      examName: mockMetadata.examId,
      durationMinutes: mockMetadata.durationMinutes || 90,
      sections: sections,
      questions: questions
    };
  }, [mockMetadata, sections, questions]);

  const dashboardUrl = `/exams/${category}/${examId}`;

  // Check for resume data and initialize responses
  useEffect(() => {
    const initialize = async () => {
      if (!testData || !user || !db) return;
      
      // Initialize default empty responses if not already set
      if (Object.keys(responses).length === 0) {
        const initialResponses: Record<string, UserResponse> = {};
        testData.questions.forEach(q => {
          initialResponses[q.id] = {
            questionId: q.id,
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

  if (!testData) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-bold">Mock Test Not Found</h2>
        <p className="text-muted-foreground">The test might have been unpublished or removed by admins.</p>
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
