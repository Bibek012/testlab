
"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  getSampleMockTest, 
  MockTestData, 
  UserResponse 
} from "@/lib/mock-test-engine-data";
import { InstructionsStep } from "@/components/mock-test/InstructionsStep";
import { ConfigStep } from "@/components/mock-test/ConfigStep";
import { TestInterface } from "@/components/mock-test/TestInterface";
import { ResultPage } from "@/components/mock-test/ResultPage";
import { SolutionInterface } from "@/components/mock-test/SolutionInterface";
import { Loader2 } from "lucide-react";

export type TestStep = 'instructions' | 'config' | 'test' | 'result' | 'solution';

export default function MockTestEnginePage() {
  const params = useParams();
  const category = params.category as string;
  const examId = params.examId as string;
  const mockId = params.mockId as string;
  
  const [step, setStep] = useState<TestStep>('instructions');
  const [testData, setTestData] = useState<MockTestData | null>(null);
  const [userLanguage, setUserLanguage] = useState<'en' | 'hn'>('en');
  const [responses, setResponses] = useState<Record<string, UserResponse>>({});
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  const dashboardUrl = `/exams/${category}/${examId}`;

  // Initialize test data
  useEffect(() => {
    const data = getSampleMockTest(mockId);
    setTestData(data);
    
    // Initialize empty responses
    const initialResponses: Record<string, UserResponse> = {};
    data.questions.forEach(q => {
      initialResponses[q.id] = {
        questionId: q.id,
        selectedOptionId: null,
        status: 'not-visited',
        timeSpentSeconds: 0
      };
    });
    setResponses(initialResponses);
  }, [mockId]);

  if (!testData) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const handleStartTest = (lang: 'en' | 'hn') => {
    setUserLanguage(lang);
    setStartTime(Date.now());
    
    // Set a persistent end time for the timer
    const testEndTime = Date.now() + (testData.durationMinutes * 60 * 1000);
    localStorage.setItem(`test_end_${testData.id}`, testEndTime.toString());
    
    setStep('test');
  };

  const handleSubmitTest = () => {
    setEndTime(Date.now());
    localStorage.removeItem(`test_end_${testData.id}`);
    setStep('result');
  };

  const handleReattempt = () => {
    const initialResponses: Record<string, UserResponse> = {};
    testData.questions.forEach(q => {
      initialResponses[q.id] = {
        questionId: q.id,
        selectedOptionId: null,
        status: 'not-visited',
        timeSpentSeconds: 0
      };
    });
    setResponses(initialResponses);
    setStartTime(null);
    setEndTime(null);
    localStorage.removeItem(`test_end_${testData.id}`);
    setStep('instructions');
  };

  return (
    <main className="min-h-screen bg-[#0b1120] text-foreground">
      {step === 'instructions' && (
        <InstructionsStep 
          testData={testData} 
          onNext={() => setStep('config')} 
        />
      )}
      
      {step === 'config' && (
        <ConfigStep 
          testData={testData} 
          onBack={() => setStep('instructions')}
          onStart={handleStartTest}
        />
      )}

      {step === 'test' && (
        <TestInterface 
          testData={testData}
          userLanguage={userLanguage}
          responses={responses}
          setResponses={setResponses}
          onSubmit={handleSubmitTest}
        />
      )}

      {step === 'result' && (
        <ResultPage 
          testData={testData}
          responses={responses}
          startTime={startTime!}
          endTime={endTime!}
          userLanguage={userLanguage}
          onReattempt={handleReattempt}
          onViewSolutions={() => setStep('solution')}
          dashboardUrl={dashboardUrl}
        />
      )}

      {step === 'solution' && (
        <SolutionInterface 
          testData={testData}
          userLanguage={userLanguage}
          responses={responses}
          onBack={() => setStep('result')}
        />
      )}
    </main>
  );
}
