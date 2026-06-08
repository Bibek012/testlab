import React from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import Link from "next/link";
import { ChevronRight, BookOpen, GraduationCap } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import ExamSidebar from "@/components/ExamSidebar";

// Sirf category param hai — examId NAHI
interface PageProps {
  params: Promise<{
    category: string;
  }>;
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;

  // Is category ke saare exams fetch karo
  const examsRef = collection(db, "exams");
  const q = query(examsRef, where("categorySlug", "==", category));
  const querySnapshot = await getDocs(q);

  const exams = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex flex-1">
        <ExamSidebar currentCategory={category} />

        <main className="flex-1 p-6 md:p-10 space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 p-3 rounded-xl border w-fit">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="w-4 h-4 opacity-60" />
            <span className="text-foreground font-medium uppercase">
              {category}
            </span>
          </div>

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight capitalize">
              {category} Exams
            </h1>
            <p className="text-muted-foreground mt-1">
              Niche diye gaye exams mein se apna exam select karein.
            </p>
          </div>

          {exams.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[250px] border border-dashed rounded-2xl p-8 text-center bg-card">
              <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Is category mein abhi koi exam available nahi hai.
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Humaari team naye exams add kar rahi hai, kripya thodi der baad
                check karein.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam: any) => (
                <Link
                  key={exam.id}
                  href={`/exams/${category}/${exam.slug || exam.id}`}
                >
                  <div className="bg-card border rounded-2xl p-6 flex flex-col gap-3 hover:shadow-md transition-all duration-300 group hover:border-primary/30 cursor-pointer h-full">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <GraduationCap className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                        {exam.name}
                      </h2>
                    </div>
                    <p className="text-muted-foreground text-sm line-clamp-2">
                      {exam.description ||
                        `${exam.name} ke liye sabhi mock tests yahan available hain.`}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-primary font-medium mt-auto pt-2">
                      <span>Tests Dekhein</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
