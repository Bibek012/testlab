
"use client";

import React from "react";
import Image from "next/image";
import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const reviews = [
  {
    name: "Aditya Kumar",
    exam: "Cleared SSC CGL 2023",
    text: "The real exam simulation at Testlab was a game changer. I felt no pressure during the actual exam as I had practiced in almost identical interface.",
    rating: 5,
    avatar: "https://picsum.photos/seed/student1/100/100"
  },
  {
    name: "Priya Sharma",
    exam: "Cleared IBPS PO",
    text: "AI performance analysis helped me identify that I was spending too much time on reasoning questions. Corrected it and cleared the exam!",
    rating: 5,
    avatar: "https://picsum.photos/seed/student2/100/100"
  },
  {
    name: "Rahul Singh",
    exam: "BPSC Rank 42",
    text: "State-specific tests for Bihar were highly accurate. Most questions in the GS section were similar to Testlab's practice sets.",
    rating: 5,
    avatar: "https://picsum.photos/seed/student3/100/100"
  }
];

export const Testimonials = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl font-headline font-bold">Success Stories</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join thousands of successful aspirants who transformed their preparation journey with Testlab.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((review, i) => (
            <Card key={i} className="bg-card border-white/10 p-8 rounded-3xl relative overflow-hidden group hover:border-primary/50 transition-all duration-300">
              <Quote className="absolute -top-4 -right-4 w-24 h-24 text-white/[0.03] group-hover:text-primary/10 transition-colors" />
              <CardContent className="p-0 space-y-6">
                <div className="flex gap-1">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-foreground leading-relaxed italic">
                  "{review.text}"
                </p>
                <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                  <Image
                    src={review.avatar}
                    alt={review.name}
                    width={48}
                    height={48}
                    className="rounded-full border-2 border-primary/20"
                    data-ai-hint="portrait student"
                  />
                  <div>
                    <h4 className="font-bold text-sm">{review.name}</h4>
                    <p className="text-xs text-accent font-medium">{review.exam}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
