
"use client";

import React from "react";

const stats = [
  { label: "Mock Tests", value: "10,000+", color: "from-primary to-accent" },
  { label: "Questions", value: "5M+", color: "from-accent to-blue-400" },
  { label: "Active Students", value: "1M+", color: "from-primary to-purple-400" },
  { label: "Exam Categories", value: "50+", color: "from-indigo-400 to-accent" }
];

export const StatsSection = () => {
  return (
    <section className="py-24 relative overflow-hidden bg-white/[0.02]">
       <div className="container mx-auto px-6">
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
           {stats.map((stat, i) => (
             <div key={i} className="text-center space-y-2 p-8 glass rounded-3xl border-white/5 shadow-inner">
               <div className={`text-4xl lg:text-5xl font-headline font-bold bg-clip-text text-transparent bg-gradient-to-r ${stat.color}`}>
                 {stat.value}
               </div>
               <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                 {stat.label}
               </div>
             </div>
           ))}
         </div>
       </div>
    </section>
  );
};
