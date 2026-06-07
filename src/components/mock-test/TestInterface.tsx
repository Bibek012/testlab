"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { useUser } from "@/firebase/auth/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Clock, CheckCircle2, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import QuestionPalette from "./QuestionPalette";
import RichTextRenderer from "./RichTextRenderer";

interface TestInterfaceProps {
  testData: any;
  initialState?: any;
  onFinish: (attemptId: string) => void;
}

export default function TestInterface({ testData, initialState, onFinish }: TestInterfaceProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // State initialization (restoring from initial state if available)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialState?.currentQuestionIndex || 0);
  const [responses, setResponses] = useState<Record<string, any>>(initialState?.responses || {});
  const [currentLang, setCurrentLang] = useState<"en" | "hi">(initialState?.userLanguage || "en");
  const [isPaused, setIsPaused] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Time calculation logic
  const durationMs = (testData.durationMinutes || 60) * 60 * 1000;
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(durationMs / 1000);

  const sections = testData.sections || [];
  const allQuestions = useMemo(() => sections.flatMap((s: any) => s.questions || []), [sections]);
  const currentQuestion = allQuestions[currentQuestionIndex];

  // Initialize End Time and LocalStorage state keys
  useEffect(() => {
    if (typeof window === "undefined") return;
    let savedEndTime = localStorage.getItem(`test_end_${testData.id}`);
    let startTime = localStorage.getItem(`test_start_${testData.id}`);

    if (initialState?.endTime) {
      setTargetEndTime(initialState.endTime);
      localStorage.setItem(`test_end_${testData.id}`, String(initialState.endTime));
    } else if (savedEndTime) {
      setTargetEndTime(parseInt(savedEndTime, 10));
    } else {
      const now = Date.now();
      const end = now + durationMs;
      setTargetEndTime(end);
      localStorage.setItem(`test_start_${testData.id}`, String(now));
      localStorage.setItem(`test_end_${testData.id}`, String(end));
    }
    // Mark test session active locally immediately
    localStorage.setItem(`test_active_${testData.id}`, "true");
  }, [testData.id, durationMs, initialState]);

  // Main countdown timer clock
  useEffect(() => {
    if (!targetEndTime || isPaused || showSubmitConfirm) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((targetEndTime - now) / 1000));
      setTimeLeft(diff);

      if (diff <= 0) {
        clearInterval(timer);
        handleSubmitTest(true); 
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetEndTime, isPaused, showSubmitConfirm]);

  // FIX 1: Safe Per-Question Timer (Wipes/Overwrite Prevention)
  useEffect(() => {
    if (isPaused || showSubmitConfirm || !currentQuestion) return;

    const timer = setInterval(() => {
      setResponses((prev) => {
        const qId = currentQuestion.id;
        const existing = prev[qId];

        // Agar response pehle se array ya object me maujood hai, to uski options wipe mat karo
        if (existing) {
          return {
            ...prev,
            [qId]: {
              ...existing,
              timeSpentSeconds: (existing.timeSpentSeconds || 0) + 1,
            },
          };
        }

        // Sirf tabhi default object lagao jab pehle se empty state ho (Not visited state)
        return {
          ...prev,
          [qId]: {
            questionId: qId,
            selectedOptionId: null,
            status: "not-visited",
            timeSpentSeconds: 1,
          },
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestion?.id, isPaused, showSubmitConfirm, setResponses]);

  // FIX 2: Synchronous Save Guard when user closes the Tab or Window
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!targetEndTime) return;
      const startTime = localStorage.getItem(`test_start_${testData.id}`) || String(Date.now());
      
      const sessionData = {
        mockId: testData.id,
        examId: testData.examId,
        examName: testData.examName,
        mockTitle: testData.title,
        responses,
        userLanguage: currentLang,
        currentQuestionIndex,
        startedAt: parseInt(startTime, 10),
        endTime: targetEndTime,
      };

      localStorage.setItem(`test_progress_${testData.id}`, JSON.stringify(sessionData));
      localStorage.setItem(`test_active_${testData.id}`, "true");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [testData, responses, currentLang, currentQuestionIndex, targetEndTime]);

  // Async Autosave cycle to Firestore (Cloud backup)
  useEffect(() => {
    if (!targetEndTime || isPaused || showSubmitConfirm) return;

    const interval = setInterval(async () => {
      const startTime = localStorage.getItem(`test_start_${testData.id}`) || String(Date.now());
      const sessionData = {
        mockId: testData.id,
        examId: testData.examId,
        examName: testData.examName,
        mockTitle: testData.title,
        responses,
        userLanguage: currentLang,
        currentQuestionIndex,
        startedAt: parseInt(startTime, 10),
        endTime: targetEndTime,
        updatedAt: Date.now()
      };

      localStorage.setItem(`test_progress_${testData.id}`, JSON.stringify(sessionData));

      if (user && db) {
        try {
          await setDoc(doc(db, "users", user.uid, "activeMocks", testData.id), sessionData);
        } catch (e) {
          console.error("Cloud autosave failed:", e);
        }
      }
    }, 5000); // 5 Seconds background sync loop

    return () => clearInterval(interval);
  }, [testData, responses, currentLang, currentQuestionIndex, targetEndTime, user]);

  const handleOptionSelect = (optionId: string) => {
    if (!currentQuestion) return;
    setResponses((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...(prev[currentQuestion.id] || { timeSpentSeconds: 0 }),
        questionId: currentQuestion.id,
        selectedOptionId: optionId,
        status: "answered",
      },
    }));
  };

  const clearResponse = () => {
    if (!currentQuestion) return;
    setResponses((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...(prev[currentQuestion.id] || { timeSpentSeconds: 0 }),
        questionId: currentQuestion.id,
        selectedOptionId: null,
        status: "not-answered",
      },
    }));
  };

  const markForReview = () => {
    if (!currentQuestion) return;
    setResponses((prev) => {
      const existing = prev[currentQuestion.id];
      const hasAnswer = existing?.selectedOptionId != null;
      return {
        ...prev,
        [currentQuestion.id]: {
          ...(existing || { timeSpentSeconds: 0 }),
          questionId: currentQuestion.id,
          status: hasAnswer ? "marked-answered" : "marked",
        },
      };
    });
    handleNext();
  };

  const handleNext = () => {
    if (currentQuestionIndex < allQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmitTest = async (isAuto = false) => {
    if (!user || isPending) return;

    startTransition(async () => {
      try {
        const attemptId = `att_${Date.now()}`;
        const finalPayload = {
          attemptId,
          mockId: testData.id,
          examId: testData.examId,
          responses,
          submittedAt: Date.now(),
          autoSubmitted: isAuto
        };

        if (db) {
          // Cloud standard attempt write tracking
          await setDoc(doc(db, "users", user.uid, "attempts", attemptId), finalPayload);
          // Clean active mock pointers from cloud database
          await deleteDoc(doc(db, "users", user.uid, "activeMocks", testData.id));
        }

        // Clean local engine checkpoints
        localStorage.removeItem(`test_progress_${testData.id}`);
        localStorage.removeItem(`test_end_${testData.id}`);
        localStorage.removeItem(`test_start_${testData.id}`);
        localStorage.removeItem(`test_active_${testData.id}`);

        toast({ title: "Test Submitted Successfully!", description: "Your performance score has been compiled." });
        onFinish(attemptId);
      } catch (err) {
        toast({ variant: "destructive", title: "Submission Failed", description: "Could not upload scores. Try again." });
      }
    });
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ":" : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (!currentQuestion) return <div className="p-8 text-center text-muted-foreground">No questions found in this mock test.</div>;

  const currentResponse = responses[currentQuestion.id];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Test Interface Header TopBar */}
      <header className="sticky top-0 z-40 border-b bg-card px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg max-w-[300px] truncate">{testData.title}</h1>
          <div className="flex gap-1 border rounded px-1 py-0.5 text-xs">
            <Button size="sm" variant={currentLang === "en" ? "default" : "ghost"} className="h-6 px-2" onClick={() => setCurrentLang("en")}>EN</Button>
            <Button size="sm" variant={currentLang === "hi" ? "default" : "ghost"} className="h-6 px-2" onClick={() => setCurrentLang("hi")}>HI</Button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-mono font-bold text-xl text-primary bg-primary/10 px-3 py-1 rounded border border-primary/20">
            <Clock className="w-5 h-5 animate-pulse" />
            <span>{formatTime(timeLeft)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? <Play className="w-4 h-4 mr-1" /> : <Pause className="w-4 h-4 mr-1" />}
              {isPaused ? "Resume" : "Pause"}
            </Button>
            <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowSubmitConfirm(true)}>Submit Test</Button>
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Paused Overlay Safety Frame */}
        {isPaused && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
            <AlertCircle className="w-16 h-16 text-primary" />
            <h2 className="text-2xl font-bold">Test is Paused</h2>
            <p className="text-muted-foreground">Your timer is frozen. Click resume to continue working on your answers.</p>
            <Button onClick={() => setIsPaused(false)}>Return to Test Interface</Button>
          </div>
        )}

        {/* Submit confirmation interface */}
        {showSubmitConfirm && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
            <Card className="max-w-md w-full">
              <CardContent className="pt-6 flex flex-col items-center gap-4 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                <h3 className="text-xl font-bold">Are you sure you want to submit?</h3>
                <p className="text-sm text-muted-foreground">You still have time left. Please review your answered sheet on the dashboard side palette before finishing.</p>
                <div className="flex gap-3 w-full mt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowSubmitConfirm(false)} disabled={isPending}>Cancel</Button>
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleSubmitTest(false)} disabled={isPending}>
                    {isPending ? "Submitting..." : "Yes, Submit"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Question Panel body block */}
        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="font-medium text-sm text-muted-foreground">Question {currentQuestionIndex + 1} of {allQuestions.length}</span>
            {currentResponse?.status.startsWith("marked") && (
              <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 text-xs px-2 py-0.5 rounded font-medium border border-amber-200">Marked for Review</span>
            )}
          </div>

          <div className="space-y-4">
            <div className="text-lg leading-relaxed font-medium">
              <RichTextRenderer content={currentLang === "hi" ? currentQuestion.textHi || currentQuestion.text : currentQuestion.text} />
            </div>

            {/* Render Question image asset framework if attached */}
            {currentQuestion.imageUrl && (
              <div className="border rounded-lg p-2 max-w-md bg-white">
                <img src={currentQuestion.imageUrl} alt="Question Asset Diagram" className="w-full object-contain max-h-[250px]" />
              </div>
            )}
          </div>

          {/* Core options selector buttons loop */}
          <div className="grid grid-cols-1 gap-3 max-w-3xl pt-2">
            {(currentQuestion.options || []).map((opt: any) => {
              const isSelected = currentResponse?.selectedOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleOptionSelect(opt.id)}
                  className={`flex items-start text-left p-4 rounded-xl border-2 transition-all duration-150 group ${
                    isSelected 
                      ? "border-primary bg-primary/5 text-primary shadow-sm" 
                      : "border-muted hover:border-muted-foreground/30 bg-card hover:bg-accent/50"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 mr-3 font-semibold text-xs ${
                    isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 text-muted-foreground group-hover:border-muted-foreground"
                  }`}>
                    {opt.id.toUpperCase()}
                  </span>
                  <div className="text-sm font-medium pt-0.5">
                    <RichTextRenderer content={currentLang === "hi" ? opt.textHi || opt.text : opt.text} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Action buttons tray row */}
          <div className="flex items-center justify-between max-w-3xl pt-6 border-t mt-8">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={markForReview}>Mark for Review & Next</Button>
              <Button variant="ghost" size="sm" onClick={clearResponse} disabled={!currentResponse?.selectedOptionId}>Clear Response</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrev} disabled={currentQuestionIndex === 0}><ChevronLeft className="w-4 h-4 mr-1" /> Previous</Button>
              <Button variant="default" size="sm" onClick={handleNext} disabled={currentQuestionIndex === allQuestions.length - 1}>Save & Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </div>
        </main>

        {/* Sidebar Question Grid Palette Panel */}
        <aside className="w-80 border-l bg-card flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm">Question Palette Dashboard</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Navigate or view indices metrics status.</p>
          </div>
          <div className="flex-1 p-4">
            <QuestionPalette
              questions={allQuestions}
              responses={responses}
              currentIndex={currentQuestionIndex}
              onNavigate={(index) => setCurrentQuestionIndex(index)}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
