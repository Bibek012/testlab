
"use client";

import React, { useState, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { 
  Bookmark, 
  Search, 
  Trash2, 
  Eye, 
  ChevronRight, 
  BookOpen, 
  HelpCircle,
  Clock,
  Languages,
  Filter,
  Loader2,
  ArrowUpRight,
  Zap,
  CheckCircle2
} from "lucide-react";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function BookmarksPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLang, setSelectedLang] = useState<'en' | 'hn'>('en');

  const bookmarksQuery = useMemoFirebase(() => 
    user && db ? query(collection(db, 'users', user.uid, 'bookmarks'), orderBy('bookmarkedAt', 'desc')) : null,
  [user?.uid, db]);

  const { data: bookmarks, loading } = useCollection<any>(bookmarksQuery);

  const filteredBookmarks = useMemo(() => {
    if (!bookmarks) return [];
    return bookmarks.filter(b => {
      const q = b.questionData;
      const text = (q.en + q.hn).toLowerCase();
      return text.includes(searchQuery.toLowerCase());
    });
  }, [bookmarks, searchQuery]);

  const handleDelete = async (id: string) => {
    if (!user || !db) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'bookmarks', id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-32 pb-24 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] -z-10" />
        
        <div className="container mx-auto px-6">
          <Breadcrumbs items={[{ label: "Saved Questions" }]} />
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="space-y-4">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest">
                 <Bookmark className="w-3 h-3" />
                 Personal Revision Bank
               </div>
               <h1 className="text-4xl lg:text-6xl font-headline font-bold tracking-tight">
                 Saved <span className="gradient-text">Questions</span>
               </h1>
               <p className="text-muted-foreground max-w-xl">
                 Your curated collection of important and challenging questions from across all mock series.
               </p>
            </div>
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
               <button 
                onClick={() => setSelectedLang('en')}
                className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", selectedLang === 'en' ? "bg-primary text-white" : "text-muted-foreground hover:text-white")}
               >English</button>
               <button 
                onClick={() => setSelectedLang('hn')}
                className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", selectedLang === 'hn' ? "bg-primary text-white" : "text-muted-foreground hover:text-white")}
               >हिन्दी</button>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-12">
            {/* Filters Sidebar */}
            <aside className="lg:col-span-3 space-y-6">
               <Card className="glass border-white/10 p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                    <Filter className="w-4 h-4" /> Filters
                  </h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search question..." 
                      className="pl-10 bg-white/5 border-white/10 h-10 text-xs"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="pt-6 space-y-4">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Recently Added</div>
                    <div className="space-y-2">
                      {bookmarks?.slice(0, 5).map((b: any) => (
                        <div key={b.id} className="text-xs text-muted-foreground truncate hover:text-foreground transition-colors cursor-pointer">
                          {b.questionData[selectedLang]}
                        </div>
                      ))}
                    </div>
                  </div>
               </Card>

               <div className="p-6 rounded-3xl bg-indigo-500/10 border border-indigo-500/20">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <BookOpen className="w-3 h-3" /> Quick Stats
                  </div>
                  <div className="text-2xl font-bold font-headline">{bookmarks?.length || 0}</div>
                  <p className="text-[10px] text-muted-foreground">Total Questions Saved</p>
               </div>
            </aside>

            {/* Questions List */}
            <div className="lg:col-span-9 space-y-6">
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
                </div>
              ) : filteredBookmarks.length === 0 ? (
                <div className="h-96 glass border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-center space-y-4">
                   <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                      <Bookmark className="w-10 h-10 text-muted-foreground opacity-20" />
                   </div>
                   <div className="space-y-1">
                      <h3 className="font-bold text-xl">No saved questions found</h3>
                      <p className="text-sm text-muted-foreground">Bookmark questions during a test to see them here.</p>
                   </div>
                   <Button variant="outline" className="rounded-full border-white/10" onClick={() => window.location.href = '/#exams'}>
                      Explore Mock Tests
                   </Button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {filteredBookmarks.map((bookmark) => (
                    <QuestionBookmarkCard 
                      key={bookmark.id} 
                      bookmark={bookmark} 
                      lang={selectedLang} 
                      onDelete={() => handleDelete(bookmark.id)} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

function QuestionBookmarkCard({ bookmark, lang, onDelete }: any) {
  const q = bookmark.questionData;

  return (
    <Card className="glass border-white/10 overflow-hidden group hover:border-primary/40 transition-all duration-300">
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
           <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                 <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px]">{bookmark.examId}</Badge>
                 <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px]">{bookmark.sectionId}</Badge>
                 <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                   <Clock className="w-3 h-3" /> 
                   Saved {bookmark.bookmarkedAt?.toDate ? new Date(bookmark.bookmarkedAt.toDate()).toLocaleDateString() : 'Recently'}
                 </span>
              </div>
              
              <div className="text-sm md:text-lg font-medium leading-relaxed line-clamp-3">
                 <div dangerouslySetInnerHTML={{ __html: q[`${lang}_html`] || q[lang] }} />
              </div>

              <div className="flex items-center gap-4 pt-4">
                 <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="rounded-xl border-white/10 h-10 gap-2 font-bold text-xs">
                         <Eye className="w-4 h-4" /> View Full Solution
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass border-white/10 sm:max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
                       <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-sm uppercase tracking-widest text-accent">
                            <HelpCircle className="w-4 h-4" /> Question Review
                          </DialogTitle>
                       </DialogHeader>
                       <div className="space-y-8 py-6">
                          <div className="space-y-6">
                             <div className="text-xl font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: q[`${lang}_html`] || q[lang] }} />
                             {q.dom_images?.map((img: string, i: number) => (
                               <img key={i} src={img} className="rounded-2xl border border-white/10 max-h-[300px] object-contain mx-auto" alt="Question Ref" />
                             ))}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             {q.options.map((opt: any) => (
                               <div key={opt.id} className={cn(
                                 "p-4 rounded-xl border flex gap-3 text-sm font-medium",
                                 q.answer === opt.id ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" : "bg-white/5 border-white/5"
                               )}>
                                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold", q.answer === opt.id ? "bg-emerald-500 text-white" : "bg-white/10 text-muted-foreground")}>
                                     {opt.id.split('-').pop()?.toUpperCase()}
                                  </div>
                                  {opt[lang]}
                                  {q.answer === opt.id && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                               </div>
                             ))}
                          </div>

                          {q.explanation && (
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4">
                               <div className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                  <Zap className="w-4 h-4 fill-current" /> Detailed Solution
                               </div>
                               <div className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: q.explanation[`${lang}_html`] || q.explanation[lang] }} />
                            </div>
                          )}
                       </div>
                    </DialogContent>
                 </Dialog>
                 <Button variant="ghost" onClick={onDelete} className="rounded-xl text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 h-10 w-10 p-0">
                    <Trash2 className="w-4 h-4" />
                 </Button>
              </div>
           </div>
           <div className="hidden md:block">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-all">
                 <ArrowUpRight className="w-6 h-6 opacity-20 group-hover:opacity-100" />
              </div>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}
