"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  MockTestData, 
  UserResponse, 
  Question, 
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
  Menu,
  X,
  LayoutGrid
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
    const answeredCount = sectionQuestions.filter(q => responses[q.id].status === 'answered' || responses[q.id].status === 'answered-marked-review').length;
    return (answeredCount / sectionQuestions.length) * 100;
  }, [currentSection, testData.questions, responses]);

  return (
    <div className="h-screen flex flex-col bg-[#0b1120] overflow-hidden">
      {/* Top Bar - Optimized for mobile height */}
      <header className="h-14 md:h-16 border-b border-white/5 bg-slate-900/50 flex items-center justify-between px-4 md:px-6 shrink-0">
        <div className="flex items-center gap-3 md:gap-6 overflow-hidden">
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <Monitor className="w-5 h-5 text-primary" />
            <h1 className="font-headline font-bold text-xs tracking-tight truncate max-w-[120px] lg:max-w-none">
              {testData.examName}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1 md:px-4 md:py-1.5 shrink-0">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent" />
            <span className={cn("text-xs md:text-sm font-mono font-bold", timeLeft < 300 ? "text-rose-500 animate-pulse" : "text-accent")}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
           <Button variant="ghost" size="sm" onClick={() => setIsPaused(true)} className="text-muted-foreground hover:text-white h-9 px-2 md:px-4">
             <Pause className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Pause</span>
           </Button>
           <Button onClick={() => setShowSubmitConfirm(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-8 md:h-9 px-3 md:px-6 text-xs md:text-sm font-bold shadow-lg shadow-emerald-500/20">
             Submit
           </Button>
           
           {/* Mobile Palette Trigger */}
           <Sheet>
             <SheetTrigger asChild>
               <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground hover:text-white">
                 <LayoutGrid className="w-5 h-5" />
               </Button>
             </SheetTrigger>
             <SheetContent side="right" className="p-0 bg-slate-900 border-white/5 w-[85%] sm:w-[350px]">
                <SheetHeader className="p-4 border-b border-white/5 text-left">
                  <SheetTitle className="text-sm font-bold flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-primary" /> Question Palette
                  </SheetTitle>
                </SheetHeader>
                <div className="h-full">
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

      {/* Section Selector - Swipable on mobile */}
      <div className="bg-slate-900/30 border-b border-white/5 flex items-center justify-between px-4 md:px-6 py-2 shrink-0">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {testData.sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                const firstQIndex = testData.questions.findIndex(q => q.sectionId === section.id);
                setCurrentQuestionIndex(firstQIndex);
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all whitespace-nowrap border shrink-0",
                currentSection?.id === section.id
                  ? "bg-primary border-primary text-white"
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 overflow-y-auto bg-slate-900/10 custom-scrollbar p-4 md:p-10">
          <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-32 md:pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
               <div className="flex items-center gap-3">
                 <Badge className="bg-primary/20 text-primary border-primary/20 rounded-lg px-3 py-1 text-[10px] md:text-xs">
                   Question {currentQuestionIndex + 1}
                 </Badge>
                 <span className="text-[10px] md:text-xs text-muted-foreground">Type: MCQ</span>
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
                    <span className="text-emerald-400">+{currentQuestion.marks}</span>
                    <span className="text-white/20 mx-1">/</span>
                    <span className="text-rose-400">-{currentQuestion.negativeMarks}</span>
                  </div>
               </div>
            </div>

            {/* Question Body - Fluid Typography */}
            <div className="space-y-6">
              <div 
                className="text-base md:text-xl font-medium leading-relaxed text-slate-100 break-words"
                dangerouslySetInnerHTML={{ __html: (currentQuestion[`${currentLang}_html` as keyof Question] || currentQuestion[currentLang as keyof Question]) as string }}
              />

              {currentQuestion.dom_images?.map((img, i) => (
                <div key={i} className="relative aspect-video max-w-full overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  <img src={img} alt="Ref" className="object-contain w-full h-full" />
                </div>
              ))}
            </div>

            {/* Options - Grid system for flexibility */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  className={cn(
                    "flex items-start gap-3 md:gap-4 p-4 md:p-5 rounded-2xl border text-left transition-all group relative overflow-hidden",
                    responses[currentQuestion.id].selectedOptionId === option.id
                      ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                      : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold transition-colors",
                    responses[currentQuestion.id].selectedOptionId === option.id
                      ? "bg-primary border-primary text-white"
                      : "border-white/20 text-muted-foreground group-hover:border-primary"
                  )}>
                    {option.id.split('-').pop()?.toUpperCase() || ''}
                  </div>
                  <div className="flex-1 space-y-2">
                    {option.image && <img src={option.image} alt="Opt" className="max-h-16 md:max-h-20 rounded" />}
                    <span className="text-sm md:text-base font-medium block leading-tight">{option[currentLang]}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Sidebar Palette */}
        <aside className="hidden lg:flex w-72 xl:w-80 bg-slate-900 border-l border-white/5 flex-col overflow-hidden">
          <QuestionPalette 
            questions={testData.questions} 
            responses={responses} 
            currentIndex={currentQuestionIndex}
            onNavigate={(index) => setCurrentQuestionIndex(index)}
          />
        </aside>
      </div>

      {/* Action Footer - Fixed bottom, high z-index */}
      <footer className="h-auto min-h-20 border-t border-white/5 bg-slate-900/90 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between px-4 md:px-6 py-4 sm:py-0 shrink-0 z-50 gap-4">
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto hide-scrollbar sm:overflow-visible">
          <Button 
            variant="outline" 
            onClick={handleMarkForReview}
            className="rounded-xl border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 font-bold text-[10px] md:text-xs h-10 md:h-11 px-3 whitespace-nowrap"
          >
            Review & Next
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleClearResponse}
            className="rounded-xl text-muted-foreground hover:bg-white/5 font-bold text-[10px] md:text-xs h-10 md:h-11 px-3 whitespace-nowrap"
          >
            Clear Response
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
           <Button 
            variant="outline" 
            disabled={currentQuestionIndex === 0}
            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
            className="rounded-xl border-white/10 h-10 md:h-11 px-4 flex-1 sm:flex-none"
           >
             <ChevronLeft className="w-5 h-5" />
           </Button>
           <Button 
            onClick={handleSaveAndNext}
            className="bg-primary hover:bg-primary/90 text-white rounded-xl h-10 md:h-11 px-6 md:px-10 font-bold gap-2 flex-[2] sm:flex-none"
           >
             {currentQuestionIndex === testData.questions.length - 1 ? "Save & Preview" : "Save & Next"}
             <ChevronRight className="w-4 h-4" />
           </Button>
        </div>
      </footer>

      {/* Pause Modal */}
      <Dialog open={isPaused} onOpenChange={setIsPaused}>
        <DialogContent className="glass border-white/10 sm:max-w-md w-[95%]">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-headline">Test Paused</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center text-muted-foreground text-sm leading-relaxed">
            Progress saved. Take a breath and resume when ready.
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setIsPaused(false)} className="bg-primary rounded-xl w-full h-12 font-bold">Resume Test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Confirmation */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="glass border-white/10 w-[95%] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">Final Submission</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
               <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                 <div className="text-xl font-bold text-emerald-400">
                   {Object.values(responses).filter(r => r.status === 'answered' || r.status === 'answered-marked-review').length}
                 </div>
                 <div className="text-[10px] uppercase font-bold text-muted-foreground">Answered</div>
               </div>
               <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center">
                 <div className="text-xl font-bold text-rose-400">
                   {Object.values(responses).filter(r => r.status === 'not-answered' || r.status === 'marked-review').length}
                 </div>
                 <div className="text-[10px] uppercase font-bold text-muted-foreground">Skipped</div>
               </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">Review your attempts carefully. Once submitted, results will be generated instantly.</p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => setShowSubmitConfirm(false)} className="rounded-xl h-11 w-full sm:flex-1">Keep Practicing</Button>
            <Button onClick={onSubmit} className="bg-emerald-500 hover:bg-emerald-600 rounded-xl h-11 w-full sm:flex-1 font-bold">Final Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};