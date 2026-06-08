"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useFirestore } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import ExamSidebar from "@/components/ExamSidebar";
import {
  BookOpen,
  Award,
  ChevronRight,
  AlertCircle,
  Loader2,
  FileText,
  BarChart2,
} from "lucide-react";

interface Exam {
  id: string;
  name: string;
  slug: string;
  description?: string;
  mockCount?: number;
  totalQuestions?: number;
  totalMarks?: number;
  difficulty?: string;
  categoryId: string;
}

// Format numbers: 1300 → 1.3k, 100 → 100
function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k";
  return String(n);
}

export default function CategoryExamsPage() {
  const params = useParams();
  const categoryParam = params.category as string;
  const db = useFirestore();

  const [exams, setExams] = useState<Exam[]>([]);
  const [categoryName, setCategoryName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setError("Firebase initialize nahi ho pa raha.");
      setLoading(false);
      return;
    }
    if (!categoryParam) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        let matchedCategoryId = categoryParam;
        let finalCategoryName = "";

        const categoriesSnapshot = await getDocs(collection(db, "examCategories"));
        const categoryDoc = categoriesSnapshot.docs.find((doc) => {
          const data = doc.data();
          const slug: string = (data.slug || "").toLowerCase();
          const cp = categoryParam.toLowerCase();
          return (
            doc.id === categoryParam ||
            slug === cp ||
            slug === `${cp}-exams` ||
            slug.startsWith(cp) ||
            cp === slug.replace("-exams", "")
          );
        });

        if (categoryDoc) {
          matchedCategoryId = categoryDoc.id;
          finalCategoryName =
            categoryDoc.data().title || categoryDoc.data().name || categoryParam;
        } else {
          finalCategoryName = categoryParam
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
        }
        setCategoryName(finalCategoryName);

        const examsSnapshot = await getDocs(collection(db, "exams"));
        const fetchedExams: Exam[] = [];

        examsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.isActive === false) return;

          const catSlug: string = (data.categorySlug || "").toLowerCase();
          const cp = categoryParam.toLowerCase();

          const matchesCategory =
            data.categoryId === matchedCategoryId ||
            data.categoryId === categoryParam ||
            data.category === categoryParam ||
            catSlug === cp ||
            catSlug === `${cp}-exams` ||
            catSlug.startsWith(cp) ||
            cp === catSlug.replace("-exams", "");

          if (matchesCategory) {
            fetchedExams.push({
              id: doc.id,
              name: data.name || "Untitled Exam",
              slug: data.slug || doc.id,
              description: data.description || "",
              // mockCount field directly
              mockCount: data.mockCount || data.testsCount || 0,
              // all question count field variations
              totalQuestions:
                data.questionCount ||
                data.totalQuestions ||
                data.questionsCount ||
                0,
              totalMarks: data.totalMarks || 100,
              difficulty: data.difficulty || "Medium",
              categoryId: data.categoryId || "",
            });
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

    fetchData();
  }, [db, categoryParam]);

  const difficultyConfig = (d?: string) => {
    switch (d?.toLowerCase()) {
      case "easy":
        return { label: "Easy", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" };
      case "hard":
        return { label: "Hard", cls: "bg-red-500/15 text-red-400 border-red-500/20" };
      default:
        return { label: d || "Medium", cls: "bg-amber-500/15 text-amber-400 border-amber-500/20" };
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* pt-16 compensates fixed navbar height */}
      <div className="flex flex-1 pt-16">
        <ExamSidebar currentCategory={categoryParam} />

        <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 lg:p-10 space-y-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/40 px-3 py-2 rounded-xl border w-fit max-w-full overflow-hidden">
            <Link href="/" className="hover:text-foreground transition-colors shrink-0">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
            <span className="text-foreground font-semibold uppercase truncate">
              {categoryParam}
            </span>
          </nav>

          {/* Title */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {loading ? "Loading..." : categoryName || "Exams"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Apna exam select karein aur mock test shuru karein.
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24">
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
            <div className="flex flex-col items-center justify-center min-h-[280px] border border-dashed rounded-2xl p-8 text-center bg-card">
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-base font-semibold text-muted-foreground">
                Is category mein abhi koi exam available nahi hai.
              </p>
              <p className="text-sm text-muted-foreground/50 mt-1">
                Humaari team naye exams add kar rahi hai, thodi der baad check karein.
              </p>
            </div>
          )}

          {/* Exam Cards */}
          {!loading && !error && exams.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
              {exams.map((exam) => {
                const diff = difficultyConfig(exam.difficulty);
                return (
                  <div
                    key={exam.id}
                    className="group relative bg-card border rounded-2xl shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                  >
                    {/* Top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/60 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="p-5 space-y-3">
                      {/* Difficulty badge */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${diff.cls}`}>
                        {diff.label}
                      </span>

                      {/* Exam name */}
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        {exam.name}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                        {exam.description || "Is exam ke liye mock tests available hain."}
                      </p>

                      {/* Stats: Mocks | Questions | Marks */}
                      <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-4">
                        {/* Mock Tests */}
                        <div className="flex flex-col items-center gap-1 bg-muted/60 rounded-xl p-2.5">
                          <FileText className="h-3.5 w-3.5 text-primary/70" />
                          <span className="text-sm font-bold text-foreground leading-none">
                            {formatNum(exam.mockCount ?? 0)}
                          </span>
                          <span className="text-[10px] text-muted-foreground leading-none">
                            Mocks
                          </span>
                        </div>

                        {/* Questions */}
                        <div className="flex flex-col items-center gap-1 bg-muted/60 rounded-xl p-2.5">
                          <BookOpen className="h-3.5 w-3.5 text-primary/70" />
                          <span className="text-sm font-bold text-foreground leading-none">
                            {formatNum(exam.totalQuestions ?? 0)}
                          </span>
                          <span className="text-[10px] text-muted-foreground leading-none">
                            Questions
                          </span>
                        </div>

                        {/* Marks */}
                        <div className="flex flex-col items-center gap-1 bg-muted/60 rounded-xl p-2.5">
                          <Award className="h-3.5 w-3.5 text-primary/70" />
                          <span className="text-sm font-bold text-foreground leading-none">
                            {formatNum(exam.totalMarks ?? 100)}
                          </span>
                          <span className="text-[10px] text-muted-foreground leading-none">
                            Marks
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div className="px-5 pb-5 pt-1">
                      <Link
                        href={`/exams/${categoryParam}/${exam.slug || exam.id}`}
                        className="w-full inline-flex items-center justify-center bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-semibold text-sm py-2.5 px-4 rounded-xl transition-all duration-200 gap-1.5"
                      >
                        View Mock Tests
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
