"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InstructionsStepProps {
  testData: any;
  userLanguage?: "en" | "hn"; // Undefined fallback safely handled
  onStart: () => void;
}

export default function InstructionsStep({ testData, userLanguage = "en", onStart }: InstructionsStepProps) {
  const isHindi = userLanguage === "hn";

  const totalQuestions = testData?.questions?.length || testData?.totalQuestions || 0;
  const durationMinutes = testData?.durationMinutes || 0;
  const marksPerQuestion = testData?.marksPerQuestion || 1;
  
  // Dynamic Max Score fallback calculation
  const totalMarks = testData?.fullMarks || testData?.totalScore || (totalQuestions * marksPerQuestion);

  // Loose but Loop-proof Negative Marks Fraction Normalizer
  let formattedNegativeMarks = "0.33";
  const num = Number(testData?.negativeMarks);
  if (!isNaN(num)) {
    if (num === 0) {
      formattedNegativeMarks = "0";
    } else if (num > 0.3 && num < 0.34) {
      formattedNegativeMarks = "0.33";
    } else {
      formattedNegativeMarks = parseFloat(num.toFixed(2)).toString();
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300">
      {/* HEADER TITLE */}
      <div className="text-center md:text-left space-y-2">
        <h1 className="text-2xl md:text-3xl font-headline font-bold text-white">
          {testData?.title || (isHindi ? "परीक्षा निर्देश" : "Exam Instructions")}
        </h1>
        <p className="text-muted-foreground text-sm uppercase tracking-wider font-semibold text-primary">
          {testData?.examName}
        </p>
      </div>

      {/* QUICK METRICS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Questions Card */}
        <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
              {isHindi ? "कुल प्रश्न" : "Total Questions"}
            </p>
            <p className="text-sm font-black text-white mt-0.5 font-mono">{totalQuestions}</p>
          </div>
        </div>

        {/* Duration Card */}
        <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
              {isHindi ? "कुल समय" : "Total Duration"}
            </p>
            <p className="text-sm font-black text-white mt-0.5 font-mono">{`${durationMinutes} ${isHindi ? "मिनट" : "Mins"}`}</p>
          </div>
        </div>

        {/* Correct Mark Card */}
        <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
              {isHindi ? "सकारात्मक अंक" : "Correct Mark"}
            </p>
            <p className="text-sm font-black text-white mt-0.5 font-mono">+{marksPerQuestion}</p>
          </div>
        </div>

        {/* Negative Mark Card */}
        <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
              {isHindi ? "नकारात्मक अंक" : "Negative Mark"}
            </p>
            <p className="text-sm font-black text-white mt-0.5 font-mono">-{formattedNegativeMarks}</p>
          </div>
        </div>
      </div>

      {/* INSTRUCTIONS DETAILS TEXT VIEW CARD */}
      <Card className="glass border-white/10 bg-slate-900/50">
        <CardHeader className="border-b border-white/5 py-4">
          <CardTitle className="text-base font-bold text-white">
            {isHindi ? "कृपया निर्देशों को ध्यान से पढ़ें" : "Please Read the Instructions Carefully"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-sm text-slate-300 space-y-4 leading-relaxed">
          {isHindi ? (
            <ul className="list-disc pl-5 space-y-2.5">
              <li>इस परीक्षा में कुल <span className="text-white font-bold">{totalQuestions}</span> बहुविकल्पीय प्रश्न शामिल हैं, जिसके लिए अधिकतम अंक <span className="text-accent font-bold">{totalMarks}</span> निर्धारित हैं।</li>
              <li>परीक्षा को पूरा करने के लिए आपको <span className="text-white font-bold">{durationMinutes} मिनट</span> का समय दिया जाएगा।</li>
              <li>प्रत्येक सही उत्तर के लिए आपको <span className="text-emerald-400 font-bold">+{marksPerQuestion}</span> अंक दिए जाएंगे।</li>
              <li>प्रत्येक गलत उत्तर के लिए <span className="text-rose-400 font-bold">-{formattedNegativeMarks}</span> अंक की कटौती की जाएगी। बिना प्रयास किए गए प्रश्नों के लिए कोई अंक नहीं काटा जाएगा।</li>
              <li>आप परीक्षा के दौरान किसी भी समय प्रश्न पैलेट का उपयोग करके किसी भी प्रश्न पर नेविगेट कर सकते हैं।</li>
              <li>सुनिश्चित करें कि समय समाप्त होने से पहले आप अपने सभी उत्तरों की जांच कर लें। समय समाप्त होने पर टेस्ट ऑटो-सबमिट हो जाएगा।</li>
            </ul>
          ) : (
            <ul className="list-disc pl-5 space-y-2.5">
              <li>This test contains a total of <span className="text-white font-bold">{totalQuestions}</span> multiple-choice questions with maximum evaluation marks of <span className="text-accent font-bold">{totalMarks}</span>.</li>
              <li>The clock/timer is set for a strict sequence window of <span className="text-white font-bold">{durationMinutes} minutes</span>.</li>
              <li>Every correct response updates your metric scoreboard by <span className="text-emerald-400 font-bold">+{marksPerQuestion}</span> mark.</li>
              <li>Every wrong attempt will deduct <span className="text-rose-400 font-bold">-{formattedNegativeMarks}</span> from your accumulated score. No marks are penalized for unattempted packets.</li>
              <li>You can easily jump onto any indexing node directly from the right-side dashboard navigation palette panel frame.</li>
              <li>Ensure steady network coverage. The assessment portal auto-commits everything synchronously once the allocation window countdown hits zero.</li>
            </ul>
          )}
        </CardContent>
      </Card>

      {/* START TRIGGERS BUTTON TRAY */}
      <div className="flex justify-center pt-2">
        <Button 
          onClick={onStart} 
          className="w-full sm:w-64 bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl text-sm shadow-xl shadow-primary/20 transition-all duration-200"
        >
          {isHindi ? "आगे बढ़ें" : "Proceed Next"}
        </Button>
      </div>
    </div>
  );
}