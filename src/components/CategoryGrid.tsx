"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { 
  Briefcase, Train, Landmark, BookOpen, Shield, 
  MapPin, UserCheck, GraduationCap, Settings, Activity, ArrowUpRight,
  Loader2,
  FolderOpen
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, any> = {
  ssc: Briefcase,
  railway: Train,
  banking: Landmark,
  upsc: BookOpen,
  defence: Shield,
  state: MapPin,
  police: UserCheck,
  teaching: GraduationCap,
  engineering: Settings,
  medical: Activity
};

export const CategoryGrid = () => {
  const db = useFirestore();
  
  const categoriesQuery = useMemoFirebase(() => 
    db ? query(collection(db, "examCategories"), orderBy("order", "asc"), limit(15)) : null, 
  [db]);

  const { data: categories, loading } = useCollection<any>(categoriesQuery);

  if (loading) {
    return (
      <div className="py-24 bg-white/[0.02]">
        <div className="container mx-auto px-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-20" />
        </div>
      </div>
    );
  }

  if (!categories || categories.length === 0) return null;

  return (
    <section id="exams" className="py-24 bg-white/[0.02]">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl font-headline font-bold">Explore Our <span className="text-accent">Library</span></h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Access thousands of mock tests across all government job categories. 
            Select a series to start your preparation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {categories.map((cat) => {
            const Icon = ICON_MAP[cat.slug] || FolderOpen;
            return (
              <Link
                key={cat.id}
                href={`/exams/${cat.slug}`}
                className="group relative p-8 rounded-2xl bg-card border border-white/10 hover:border-primary/50 transition-all duration-500 overflow-hidden glow-hover block"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <ArrowUpRight className="w-5 h-5 text-primary" />
                </div>
                
                <div className="mb-6 p-3 rounded-xl bg-white/5 inline-block group-hover:scale-110 transition-transform">
                  <Icon className="w-8 h-8 text-primary" />
                </div>

                <h3 className="text-xl font-headline font-bold mb-2">{cat.title}</h3>
                <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{cat.description}</p>
                
                <div className="text-primary text-sm font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  View Series <ArrowUpRight className="w-4 h-4" />
                </div>
                
                <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
