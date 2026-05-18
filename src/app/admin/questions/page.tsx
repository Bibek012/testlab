
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
  Trash2
} from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  collectionGroup,
  doc,
  deleteDoc,
  updateDoc
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

  // Fetch all categories and mocks for filters
  const { data: categories } = useCollection(db ? query(collection(db, "examCategories"), orderBy("title", "asc")) : null);
  const { data: mockTests } = useCollection(db ? query(collection(db, "mockTests"), orderBy("title", "asc")) : null);

  // We use collectionGroup to see questions across all mocks
  // Note: This requires a composite index if filtered/ordered complexly, 
  // but simple collectionGroup works for small datasets.
  const questionsQuery = useMemo(() => {
    if (!db) return null;
    let q = query(collectionGroup(db, "questions"));
    if (selectedMockId !== "all") {
      q = query(collectionGroup(db, "questions"), where("mockId", "==", selectedMockId));
    }
    return q;
  }, [db, selectedMockId]);

  const { data: questions, loading: qLoading } = useCollection(questionsQuery);

  // Client-side filtering for search and status
  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    return questions.filter(q => {
      const matchesSearch = q.en.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           q.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === "all" || q.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [questions, searchQuery, selectedStatus]);

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
          <h1 className="text-3xl font-headline font-bold">Question <span className="text-accent">Manager</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Review, edit and verify your examination content bank.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/upload-json">
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 h-11 shadow-lg shadow-primary/20">
              Go to Upload JSON
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="glass border-white/10">
        <CardContent className="p-4 flex flex-col xl:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by question text or ID..." 
              className="pl-10 bg-white/5 border-white/5 h-11 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={selectedMockId} onValueChange={setSelectedMockId}>
            <SelectTrigger className="w-full xl:w-[250px] bg-white/5 border-white/5 h-11 rounded-xl">
              <SelectValue placeholder="All Mock Tests" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Mock Tests</SelectItem>
              {mockTests?.map(mock => (
                <SelectItem key={mock.id} value={mock.id}>{mock.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full xl:w-[180px] bg-white/5 border-white/5 h-11 rounded-xl">
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

          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl hover:bg-white/5 border border-white/5 text-muted-foreground">
             <Filter className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Question Table */}
      <Card className="glass border-white/10 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Question ID & Preview</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Mock Context</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Metadata</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Status</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {qLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p>Loading question bank...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredQuestions.map((q) => (
                  <tr key={q.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 max-w-md">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">{q.id}</span>
                           {q.dom_images?.length > 0 && <ImageIcon className="w-3 h-3 text-accent" />}
                           <Languages className="w-3 h-3 text-primary" />
                        </div>
                        <p className="line-clamp-2 text-foreground font-medium">{q.en}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-muted-foreground uppercase truncate w-32">
                          {mockTests?.find(m => m.id === q.mockId)?.title || "Generic"}
                        </span>
                        <span className="text-[10px] text-accent mt-0.5">{q.sectionId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          <div className="flex flex-col">
                             <span>Marks</span>
                             <span className="text-foreground text-xs mt-0.5">+{q.marks}</span>
                          </div>
                          <div className="flex flex-col border-l border-white/5 pl-4">
                             <span>Neg.</span>
                             <span className="text-rose-400 text-xs mt-0.5">-{q.negativeMarks}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={cn(
                        "h-6 gap-1.5",
                        q.status === 'Verified' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        q.status === 'Needs Review' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
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
                            <DropdownMenuContent align="end" className="glass border-white/10">
                               <DropdownMenuItem onClick={() => handleStatusChange(q.mockId, q.id, "Verified")} className="gap-2">
                                 <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Mark Verified
                               </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleStatusChange(q.mockId, q.id, "Needs Review")} className="gap-2">
                                 <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Needs Review
                               </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleDelete(q.mockId, q.id)} className="gap-2 text-destructive">
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
                         <FileText className="w-12 h-12 opacity-10" />
                         <p className="font-bold">No questions found</p>
                         <p className="text-xs">Adjust your filters or upload some questions first.</p>
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

