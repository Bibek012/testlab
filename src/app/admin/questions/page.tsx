"use client";

import React, { useState, useMemo } from "react";
import { 
  Search, 
  Filter, 
  Edit2, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon,
  Languages,
  MoreVertical,
  Loader2,
  Trash2,
  LayoutGrid,
  FileSearch,
  Database,
  List
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  collectionGroup,
  doc,
  deleteDoc,
  updateDoc,
  limit
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function QuestionManagementPage() {
  const db = useFirestore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMockId, setSelectedMockId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [hasImages, setHasImages] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");

  const mocksQuery = useMemoFirebase(() => 
    db ? query(collection(db, "mockTests"), orderBy("title", "asc")) : null, 
  [db]);
  const { data: mockTests } = useCollection<any>(mocksQuery);

  const questionsQuery = useMemoFirebase(() => {
    if (!db) return null;
    let q = query(collectionGroup(db, "questions"), limit(200));
    if (selectedMockId !== "all") {
      q = query(collectionGroup(db, "questions"), where("mockId", "==", selectedMockId));
    }
    return q;
  }, [db, selectedMockId]);

  const { data: questions, loading: qLoading } = useCollection<any>(questionsQuery);

  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    return questions.filter(q => {
      const matchesSearch = 
        q.en?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        q.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.hn?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = selectedStatus === "all" || q.status === selectedStatus;
      const matchesImage = hasImages === "all" ? true : hasImages === "yes" ? (q.dom_images?.length > 0) : (!q.dom_images || q.dom_images.length === 0);
      const matchesSection = selectedSection === "all" || q.sectionId === selectedSection;

      return matchesSearch && matchesStatus && matchesImage && matchesSection;
    });
  }, [questions, searchQuery, selectedStatus, hasImages, selectedSection]);

  const sections = useMemo(() => {
    if (!questions) return [];
    const unique = new Set(questions.map(q => q.sectionId).filter(Boolean));
    return Array.from(unique);
  }, [questions]);

  const handleDelete = async (mockId: string, questionId: string) => {
    if (!db || !confirm("Are you sure you want to delete this question?")) return;
    try {
      await deleteDoc(doc(db, "mockTests", mockId, "questions", questionId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (mockId: string, questionId: string, status: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "mockTests", mockId, "questions", questionId), { status });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-bold">Global <span className="text-accent">Question Bank</span></h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">Advanced management for all cross-platform examination items.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link href="/admin/upload-json" className="w-full md:w-auto">
            <Button className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 h-10 md:h-11 shadow-lg shadow-primary/20 text-xs md:text-sm">
               <ImageIcon className="w-4 h-4 shrink-0" />
               Import Content
            </Button>
          </Link>
        </div>
      </div>

      <Card className="glass border-white/10 overflow-hidden">
        <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="flex flex-col xl:flex-row gap-4">
             <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Deep search item text, ID or content..." 
                  className="pl-10 bg-white/5 border-white/5 h-10 md:h-11 rounded-xl focus:border-primary/40 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
             
             <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 md:gap-3">
               <Select value={selectedMockId} onValueChange={setSelectedMockId}>
                  <SelectTrigger className="w-full md:w-[180px] bg-white/5 border-white/5 h-10 md:h-11 rounded-xl text-[10px] md:text-xs">
                    <SelectValue placeholder="All Mocks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Mocks</SelectItem>
                    {mockTests?.map((mock: any) => (
                      <SelectItem key={mock.id} value={mock.id}>{mock.title}</SelectItem>
                    ))}
                  </SelectContent>
               </Select>

               <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger className="w-full md:w-[150px] bg-white/5 border-white/5 h-10 md:h-11 rounded-xl text-[10px] md:text-xs">
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map((s: any) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
               </Select>

               <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full md:w-[130px] bg-white/5 border-white/5 h-10 md:h-11 rounded-xl text-[10px] md:text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Verified">Verified</SelectItem>
                    <SelectItem value="Needs Review">Needs Review</SelectItem>
                    <SelectItem value="Published">Published</SelectItem>
                  </SelectContent>
               </Select>

               <Button variant="outline" className="hidden md:flex rounded-xl h-10 md:h-11 border-white/10 hover:bg-white/5 px-4 gap-2 text-xs" onClick={() => { setSearchQuery(""); setSelectedStatus("all"); setSelectedMockId("all"); setHasImages("all"); setSelectedSection("all"); }}>
                 <Filter className="w-4 h-4" /> Reset
               </Button>
             </div>
          </div>

          <div className="flex items-center justify-between pt-3 md:pt-4 border-t border-white/5">
             <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <Badge variant="outline" className="bg-white/5 text-[9px] md:text-[10px] uppercase font-bold tracking-widest px-2 md:px-3 h-5 md:h-6 shrink-0">
                   {filteredQuestions.length} Items
                </Badge>
                <div className="text-[9px] md:text-[10px] text-muted-foreground flex items-center gap-1.5 uppercase font-bold truncate">
                   <Database className="w-3 h-3 shrink-0" /> Syncing Global Pool
                </div>
             </div>
             <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-primary bg-white/5"><List className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground"><LayoutGrid className="w-3.5 h-3.5" /></Button>
             </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-white/10 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-6 py-4 font-semibold text-muted-foreground">Item Identity & Preview</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground">Hierarchy</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground">Attributes</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground">Status</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {qLoading ? (
                <tr><td colSpan={5} className="p-20 text-center"><div className="flex flex-col items-center gap-4 text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="text-xs font-bold uppercase tracking-widest">Aggregating Content...</p></div></td></tr>
              ) : filteredQuestions.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-muted-foreground italic">No questions found matching the search criteria.</td></tr>
              ) : filteredQuestions.map((q) => (
                <tr key={q.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 max-w-lg">
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-2 py-0.5 rounded border border-white/5">{q.id.slice(0, 8)}...</span>
                         {q.dom_images?.length > 0 && (
                           <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20 h-4 px-1.5 text-[8px] font-bold uppercase shrink-0">
                             <ImageIcon className="w-2.5 h-2.5 mr-1" /> Media
                           </Badge>
                         )}
                         <Languages className="w-3 h-3 text-primary shrink-0" />
                      </div>
                      <p className="line-clamp-2 text-foreground font-medium text-sm leading-relaxed min-w-0">{q.en}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-muted-foreground uppercase truncate w-32">
                        {mockTests?.find((m: any) => m.id === q.mockId)?.title || "Global Pool"}
                      </span>
                      <Badge variant="outline" className="mt-1.5 text-[9px] w-fit border-white/5 h-4 uppercase">{q.sectionId}</Badge>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">
                        <div className="flex flex-col"><span>Marks</span><span className="text-emerald-400 text-xs mt-0.5">+{q.marks}</span></div>
                        <div className="flex flex-col border-l border-white/5 pl-4"><span>Neg.</span><span className="text-rose-400 text-xs mt-0.5">-{q.negativeMarks}</span></div>
                     </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={cn(
                      "h-6 gap-1.5",
                      q.status === 'Verified' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      q.status === 'Needs Review' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                      "bg-slate-500/10 text-slate-400 border-slate-500/20"
                    )}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", q.status === 'Verified' ? "bg-emerald-400" : q.status === 'Needs Review' ? "bg-amber-400" : "bg-slate-400")} />
                      {q.status || 'Draft'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                     <div className="flex items-center justify-end gap-1 md:gap-2">
                       <Link href={`/admin/questions/edit?mockId=${q.mockId}&qId=${q.id}`}>
                         <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10"><Edit2 className="w-4 h-4" /></Button>
                       </Link>
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass border-white/10 w-48">
                             <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => handleStatusChange(q.mockId, q.id, "Verified")}><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Mark Verified</DropdownMenuItem>
                             <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => handleStatusChange(q.mockId, q.id, "Needs Review")}><AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Needs Review</DropdownMenuItem>
                             <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer gap-2" onClick={() => handleDelete(q.mockId, q.id)}><Trash2 className="w-3.5 h-3.5" /> Delete Question</DropdownMenuItem>
                          </DropdownMenuContent>
                       </DropdownMenu>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}