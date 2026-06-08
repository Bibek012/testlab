"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useFirestore } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import ExamSidebar from "@/components/ExamSidebar";
import { BookOpen, Clock, Award, ChevronRight, AlertCircle, Loader2, ArrowLeft } from "lucide-react";

interface Exam {
  id: string;
  name: string;
  slug: string;
  description?: string;
  duration?: number;
  totalQuestions?: number;
  totalMarks?: number;
  difficulty?: string;
  categoryId: string;
}

export default function CategoryExamsPage() {
  const router = useRouter();
  const params = useParams();
  const categoryParam = params.category as string;

  // ✅ Hook ko component level pe call karo — useEffect ke bahar
  const db = useFirestore();

  const [exams, setExams] = useState<Exam[]>([]);
  const [categoryName, setCategoryName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ✅ db ab useEffect ke andar directly available hai
    if (!db) {
      setError("Firebase initialize nahi ho pa raha. Thodi der baad try karein.");
      setLoading(false);
      return;
    }

    if (!categoryParam) {
      setLoading(false);
      return;
    }

    const fetchCategoryAndExams = async () => {
      setLoading(true);
      setError(null);
      try {
        let matchedCategoryId = categoryParam;
        let finalCategoryName = "";

        // 1. Category name dhundho
        const categoriesSnapshot = await getDocs(collection(db, "examCategories"));
        const categoryDoc = categoriesSnapshot.docs.find(
          (doc) => doc.id === categoryParam || doc.data().slug === categoryParam
        );

        if (categoryDoc) {
          matchedCategoryId = categoryDoc.id;
          finalCategoryName = categoryDoc.data().title || categoryDoc.data().name || categoryParam;
        } else {
          finalCategoryName = categoryParam
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        }
        setCategoryName(finalCategoryName);

        // 2. Us category ke exams fetch karo
        const examsSnapshot = await getDocs(collection(db, "exams"));
        const fetchedExams: Exam[] = [];

        examsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.isActive !== false) {
            const matchesCategory =
              data.categoryId === matchedCategoryId ||
              data.categoryId === categoryParam ||
              data.category === categoryParam ||
              data.categorySlug === categoryParam;

            if (matchesCategory) {
              fetchedExams.push({
                id: doc.id,
                name: data.name || "Untitled Exam",
                slug: data.slug || doc.id,
                description: data.description || "",
                duration: data.duration || data.timeLimit || 60,
                totalQuestions: data.totalQuestions || data.questionsCount || 0,
                totalMarks: data.totalMarks || 100,
                difficulty: data.difficulty || "Medium",
                categoryId: data.categoryId || "",
              });
            }
          }
        });

        setExams(fetchedExams);
      } catch (err: any) {
        console.error("Firestore error:", err);
        setError("Data load karne mein dikkat aayi. Kripya page refresh karein.");
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndExams();
  }, [db, categoryParam]); // ✅ db dependency mein hai

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex flex-1">
        <ExamSidebar currentCategory={categoryParam} />

        <main className="flex-1 p-6 md:p-10 space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 p-3 rounded-xl border w-fit">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4 opacity-60" />
            <span className="text-foreground font-medium uppercase">{categoryParam}</span>
          </div>

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {loading ? "Loading..." : categoryName || "Exams"}
            </h1>
            <p className="text-muted-foreground mt-1">
              Apna exam select karein aur mock test shuru karein.
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="mt-4 text-muted-foreground text-sm">Exams load ho rahe hain...</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="border border-destructive/30 bg-destructive/10 rounded-xl p-6 text-center max-w-md mx-auto">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm font-semibold text-destructive">{error}</p>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && exams.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[250px] border border-dashed rounded-2xl p-8 text-center bg-card">
              <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Is category mein abhi koi exam available nahi hai.
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Humaari team naye exams add kar rahi hai, thodi der baad check karein.
              </p>
            </div>
          )}

          {/* Exam Cards */}
          {!loading && !error && exams.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="group bg-card border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-6 space-y-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      exam.difficulty?.toLowerCase() === "easy"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : exam.difficulty?.toLowerCase() === "hard"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-amber-500/10 text-amber-500"
                    }`}>
                      {exam.difficulty || "Medium"}
                    </span>

                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {exam.name}
                    </h3>

                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                      {exam.description || "Is exam ke liye mock tests available hain."}
                    </p>

                    <div className="grid grid-cols-3 gap-2 border-t pt-4 text-center">
                      <div className="bg-muted p-2 rounded-xl">
                        <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <span className="block text-xs font-bold">{exam.duration} Min</span>
                        <span className="text-[10px] text-muted-foreground">Time</span>
                      </div>
                      <div className="bg-muted p-2 rounded-xl">
                        <BookOpen className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <span className="block text-xs font-bold">{exam.totalQuestions}</span>
                        <span className="text-[10px] text-muted-foreground">Questions</span>
                      </div>
                      <div className="bg-muted p-2 rounded-xl">
                        <Award className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <span className="block text-xs font-bold">{exam.totalMarks}</span>
                        <span className="text-[10px] text-muted-foreground">Marks</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-2">
                    <Link
                      href={`/exams/${categoryParam}/${exam.slug || exam.id}`}
                      className="w-full inline-flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm py-3 px-4 rounded-xl transition-all duration-200"
                    >
                      View Mock Tests
                      <ChevronRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
