
"use client";

import React from "react";
import { Monitor, FileText, BrainCircuit, Globe, Calendar, Layers, Clock, BarChart3 } from "lucide-react";

const features = [
  { icon: Monitor, title: "Real Exam Interface", desc: "Experience the exact UI used in official government portals." },
  { icon: FileText, title: "Detailed Solutions", desc: "Step-by-step explanations for every single question attempted." },
  { icon: BrainCircuit, title: "AI Performance Analytics", desc: "Deep insights into your learning gaps powered by GenAI." },
  { icon: Globe, title: "Hindi + English Support", desc: "Attempt tests in the language you are most comfortable with." },
  { icon: Calendar, title: "Daily Practice", desc: "New quizzes and sets updated every 24 hours for consistency." },
  { icon: Layers, title: "Full-Length Mock Tests", desc: "Comprehensive tests covering complete syllabus and patterns." },
  { icon: Clock, title: "Previous Year Questions", desc: "Archive of over 10 years of actual exam papers." },
  { icon: BarChart3, title: "Smart Ranking System", desc: "Know where you stand among millions of fellow aspirants." }
];

export const Features = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl font-headline font-bold">Built for Rankers</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Testlab combines advanced technology with curated educational content to give you the ultimate edge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, i) => (
            <div
              key={i}
              className="p-8 rounded-2xl bg-card border border-white/10 hover:bg-white/[0.03] transition-colors group"
            >
              <div className="mb-6 p-3 rounded-xl bg-primary/10 inline-block group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-headline font-bold mb-3">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
