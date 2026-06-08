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
  Sparkles,
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
  if (n >= 1000) {
    return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k";
  }
  return String(n);
}

export default function CategoryExamsPage() {
  const params = useParams();
  const categoryParam = params.category as string;

  const db = useFirestore();

  const [exams, setExams] = useState<Exam[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
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
      try {
        setLoading(true);
        setError(null);

        let matchedCategoryId = categoryParam;
        let finalCategoryName = "";

        // CATEGORY
        const categoriesSnapshot = await getDocs(
          collection(db, "examCategories")
        );

        const categoryDoc = categoriesSnapshot.docs.find((doc) => {
          const data = doc.data();

          const slug = (data.slug || "").toLowerCase();
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
            categoryDoc.data().title ||
            categoryDoc.data().name ||
            categoryParam;
        } else {
          finalCategoryName = categoryParam
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
        }

        setCategoryName(finalCategoryName);

        // EXAMS
        const examsSnapshot = await getDocs(collection(db, "exams"));

        const fetchedExams: Exam[] = [];

        examsSnapshot.forEach((doc) => {
          const data = doc.data();

          if (data.isActive === false) return;

          const cp = categoryParam.toLowerCase();
          const catSlug = (data.categorySlug || "").toLowerCase();

          const matchesCategory =
            data.categoryId === matchedCategoryId ||
            data.categoryId === categoryParam ||
            data.category === categoryParam ||
            catSlug === cp ||
            catSlug === `${cp}-exams` ||
            catSlug.startsWith(cp) ||
            cp === catSlug.replace("-exams", "");

          if (!matchesCategory) return;

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
        });

        setExams(fetchedExams);
      } catch (err) {
        console.error(err);

        setError(
          "Data load karne mein dikkat aayi. Kripya page refresh karein."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [db, categoryParam]);

  const difficultyStyles = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";

      case "hard":
        return "bg-red-500/15 text-red-400 border-red-500/20";

      default:
        return "bg-amber-500/15 text-amber-400 border-amber-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-[#071028] text-white flex flex-col overflow-x-hidden">
      <Navbar />

      <div className="flex flex-1 pt-16">
        {/* DESKTOP SIDEBAR */}
        <div className="hidden lg:block">
          <ExamSidebar currentCategory={categoryParam} />
        </div>

        {/* MAIN */}
        <main className="flex-1 w-full min-w-0">
          {/* HERO */}
          <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-[#0b1736] to-[#071028]">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 left-0 h-72 w-72 rounded-full bg-indigo-500 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blue-500 blur-3xl" />
            </div>

            <div className="relative px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
              {/* BREADCRUMB */}
              <div className="flex flex-wrap items-center gap-1 text-xs sm:text-sm text-gray-400 mb-5">
                <Link
                  href="/"
                  className="hover:text-white transition-colors"
                >
                  Home
                </Link>

                <ChevronRight className="w-3 h-3" />

                <span className="text-white font-semibold">
                  {categoryName || categoryParam}
                </span>
              </div>

              {/* TITLE */}
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-4">
                  <Sparkles className="h-3.5 w-3.5" />
                  Competitive Exam Preparation
                </div>

                <h1 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight">
                  {loading
                    ? "Loading Exams..."
                    : `${categoryName} Mock Tests`}
                </h1>

                <p className="mt-3 text-sm sm:text-base text-gray-400 leading-relaxed">
                  Latest mock tests, previous year papers aur practice sets.
                  Real exam pattern ke saath preparation karein.
                </p>

                {!loading && exams.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-6">
                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 min-w-[120px]">
                      <div className="text-2xl font-bold">
                        {formatNum(exams.length)}
                      </div>

                      <div className="text-xs text-gray-400 mt-1">
                        Exams
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 min-w-[120px]">
                      <div className="text-2xl font-bold">
                        {formatNum(
                          exams.reduce(
                            (acc, exam) => acc + exam.mockCount,
                            0
                          )
                        )}
                      </div>

                      <div className="text-xs text-gray-400 mt-1">
                        Mock Tests
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 min-w-[120px]">
                      <div className="text-2xl font-bold">
                        {formatNum(
                          exams.reduce(
                            (acc, exam) => acc + exam.totalQuestions,
                            0
                          )
                        )}
                      </div>

                      <div className="text-xs text-gray-400 mt-1">
                        Questions
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* CONTENT */}
          <section className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
            {/* LOADING */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />

                <p className="mt-4 text-sm text-gray-400">
                  Exams load ho rahe hain...
                </p>
              </div>
            )}

            {/* ERROR */}
            {!loading && error && (
              <div className="max-w-md mx-auto border border-red-500/20 bg-red-500/10 rounded-2xl p-6 text-center">
                <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />

                <p className="text-red-300 font-medium">{error}</p>
              </div>
            )}

            {/* EMPTY */}
            {!loading && !error && exams.length === 0 && (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 py-20 px-6 text-center">
                <BookOpen className="w-14 h-14 text-gray-500 mx-auto mb-4" />

                <h3 className="text-xl font-bold">
                  No Exams Available
                </h3>

                <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
                  Is category mein abhi exams available nahi hain.
                  Thodi der baad dobara check karein.
                </p>
              </div>
            )}

            {/* EXAM GRID */}
            {!loading && !error && exams.length > 0 && (
              <div
                className="
                  grid
                  grid-cols-1
                  sm:grid-cols-2
                  xl:grid-cols-3
                  2xl:grid-cols-4
                  gap-4
                "
              >
                {exams.map((exam) => (
                  <div
                    key={exam.id}
                    className="
                      group
                      relative
                      overflow-hidden
                      rounded-3xl
                      border
                      border-white/10
                      bg-gradient-to-b
                      from-white/[0.07]
                      to-white/[0.03]
                      backdrop-blur-md
                      hover:border-indigo-500/40
                      hover:-translate-y-1
                      transition-all
                      duration-300
                    "
                  >
                    {/* TOP GLOW */}
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="p-5 flex flex-col h-full">
                      {/* BADGE */}
                      <div
                        className={`
                          inline-flex
                          self-start
                          items-center
                          rounded-full
                          border
                          px-3
                          py-1
                          text-[11px]
                          font-semibold
                          mb-4
                          ${difficultyStyles(exam.difficulty)}
                        `}
                      >
                        {exam.difficulty}
                      </div>

                      {/* TITLE */}
                      <h2 className="text-lg font-bold leading-snug line-clamp-2 group-hover:text-indigo-300 transition-colors">
                        {exam.name}
                      </h2>

                      {/* DESCRIPTION */}
                      <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                        {exam.description ||
                          "Latest mock tests aur practice papers available."}
                      </p>

                      {/* STATS */}
                      <div className="grid grid-cols-2 gap-3 mt-5">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                          <div className="flex items-center gap-2 text-indigo-300 mb-2">
                            <FileText className="h-4 w-4" />

                            <span className="text-xs font-medium">
                              Mock Tests
                            </span>
                          </div>

                          <div className="text-xl font-black">
                            {formatNum(exam.mockCount)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                          <div className="flex items-center gap-2 text-cyan-300 mb-2">
                            <BookOpen className="h-4 w-4" />

                            <span className="text-xs font-medium">
                              Questions
                            </span>
                          </div>

                          <div className="text-xl font-black">
                            {formatNum(exam.totalQuestions)}
                          </div>
                        </div>
                      </div>

                      {/* BUTTON */}
                      <div className="mt-5">
                        <Link
                          href={`/exams/${categoryParam}/${exam.slug || exam.id}`}
                          className="
                            w-full
                            inline-flex
                            items-center
                            justify-center
                            gap-2
                            rounded-2xl
                            bg-gradient-to-r
                            from-indigo-500
                            to-blue-500
                            hover:opacity-90
                            px-4
                            py-3
                            text-sm
                            font-bold
                            text-white
                            transition-all
                            active:scale-[0.98]
                          "
                        >
                          View Mock Tests

                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      <Footer />
    </div>
  );
}