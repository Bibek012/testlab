"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { MockTestData, UserResponse } from "@/lib/mock-test-engine-data";
import { InstructionsStep } from "@/components/mock-test/InstructionsStep";
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

  // ─────────────────────────────────────────────────────────
  // BUG 1 FIX:
  // Pehle yahan lazy initializer tha jo mockId use karta tha:
  //   useState<TestStep>(() => {
  //     const isActive = localStorage.getItem(`test_active_${mockId}`)
  //     ...
  //   })
  //
  // Problem: Next.js mein useParams() se aane wala mockId
  // component ke FIRST render par kabhi kabhi "undefined" hota hai
  // (SSR + hydration timing). Lazy initializer sirf ONCE chalta hai
  // — isliye jab mockId undefined hota hai, "test_active_undefined"
  // check hota hai jo null return karta hai, aur step hamesha
  // 'instructions' pe aa jaata tha.
  //
  // FIX: step ko 'instructions' se initialize karo, aur ek alag
  // useEffect mein — jab mockId actually available ho — localStorage
  // check karke sahi step set karo.
  // ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<TestStep>("instructions");
  const [stepInitialized, setStepInitialized] = useState(false);

 

  // ─────────────────────────────────────────────────────────
  // BUG 1 FIX (continued):
  // responses, startTime, aur userLanguage bhi pehle lazy
  // initializer se load ho rahe the — wahi problem thi: mockId
  // undefined hone par localStorage se kuch nahi milta tha.
  //
  // Ab inhe bhi separate useEffect mein mockId milne ke baad load
  // karo.
  // ─────────────────────────────────────────────────────────
  const [responses, setResponses] = useState<Record<string, UserResponse>>({});
  const [startTime, setStartTime] = useState<number | null>(null);
  const [userLanguage, setUserLanguage] = useState<"en" | "hn">("en");
  const [hydrated, setHydrated] = useState(false);

  

  useEffect(() => {
  if (!mockId || stepInitialized) return;

  const isActive = localStorage.getItem(`test_active_${mockId}`);
  const savedProgress = localStorage.getItem(`test_progress_${mockId}`);
  const savedStart = localStorage.getItem(`test_start_${mockId}`);

  if (isActive && savedProgress) {
    try {
      const parsed = JSON.parse(savedProgress);

      if (parsed.responses) {
        setResponses(parsed.responses);
      }

      if (parsed.userLanguage) {
        setUserLanguage(parsed.userLanguage);
      }

      if (savedStart) {
        setStartTime(parseInt(savedStart));
      }

      setHydrated(true);
      setStep("test");

    } catch (e) {
      console.error("Restore failed", e);
      setHydrated(true);
    }
  } else {
    setHydrated(true);
  }

  setStepInitialized(true);
}, [mockId, stepInitialized]);

  // Resume state
  const [hasResumeData, setHasResumeData] = useState(false);

  // ─────────────────────────────────────────────────────────
  // AUTH PROTECTION
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userLoading && !user) {
      const callback = encodeURIComponent(window.location.pathname);
      router.replace(`/signin?callbackUrl=${callback}`);
    }
  }, [user, userLoading, router]);

  // ─────────────────────────────────────────────────────────
  // FIRESTORE DATA FETCH
  // ─────────────────────────────────────────────────────────
  const mockRef = useMemoFirebase(
    () => (db ? doc(db, "mockTests", mockId) : null),
    [db, mockId]
  );
  const { data: mockMetadata, loading: mockLoading } = useDoc<any>(mockRef);

  const sectionsQuery = useMemoFirebase(
    () =>
      db ? query(collection(db, "mockTests", mockId, "sections")) : null,
    [db, mockId]
  );
  const { data: sections, loading: sectionsLoading } =
    useCollection<any>(sectionsQuery);

  const questionsQuery = useMemoFirebase(
    () =>
      db ? query(collection(db, "mockTests", mockId, "questions")) : null,
    [db, mockId]
  );
  const { data: questions, loading: questionsLoading } =
    useCollection<any>(questionsQuery);

  // ─────────────────────────────────────────────────────────
  // testData ASSEMBLE
  // ─────────────────────────────────────────────────────────
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
        questions.length * Number(mockMetadata.marksPerQuestion || 1),

      sections:
        sections && sections.length > 0
          ? sections.map((section: any, index: number) => ({
              ...section,
              id: section.id || `section_${index}`,
              title: section.title || {
                en: `Section ${index + 1}`,
                hn: `अनुभाग ${index + 1}`,
              },
              questionCount: section.questionCount || 0,
            }))
          : [{ id: "default", title: { en: "General", hn: "सामान्य" } }],

      questions: questions
        .filter((q: any) => q && (q.question || q.en || q.en_html))
        .map((q: any, index: number) => {
          const base = q.question || q;
          const sol = q.explanation || q.solution || { en: "", hn: "" };

          const options = (Array.isArray(q.options) ? q.options : []).map(
            (opt: any, optIndex: number) => ({
              ...opt,
              id:
                opt.id !== undefined ? String(opt.id) : String(optIndex + 1),
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
            correctOptionId: String(
              q.correctOptionId || q.raw_answer_id || q.answer || ""
            ),
            marks: {
              positive: Number(mockMetadata?.marksPerQuestion ?? 1),
              negative: Number(mockMetadata?.negativeMarks ?? 0.33),
              skip: Number(q?.marks?.skip ?? 0),
            },
            explanation:
              typeof sol === "object"
                ? {
                    en: sol.en || "",
                    hn: sol.hn || "",
                    en_html: sol.en_html || "",
                    hn_html: sol.hn_html || "",
                  }
                : { en: sol, hn: "" },
          };
        })
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
    };
  }, [mockMetadata, sections, questions]);

  const dashboardUrl = `/exams/${category || "all"}/${examId}`;

  // ─────────────────────────────────────────────────────────
  // BUG 2 FIX (Cloud Resume Check):
  // Jab user tab close karta hai ya computer band ho jaata hai,
  // localStorage clear ho sakta hai (dusre device/browser pe
  // nahi hoga), lekin Firestore mein activeMocks document rehta hai.
  //
  // Pehle: agar localStorage mein test_active tha, toh
  // checkResume() hi nahi chalta tha — toh cloud se resume ka
  // pata nahi chalta tha.
  //
  // Ab: hamesha Firestore check karo. Agar wahan session mila
  // aur localStorage mein nahi hai, toh resume modal dikhao.
  // Agar localStorage mein bhi hai, toh directly 'test' step pe
  // le jao (useEffect #1 se handle ho raha hai).
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !db || !mockId) return;

    const checkCloudResume = async () => {
      try {
        const sessionRef = doc(db, "users", user.uid, "activeMocks", mockId);
        const snap = await getDoc(sessionRef);
        if (!snap.exists()) return;

        // Agar localStorage mein already active hai, toh modal mat dikhao
        // step useEffect pehle se 'test' set kar chuka hoga
        const isLocallyActive = localStorage.getItem(`test_active_${mockId}`);
        if (isLocallyActive) return;

        // Cloud mein session hai par local mein nahi — resume modal dikhao
        setHasResumeData(true);
      } catch (e) {}
    };

    checkCloudResume();
  }, [user, db, mockId]);

  // ─────────────────────────────────────────────────────────
  // RESUME: Cloud session se data leke test shuru karo
  // ─────────────────────────────────────────────────────────
  const handleResume = async () => {
    if (!user || !db || !testData) return;
    try {
      const sessionRef = doc(db, "users", user.uid, "activeMocks", mockId);
      const snap = await getDoc(sessionRef);

      if (snap.exists()) {
        const data = snap.data();

        // Cloud se responses, language, aur timer restore karo
        setResponses(data.responses || {});
        setUserLanguage(data.userLanguage || "en");
        setStartTime(data.startedAt || Date.now());

        // localStorage bhi sync karo taaki TestInterface sahi kaam kare
        localStorage.setItem(`test_active_${mockId}`, "true");
        localStorage.setItem(`test_progress_${mockId}`, JSON.stringify(data));
        if (data.endTime) {
          localStorage.setItem(
            `test_end_${mockId}`,
            data.endTime.toString()
          );
        }
        if (data.startedAt) {
          localStorage.setItem(
            `test_start_${mockId}`,
            data.startedAt.toString()
          );
        }

        setHydrated(true);
setHasResumeData(false);
setStep("test");
      }
    } catch (e) {
      console.error("Resume handoff failed", e);
    }
  };

  // Fresh start — cloud session delete karo aur naya test shuru karo
  const handleFreshStart = async () => {
    if (user && db) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "activeMocks", mockId));
      } catch (_) {}
    }
    localStorage.removeItem(`test_active_${mockId}`);
    localStorage.removeItem(`test_progress_${mockId}`);
    localStorage.removeItem(`test_end_${mockId}`);
    localStorage.removeItem(`test_start_${mockId}`);
    setResponses({});
setHydrated(true);
setHasResumeData(false);
  };

  // ─────────────────────────────────────────────────────────
  // START TEST
  // ─────────────────────────────────────────────────────────
  const handleStartTest = (lang: "en" | "hn") => {
    setUserLanguage(lang);
    const now = Date.now();
    setStartTime(now);
    localStorage.setItem(`test_start_${mockId}`, now.toString());
    localStorage.setItem(`test_active_${mockId}`, "true");
    setStep("test");
  };

  // ─────────────────────────────────────────────────────────
  // SUBMIT TEST
  // ─────────────────────────────────────────────────────────
  const handleSubmitTest = async () => {
    if (!user || !db || !testData) return;

    const attemptId = crypto.randomUUID();
    const endTime = Date.now();

    let correct = 0,
      incorrect = 0,
      totalScore = 0;

    testData.questions.forEach((q) => {
      const resp = responses[q.id];
      if (!resp?.selectedOptionId) return;

      if (resp.selectedOptionId === q.correctOptionId) {
        correct++;
        totalScore += testData.marksPerQuestion;
      } else {
        incorrect++;
        totalScore -= testData.negativeMarks;
      }
    });

    const attempted = correct + incorrect;
    const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;

    try {
      const attemptData = {
        attemptId,
        uid: user.uid,
        mockId,
        examId: testData.examId,
        examName: testData.examName,
        mockTitle: testData.title,
        score: totalScore,
        totalMarks: testData.fullMarks,
        correct,
        wrong: incorrect,
        unattempted: testData.questions.length - attempted,
        accuracy,
        percentage: (totalScore / testData.fullMarks) * 100,
        timeTakenSeconds: Math.floor(
          (endTime - (startTime || endTime)) / 1000
        ),
        completedAt: serverTimestamp(),
        userLanguage,
        rawResponses: responses,
      };

      await setDoc(
        doc(db, "users", user.uid, "mockAttempts", attemptId),
        attemptData
      );
      await deleteDoc(doc(db, "users", user.uid, "activeMocks", mockId));

      // Sab localStorage keys saaf karo
      localStorage.removeItem(`test_progress_${mockId}`);
      localStorage.removeItem(`test_end_${mockId}`);
      localStorage.removeItem(`test_start_${mockId}`);
      localStorage.removeItem(`test_active_${mockId}`);

      router.push(`${dashboardUrl}/mock/${mockId}/result/${attemptId}`);
    } catch (e) {
      console.error("Critical submission failure", e);
    }
  };

  // ─────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────
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
        <Button onClick={() => router.push(dashboardUrl)}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b1120] text-foreground">
      {/* ─────────────────────────────────────────────────────
          BUG 2 FIX: Resume Modal
          Jab cloud mein session milta hai par local mein nahi,
          yeh modal dikhta hai. User choose kar sakta hai:
          Resume (cloud se data restore) ya Start Fresh (naya test).
          ───────────────────────────────────────────────────── */}
      {hasResumeData && step === "instructions" && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="glass border-white/10 p-8 rounded-[2.5rem] max-w-md w-full text-center space-y-6">
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-pulse" />
            <h2 className="text-2xl font-headline font-bold">
              Resume Previous Attempt?
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We found an active session for{" "}
              <strong>{testData.title}</strong>. Continue where you left off?
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleResume}
                className="w-full h-12 bg-primary"
              >
                Resume Attempt
              </Button>
              <Button
                onClick={handleFreshStart}
                variant="outline"
                className="w-full h-12"
              >
                Start Fresh
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "instructions" && (
        <InstructionsStep testData={testData} onNext={() => setStep("config")} />
      )}
      {step === "config" && (
        <ConfigStep
          testData={testData}
          onBack={() => setStep("instructions")}
          onStart={handleStartTest}
        />
      )}
      {step === "test" && (
        <TestInterface
          testData={testData}
          userLanguage={userLanguage}
          responses={responses}
          setResponses={setResponses}
          onSubmit={handleSubmitTest}
          hydrated={hydrated}
        />
      )}
    </main>
  );
}
