
"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export const SearchSection = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const trending = ["SSC CGL", "RRB NTPC", "BPSC", "UPSC", "Bihar Police", "SSC GD"];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto space-y-8 text-center">
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative flex items-center bg-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl h-16 px-6">
              <Search className="w-6 h-6 text-muted-foreground mr-4" />
              <input
                type="text"
                placeholder="Search exams like SSC CGL, RRB NTPC, BPSC, UPSC..."
                className="flex-1 bg-transparent border-none outline-none text-lg text-foreground placeholder:text-muted-foreground"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Badge className="bg-primary hidden sm:flex">Press Enter</Badge>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-sm text-muted-foreground">Trending:</span>
            {trending.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer px-4 py-1 rounded-full transition-all border border-white/10"
                onClick={() => router.push(`/search?q=${encodeURIComponent(tag)}`)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
