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
  Clock,
  Zap,
  Bookmark,
  BookmarkCheck,
  History,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QuestionPalette } from "./QuestionPalette";
import { RichTextRenderer } from "./RichTextRenderer";
import { QuestionImage } from "./QuestionImage";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { doc, setDoc, deleteDoc, serverTimestamp, collection } from "firebase/firestore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  testData: MockTestData;
  userLanguage: 'en' | 'hn';
  responses: Record<string, UserResponse>;
  onBack: () => void;
  history: any[];
  currentAttemptId: string;
}

export const SolutionInterface = ({
  testData,
  userLanguage: initialLang,
  responses,
  onBack,
  history,
  currentAttemptId
}: Props) => {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { category, examId, mockId } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentLang, setCurrentLang] = useState<'en' | 'hn'>(initialLang);

  const bmQuery = useMemoFirebase(() =>
    user && db ? collection(db, 'users', user.uid, 'bookmarks') : null,
    [user?.uid, db]);
  const { data: bookmarks } = useCollection<any>(bmQuery);

  const currentQuestion = testData.questions[currentIndex];
  const response = responses[currentQuestion.id];

  const correctOptionId = Number(currentQuestion.correctOptionId);
  const selectedOptionId = (response?.selectedOptionId !== null && response?.selectedOptionId !== undefined)
    ? Number(response.selectedOptionId)
    : null;

  const isCorrect = selectedOptionId !== null && selectedOptionId === correctOptionId;
  const isSkipped = selectedOptionId === null || isNaN(selectedOptionId);

  const isBookmarked = useMemo(() => {
    return bookmarks?.some(b => b.questionId === currentQuestion.id);
  }, [bookmarks, currentQuestion.id]);

  const toggleBookmark = async () => {
    if (!user || !db) return;
    const ref = doc(db, 'users', user.uid, 'bookmarks', currentQuestion.id);
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

  const currentAttempt = history?.find(h => h.id === currentAttemptId);
  const currentAttemptDate = currentAttempt?.completedAt?.toDate ? currentAttempt.completedAt.toDate() : null;

  return (
    <div className="h-screen flex flex-col bg-[#0b1120] overflow-hidden">
      {/* Sticky Compact Header */}
      <header className="h-14 border-b border-white/10 bg-slate-900/90 backdrop-blur-md flex items-center justify-between px-4 md:px-6 shrink-0 z-[100] sticky top-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-white h-9 px-3 rounded-lg font-bold text-xs gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="font-headline font-bold text-xs uppercase text-accent truncate max-w-[150px] hidden sm:block">
            {testData.title}
          </h1>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10 mr-1">
            <button
              onClick={() => setCurrentLang('en')}
              className={cn("px-2.5 py-1 text-[10px] font-bold rounded-md transition-all", currentLang === 'en' ? "bg-primary text-white" : "text-muted-foreground hover:text-white")}
            >EN</button>
            <button
              onClick={() => setCurrentLang('hn')}
              className={cn("px-2.5 py-1 text-[10px] font-bold rounded-md transition-all", currentLang === 'hn' ? "bg-primary text-white" : "text-muted-foreground hover:text-white")}
            >HN</button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="glass border-white/10 h-8 rounded-lg text-[9px] font-bold uppercase gap-2 px-3">
                <History className="w-3 h-3 text-primary" />
                <span className="hidden xs:inline">Attempt</span> {currentAttemptDate ? format(currentAttemptDate, "MMM d") : 'Current'}
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 glass border-white/10 p-1" align="end">
              {history?.map((h) => {
                const date = h.completedAt?.toDate ? h.completedAt.toDate() : null;
                return (
                  <Link
                    key={h.id}
                    href={`/exams/${category}/${examId}/mock/${mockId}/result/${h.id}`}
                  >
                    <DropdownMenuItem
                      className={cn(
                        "flex items-center justify-between py-3 px-4 cursor-pointer rounded-lg mb-1",
                        h.id === currentAttemptId
                          ? "bg-primary/20 text-primary"
                          : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-xs">
                          {date ? format(date, "MMM dd, yyyy") : "Recently"}
                        </span>
                        <span className="text-[10px] opacity-60">
                          {date ? format(date, "HH:mm") : ""}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold">
                          {Number(h.score || 0).toFixed(1)}
                        </div>
                        <div className="text-[9px] opacity-60">
                          {Number(h.accuracy || 0).toFixed(0)}% Acc
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground hover:text-white h-9 w-9">
                <LayoutGrid className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 bg-[#0f172a] border-white/5 w-[85%] sm:w-[350px]">
              <QuestionPalette questions={testData.questions} responses={responses} currentIndex={currentIndex} onNavigate={setCurrentIndex} />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 lg:p-12">
          <div className="max-w-4xl mx-auto space-y-10 pb-32">
            <div className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-4">
                {isSkipped ? (
                  <Badge className="bg-slate-500/10 text-slate-400 h-7 px-3 text-[10px] uppercase font-bold border-slate-500/20">Not Attempted</Badge>
                ) : isCorrect ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 h-7 px-3 text-[10px] uppercase font-bold border-emerald-500/20">Correct</Badge>
                ) : (
                  <Badge className="bg-rose-500/10 text-rose-400 h-7 px-3 text-[10px] uppercase font-bold border-rose-500/20">Incorrect</Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleBookmark}
                  className={cn("h-8 w-8 p-0 rounded-full transition-all", isBookmarked ? "text-accent bg-accent/10" : "text-muted-foreground hover:bg-white/5")}
                >
                  {isBookmarked ? <BookmarkCheck className="w-4.5 h-4.5" /> : <Bookmark className="w-4.5 h-4.5" />}
                </Button>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-2">
                  <Clock className="w-3.5 h-3.5 text-primary" /> {formatTime(response?.timeSpentSeconds || 0)}
                </div>
              </div>
              <div className="text-sm font-bold font-mono">
                <span className={isCorrect ? "text-emerald-400" : isSkipped ? "text-slate-400" : "text-rose-400"}>
                  {isCorrect ? `+${currentQuestion.marks?.positive}` : isSkipped ? "0.00" : `-${currentQuestion.marks?.negative}`}
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/20 text-primary border-primary/20 text-[10px] font-bold px-3">Q. {currentIndex + 1}</Badge>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{currentQuestion.sectionId}</span>
              </div>
              <RichTextRenderer
                content={(currentQuestion[`${currentLang}_html` as keyof Question] || currentQuestion[currentLang as keyof Question]) as string}
                className="text-lg md:text-2xl font-medium text-slate-100 leading-relaxed"
              />
              {currentQuestion.dom_images?.map((img, i) => (
                <QuestionImage key={i} src={img} alt={`Figure ${i + 1}`} />
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.options.map((option) => {
                const optId = Number(option.id);
                const isUserSelected = selectedOptionId === optId;
                const isCorrectOption = correctOptionId === optId;

                return (
                  <div key={option.id} className={cn(
                    "p-5 rounded-2xl border flex gap-4 transition-all relative",
                    isCorrectOption ? "bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/5" :
                      isUserSelected && !isCorrect ? "bg-rose-500/10 border-rose-500/40" :
                        "bg-white/[0.03] border-white/5"
                  )}>
                    <div className={cn(
                      "w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0",
                      isCorrectOption ? "bg-emerald-500 border-emerald-500 text-white" :
                        isUserSelected && !isCorrect ? "bg-rose-500 border-rose-500 text-white" :
                          "bg-white/10 border-white/10 text-muted-foreground"
                    )}>
                      {String(option.id).split('-').pop()?.toUpperCase() || ''}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <RichTextRenderer
                        content={(option[`${currentLang}_html` as keyof typeof option] || option[currentLang as keyof typeof option]) as string}
                        className="text-sm md:text-base font-medium leading-relaxed"
                      />
                    </div>
                    {isCorrectOption && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
                    {isUserSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
                  </div>
                );
              })}
            </div>

            {(currentQuestion.explanation || currentQuestion.solution) && (
              <div className="space-y-4 p-8 rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-white/5 to-transparent relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Zap className="w-24 h-24 text-primary" />
                </div>
                <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-[10px]">
                  <Zap className="w-4 h-4 fill-current" /> Detailed Solution
                </div>
                <RichTextRenderer
                  content={
                    (
                      (currentQuestion.explanation || currentQuestion.solution)?.[
                      `${currentLang}_html`
                      ] ||
                      (currentQuestion.explanation || currentQuestion.solution)?.[
                      currentLang
                      ] ||
                      "No detailed solution available."
                    ) as string
                  }
                  className="text-sm md:text-base text-muted-foreground leading-relaxed prose-invert"
                />
              </div>
            )}
          </div>
        </div>

        <aside className="hidden lg:flex w-72 xl:w-80 bg-[#0f172a] border-l border-white/10 flex-col overflow-hidden">
          <QuestionPalette questions={testData.questions} responses={responses} currentIndex={currentIndex} onNavigate={setCurrentIndex} />
        </aside>
      </div>

      <footer className="h-16 border-t border-white/10 bg-slate-900/95 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-[100]">
        <Button variant="outline" disabled={currentIndex === 0} onClick={() => setCurrentIndex(prev => prev - 1)} className="rounded-xl border-white/10 h-10 px-6 font-bold text-xs">
          <ChevronLeft className="w-4 h-4 mr-2" /> Previous
        </Button>
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          {currentIndex + 1} / {testData.questions.length}
        </div>
        <Button onClick={() => currentIndex < testData.questions.length - 1 ? setCurrentIndex(prev => prev + 1) : onBack()} className="bg-primary hover:bg-primary/90 text-white rounded-xl h-10 px-8 font-bold text-xs shadow-lg shadow-primary/20">
          {currentIndex === testData.questions.length - 1 ? "Finish Review" : "Next Question"}
          {currentIndex < testData.questions.length - 1 && <ChevronRight className="w-4 h-4 ml-2" />}
        </Button>
      </footer>
    </div>
  );
};