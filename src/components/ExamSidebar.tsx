"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { BookOpen, GraduationCap, ChevronRight } from "lucide-react";

interface ExamSidebarProps {
  currentCategory: string;
}

export default function ExamSidebar({ currentCategory }: ExamSidebarProps) {
  // Sahi structure routing aur filtering ke liye
  const categories = [
    {
      id: "ssc",
      name: "SSC Exams",
      description: "CGL, CHSL, MTS, CPO",
      icon: GraduationCap,
    },
    {
      id: "bihar",
      name: "Bihar Govt Exams",
      description: "BPSC, BSSC, Police",
      icon: BookOpen,
    },
  ];

  return (
    <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r bg-card p-6 flex flex-col gap-6 shrink-0">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Exam Categories</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Apna exam board filter karein</p>
      </div>

      <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          // Active button highlighted check logic
          const isActive = currentCategory.toLowerCase() === cat.id.toLowerCase();

          return (
            <Link
              key={cat.id}
              href={`/exams/${cat.id}`} // Yahan `cat.id` use kiya hai taki sahi URL ban sake
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group shrink-0 min-w-[160px] md:min-w-0",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                <div className="flex flex-col text-left">
                  <span className="leading-none font-medium">{cat.name}</span>
                  <span className={cn("text-[10px] mt-1 font-normal opacity-80 block md:hidden lg:block", isActive ? "text-primary-foreground/90" : "text-muted-foreground/70")}>
                    {cat.description}
                  </span>
                </div>
              </div>
              <ChevronRight className={cn("h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}