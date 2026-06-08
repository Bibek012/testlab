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
  ChevronRight,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";

interface Exam {
  id: string;
  name: string;
  slug: string;
  description?: string;
  mockCount: number;
  totalQuestions: number;
  difficulty?: string;
  categoryId: string;
}

function formatNum(n: number): string {
  if (!n || n === 0) return "0";
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

          // Debug: console mein sabhi fields dekho
          console.log(`[EXAM] ${doc.id}:`, {
            mockCount: data.mockCount,
            testsCount: data.testsCount,
            mocksCount: data.mocksCount,
            questionCount: data.questionCount,
            totalQuestions: data.totalQuestions,
            questionsCount: data.questionsCount,
          });

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
              mockCount:
                data.mockCount ??
                data.testsCount ??
                data.mocksCount ??
                data.mock_count ??
                0,
              totalQuestions:
                data.questionCount ??
                data.totalQuestions ??
                data.questionsCount ??
                data.question_count ??
                data.noOfQuestions ??
                0,
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
        return { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" };
      case "hard":
        return { cls: "bg-red-500/15 text-red-400 border-red-500/25" };
      default:
        return { cls: "bg-amber-500/15 text-amber-400 border-amber-500/25" };
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex flex-1 pt-16">
        <ExamSidebar currentCategory={categoryParam} />

        <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 space-y-5">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/40 px-3 py-2 rounded-xl border w-fit">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            <span className="text-foreground font-semibold uppercase">
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
              <Loader2 className="h-9 w-9 text-primary animate-spin" />
              <p className="mt-3 text-muted-foreground text-sm">
                Exams load ho rahe hain...
              </p>
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
            <div className="flex flex-col items-center justify-center min-h-[260px] border border-dashed rounded-2xl p-8 text-center bg-card">
              <BookOpen className="w-11 h-11 text-muted-foreground/30 mb-3" />
              <p className="text-base font-semibold text-muted-foreground">
                Is category mein abhi koi exam available nahi hai.
              </p>
              <p className="text-sm text-muted-foreground/50 mt-1">
                Humaari team naye exams add kar rahi hai, thodi der baad check karein.
              </p>
            </div>
          )}

          {/* Exam Cards — testbook style, compact */}
          {!loading && !error && exams.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
              {exams.map((exam) => {
                const diff = difficultyConfig(exam.difficulty);
                return (
                  <div
                    key={exam.id}
                    className="group relative bg-card border rounded-2xl hover:border-primary/40 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden"
                  >
                    {/* Hover top accent */}
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="p-4 flex flex-col gap-2.5 flex-1">
                      {/* Difficulty */}
                      <span
                        className={`self-start px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${diff.cls}`}
                      >
                        {exam.difficulty || "Medium"}
                      </span>

                      {/* Name */}
                      <h3 className="text-[15px] font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        {exam.name}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {exam.description || "Is exam ke liye mock tests available hain."}
                      </p>

                      {/* Stats row — horizontal, compact */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border/50 mt-auto">
                        {/* Mocks */}
                        <div className="flex items-center gap-1.5 bg-muted/70 rounded-lg px-3 py-1.5 flex-1">
                          <FileText className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-foreground leading-none">
                              {formatNum(exam.mockCount)}
                            </div>
                            <div className="text-[10px] text-muted-foreground leading-none mt-0.5">
                              Mock Tests
                            </div>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="w-px h-8 bg-border/60 shrink-0" />

                        {/* Questions */}
                        <div className="flex items-center gap-1.5 bg-muted/70 rounded-lg px-3 py-1.5 flex-1">
                          <BookOpen className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-foreground leading-none">
                              {formatNum(exam.totalQuestions)}
                            </div>
                            <div className="text-[10px] text-muted-foreground leading-none mt-0.5">
                              Questions
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="px-4 pb-4">
                      <Link
                        href={`/exams/${categoryParam}/${exam.slug || exam.id}`}
                        className="w-full inline-flex items-center justify-center bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-semibold text-sm py-2.5 rounded-xl transition-all duration-150 gap-1"
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
