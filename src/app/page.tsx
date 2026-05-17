
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { SearchSection } from "@/components/SearchSection";
import { CategoryGrid } from "@/components/CategoryGrid";
import { StateExamSection } from "@/components/StateExamSection";
import { AIInsightShowcase } from "@/components/AIInsightShowcase";
import { PopularExams } from "@/components/PopularExams";
import { Features } from "@/components/Features";
import { StatsSection } from "@/components/StatsSection";
import { Testimonials } from "@/components/Testimonials";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <SearchSection />
      <CategoryGrid />
      <AIInsightShowcase />
      <StateExamSection />
      <PopularExams />
      <Features />
      <StatsSection />
      <Testimonials />
      <CTASection />
      <Footer />
    </main>
  );
}
