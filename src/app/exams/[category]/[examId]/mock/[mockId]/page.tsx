"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { MockTestData, UserResponse } from "@/lib/mock-test-engine-data";
import InstructionsStep from "@/components/mock-test/InstructionsStep";
import { ConfigStep } from "@/components/mock-test/ConfigStep";
import { TestInterface } from "@/components/mock-test/TestInterface";
import { Loader2, AlertCircle } from "lucide-react";
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  getDoc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";

export type TestStep = "instructions" | "config" | "test";

export default function MockTestEnginePage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const mockId = params.mockId as string;
  const category = params.category as string;

  const { user, loading: userLoading } = useUser();
  const db = useFirestore();

  const [step, setStep] = useState<TestStep>("instructions");
  const [stepInitialized, setStepInitialized] = useState(false);

  // Test session state
  const [responses, setResponses] = useState<Record<string, UserResponse>>({});
  const [startTime, setStartTime] = useState<number | null>(null);
  const [userLanguage, setUserLanguage] = useState<"en" | "hn">("en");

  // Cloud resume modal
  const [hasResumeData, setHasResumeData] = useState(false);

  // ─── localStorage restore ───
  useEffect(() => {
    if (!mockId || stepInitialized) return;
    setStepInitialized(true);

    const isActive = localStorage.getItem(`test_active_${mockId}`);
    const savedProgress = localStorage.getItem(`test_progress_${mockId}`);
    const savedStart = localStorage.getItem(`test_start_${mockId}`);

    if (isActive === "true" && savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        if (parsed.responses) setResponses(parsed.responses);
        if (parsed.userLanguage) setUserLanguage(parsed.userLanguage);
        if (savedStart) setStartTime(parseInt(savedStart, 10));
        else if (parsed.startedAt) setStartTime(parsed.startedAt);
        setStep("test");
      } catch (e) {
        localStorage.removeItem(`test_active_${mockId}`);
        localStorage.removeItem(`test_progress_${mockId}`);
        localStorage.removeItem(`test_end_${mockId}`);
        localStorage.removeItem(`test_start_${mockId}`);
      }
    }
  }, [mockId, stepInitialized]);

  // ─── Auth protection ───
  useEffect(() => {
    if (!userLoading && !user) {
      const callback = encodeURIComponent(window.location.pathname);
      router.replace(`/signin?callbackUrl=${callback}`);
    }
  }, [user, userLoading, router]);

  // ─── Firestore fetch ───
  const mockRef = useMemoFirebase(
    () => (db ? doc(db, "mockTests", mockId) : null),
    [db, mockId]
  );
  const { data: mockMetadata, loading: mockLoading } = useDoc<any>(mockRef);

  const sectionsQuery = useMemoFirebase(
    () => db ? query(collection(db, "mockTests", mockId, "sections")) : null,
    [db, mockId]
  );
  const { data: sections, loading: sectionsLoading } = useCollection<any>(sectionsQuery);

  const questionsQuery = useMemoFirebase(
    () => db ? query(collection(db, "mockTests", mockId, "questions")) : null,
    [db, mockId]
  );
  const { data: questions, loading: questionsLoading } = useCollection<any>(questionsQuery);

  // ─── sectionId inject (agar Firestore questions mein sectionId nahi hai) ───
  const questionsWithSectionId = useMemo(() => {
    if (!questions || !sections || sections.length === 0) return questions;

    // Check karo kisi question mein valid sectionId hai ya nahi
    const hasSectionId = questions.some(
      (q) => q.sectionId && q.sectionId !== "default"
    );
    if (hasSectionId) return questions;

    // sectionId nahi hai — sections ke questionCount se assign karo
    const result = questions.map((q) => ({ ...q }));
    let idx = 0;
    for (const section of sections) {
      const count = section.questionCount || 0;
      for (let i = idx; i < idx + count && i < result.length; i++) {
        result[i].sectionId = section.id;
      }
      idx += count;
    }
    return result;
  }, [questions, sections]);

  // ─── testData assemble ───
  const testData = useMemo<MockTestData | null>(() => {
    if (!mockMetadata || !questionsWithSectionId) return null;
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
        questionsWithSectionId.length * Number(mockMetadata.marksPerQuestion || 1),
      sections:
        sections && sections.length > 0
          ? sections.map((section: any, index: number) => ({
              ...section,
              id: section.id || `section_${index}`,
              title: section.title || { en: `Section ${index + 1}`, hn: `अनुभाग ${index + 1}` },
              questionCount: section.questionCount || 0,
            }))
          : [{ id: "default", title: { en: "General", hn: "सामान्य" } }],
      questions: questionsWithSectionId
        .filter((q: any) => q && (q.question || q.en || q.en_html))
        .map((q: any, index: number) => {
          const base = q.question || q;
          const sol = q.explanation || q.solution || { en: "", hn: "" };
          const options = (Array.isArray(q.options) ? q.options : []).map(
            (opt: any, optIndex: number) => ({
              ...opt,
              id: opt.id !== undefined ? String(opt.id) : String(optIndex + 1),
            })
          );
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
              negative: Number(mockMetadata?.negativeMarks ?? 0.33),
              skip: Number(q?.marks?.skip ?? 0),
            },
            explanation:
              typeof sol === "object"
                ? { en: sol.en || "", hn: sol.hn || "", en_html: sol.en_html || "", hn_html: sol.hn_html || "" }
                : { en: sol, hn: "" },
          };
        })
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
    };
  }, [mockMetadata, sections, questionsWithSectionId]);

  const dashboardUrl = `/exams/${category || "all"}/${examId}`;

  // ─── Cloud resume check ───
  useEffect(() => {
    if (!user || !db || !mockId || !stepInitialized) return;
    const isLocallyActive = localStorage.getItem(`test_active_${mockId}`);
    if (isLocallyActive === "true") return;

    const checkCloud = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid, "activeMocks", mockId));
        if (snap.exists()) setHasResumeData(true);
      } catch (_) {}
    };
    checkCloud();
  }, [user, db, mockId, stepInitialized]);

  // ─── Resume from cloud ───
  const handleResume = async () => {
    if (!user || !db || !testData) return;
    try {
      const snap = await getDoc(doc(db, "users", user.uid, "activeMocks", mockId));
      if (snap.exists()) {
        const data = snap.data();
        localStorage.setItem(`test_active_${mockId}`, "true");
        localStorage.setItem(`test_progress_${mockId}`, JSON.stringify(data));
        if (data.endTime) localStorage.setItem(`test_end_${mockId}`, String(data.endTime));
        if (data.startedAt) localStorage.setItem(`test_start_${mockId}`, String(data.startedAt));
        setResponses(data.responses || {});
        setUserLanguage(data.userLanguage || "en");
        setStartTime(data.startedAt || Date.now());
        setHasResumeData(false);
        setStep("test");
      }
    } catch (e) {
      console.error("Resume failed:", e);
    }
  };

  // ─── Fresh start ───
  const handleFreshStart = async () => {
    if (user && db) {
      try { await deleteDoc(doc(db, "users", user.uid, "activeMocks", mockId)); } catch (_) {}
    }
    localStorage.removeItem(`test_active_${mockId}`);
    localStorage.removeItem(`test_progress_${mockId}`);
    localStorage.removeItem(`test_end_${mockId}`);
    localStorage.removeItem(`test_start_${mockId}`);
    setResponses({});
    setHasResumeData(false);
  };

  // ─── Start test ───
  const handleStartTest = (lang: "en" | "hn") => {
    const now = Date.now();
    setUserLanguage(lang);
    setStartTime(now);
    localStorage.setItem(`test_start_${mockId}`, String(now));
    localStorage.setItem(`test_active_${mockId}`, "true");
    setStep("test");
  };

  // ─── Submit test ───
  const handleSubmitTest = async () => {
    if (!user || !db || !testData) return;
    const attemptId = crypto.randomUUID();
    const endTime = Date.now();
    let correct = 0, incorrect = 0, totalScore = 0;
    testData.questions.forEach((q) => {
      const resp = responses[q.id];
      if (!resp?.selectedOptionId) return;
      if (resp.selectedOptionId === q.correctOptionId) { correct++; totalScore += testData.marksPerQuestion; }
      else { incorrect++; totalScore -= testData.negativeMarks; }
    });
    const attempted = correct + incorrect;
    try {
      await setDoc(doc(db, "users", user.uid, "mockAttempts", attemptId), {
        attemptId, uid: user.uid, mockId,
        examId: testData.examId, examName: testData.examName, mockTitle: testData.title,
        score: totalScore, totalMarks: testData.fullMarks, correct, wrong: incorrect,
        unattempted: testData.questions.length - attempted,
        accuracy: attempted > 0 ? (correct / attempted) * 100 : 0,
        percentage: (totalScore / testData.fullMarks) * 100,
        timeTakenSeconds: Math.floor((endTime - (startTime || endTime)) / 1000),
        completedAt: serverTimestamp(), userLanguage, rawResponses: responses,
      });
      await deleteDoc(doc(db, "users", user.uid, "activeMocks", mockId));
      localStorage.removeItem(`test_progress_${mockId}`);
      localStorage.removeItem(`test_end_${mockId}`);
      localStorage.removeItem(`test_start_${mockId}`);
      localStorage.removeItem(`test_active_${mockId}`);
      router.push(`${dashboardUrl}/mock/${mockId}/result/${attemptId}`);
    } catch (e) {
      console.error("Submission failed:", e);
    }
  };

  // ─── Loading ───
  if (userLoading || mockLoading || sectionsLoading || questionsLoading) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse text-xs font-bold uppercase tracking-widest">
          Warming Engine...
        </p>
      </div>
    );
  }

  if (!user) return null;

  if (!testData || testData.questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-2xl font-bold">Module Data Missing</h2>
        <Button onClick={() => router.push(dashboardUrl)}>Return to Dashboard</Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b1120] text-foreground">
      {/* Resume Modal */}
      {hasResumeData && step === "instructions" && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="glass border-white/10 p-8 rounded-[2.5rem] max-w-md w-full text-center space-y-6">
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-pulse" />
            <h2 className="text-2xl font-headline font-bold">Resume Previous Attempt?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We found an active session for <strong>{testData.title}</strong>. Continue where you left off?
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={handleResume} className="w-full h-12 bg-primary">Resume Attempt</Button>
              <Button onClick={handleFreshStart} variant="outline" className="w-full h-12">Start Fresh</Button>
            </div>
          </div>
        </div>
      )}

      {step === "instructions" && (
        <InstructionsStep
          testData={testData}
          userLanguage={userLanguage}
          onStart={() => setStep("config")}
        />
      )}
      {step === "config" && (
        <ConfigStep testData={testData} onBack={() => setStep("instructions")} onStart={handleStartTest} />
      )}
      {step === "test" && (
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
