
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  MockTestData, 
  UserResponse, 
  Question, 
  QuestionStatus, 
  Section 
} from "@/lib/mock-test-engine-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Flag, 
  Menu, 
  X,
  Maximize2,
  Pause,
  Monitor
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { QuestionPalette } from "./QuestionPalette";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";

interface Props {
  testData: MockTestData;
  userLanguage: 'en' | 'hn';
  responses: Record<string, UserResponse>;
  setResponses: React.Dispatch<React.SetStateAction<Record<string, UserResponse>>>;
  onSubmit: () => void;
}

export const TestInterface = ({ 
  testData, 
  userLanguage: initialLang, 
  responses, 
  setResponses, 
  onSubmit 
}: Props) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentLang, setCurrentLang] = useState<'en' | 'hn'>(initialLang);
  const [timeLeft, setTimeLeft] = useState(testData.durationMinutes * 60);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const currentQuestion = testData.questions[currentQuestionIndex];
  const currentSection = testData.sections.find(s => s.id === currentQuestion.sectionId);

  // Timer logic
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused, onSubmit]);

  // Mark current question as visited
  useEffect(() => {
    setResponses(prev => {
      if (prev[currentQuestion.id].status === 'not-visited') {
        return {
          ...prev,
          [currentQuestion.id]: { ...prev[currentQuestion.id], status: 'not-answered' }
        };
      }
      return prev;
    });
  }, [currentQuestion.id, setResponses]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOptionSelect = (optionId: string) => {
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: { ...prev[currentQuestion.id], selectedOptionId: optionId }
    }));
  };

  const handleSaveAndNext = () => {
    setResponses(prev => {
      const resp = prev[currentQuestion.id];
      const newStatus: QuestionStatus = resp.selectedOptionId ? 'answered' : 'not-answered';
      return {
        ...prev,
        [currentQuestion.id]: { ...resp, status: newStatus }
      };
    });
    if (currentQuestionIndex < testData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleMarkForReview = () => {
    setResponses(prev => {
      const resp = prev[currentQuestion.id];
      const newStatus: QuestionStatus = resp.selectedOptionId ? 'answered-marked-review' : 'marked-review';
      return {
        ...prev,
        [currentQuestion.id]: { ...resp, status: newStatus }
      };
    });
    if (currentQuestionIndex < testData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleClearResponse = () => {
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: { ...prev[currentQuestion.id], selectedOptionId: null, status: 'not-answered' }
    }));
  };

  const sectionProgress = useMemo(() => {
    const sectionQuestions = testData.questions.filter(q => q.sectionId === currentSection?.id);
    const answered = sectionQuestions.filter(q => responses[q.id].status === 'answered' || responses[q.id].status === 'answered-marked-review').length;
    return (answered / sectionQuestions.length) * 100;
  }, [currentSection, testData.questions, responses]);

  return (
    <div className="h-screen flex flex-col bg-[#0b1120] overflow-hidden">
      {/* Top Navigation */}
      <header className="h-16 border-b border-white/5 bg-slate-900/50 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            <h1 className="font-headline font-bold text-sm tracking-tight hidden md:block">
              {testData.examName} <span className="text-muted-foreground font-normal">| {testData.title}</span>
            </h1>
          </div>
          <div className="h-8 w-px bg-white/5 hidden md:block" />
          <div className="flex items-center gap-1 bg-white/5 rounded-full px-4 py-1.5">
            <Clock className="w-4 h-4 text-accent" />
            <span className={cn("text-sm font-mono font-bold", timeLeft < 300 ? "text-rose-500 animate-pulse" : "text-accent")}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <Button variant="ghost" size="sm" onClick={() => setIsPaused(true)} className="text-muted-foreground hover:text-white gap-2">
             <Pause className="w-4 h-4" /> Pause
           </Button>
           <Button onClick={() => setShowSubmitConfirm(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-9 px-6 font-bold shadow-lg shadow-emerald-500/20">
             Submit Test
           </Button>
           <button onClick={() => setIsPaletteOpen(!isPaletteOpen)} className="lg:hidden p-2 text-muted-foreground">
             <Menu className="w-6 h-6" />
           </button>
        </div>
      </header>

      {/* Section Bar */}
      <div className="bg-slate-900/30 border-b border-white/5 flex items-center justify-between px-6 py-2 shrink-0">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {testData.sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                const firstQIndex = testData.questions.findIndex(q => q.sectionId === section.id);
                setCurrentQuestionIndex(firstQIndex);
              }}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border",
                currentSection?.id === section.id
                  ? "bg-primary border-primary text-white"
                  : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
              )}
            >
              {section.title[currentLang]}
            </button>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-4 w-64">
           <span className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap">Section Progress</span>
           <Progress value={sectionProgress} className="h-1.5 flex-1" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question Panel */}
        <div className="flex-1 overflow-y-auto bg-slate-900/10 custom-scrollbar p-6 md:p-10">
          <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
               <div className="flex items-center gap-3">
                 <Badge className="bg-primary/20 text-primary border-primary/20 rounded-lg px-3 py-1">
                   Question {currentQuestionIndex + 1}
                 </Badge>
                 <span className="text-xs text-muted-foreground">Type: Multiple Choice</span>
               </div>
               <div className="flex items-center gap-4">
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setCurrentLang('en')}
                      className={cn("px-2 py-0.5 text-[10px] font-bold rounded", currentLang === 'en' ? "bg-accent text-white" : "text-muted-foreground hover:text-white")}
                    >EN</button>
                    <button 
                      onClick={() => setCurrentLang('hn')}
                      className={cn("px-2 py-0.5 text-[10px] font-bold rounded", currentLang === 'hn' ? "bg-accent text-white" : "text-muted-foreground hover:text-white")}
                    >HN</button>
                  </div>
                  <div className="text-[10px] font-bold">
                    <span className="text-emerald-400">+{currentQuestion.marks}</span>
                    <span className="text-white/20 mx-1">|</span>
                    <span className="text-rose-400">-{currentQuestion.negativeMarks}</span>
                  </div>
               </div>
            </div>

            {/* Question Body */}
            <div className="space-y-6">
              {currentQuestion[`${currentLang}_html` as keyof Question] ? (
                <div 
                  className="text-lg md:text-xl font-medium leading-relaxed text-slate-100"
                  dangerouslySetInnerHTML={{ __html: currentQuestion[`${currentLang}_html` as keyof Question] as string }}
                />
              ) : (
                <p className="text-lg md:text-xl font-medium leading-relaxed text-slate-100">
                  {currentQuestion[currentLang as keyof Question] as string}
                </p>
              )}

              {/* DOM/Memory Images */}
              {currentQuestion.dom_images?.map((img, i) => (
                <img key={i} src={img} alt="Question ref" className="max-w-full rounded-xl border border-white/10 shadow-2xl" />
              ))}
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  className={cn(
                    "flex items-center gap-4 p-5 rounded-2xl border text-left transition-all group",
                    responses[currentQuestion.id].selectedOptionId === option.id
                      ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                      : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold transition-colors",
                    responses[currentQuestion.id].selectedOptionId === option.id
                      ? "bg-primary border-primary text-white"
                      : "border-white/20 text-muted-foreground group-hover:border-primary"
                  )}>
                    {option.id.split('-')[1].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    {option.image && <img src={option.image} alt="Option" className="mb-2 max-h-20 rounded" />}
                    <span className="text-sm font-medium">{option[currentLang]}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar Palette */}
        <aside className={cn(
          "fixed lg:relative inset-y-0 right-0 w-80 bg-slate-900 border-l border-white/5 flex flex-col transition-transform z-50",
          isPaletteOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}>
          <div className="p-4 flex items-center justify-between border-b border-white/5 lg:hidden">
            <span className="font-bold text-sm">Question Palette</span>
            <button onClick={() => setIsPaletteOpen(false)}><X className="w-5 h-5" /></button>
          </div>
          <QuestionPalette 
            questions={testData.questions} 
            responses={responses} 
            currentIndex={currentQuestionIndex}
            onNavigate={(index) => {
              setCurrentQuestionIndex(index);
              setIsPaletteOpen(false);
            }}
          />
        </aside>
      </div>

      {/* Footer Controls */}
      <footer className="h-20 border-t border-white/5 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-40">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleMarkForReview}
            className="rounded-xl border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 font-bold text-xs h-11"
          >
            Mark for Review & Next
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleClearResponse}
            className="rounded-xl text-muted-foreground hover:bg-white/5 font-bold text-xs h-11"
          >
            Clear Response
          </Button>
        </div>

        <div className="flex gap-3">
           <Button 
            variant="outline" 
            disabled={currentQuestionIndex === 0}
            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
            className="rounded-xl border-white/10 h-11 px-4"
           >
             <ChevronLeft className="w-5 h-5" />
           </Button>
           <Button 
            onClick={handleSaveAndNext}
            className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-8 font-bold gap-2"
           >
             {currentQuestionIndex === testData.questions.length - 1 ? "Save & Preview" : "Save & Next"}
             <ChevronRight className="w-4 h-4" />
           </Button>
        </div>
      </footer>

      {/* Modals */}
      <Dialog open={isPaused} onOpenChange={setIsPaused}>
        <DialogContent className="glass border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-headline">Test Paused</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center text-muted-foreground">
            Take a deep breath. Your timer is paused and your progress is saved.
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setIsPaused(false)} className="bg-primary rounded-xl px-8 h-12 font-bold">Resume Test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="glass border-white/10">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">Submit Test?</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                 <div className="text-2xl font-bold text-emerald-400">
                   {Object.values(responses).filter(r => r.status === 'answered' || r.status === 'answered-marked-review').length}
                 </div>
                 <div className="text-[10px] uppercase font-bold text-muted-foreground">Answered</div>
               </div>
               <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                 <div className="text-2xl font-bold text-rose-400">
                   {Object.values(responses).filter(r => r.status === 'not-answered' || r.status === 'marked-review').length}
                 </div>
                 <div className="text-[10px] uppercase font-bold text-muted-foreground">Not Answered</div>
               </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">Are you sure you want to end this mock test? This action cannot be undone.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSubmitConfirm(false)} className="rounded-xl h-12">Continue Test</Button>
            <Button onClick={onSubmit} className="bg-emerald-500 hover:bg-emerald-600 rounded-xl h-12 font-bold shadow-lg shadow-emerald-500/20">Final Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
