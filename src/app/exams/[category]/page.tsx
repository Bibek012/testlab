import React from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import Link from "next/link";
import { ChevronRight, BookOpen, Clock, Award, FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

// Params ko Promise type mein wrap kiya gaya hai
interface PageProps {
  params: Promise<{
    category: string;
    examId: string;
  }>;
}

export default async function ExamDetailsPage({ params }: PageProps) {
  // 1. Dono dynamic route parameters ko await karein
  const { category, examId } = await params;

  // 2. Fetch specific exam details from Firestore
  const examRef = doc(db, "exams", examId);
  const examSnap = await getDoc(examRef);

  if (!examSnap.exists()) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-2xl font-bold text-foreground">Exam Not Found</h2>
          <p className="text-muted-foreground mt-2">Kripya sahi URL check karein ya thodi der baad koshish karein.</p>
          <Link href={`/exams/${category}`} className="mt-4">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Go Back
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const examData = examSnap.data();

  // 3. Fetch all mock tests related to this examId
  const mockTestsRef = collection(db, "mockTests");
  const q = query(mockTestsRef, where("examId", "==", examId));
  const querySnapshot = await getDocs(q);
  
  const mockTests = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      <Navbar />
      
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-10 space-y-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 p-3 rounded-xl border w-fit">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4 opacity-60" />
          <Link href={`/exams/${category}`} className="hover:text-foreground transition-colors uppercase">{category}</Link>
          <ChevronRight className="w-4 h-4 opacity-60" />
          <span className="text-foreground font-medium">{examData.name || examId.toUpperCase()}</span>
        </div>

        {/* Exam Header Banner */}
        <div className="relative bg-gradient-to-br from-primary/10 via-background to-background border rounded-3xl p-8 md:p-12 overflow-hidden shadow-sm">
          <div className="absolute top-1/2 right-10 -translate-y-1/2 w-72 h-72 bg-primary/5 blur-[100px] pointer-events-none rounded-full" />
          <div className="max-w-3xl space-y-4 relative z-10">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">{examData.name}</h1>
            <p className="text-muted-foreground text-lg leading-relaxed">{examData.description || `${examData.name} ke liye sabhi important mock tests yahan available hain.`}</p>
            <div className="flex flex-wrap gap-4 text-sm font-medium pt-2">
              <div className="flex items-center gap-2 bg-card border px-4 py-2 rounded-xl">
                <FileText className="w-4 h-4 text-primary" />
                <span>Total Tests: {mockTests.length}</span>
              </div>
              <div className="flex items-center gap-2 bg-card border px-4 py-2 rounded-xl">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Difficulty: {examData.difficulty || "Intermediate"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mock Tests Section */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Available Mock Tests</h2>
            <p className="text-muted-foreground mt-1">Apni taiyari check karne ke liye niche diye gaye tests ko start karein.</p>
          </div>

          {mockTests.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[250px] border border-dashed rounded-2xl p-8 text-center bg-card">
              <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Is exam ke liye abhi koi mock test publish nahi kiya gaya hai.</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Humaari team naye tests add kar rahi hai, kripya thodi der baad check karein.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockTests.map((mock: any) => (
                <div key={mock.id} className="bg-card border rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300 group hover:border-primary/30">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-bold text-xl text-foreground group-hover:text-primary transition-colors">{mock.title || "Full Length Mock Test"}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm line-clamp-2">{mock.description || "Exam pattern ke hisab se design kiya gaya updated pattern mock test."}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{mock.totalQuestions || "N/A"} Qs</span>
                      </div>
                      <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{mock.duration || "N/A"} Mins</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-6">
                    <Link href={`/exams/${category}/${examId}/mock/${mock.id}`}>
                      <Button className="w-full rounded-xl font-bold h-11 shadow-sm">Start Test</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
