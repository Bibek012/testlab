"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
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

interface Category {
  id: string;
  name: string;
  slug?: string;
}

export default function CategoryExamsPage() {
  const params = useParams();
  const router = useRouter();
  
  // URL se category slug ya ID nikalna
  const categoryParam = params?.category as string;

  const [exams, setExams] = useState<Exam[]>([]);
  const [categoryName, setCategoryName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryParam) return;

    const fetchCategoryAndExams = async () => {
      setLoading(true);
      setError(null);
      try {
        let matchedCategoryId = categoryParam;
        let finalCategoryName = "Exams";

        // 1. Pehle check karein ki kya categoryParam ek valid Category ID ya Slug hai
        // Hum 'examCategories' collection me check karenge
        const categoriesRef = collection(db, "examCategories");
        const categoriesSnapshot = await getDocs(categoriesRef);
        
        let categoryDoc = categoriesSnapshot.docs.find(
          doc => doc.id === categoryParam || doc.data().slug === categoryParam
        );

        if (categoryDoc) {
          matchedCategoryId = categoryDoc.id;
          finalCategoryName = categoryDoc.data().name;
          setCategoryName(finalCategoryName);
        } else {
          // Agar database me category direct nahi mili toh raw slug ko capital karke temporary name banayein
          const formattedName = categoryParam
            .split("-")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
          setCategoryName(formattedName);
        }

        // 2. Exams fetch karne ki query
        const examsRef = collection(db, "exams");
        
        // Flexible Query: Jo categoryId aur slug dono ke aaspas flexible ho
        const q = query(
          examsRef, 
          where("isActive", "==", true)
        );
        
        const examsSnapshot = await getDocs(q);
        const fetchedExams: Exam[] = [];

        examsSnapshot.forEach((doc) => {
          const data = doc.data();
          // Validation Check: categoryId match ho rahi hai ya exam ka khud ka category field param se match ho raha hai
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
        console.error("Error fetching exams:", err);
        setError("Data load karne me dikkat aayi. Kripya dobara koshish karein.");
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndExams();
  }, [categoryParam]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      {/* Main Container */}
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-7xl">
        
        {/* Back Button & Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Peeche Jayein
          </button>
          
          <div className="text-xs text-slate-400 font-mono hidden sm:block">
            Route: exams / {categoryParam}
          </div>
        </div>

        {/* Dynamic Title Section */}
        <div className="mb-10 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-all">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {loading ? "Loading Category..." : categoryName}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-3xl">
            Apne pasandida exam ko chuniye aur mock test dekar apni tayaari ko parakhiye. Sabhi tests naye exam pattern par aadharit hain.
          </p>
        </div>

        {/* Loading State UI */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm animate-pulse">
              Exams dhundhe ja rahe hain, kripya thoda intezar karein...
            </p>
          </div>
        )}

        {/* Error State UI */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-4 flex items-start gap-3 max-w-2xl mx-auto my-12">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-red-800 dark:text-red-300">Galti Hui!</h3>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-3 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-800 dark:text-red-200 font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                Dubara Koshish Karen
              </button>
            </div>
          </div>
        )}

        {/* Empty State UI (No Exams Found) */}
        {!loading && !error && exams.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-sm">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Koi Exam Nahi Mila</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
              Hame is category ke andar abhi koi active exam nahi mila. Kripya Firestore me check karein ki kya exams me sahi <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-red-500 font-mono text-xs">categoryId</code> set hai.
            </p>
            <Link 
              href="/"
              className="mt-6 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5"
            >
              Home Page Par Jayein
            </Link>
          </div>
        )}

        {/* Fully Flexible Responsive Grid Cards Section */}
        {!loading && !error && exams.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <div 
                key={exam.id}
                className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-sm hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900/60 transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Card Top / Header */}
                <div className="p-6">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      exam.difficulty?.toLowerCase() === 'easy' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                      exam.difficulty?.toLowerCase() === 'hard' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400' :
                      'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                    }`}>
                      {exam.difficulty || "Medium"}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      ID: {exam.id.substring(0, 5)}...
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {exam.name}
                  </h3>
                  
                  <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[40px]">
                    {exam.description || "Is exam ke liye koi specific description upalabdh nahi hai."}
                  </p>

                  {/* Badges Info Grid */}
                  <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-700/50 pt-4 text-center">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl">
                      <Clock className="h-4 w-4 mx-auto mb-1 text-slate-400" />
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">{exam.duration} Min</span>
                      <span className="text-[10px] text-slate-400 block">Samaay</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl">
                      <BookOpen className="h-4 w-4 mx-auto mb-1 text-slate-400" />
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">{exam.totalQuestions}</span>
                      <span className="text-[10px] text-slate-400 block">Prashna</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl">
                      <Award className="h-4 w-4 mx-auto mb-1 text-slate-400" />
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">{exam.totalMarks}</span>
                      <span className="text-[10px] text-slate-400 block">Ank</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="px-6 pb-6 pt-2 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-50 dark:border-slate-700/30">
                  <Link 
                    href={`/exams/${categoryParam}/${exam.slug}`}
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
