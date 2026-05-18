
"use client";

import React, { useState, useMemo } from "react";
import { 
  Search, 
  Filter, 
  Eye, 
  Edit2, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon,
  Languages,
  MoreVertical,
  ChevronRight,
  FileText,
  Loader2,
  Trash2,
  LayoutGrid,
  FileSearch,
  Database
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  
  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMockId, setSelectedMockId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [hasImages, setHasImages] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");

  // Fetch all categories and mocks for filters stabilized with useMemoFirebase
  const mocksQuery = useMemoFirebase(() => 
    db ? query(collection(db, "mockTests"), orderBy("title", "asc")) : null, 
  [db]);
  const { data: mockTests } = useCollection(mocksQuery);

  // Question collectionGroup
  const questionsQuery = useMemoFirebase(() => {
    if (!db) return null;
    let q = query(collectionGroup(db, "questions"), limit(200));
    if (selectedMockId !== "all") {
      q = query(collectionGroup(db, "questions"), where("mockId", "==", selectedMockId));
    }
    return q;
  }, [db, selectedMockId]);

  const { data: questions, loading: qLoading } = useCollection(questionsQuery);

  // Client-side advanced filtering
  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    return questions.filter(q => {
      const matchesSearch = 
        q.en?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        q.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.hn?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = selectedStatus === "all" || q.status === selectedStatus;
      const matchesImage = hasImages === "all" ? true : hasImages === "yes" ? (q.dom_images?.length > 0 || q.memory_images?.length > 0) : (!q.dom_images || q.dom_images.length === 0);
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Global <span className="text-accent">Question Bank</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Industrial-grade filtering and management for all examination items.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/upload-json">
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 h-11 shadow-lg shadow-primary/20">
               Import New Questions
            </Button>
          </Link>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <Card className="glass border-white/10">
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col xl:flex-row gap-4">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Deep search item text, ID or bilingual content..." 
                  className="pl-10 bg-white/5 border-white/5 h-11 rounded-xl focus:border-primary/40"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
             
             <div className="flex flex-wrap items-center gap-3">
               <Select value={selectedMockId} onValueChange={setSelectedMockId}>
                  <SelectTrigger className="w-[200px] bg-white/5 border-white/5 h-11 rounded-xl">
                    <SelectValue placeholder="All Mock Tests" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Mock Tests</SelectItem>
                    {mockTests?.map(mock => (
                      <SelectItem key={mock.id} value={mock.id}>{mock.title}</SelectItem>
                    ))}
                  </SelectContent>
               </Select>

               <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger className="w-[180px] bg-white/5 border-white/5 h-11 rounded-xl">
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
               </Select>

               <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[150px] bg-white/5 border-white/5 h-11 rounded-xl">
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

               <Select value={hasImages} onValueChange={setHasImages}>
                  <SelectTrigger className="w-[130px] bg-white/5 border-white/5 h-11 rounded-xl">
                    <SelectValue placeholder="Assets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Assets</SelectItem>
                    <SelectItem value="yes">Has Images</SelectItem>
                    <SelectItem value="no">Text Only</SelectItem>
                  </SelectContent>
               </Select>

               <Button variant="outline" className="rounded-xl h-11 border-white/10 hover:bg-white/5 px-6 gap-2" onClick={() => { setSearchQuery(""); setSelectedStatus("all"); setSelectedMockId("all"); setHasImages("all"); setSelectedSection("all"); }}>
                 <Filter className="w-4 h-4" /> Reset
               </Button>
             </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/5">
             <div className="flex items-center gap-4">
                <Badge variant="outline" className="bg-white/5 text-[10px] uppercase font-bold tracking-widest px-3 h-6">
                   Showing {filteredQuestions.length} Items
                </Badge>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 uppercase font-bold">
                   <Database className="w-3 h-3" /> Syncing across {mockTests?.length || 0} tests
                </div>
             </div>
             <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-primary bg-white/5"><List className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground"><LayoutGrid className="w-3.5 h-3.5" /></Button>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Table */}
      <Card className="glass border-white/10 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Item Identity & Preview</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Test Hierarchy</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Attributes</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Verification</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {qLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 text-muted-foreground">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <p className="text-xs font-bold uppercase tracking-widest">Aggregating Content Bank...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredQuestions.map((q) => (
                  <tr key={q.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 max-w-lg">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-2 py-0.5 rounded border border-white/5">{q.id}</span>
                           {(q.dom_images?.length > 0 || q.memory_images?.length > 0) && (
                             <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20 h-5 px-1.5 text-[8px] font-bold uppercase">
                               <ImageIcon className="w-2.5 h-2.5 mr-1" /> Media
                             </Badge>
                           )}
                           <Languages className="w-3 h-3 text-primary" />
                        </div>
                        <p className="line-clamp-2 text-foreground font-medium text-sm leading-relaxed">{q.en}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-muted-foreground uppercase truncate w-40">
                          {mockTests?.find(m => m.id === q.mockId)?.title || "Global Pool"}
                        </span>
                        <Badge variant="outline" className="mt-1.5 text-[9px] w-fit border-white/5 h-5">
                          {q.sectionId}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          <div className="flex flex-col">
                             <span>Marks</span>
                             <span className="text-emerald-400 text-xs mt-0.5">+{q.marks}</span>
                          </div>
                          <div className="flex flex-col border-l border-white/5 pl-5">
                             <span>Neg.</span>
                             <span className="text-rose-400 text-xs mt-0.5">-{q.negativeMarks}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={cn(
                        "h-6 gap-1.5",
                        q.status === 'Verified' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        q.status === 'Needs Review' ? "bg-amber-500/10 text-amber-400 border-emerald-500/20" :
                        "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", 
                          q.status === 'Verified' ? "bg-emerald-400" :
                          q.status === 'Needs Review' ? "bg-amber-400" : "bg-slate-400"
                        )} />
                        {q.status || 'Draft'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                         <Link href={`/admin/questions/edit?mockId=${q.mockId}&qId=${q.id}`}>
                           <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Edit2 className="w-4 h-4" />
                           </Button>
                         </Link>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass border-white/10 w-48">
                               <DropdownMenuItem onClick={() => handleStatusChange(q.mockId, q.id, "Verified")} className="gap-2">
                                 <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Mark Verified
                               </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleStatusChange(q.mockId, q.id, "Needs Review")} className="gap-2">
                                 <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Needs Review
                               </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleDelete(q.mockId, q.id)} className="gap-2 text-destructive focus:text-destructive">
                                 <Trash2 className="w-3.5 h-3.5" /> Delete Question
                               </DropdownMenuItem>
                            </DropdownMenuContent>
                         </DropdownMenu>
                       </div>
                    </td>
                  </tr>
                ))}
                {filteredQuestions.length === 0 && !qLoading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 text-muted-foreground">
                         <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                            <FileSearch className="w-8 h-8 opacity-20" />
                         </div>
                         <div>
                            <p className="font-bold text-lg">No matching items found</p>
                            <p className="text-xs">Try relaxing your filters or different search terms.</p>
                         </div>
                         <Button variant="outline" className="rounded-xl border-white/10" onClick={() => { setSearchQuery(""); setSelectedStatus("all"); setSelectedMockId("all"); setHasImages("all"); setSelectedSection("all"); }}>
                            Clear All Filters
                         </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
