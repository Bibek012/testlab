"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  MockTestData,
  UserResponse,
  QuestionStatus
} from "@/lib/mock-test-engine-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Pause,
  Monitor,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  AlertCircle,
  Send,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { QuestionPalette } from "./QuestionPalette";
import { RichTextRenderer } from "./RichTextRenderer";
import { QuestionImage } from "./QuestionImage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useUser, useFirestore } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

interface Props {
  testData: MockTestData;
  userLanguage: 'en' | 'hn';
  responses: Record<string, UserResponse>;
  setResponses: React.Dispatch<React.SetStateAction<Record<string, UserResponse>>>;
  onSubmit: () => void;
}

const TimerDisplay = React.memo(({ targetEndTime, onTimeout }: { targetEndTime: number, onTimeout: () => void }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((targetEndTime - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        onTimeout();
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [targetEndTime, onTimeout]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1 md:px-4 md:py-1.5 shrink-0 border border-white/5">
      <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent" />
      <span className={cn("text-xs md:text-sm font-mono font-bold", timeLeft < 300 ? "text-rose-500 animate-pulse" : "text-accent")}>
        {formatTime(timeLeft)}
      </span>
    </div>
  );
});
TimerDisplay.displayName = "TimerDisplay";

export const TestInterface = ({
  testData,
  userLanguage: initialLang,
  responses,
  setResponses,
  onSubmit
}: Props) => {
  const { user } = useUser();
  const db = useFirestore();
  
  // States with initial loading fallback from localStorage to prevent data loss on reload
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`test_progress_${testData.id}`);
      if (saved) {
        try {
          return JSON.parse(saved).currentQuestionIndex || 0;
        } catch (_) { return 0; }
      }
    }
    return 0;
  });

  const [currentLang, setCurrentLang] = useState<'en' | 'hn'>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`test_progress_${testData.id}`);
      if (saved) {
        try {
          return JSON.parse(saved).userLanguage || initialLang;
        } catch (_) { return initialLang; }
      }
    }
    return initialLang;
  });

  const [isPaused, setIsPaused] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);

  // Restore saved responses on mount before initializing timers
  useEffect(() => {
    const savedProgress = localStorage.getItem(`test_progress_${testData.id}`);
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        if (parsed.responses && Object.keys(parsed.responses).length > 0) {
          setResponses(parsed.responses);
        }
      } catch (e) {
        console.error("Error restoring responses from localStorage", e);
      }
    }
  }, [testData.id, setResponses]);

  const currentQuestion = testData.questions[currentQuestionIndex];
  const currentSection = testData.sections.find(s => s.id === currentQuestion.sectionId);

  // Timer Initialization & Status Lock
  useEffect(() => {
    let savedEndTime = localStorage.getItem(`test_end_${testData.id}`);
    if (!savedEndTime) {
      const newEndTime = Date.now() + (testData.durationMinutes * 60 * 1000);
      localStorage.setItem(`test_end_${testData.id}`, newEndTime.toString());
      savedEndTime = newEndTime.toString();
    }
    // Flag to tell the instruction page that this test is actively running
    localStorage.setItem(`test_active_${testData.id}`, "true");
    setTargetEndTime(parseInt(savedEndTime));
  }, [testData.id, testData.durationMinutes]);

  // Response Autosave Logic (runs every 5 seconds for higher security)
  useEffect(() => {
    if (isPaused || showSubmitConfirm) return;

    const saveInterval = setInterval(async () => {
      const startTime = localStorage.getItem(`test_start_${testData.id}`) || Date.now().toString();
      if (!localStorage.getItem(`test_start_${testData.id}`)) {
        localStorage.setItem(`test_start_${testData.id}`, startTime);
      }

      const sessionData = {
        mockId: testData.id,
        examId: testData.examId,
        examName: testData.examName,
        mockTitle: testData.title,
        responses,
        userLanguage: currentLang,
        currentQuestionIndex,
        startedAt: parseInt(startTime),
        endTime: targetEndTime,
      };

      // 1. Fast Cache (Essential for page reloads)
      localStorage.setItem(`test_progress_${testData.id}`, JSON.stringify(sessionData));

      // 2. Cloud Persistence
      if (user && db) {
        try {
          await setDoc(doc(db, 'users', user.uid, 'activeMocks', testData.id), {
            ...sessionData,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.warn("Autosave cloud sync deferred", e);
        }
      }
    }, 5000);

    return () => clearInterval(saveInterval);
  }, [user, db, testData, responses, currentLang, currentQuestionIndex, isPaused, showSubmitConfirm, targetEndTime]);

  // Individual Question Timing
  useEffect(() => {
    if (isPaused || showSubmitConfirm || !currentQuestion) return;
    
    const qTimer = setInterval(() => {
      setResponses(prev => {
        const qId = currentQuestion.id;
        const existing = prev[qId];
        
        if (!existing) {
          return {
            ...prev,
            [qId]: {
              questionId: qId,
              selectedOptionId: null,
              status: 'not-visited',
              timeSpentSeconds: 1
            }
          };
        }
        return {
          ...prev,
          [qId]: {
            ...existing,
            timeSpentSeconds: (existing.timeSpentSeconds || 0) + 1
          }
        };
      });
    }, 1000);
    return () => clearInterval(qTimer);
  }, [currentQuestion?.id, isPaused, showSubmitConfirm, setResponses]);

  const handleOptionSelect = useCallback((optionId: string | number) => {
    const numericOptionId = String(optionId);
    setResponses(prev => {
      const qId = currentQuestion.id;
      const currentResp = prev[qId] || { questionId: qId, timeSpentSeconds: 0 };
      return {
        ...prev,
        [qId]: {
          ...currentResp,
          selectedOptionId: numericOptionId,
          status: currentResp.status === 'marked-review' ? 'answered-marked-review' : 'answered'
        }
      };
    });
  }, [currentQuestion?.id, setResponses]);

  const handleSaveAndNext = () => {
    setResponses(prev => {
      const qId = currentQuestion.id;
      const resp = prev[qId];
      // If user hasn't selected anything but clicks Save & Next, mark as not-answered explicitly
      const currentStatus = resp?.selectedOptionId ? 'answered' : 'not-answered';
      return {
        ...prev,
        [qId]: {
          ...resp,
          questionId: qId,
          selectedOptionId: resp?.selectedOptionId || null,
          status: resp?.status === 'answered-marked-review' || resp?.status === 'marked-review' ? resp.status : currentStatus,
          timeSpentSeconds: resp?.timeSpentSeconds || 0
        }
      };
    });

    if (currentQuestionIndex < testData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setShowSubmitConfirm(true);
    }
  };

  const handleMarkForReview = () => {
    setResponses(prev => {
      const qId = currentQuestion.id;
      const resp = prev[qId];
      const newStatus: QuestionStatus = resp?.selectedOptionId ? 'answered-marked-review' : 'marked-review';
      return {
        ...prev,
        [qId]: { 
          ...resp, 
          questionId: qId,
          selectedOptionId: resp?.selectedOptionId || null,
          status: newStatus,
          timeSpentSeconds: resp?.timeSpentSeconds || 0
        }
      };
    });
    if (currentQuestionIndex < testData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setShowSubmitConfirm(true);
    }
  };

  const handleClearResponse = () => {
    setResponses(prev => {
      const qId = currentQuestion.id;
      return {
        ...prev,
        [qId]: { ...prev[qId], selectedOptionId: null, status: 'not-answered' }
      };
    });
  };

  const handleFinalSubmit = () => {
    // Clean up local storage keys for this test upon submission
    localStorage.removeItem(`test_progress_${testData.id}`);
    localStorage.removeItem(`test_end_${testData.id}`);
    localStorage.removeItem(`test_start_${testData.id}`);
    localStorage.removeItem(`test_active_${testData.id}`);
    onSubmit();
  };

  const sectionProgress = useMemo(() => {
    const sectionQuestions = testData.questions.filter(q => q.sectionId === currentSection?.id);
    const answeredCount = sectionQuestions.filter(q => responses[q.id]?.selectedOptionId !== null).length;
    return (answeredCount / (sectionQuestions.length || 1)) * 100;
  }, [currentSection, testData.questions, responses]);

  const stats = useMemo(() => {
    const total = testData.questions.length;
    const attempted = Object.values(responses).filter(r => r.selectedOptionId !== null).length;
    const marked = Object.values(responses).filter(r => r.status?.includes('marked')).length;
    return { total, attempted, unattempted: total - attempted, marked };
  }, [testData.questions, responses]);

  if (!currentQuestion) return null;

  return (
    <div className="h-screen flex flex-col bg-[#0b1120] overflow-hidden">
      <header className="h-14 md:h-16 border-b border-white/5 bg-slate-900/50 flex items-center justify-between px-4 md:px-6 shrink-0 z-50">
        <div className="flex items-center gap-3 md:gap-6 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            <Monitor className="w-5 h-5 text-primary" />
            <h1 className="font-headline font-bold text-xs tracking-tight truncate max-w-[120px] lg:max-w-none uppercase">
              {testData.examName}
            </h1>
          </div>
          {targetEndTime && <TimerDisplay targetEndTime={targetEndTime} onTimeout={handleFinalSubmit} />}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="sm" onClick={() => setIsPaused(true)} className="text-muted-foreground hover:text-white h-9 px-2 md:px-4">
            <Pause className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Pause</span>
          </Button>

          <Button
            onClick={() => setShowSubmitConfirm(true)}
            className="flex bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-9 px-4 md:px-6 text-sm font-bold shadow-lg shadow-emerald-500/20 gap-2"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Submit Test</span>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground hover:text-white">
                <LayoutGrid className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 bg-[#0f172a] border-white/5 w-[85%] sm:w-[350px]">
              <SheetHeader className="p-4 border-b border-white/5 text-left">
                <SheetTitle className="text-sm font-bold flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-primary" /> Question Palette
                </SheetTitle>
              </SheetHeader>
              <div className="h-full flex flex-col">
                <QuestionPalette
                  questions={testData.questions}
                  responses={responses}
                  currentIndex={currentQuestionIndex}
                  onNavigate={(index) => setCurrentQuestionIndex(index)}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="bg-slate-900/30 border-b border-white/5 flex items-center justify-between px-4 md:px-6 py-2 shrink-0 z-40">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {testData.sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                const firstQIndex = testData.questions.findIndex(q => q.sectionId === section.id);
                if (firstQIndex !== -1) setCurrentQuestionIndex(firstQIndex);
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all whitespace-nowrap border shrink-0",
                currentSection?.id === section.id
                  ? "bg-primary border-primary text-white shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                  : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
              )}
            >
              {section.title[currentLang]}
            </button>
          ))}
        </div>
        <div className="hidden lg:flex items-center gap-4 w-48 xl:w-64">
          <span className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap">Progress</span>
          <Progress value={sectionProgress} className="h-1.5 flex-1" />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 overflow-y-auto bg-slate-900/10 custom-scrollbar p-4 md:p-10">
          <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-32 md:pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/20 text-primary border-primary/20 rounded-lg px-3 py-1 text-[10px] md:text-xs">
                  Question {currentQuestionIndex + 1} of {testData.questions.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10">
                  <button
                    onClick={() => setCurrentLang('en')}
                    className={cn("px-2 py-0.5 text-[10px] font-bold rounded", currentLang === 'en' ? "bg-accent text-white" : "text-muted-foreground")}
                  >EN</button>
                  <button
                    onClick={() => setCurrentLang('hn')}
                    className={cn("px-2 py-0.5 text-[10px] font-bold rounded", currentLang === 'hn' ? "bg-accent text-white" : "text-muted-foreground")}
                  >HN</button>
                </div>
                <div className="text-[10px] font-bold bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                  <span className="text-emerald-400">+{testData.marksPerQuestion ?? 1}</span>
                  <span className="text-white/20 mx-1">/</span>
                  <span className="text-rose-400">-{testData.negativeMarks ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="space-y-6 animate-in fade-in duration-300">
              <RichTextRenderer
                content={(currentQuestion[`${currentLang}_html` as any] || currentQuestion[currentLang as any]) as string}
                className="text-base md:text-xl font-medium leading-relaxed text-white"
              />

              {currentQuestion.dom_images?.map((img, i) => (
                <QuestionImage key={i} src={img} alt={`Figure for Q${currentQuestionIndex + 1}`} />
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {currentQuestion.options.map((option) => {
                const isSelected = responses[currentQuestion.id]?.selectedOptionId === String(option.id);
                return (
                  <button
                    key={option.id}
                    onClick={() => handleOptionSelect(option.id)}
                    className={cn(
                      "flex items-start gap-4 p-5 rounded-2xl border text-left transition-all group",
                      isSelected
                        ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                        : "bg-white/5 border-white/5 hover:border-white/20"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold",
                      isSelected
                        ? "bg-primary border-primary text-white"
                        : "border-white/20 text-muted-foreground"
                    )}>
                      {String(option.id).split('-').pop()?.toUpperCase() || ''}
                    </div>
                    <div className="flex-1 overflow-hidden text-white">
                      <RichTextRenderer
                        content={(option[`${currentLang}_html` as any] || option[currentLang as any]) as string}
                        className="text-sm md:text-base font-medium"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="hidden lg:flex w-72 xl:w-80 bg-[#0f172a] border-l border-white/5 flex-col overflow-hidden">
          <QuestionPalette
            questions={testData.questions}
            responses={responses}
            currentIndex={currentQuestionIndex}
            onNavigate={(index) => setCurrentQuestionIndex(index)}
          />
        </aside>
      </div>

      <footer className="h-auto border-t border-white/5 bg-slate-900/90 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between px-4 md:px-6 py-4 md:py-4 shrink-0 z-50 gap-4">
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto hide-scrollbar">
          <Button
            variant="outline"
            onClick={handleMarkForReview}
            className="rounded-xl border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 font-bold text-[10px] md:text-xs h-10 px-4 whitespace-nowrap"
          >
            Review & Next
          </Button>
          <Button
            variant="ghost"
            onClick={handleClearResponse}
            className="rounded-xl text-muted-foreground hover:bg-white/5 font-bold text-[10px] md:text-xs h-10 px-4 whitespace-nowrap"
          >
            Clear Response
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <Button
            variant="outline"
            disabled={currentQuestionIndex === 0}
            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
            className="rounded-xl border-white/10 h-10 px-4 text-white disabled:opacity-40"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            onClick={handleSaveAndNext}
            className="bg-primary hover:bg-primary/90 text-white rounded-xl h-10 px-6 md:px-10 font-bold gap-2 flex-1 md:flex-none"
          >
            {currentQuestionIndex === testData.questions.length - 1 ? "Submit Exam" : "Save & Next"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </footer>

      {/* Submission Confirmation Dialog */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="glass border-white/10 w-[95%] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 text-white">
          <DialogHeader className="mb-6">
            <DialogTitle className="font-headline text-2xl flex items-center gap-2 text-white">
              <AlertCircle className="w-6 h-6 text-amber-400" />
              Final Submission Summary
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SummaryItem label="Total Questions" value={stats.total} color="slate" />
              <SummaryItem label="Attempted" value={stats.attempted} color="emerald" />
              <SummaryItem label="Unattempted" value={stats.unattempted} color="rose" />
              <SummaryItem label="Marked" value={stats.marked} color="indigo" />
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Section Overview</h4>
              <div className="space-y-3">
                {testData.sections.map((sec, i) => {
                  const secQs = testData.questions.filter(q => q.sectionId === sec.id);
                  const attempted = secQs.filter(q => responses[q.id]?.selectedOptionId !== null).length;
                  return (
                    <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                      <span className="text-sm font-medium">{sec.title[currentLang]}</span>
                      <div className="text-sm font-bold text-emerald-400">{attempted} / {secQs.length} Attempted</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3 mt-8">
            <Button variant="outline" onClick={() => setShowSubmitConfirm(false)} className="rounded-xl h-12 w-full sm:flex-1 border-white/10 text-white hover:bg-white/5">Resume Test</Button>
            <Button onClick={handleFinalSubmit} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 w-full sm:flex-1 font-bold shadow-lg shadow-emerald-500/20">Final Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause Dialog */}
      <Dialog open={isPaused} onOpenChange={setIsPaused}>
        <DialogContent className="glass border-white/10 sm:max-w-md w-[95%] bg-slate-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-headline text-white">Test Paused</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center text-muted-foreground text-sm">
            Take a short break. Your progress is safely saved.
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setIsPaused(false)} className="bg-primary text-white rounded-xl w-full h-12 font-bold">Resume Test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SummaryItem = React.memo(({ label, value, color }: { label: string, value: number, color: string }) => {
  const colorMap: Record<string, string> = {
    slate: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  };

  return (
    <div className={cn("p-4 rounded-2xl border text-center", colorMap[color])}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] uppercase font-bold opacity-70 tracking-tighter">{label}</div>
    </div>
  );
});
SummaryItem.displayName = "SummaryItem";
