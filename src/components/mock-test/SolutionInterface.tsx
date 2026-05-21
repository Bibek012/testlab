"use client";

import React, { useState, useMemo } from "react";
import { 
  MockTestData, 
  UserResponse, 
  Question 
} from "@/lib/mock-test-engine-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  LayoutGrid, 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Zap,
  Bookmark,
  BookmarkCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QuestionPalette } from "./QuestionPalette";
import { RichTextRenderer } from "./RichTextRenderer";
import { QuestionImage } from "./QuestionImage";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { doc, setDoc, deleteDoc, serverTimestamp, collection } from "firebase/firestore";

interface Props {
  testData: MockTestData;
  userLanguage: 'en' | 'hn';
  responses: Record<string, UserResponse>;
  onBack: () => void;
}

export const SolutionInterface = ({ 
  testData, 
  userLanguage: initialLang, 
  responses, 
  onBack 
}: Props) => {
  const { user } = useUser();
  const db = useFirestore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentLang, setCurrentLang] = useState<'en' | 'hn'>(initialLang);

  const bmQuery = useMemoFirebase(() => 
    user && db ? collection(db, 'users', user.uid, 'bookmarks') : null, 
  [user?.uid, db]);
  const { data: bookmarks } = useCollection<any>(bmQuery);

  const currentQuestion = testData.questions[currentIndex];
  const response = responses[currentQuestion.id];
  const correctOptionId = Number(currentQuestion.correctOptionId ?? currentQuestion.raw_answer_id ?? currentQuestion.answer);
  const selectedOptionId = (response?.selectedOptionId !== null && response?.selectedOptionId !== undefined) 
    ? Number(response.selectedOptionId) 
    : null;
  const isCorrect = selectedOptionId !== null && selectedOptionId === correctOptionId;
  const isSkipped = selectedOptionId === null || isNaN(selectedOptionId as number);

  const isBookmarked = useMemo(() => {
    return bookmarks?.some(b => b.questionId === currentQuestion.id);
  }, [bookmarks, currentQuestion.id]);

  const toggleBookmark = async () => {
    if (!user || !db) return;
    const bookmarkId = currentQuestion.id;
    const ref = doc(db, 'users', user.uid, 'bookmarks', bookmarkId);

    if (isBookmarked) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        uid: user.uid,
        questionId: currentQuestion.id,
        mockId: testData.id,
        examId: testData.examName,
        sectionId: currentQuestion.sectionId,
        bookmarkedAt: serverTimestamp(),
        questionData: currentQuestion
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen flex flex-col bg-[#0b1120] overflow-hidden">
      <header className="h-14 md:h-16 border-b border-white/5 bg-slate-900/50 flex items-center justify-between px-4 md:px-6 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-white h-9">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Result
          </Button>
          <div className="h-4 w-px bg-white/10 mx-2" />
          <h1 className="font-headline font-bold text-xs uppercase text-accent hidden sm:block">
            Solution Mode: {testData.examName}
          </h1>
        </div>

        <div className="flex items-center gap-2">
           <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10 mr-2">
              <button 
                onClick={() => setCurrentLang('en')}
                className={cn("px-2 py-0.5 text-[10px] font-bold rounded", currentLang === 'en' ? "bg-accent text-white" : "text-muted-foreground")}
              >EN</button>
              <button 
                onClick={() => setCurrentLang('hn')}
                className={cn("px-2 py-0.5 text-[10px] font-bold rounded", currentLang === 'hn' ? "bg-accent text-white" : "text-muted-foreground")}
              >HN</button>
            </div>
           <Sheet>
             <SheetTrigger asChild>
               <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground hover:text-white">
                 <LayoutGrid className="w-5 h-5" />
               </Button>
             </SheetTrigger>
             <SheetContent side="right" className="p-0 bg-[#0f172a] border-white/5 w-[85%] sm:w-[350px]">
                <SheetHeader className="p-4 border-b border-white/5 text-left">
                  <SheetTitle className="text-sm font-bold">Review Palette</SheetTitle>
                </SheetHeader>
                <div className="h-full flex flex-col">
                  <QuestionPalette 
                    questions={testData.questions} 
                    responses={responses} 
                    currentIndex={currentIndex}
                    onNavigate={(index) => setCurrentIndex(index)}
                  />
                </div>
             </SheetContent>
           </Sheet>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-10">
          <div className="max-w-4xl mx-auto space-y-8 pb-32">
            <div className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/5">
              <div className="flex items-center gap-4">
                {isSkipped ? (
                  <Badge className="bg-slate-500/10 text-slate-400 gap-2 h-8 px-4"><HelpCircle className="w-4 h-4" /> Not Attempted</Badge>
                ) : isCorrect ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 gap-2 h-8 px-4"><CheckCircle2 className="w-4 h-4" /> Correct Answer</Badge>
                ) : (
                  <Badge className="bg-rose-500/10 text-rose-400 gap-2 h-8 px-4"><XCircle className="w-4 h-4" /> Incorrect Answer</Badge>
                )}
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={toggleBookmark}
                    className={cn(
                      "h-8 w-8 p-0 rounded-full",
                      isBookmarked ? "text-accent bg-accent/10" : "text-muted-foreground hover:bg-white/5"
                    )}
                 >
                    {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                 </Button>
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> Time Spent: {formatTime(response?.timeSpentSeconds || 0)}
                </div>
              </div>
              <div className="text-sm font-bold">
                Result: <span className={isCorrect ? "text-emerald-400" : isSkipped ? "text-slate-400" : "text-rose-400"}>
                  {isCorrect ? `+${currentQuestion.marks?.positive || 1}` : isSkipped ? "0.00" : `-${currentQuestion.marks?.negative || 0.33}`}
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <Badge className="bg-primary/20 text-primary border-primary/20 rounded-lg">Question {currentIndex + 1}</Badge>
              </div>
              
              <RichTextRenderer 
                content={(currentQuestion[`${currentLang}_html` as keyof Question] || currentQuestion[currentLang as keyof Question]) as string}
                className="text-lg md:text-xl font-medium text-slate-100"
              />

              {currentQuestion.dom_images?.map((img, i) => (
                <QuestionImage key={i} src={img} alt={`Solution Figure ${i+1}`} />
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.options.map((option) => {
                const optId = Number(option.id);
                const isUserSelected = selectedOptionId === optId;
                const isCorrectOption = correctOptionId === optId;
                
                let cardStyle = "bg-white/5 border-white/5";
                let badgeStyle = "bg-white/10 text-muted-foreground border-white/10";

                if (isCorrectOption) {
                  cardStyle = "bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
                  badgeStyle = "bg-emerald-500 border-emerald-500 text-white";
                } else if (isUserSelected && !isCorrect) {
                  cardStyle = "bg-rose-500/10 border-rose-500/40";
                  badgeStyle = "bg-rose-500 border-rose-500 text-white";
                }

                return (
                  <div key={option.id} className={cn("p-5 rounded-2xl border flex gap-4 transition-all", cardStyle)}>
                    <div className={cn("w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0", badgeStyle)}>
                      {String(option.id).split('-').pop()?.toUpperCase() || ''}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <RichTextRenderer 
                        content={(option[`${currentLang}_html` as keyof typeof option] || option[currentLang as keyof typeof option]) as string}
                        className="text-sm md:text-base font-medium"
                      />
                    </div>
                    {isCorrectOption && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                    {isUserSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                  </div>
                );
              })}
            </div>

            {currentQuestion.explanation && (
              <div className="space-y-4 p-6 rounded-3xl border border-white/5 bg-gradient-to-br from-white/5 to-transparent">
                <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs">
                  <Zap className="w-4 h-4 fill-current" /> Detailed Solution
                </div>
                <RichTextRenderer 
                  content={(currentQuestion.explanation[`${currentLang}_html` as keyof typeof currentQuestion.explanation] || currentQuestion.explanation[currentLang as keyof typeof currentQuestion.explanation]) as string}
                  className="text-sm md:text-base text-muted-foreground leading-relaxed"
                />
              </div>
            )}
          </div>
        </div>

        <aside className="hidden lg:flex w-72 xl:w-80 bg-[#0f172a] border-l border-white/5 flex-col overflow-hidden">
          <QuestionPalette 
            questions={testData.questions} 
            responses={responses} 
            currentIndex={currentIndex}
            onNavigate={(index) => setCurrentIndex(index)}
          />
        </aside>
      </div>

      <footer className="h-16 border-t border-white/5 bg-slate-900/90 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-50">
        <Button 
          variant="outline" 
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(prev => prev - 1)}
          className="rounded-xl border-white/10 h-10 px-6 font-bold"
        >
          <ChevronLeft className="w-4 h-4 mr-2" /> Previous
        </Button>
        <Button 
          onClick={() => {
            if (currentIndex < testData.questions.length - 1) {
              setCurrentIndex(prev => prev + 1);
            } else {
              onBack();
            }
          }}
          className="bg-primary hover:bg-primary/90 rounded-xl h-10 px-8 font-bold"
        >
          {currentIndex === testData.questions.length - 1 ? "Finish Review" : "Next Question"}
          {currentIndex < testData.questions.length - 1 && <ChevronRight className="w-4 h-4 ml-2" />}
        </Button>
      </footer>
    </div>
  );
};
