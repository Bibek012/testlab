"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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

// Next.js 13/14/15 safe type for page components
interface PageProps {
  params: Promise<{ category: string }> | { category: string };
}

export default function CategoryExamsPage({ params }: PageProps) {
  const router = useRouter();
  
  // Params ko safely unwrap karne ke liye React.use() ya normal check use karenge
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const rawCategory = resolvedParams?.category || "";
  
  // Hamesha ensure karein ki categoryParam ek clean string ho
  const categoryParam = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory;

  const [exams, setExams] = useState<Exam[]>([]);
  const [categoryName, setCategoryName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

        // 1. Fetch from 'examCategories' to resolve slug vs ID
        const categoriesRef = collection(db, "examCategories");
        const categoriesSnapshot = await getDocs(categoriesRef);
        
        const categoryDoc = categoriesSnapshot.docs.find(
          doc => doc.id === categoryParam || doc.data().slug === categoryParam
        );

        if (categoryDoc) {
          matchedCategoryId = categoryDoc.id;
          finalCategoryName = categoryDoc.data().name || "Exams";
        } else {
          // Fallback UI title decoration from slug text
          finalCategoryName = categoryParam
            .split("-")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        }
        setCategoryName(finalCategoryName);

        // 2. Query exams securely
        const examsRef = collection(db, "exams");
        const q = query(examsRef, where("isActive", "==", true));
        const examsSnapshot = await getDocs(q);
        
        const fetchedExams: Exam[] = [];
        examsSnapshot.forEach((doc) => {
          const data = doc.data();
          // Flexible mapping matches fields safely
          if (
            data.categoryId === matchedCategoryId || 
            data.categoryId === categoryParam ||
            data.category === categoryParam
          ) {
            fetchedExams.push({
              id: doc.id,
              name: data.name || "Untitled Exam",
              slug: data.slug || doc.id,
              description: data.description || "",
              duration: data.duration || data.timeLimit || 60,
              totalQuestions: data.totalQuestions || data.questionsCount || 0,
              totalMarks: data.totalMarks || 100,
              difficulty: data.difficulty || "Medium",
              categoryId: data.categoryId || ""
            });
          }
        });

        setExams(fetchedExams);
      } catch (err: any) {
        console.error("Firestore loading error:", err);
        setError("Database se sampark nahi ho paya. Kripya reload karein.");
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndExams();
  }, [categoryParam]);

  // Fallback safe string creation for layout paths
  const safeCategorySlug = String(categoryParam || "all");

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-7xl">
        {/* Navigation Row */}
        <div className="mb-6 flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Peeche Jayein
          </button>
          <div className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono px-2 py-1 rounded-md">
            exams / {safeCategorySlug}
          </div>
        </div>

        {/* Dynamic Premium Header Card */}
        <div className="mb-8 bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100 dark:border-slate-700">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {loading ? "Loading Category..." : categoryName || "Exams List"}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-3xl">
            Apne targeted exam ka chayan karein aur apni kamzoriyo ko door karne ke liye mock tests lagayein.
          </p>
        </div>

        {/* Loading UI State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm font-medium">
              Mock tests aur exams khoje ja rahe hain...
            </p>
          </div>
        )}

        {/* Error Notification Block */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-5 max-w-xl mx-auto my-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 text-xs bg-white border border-red-200 text-red-700 px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-red-50"
            >
              Page Refersh Karein
            </button>
          </div>
        )}

        {/* Clean Empty View UI */}
        {!loading && !error && exams.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm my-6">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Koi test active nahi mila</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Is category ke liye jald hi naye tests publish kiye jayenge. Kripya tab tak anya categories check karein.
            </p>
            <Link 
              href="/"
              className="mt-6 inline-flex bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-6 py-2.5 rounded-xl transition-all"
            >
              Main Dashboard
            </Link>
          </div>
        )}

        {/* Responsive Grid Layout */}
        {!loading && !error && exams.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <div 
                key={exam.id}
                className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-900 transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      exam.difficulty?.toLowerCase() === 'easy' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                      exam.difficulty?.toLowerCase() === 'hard' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400' :
                      'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                    }`}>
                      {exam.difficulty || "Medium"}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      ID: {exam.id.substring(0, 5)}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {exam.name}
                  </h3>
                  
                  <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[40px]">
                    {exam.description || "Is mock test ke liye koi explicit description available nahi hai."}
                  </p>

                  {/* Badges Matrix */}
                  <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-700/50 pt-4 text-center">
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl">
                      <Clock className="h-4 w-4 mx-auto mb-1 text-slate-400" />
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">{exam.duration} Min</span>
                      <span className="text-[10px] text-slate-400 block">Samaay</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl">
                      <BookOpen className="h-4 w-4 mx-auto mb-1 text-slate-400" />
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">{exam.totalQuestions}</span>
                      <span className="text-[10px] text-slate-400 block">Prashna</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl">
                      <Award className="h-4 w-4 mx-auto mb-1 text-slate-400" />
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">{exam.totalMarks}</span>
                      <span className="text-[10px] text-slate-400 block">Ank</span>
                    </div>
                  </div>
                </div>

                {/* Secure URL Construction Action Wrapper */}
                <div className="px-6 pb-6 pt-2 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-50 dark:border-slate-700/30">
                  <Link 
                    href={`/exams/${safeCategorySlug}/${String(exam.slug || exam.id)}`}
                    className="w-full inline-flex items-center justify-center bg-white hover:bg-blue-600 dark:bg-slate-900 dark:hover:bg-blue-600 border border-slate-200 hover:border-blue-600 dark:border-slate-700 dark:hover:border-blue-600 text-slate-700 hover:text-white dark:text-slate-300 dark:hover:text-white font-semibold text-sm py-3 px-4 rounded-xl shadow-sm transition-all duration-200 group/btn"
                  >
                    View Mock Tests
                    <ChevronRight className="ml-1.5 h-4 w-4 transform group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
