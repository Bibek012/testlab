"use client";

import React, { useMemo } from "react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";

export const StatsSection = () => {
  const db = useFirestore();

  const examsQuery = useMemoFirebase(() => db ? collection(db, "exams") : null, [db]);
  const { data: exams } = useCollection(examsQuery);

  const mocksQuery = useMemoFirebase(() => db ? collection(db, "mockTests") : null, [db]);
  const { data: mocks } = useCollection(mocksQuery);

  const usersQuery = useMemoFirebase(() => db ? collection(db, "users") : null, [db]);
  const { data: users } = useCollection(usersQuery);

  const stats = useMemo(() => [
    { label: "Mock Tests", value: mocks?.length ? `${mocks.length}+` : "1,000+", color: "from-primary to-accent" },
    { label: "Practice Questions", value: mocks?.length ? `${mocks.length * 100}+` : "100k+", color: "from-accent to-blue-400" },
    { label: "Active Aspirants", value: users?.length ? `${users.length}+` : "10k+", color: "from-primary to-purple-400" },
    { label: "Exam Categories", value: exams?.length ? `${exams.length}+` : "10+", color: "from-indigo-400 to-accent" }
  ], [exams, mocks, users]);

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
