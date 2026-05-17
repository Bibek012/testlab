
"use client";

import React from "react";
import { 
  Briefcase, Train, Landmark, BookOpen, Shield, 
  MapPin, UserCheck, GraduationCap, Settings, Activity, ArrowUpRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";

const categories = [
  { icon: Briefcase, title: "SSC", desc: "Staff Selection Commission", color: "text-blue-400" },
  { icon: Train, title: "Railway", desc: "RRB NTPC, Group D & more", color: "text-amber-400" },
  { icon: Landmark, title: "Banking", desc: "SBI, IBPS, RBI exams", color: "text-green-400" },
  { icon: BookOpen, title: "UPSC", desc: "Civil Services & IAS", color: "text-purple-400" },
  { icon: Shield, title: "Defence", desc: "NDA, CDS, Air Force", color: "text-red-400" },
  { icon: MapPin, title: "State Exams", desc: "BPSC, UPPCS, WBPSC", color: "text-cyan-400" },
  { icon: UserCheck, title: "Police", desc: "SI, Constable exams", color: "text-indigo-400" },
  { icon: GraduationCap, title: "Teaching", desc: "TET, CTET, B.Ed", color: "text-pink-400" },
  { icon: Settings, title: "Engineering", desc: "GATE, IES, JE exams", color: "text-emerald-400" },
  { icon: Activity, title: "Medical", desc: "NEET, AIIMS, Nursing", color: "text-rose-400" }
];

export const CategoryGrid = () => {
  return (
    <section id="exams" className="py-24 bg-white/[0.02]">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl font-headline font-bold">Browse by Category</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose your career path and start practicing with India's best study material and real-time simulations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {categories.map((cat, i) => (
            <div
              key={i}
              className="group relative p-8 rounded-2xl bg-card border border-white/10 hover:border-primary/50 transition-all duration-500 overflow-hidden glow-hover"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                 <ArrowUpRight className="w-5 h-5 text-primary" />
              </div>
              
              <div className={`mb-6 p-3 rounded-xl bg-white/5 inline-block group-hover:scale-110 transition-transform`}>
                <cat.icon className={`w-8 h-8 ${cat.color}`} />
              </div>

              <h3 className="text-xl font-headline font-bold mb-2">{cat.title}</h3>
              <p className="text-sm text-muted-foreground mb-6">{cat.desc}</p>
              
              <Button variant="link" className="p-0 text-primary h-auto group-hover:translate-x-1 transition-transform">
                Explore Tests
              </Button>
              
              <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
