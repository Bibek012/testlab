
"use client";

import React from "react";
import { MockTestData } from "@/lib/mock-test-engine-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Info, AlertTriangle, Clock, HelpCircle, Target } from "lucide-react";

interface Props {
  testData: MockTestData;
  onNext: () => void;
}

export const InstructionsStep = ({ testData, onNext }: Props) => {
  const totalMarks = (testData.questions || []).reduce(
    (acc: number, q: any) =>
      acc + Number(q?.positiveMarks ?? q?.marks?.positive ?? 1),
    0
  );

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Card className="glass border-white/10 shadow-2xl overflow-hidden rounded-[2rem]">
        <CardHeader className="bg-white/5 border-b border-white/5 p-8">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-accent uppercase tracking-widest mb-1">General Instructions</p>
              <CardTitle className="text-3xl font-headline font-bold">{testData.title}</CardTitle>
            </div>
            <div className="bg-primary/20 p-3 rounded-2xl">
              <Info className="w-6 h-6 text-primary" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Questions</p>
              <div className="flex items-center gap-2 text-xl font-bold">
                <HelpCircle className="w-5 h-5 text-primary" />
                {testData.questions.length}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Duration</p>
              <div className="flex items-center gap-2 text-xl font-bold">
                <Clock className="w-5 h-5 text-accent" />
                {testData.durationMinutes}m
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Max Marks</p>
              <div className="flex items-center gap-2 text-xl font-bold">
                <Target className="w-5 h-5 text-emerald-400" />
                {totalMarks}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Negative Marks</p>
              <div className="flex items-center gap-2 text-xl font-bold text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                {testData.negativeMarks || 0.33}
              </div>
            </div>
          </div>

          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed h-[300px] overflow-y-auto pr-4 scrollbar-thin">
            <h4 className="text-foreground font-bold text-base">Please read the following instructions carefully:</h4>
            <ul className="space-y-3 list-disc pl-5">
              <li>The clock will be set at the server. The countdown timer at the top right corner of screen will display the remaining time available for you to complete the examination.</li>
              <li>When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination.</li>
              <li>The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:</li>
              <li className="list-none flex items-center gap-3">
                <div className="w-5 h-5 rounded bg-slate-700"></div> You have not visited the question yet.
              </li>
              <li className="list-none flex items-center gap-3">
                <div className="w-5 h-5 rounded bg-rose-500"></div> You have not answered the question.
              </li>
              <li className="list-none flex items-center gap-3">
                <div className="w-5 h-5 rounded bg-emerald-500"></div> You have answered the question.
              </li>
              <li className="list-none flex items-center gap-3">
                <div className="w-5 h-5 rounded bg-indigo-500"></div> You have NOT answered the question, but have marked the question for review.
              </li>
              <li>Navigating to a Question: To answer a question, you can click on the question number in the Question Palette at the right of your screen.</li>
              <li>Marks per correct answer: +{testData.marksPerQuestion || 1}, Incorrect answer penalty: -{testData.negativeMarks || 0.33}.</li>
              <li>Do not refresh the page or close the window during the test.</li>
            </ul>
          </div>

          <div className="pt-8 border-t border-white/5 flex justify-end">
            <Button size="lg" onClick={onNext} className="bg-primary hover:bg-primary/90 text-white rounded-xl px-10 h-14 font-bold gap-2">
              Next Step
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
