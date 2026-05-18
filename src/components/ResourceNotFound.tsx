
"use client";

import React from "react";
import Link from "next/link";
import { FileSearch, ArrowLeft, Home, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  type: "Exam" | "Mock Test" | "Question" | "Category";
  message?: string;
  backUrl?: string;
}

export const ResourceNotFound = ({ type, message, backUrl }: Props) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <Card className="glass border-white/10 p-12 max-w-lg w-full text-center space-y-8 rounded-[3rem] shadow-2xl">
        <div className="relative mx-auto w-24 h-24">
           <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
           <div className="relative w-full h-full rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground">
              <FileSearch className="w-12 h-12 opacity-50" />
           </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-headline font-bold">{type} <span className="text-accent">Not Found</span></h2>
          <p className="text-muted-foreground leading-relaxed">
            {message || `We couldn't locate the specific ${type.toLowerCase()} you're looking for. It might have been unpublished or removed.`}
          </p>
        </div>

        <div className="grid gap-3">
          {backUrl && (
            <Link href={backUrl}>
              <Button className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 font-bold gap-2">
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </Button>
            </Link>
          )}
          <Link href="/#exams">
            <Button variant="outline" className="w-full h-12 rounded-xl border-white/10 hover:bg-white/5 font-bold gap-2">
              <BookOpen className="w-4 h-4" />
              Explore All Exams
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="w-full h-12 rounded-xl text-muted-foreground hover:text-foreground font-bold">
              <Home className="w-4 h-4 mr-2" />
              Return to Home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
