"use client";

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ExamCard } from "@/components/ExamCard";
import { ExamSidebar } from "@/components/ExamSidebar";
import { CTASection } from "@/components/CTASection";
import { StatsSection } from "@/components/StatsSection";

import {
  Search,
  Filter,
  BookOpen
} from "lucide-react";

import { Input } from "@/components/ui/input";

import {
  useFirestore,
  useCollection,
  useMemoFirebase
} from "@/firebase";

import {
  collection,
  query,
  orderBy,
  where
} from "firebase/firestore";

export default function AllExamsPage() {
  const params = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const db = useFirestore();

  // Next.js [category] folder param maps to params.category
  const categorySlug = (params?.category as string) || "all";

  // Dynamic Page Title
  const pageTitle =
    categorySlug !== "all"
      ? `${categorySlug
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())} Exams`
      : "Unified Preparation";

  // Dynamic Description
  const pageDescription =
    categorySlug !== "all"
      ? `Explore mock tests, previous year questions and preparation resources for ${categorySlug.replace(/-/g, " ")} exams.`
      : "Access India's most comprehensive collection of mock tests and previous year questions. Search for any exam to start your success journey.";

  // Dynamic Firestore Query
  const examsQuery = useMemoFirebase(
    () => {
      if (!db) return null;
      
      const examsRef = collection(db, "exams");
      
      if (categorySlug !== "all") {
        return query(
          examsRef,
          where("isActive", "==", true),
          where("categorySlug", "==", categorySlug),
          orderBy("name", "asc")
        );
      }
      
      return query(
        examsRef,
        where("isActive", "==", true),
        orderBy("name", "asc")
      );
    },
    [db, categorySlug]
  );

  const {
    data: exams,
    loading: examsLoading
  } = useCollection<any>(examsQuery);

  // Search Filter
  const filteredExams = useMemo(() => {
    return (
      exams?.filter((exam) => {
        const queryText = searchQuery.toLowerCase();

        return (
          exam.name?.toLowerCase().includes(queryText) ||
          exam.description
            ?.toLowerCase()
            .includes(queryText)
        );
      }) || []
    );
  }, [exams, searchQuery]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="pt-32 pb-24 relative overflow-hidden">
        {/* Background Blur Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] -z-10" />

        <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-accent/10 rounded-full blur-[120px] -z-10" />

        <div className="container mx-auto px-6">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[
              {
                label:
                  categorySlug !== "all"
                    ? pageTitle
                    : "All Examinations"
              }
            ]}
          />

          {/* Hero Section */}
          <div className="space-y-6 mb-16 max-w-4xl">
            <h1 className="text-5xl lg:text-7xl font-headline font-bold leading-[1.05] tracking-tight uppercase">
              {pageTitle.split(" ")[0]}{" "}
              <span className="gradient-text">
                {pageTitle
                  .split(" ")
                  .slice(1)
                  .join(" ")}
              </span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
              {pageDescription}
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-12">
            {/* LEFT CONTENT */}
            <div className="flex-1 space-y-12">
              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row gap-4 items-center p-4 glass border border-white/10 rounded-2xl">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                  <Input
                    placeholder="Search for SSC, Banking, Railway, UPSC or State exams..."
                    className="pl-10 bg-transparent border-white/5 focus-visible:ring-primary h-12"
                    value={searchQuery}
                    onChange={(e) =>
                      setSearchQuery(e.target.value)
                    }
                  />
                </div>

                <button className="flex items-center gap-2 px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors h-12 w-full sm:w-auto justify-center">
                  <Filter className="w-3 h-3" />
                  All Categories
                </button>
              </div>

              {/* Loading */}
              {examsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-64 rounded-3xl bg-white/5 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <>
                  {/* Exams Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {filteredExams.map((exam) => (
                      <ExamCard
                        key={exam.id}
                        exam={exam}
                        categorySlug={
                          exam.categorySlug || "general"
                        }
                      />
                    ))}
                  </div>

                  {/* Empty State */}
                  {filteredExams.length === 0 && (
                    <div className="col-span-full py-20 text-center text-muted-foreground glass border border-white/5 rounded-[3rem] space-y-4">
                      <BookOpen className="w-12 h-12 mx-auto opacity-10" />

                      <p className="font-bold tracking-widest uppercase text-xs">
                        No matching examinations found
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* RIGHT SIDEBAR */}
            <aside className="lg:w-[350px]">
              <ExamSidebar />
            </aside>
          </div>
        </div>
      </div>

      <StatsSection />

      <CTASection />

      <Footer />
    </main>
  );
}
