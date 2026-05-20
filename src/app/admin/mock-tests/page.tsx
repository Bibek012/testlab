"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  UploadCloud,
  LayoutGrid,
  List,
  Copy,
  Loader2,
  Filter,
  Layers,
  ChevronRight,
  PlusCircle,
  FolderPlus,
  AlertCircle
} from "lucide-react";

import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser
} from "@/firebase";

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { logAction } from "@/services/audit";

export default function MockTestManagementPage() {
  const db = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [activeTab, setActiveTab] = useState<"all" | "Draft" | "Published">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Fetch Exams
  const examsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "exams"), orderBy("name", "asc")) : null, 
  [db]);
  const { data: exams } = useCollection<any>(examsQuery);

  // Fetch All Mock Tests
  const mockTestsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "mockTests"), orderBy("createdAt", "desc")) : null, 
  [db]);
  const { data: mockTests, loading: mocksLoading } = useCollection<any>(mockTestsQuery);

  const filteredMocks = useMemo(() => {
    if (!mockTests) return [];
    return mockTests.filter((mock: any) => {
      const matchesSearch = (mock.title || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "all" || mock.status === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [mockTests, searchQuery, activeTab]);

  const handleDeleteMock = async (id: string, title: string) => {
    if (!db || !user) return;
    console.log("DELETE CLICKED", id);
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "mockTests", id));
      await logAction(db, user, "delete_mock", id, "mock_test", `Deleted: ${title}`);
      toast({ title: "Deleted Successfully" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: error?.message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicateMock = async (mock: any) => {
    if (!db || !user) return;
    try {
      const { id, ...data } = mock;
      const docRef = await addDoc(collection(db, "mockTests"), {
        ...data,
        title: `${data.title} (Copy)`,
        slug: `${data.slug}-copy`,
        status: "Draft",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await logAction(db, user, "duplicate_mock", docRef.id, "mock_test", `Duplicated from: ${mock.title}`);
      toast({ title: "Duplicated", description: "Mock test duplicated as Draft" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Duplicate Failed", description: error?.message });
    }
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-headline font-bold">Mock Test <span className="text-accent">Manager</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Orchestrate exam-specific mock series with hierarchical mapping.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/upload-json" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full rounded-xl border-white/10 h-11">
              <UploadCloud className="w-4 h-4 mr-2" /> Ingest Content
            </Button>
          </Link>
          <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="flex-1 sm:flex-none bg-primary text-white rounded-xl shadow-lg shadow-primary/20 h-11 font-bold">
            <Plus className="w-4 h-4 mr-2" /> New Mock Series
          </Button>
        </div>
      </div>

      <Card className="glass border-white/10 shadow-xl overflow-hidden">
        <CardContent className="p-4 flex flex-col xl:flex-row gap-4 items-center">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full xl:w-auto">
            <TabsList className="bg-white/5 border-white/10 h-11 p-1">
              <TabsTrigger value="all" className="px-5 text-[10px] uppercase font-bold tracking-widest">All</TabsTrigger>
              <TabsTrigger value="Draft" className="px-5 text-[10px] uppercase font-bold tracking-widest">Draft</TabsTrigger>
              <TabsTrigger value="Published" className="px-5 text-[10px] uppercase font-bold tracking-widest">Live</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-10 bg-white/5 border-white/10 rounded-xl h-11 focus-visible:ring-primary/40" placeholder="Search tests by title..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
            <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-lg transition-all", viewMode === "table" ? "bg-primary text-white shadow-lg" : "text-muted-foreground")} onClick={() => setViewMode("table")}><List className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-lg transition-all", viewMode === "grid" ? "bg-primary text-white shadow-lg" : "text-muted-foreground")} onClick={() => setViewMode("grid")}><LayoutGrid className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {mocksLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-[10px] font-bold uppercase tracking-widest animate-pulse text-muted-foreground">Syncing Library Hierarchy...</p>
        </div>
      ) : viewMode === "table" ? (
        <Card className="glass border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto w-full custom-scrollbar">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="p-5 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Test Title & Exam</th>
                  <th className="p-5 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Mapping & Hierarchy</th>
                  <th className="p-5 font-bold text-muted-foreground uppercase tracking-widest text-[10px] text-center">Engine Config</th>
                  <th className="p-5 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Lifecycle</th>
                  <th className="p-5 font-bold text-muted-foreground uppercase tracking-widest text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredMocks.map((mock: any) => (
                  <tr key={mock.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-5">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-foreground text-sm leading-tight">{mock.title}</span>
                        <div className="flex items-center gap-2">
                           <Badge variant="outline" className="h-4 px-1.5 text-[8px] border-white/10 uppercase opacity-60">ID: {mock.id.slice(0, 8)}</Badge>
                           <span className="text-[9px] text-primary font-bold uppercase tracking-widest">{mock.examName || 'Generic'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className="bg-primary/20 text-primary border-primary/10 text-[9px] h-5 px-2 uppercase font-bold tracking-tighter">{mock.typeName || 'Full Test'}</Badge>
                        {mock.subTypeName && <ChevronRight className="w-3 h-3 text-muted-foreground opacity-30" />}
                        {mock.subTypeName && <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 text-[9px] h-5 px-2 font-bold tracking-tighter">{mock.subTypeName}</Badge>}
                      </div>
                    </td>
                    <td className="p-5 text-center">
                       <div className="inline-flex flex-col items-center gap-1 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                          <span className="text-[10px] font-bold text-foreground">{mock.totalQuestions} Questions</span>
                          <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">{mock.durationMinutes} Minutes</span>
                       </div>
                    </td>
                    <td className="p-5">
                      <Badge className={cn(
                        "h-6 font-bold uppercase text-[9px] tracking-widest px-3 gap-1.5", 
                        mock.status === 'Published' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", mock.status === 'Published' ? "bg-emerald-400" : "bg-amber-400")} />
                        {mock.status}
                      </Badge>
                    </td>
                    <td className="p-5 text-right">
                      {deletingId === mock.id ? (
                        <Loader2 className="w-4 h-4 animate-spin ml-auto text-primary" />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-white/10 rounded-xl transition-all"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass border-white/10 w-52 p-1.5 shadow-3xl">
                            <DropdownMenuItem className="gap-2 py-2.5 rounded-lg cursor-pointer" onClick={() => { setEditingItem(mock); setIsModalOpen(true); }}><Edit2 className="w-3.5 h-3.5 text-primary" /> Edit Configuration</DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 py-2.5 rounded-lg cursor-pointer" onClick={() => handleDuplicateMock(mock)}><Copy className="w-3.5 h-3.5 text-accent" /> Duplicate Module</DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5 my-1" />
                            <DropdownMenuItem 
                              asChild
                              className="text-rose-400 focus:text-rose-400 focus:bg-rose-500/10 gap-2 py-2.5 rounded-lg cursor-pointer"
                            >
                                <button className="w-full text-left" onClick={() => { if (confirm(`Confirm permanent deletion of "${mock.title}"?`)) handleDeleteMock(mock.id, mock.title); }}>
                                   <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
                                </button>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
          {filteredMocks.map((mock: any) => (
            <Card key={mock.id} className="glass border-white/10 p-8 flex flex-col gap-8 group hover:border-primary/50 transition-all duration-500 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                 <Layers className="w-20 h-20 text-primary" />
              </div>

              <div className="flex justify-between items-start relative z-10">
                <Badge className="bg-primary/20 text-primary border-primary/10 text-[10px] uppercase tracking-widest px-3 h-6">{mock.typeName || "Full Test"}</Badge>
                <Badge className={cn("h-6 text-[10px] font-bold uppercase tracking-widest px-3", mock.status === 'Published' ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400")}>{mock.status}</Badge>
              </div>
              
              <div className="relative z-10 space-y-2">
                <h3 className="font-bold text-xl leading-tight group-hover:text-primary transition-colors line-clamp-2 min-h-[3.5rem]">{mock.title}</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">{mock.examName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-6 border-y border-white/5 relative z-10">
                <div className="space-y-1"><p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter opacity-50">Items</p><p className="text-2xl font-bold">{mock.totalQuestions}</p></div>
                <div className="space-y-1 border-l border-white/5 pl-4"><p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter opacity-50">Mins</p><p className="text-2xl font-bold">{mock.durationMinutes}</p></div>
              </div>

              <div className="flex justify-end gap-3 relative z-10 mt-auto">
                 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white/10" onClick={() => { setEditingItem(mock); setIsModalOpen(true); }}><Edit2 className="w-4 h-4" /></Button>
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="h-10 w-10 rounded-xl hover:bg-rose-500/10 text-rose-400"
                   onClick={() => { if (confirm(`Delete ${mock.title}?`)) handleDeleteMock(mock.id, mock.title); }}
                 ><Trash2 className="w-4 h-4" /></Button>
              </div>
            </Card>
          ))}
          {filteredMocks.length === 0 && (
            <div className="col-span-full py-20 text-center glass border-white/5 rounded-[3rem] space-y-4">
               <AlertCircle className="w-12 h-12 text-muted-foreground opacity-10 mx-auto" />
               <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs">No matching tests found</p>
            </div>
          )}
        </div>
      )}

      <MockTestModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        editingItem={editingItem} 
        exams={exams || []} 
      />
    </div>
  );
}

function MockTestModal({ isOpen, onClose, editingItem, exams }: any) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<any>({
    title: "",
    examId: "",
    examName: "",
    typeId: "",
    typeName: "",
    subTypeId: "",
    subTypeName: "",
    durationMinutes: 90,
    totalQuestions: 100,
    fullMarks: 100,
    negativeMarks: 0.33,
    isFree: true,
    status: "Draft",
  });

  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [isAddingSubType, setIsAddingSubType] = useState(false);
  const [newSubTypeName, setNewSubTypeName] = useState("");

  // Listeners for exam-specific types/subtypes
  const mockTypesQuery = useMemoFirebase(() => 
    db && formData.examId ? query(collection(db, "exams", formData.examId, "mockTypes"), orderBy("order", "asc")) : null,
  [db, formData.examId]);
  const { data: mockTypes } = useCollection<any>(mockTypesQuery);

  const subTypesQuery = useMemoFirebase(() => 
    db && formData.examId && formData.typeId 
      ? query(collection(db, "exams", formData.examId, "mockTypes", formData.typeId, "subTypes"), orderBy("order", "asc")) 
      : null,
  [db, formData.examId, formData.typeId]);
  const { data: subTypes } = useCollection<any>(subTypesQuery);

  useEffect(() => {
    if (editingItem) setFormData({ 
      title: editingItem.title || "",
      examId: editingItem.examId || "",
      examName: editingItem.examName || "",
      typeId: editingItem.typeId || "",
      typeName: editingItem.typeName || "",
      subTypeId: editingItem.subTypeId || "",
      subTypeName: editingItem.subTypeName || "",
      durationMinutes: editingItem.durationMinutes || 90,
      totalQuestions: editingItem.totalQuestions || 0,
      fullMarks: editingItem.fullMarks || 100,
      negativeMarks: editingItem.negativeMarks || 0.33,
      isFree: editingItem.isFree ?? true,
      status: editingItem.status || "Draft"
    });
    else setFormData({ title: "", examId: "", examName: "", typeId: "", typeName: "", subTypeId: "", subTypeName: "", durationMinutes: 90, totalQuestions: 100, fullMarks: 100, negativeMarks: 0.33, isFree: true, status: "Draft" });
  }, [editingItem, isOpen]);

  const handleAddType = async () => {
    if (!db || !formData.examId || !newTypeName.trim()) return;
    try {
      const slug = newTypeName.toLowerCase().replace(/\s+/g, '-');
      await addDoc(collection(db, "exams", formData.examId, "mockTypes"), {
        title: newTypeName,
        slug,
        order: Date.now(),
        isActive: true,
        createdAt: serverTimestamp()
      });
      setNewTypeName("");
      setIsAddingType(false);
      toast({ title: "Mock Type Added" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleAddSubType = async () => {
    if (!db || !formData.examId || !formData.typeId || !newSubTypeName.trim()) return;
    try {
      const slug = newSubTypeName.toLowerCase().replace(/\s+/g, '-');
      await addDoc(collection(db, "exams", formData.examId, "mockTypes", formData.typeId, "subTypes"), {
        title: newSubTypeName,
        slug,
        order: Date.now(),
        isActive: true
      });
      setNewSubTypeName("");
      setIsAddingSubType(false);
      toast({ title: "Sub-Type/Subject Added" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleSave = async () => {
    if (!db || !user || !formData.title.trim() || !formData.examId) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Title and Exam are required." });
      return;
    }
    
    setIsSaving(true);
    try {
      const selectedExam = exams.find((e: any) => e.id === formData.examId);
      const selectedType = mockTypes?.find((t: any) => t.id === formData.typeId);
      const selectedSubType = subTypes?.find((s: any) => s.id === formData.subTypeId);

      const data = {
        ...formData,
        examName: selectedExam?.name || "",
        typeName: selectedType?.title || "",
        subTypeName: selectedSubType?.title || "",
        hierarchyPath: `${selectedExam?.name} > ${selectedType?.title || 'No Type'}${selectedSubType ? ` > ${selectedSubType.title}` : ''}`,
        slug: formData.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        updatedAt: serverTimestamp(),
      };

      if (editingItem) {
        await updateDoc(doc(db, "mockTests", editingItem.id), data);
        await logAction(db, user, "update_mock", editingItem.id, "mock_test", `Updated: ${formData.title}`);
      } else {
        await addDoc(collection(db, "mockTests"), { ...data, createdAt: serverTimestamp() });
        await logAction(db, user, "create_mock", "new", "mock_test", `Created: ${formData.title}`);
      }
      onClose();
      toast({ title: "Test Synchronized" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally { setIsSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl glass border-white/10 max-h-[95vh] overflow-y-auto custom-scrollbar shadow-3xl rounded-[2.5rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl md:text-3xl font-headline font-bold text-foreground">
             {editingItem ? "Edit Configuration" : "New Mock Series"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-8 border-y border-white/5 mt-6">
          <div className="md:col-span-2 space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Series Identifier (Title)</Label>
            <Input className="bg-white/5 border-white/10 h-14 text-xl font-bold rounded-2xl" placeholder="e.g. SSC CGL 2024 Tier-1 Mock 01" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Target Examination</Label>
            <Select value={formData.examId} onValueChange={(v) => setFormData({ ...formData, examId: v, typeId: "", subTypeId: "" })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl focus:ring-primary/40"><SelectValue placeholder="Select Exam" /></SelectTrigger>
              <SelectContent className="glass border-white/10">
                {exams?.map((e: any) => <SelectItem key={e.id} value={e.id} className="rounded-lg">{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Mock Classification</Label>
              {formData.examId && (
                <button onClick={() => setIsAddingType(true)} className="text-[10px] text-primary font-bold hover:underline">+ Create New</button>
              )}
            </div>
            {isAddingType ? (
              <div className="flex gap-2 animate-in slide-in-from-top-1">
                <Input size="sm" className="h-12 text-xs bg-white/10 border-white/10 rounded-xl" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Type name..." />
                <Button size="sm" onClick={handleAddType} className="h-12 px-3 rounded-xl bg-primary"><PlusCircle className="w-5 h-5" /></Button>
              </div>
            ) : (
              <Select value={formData.typeId} onValueChange={(v) => setFormData({ ...formData, typeId: v, subTypeId: "" })} disabled={!formData.examId}>
                <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl disabled:opacity-30"><SelectValue placeholder="Select Type" /></SelectTrigger>
                <SelectContent className="glass border-white/10">
                  {mockTypes?.map((t: any) => <SelectItem key={t.id} value={t.id} className="rounded-lg">{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {formData.typeId && (
            <div className="md:col-span-2 space-y-2 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Subject / Chapter Focus</Label>
                <button onClick={() => setIsAddingSubType(true)} className="text-[10px] text-primary font-bold hover:underline">+ Create New</button>
              </div>
              {isAddingSubType ? (
                <div className="flex gap-2">
                  <Input size="sm" className="h-12 text-xs bg-white/10 border-white/10 rounded-xl" value={newSubTypeName} onChange={(e) => setNewSubTypeName(e.target.value)} placeholder="Subject name..." />
                  <Button size="sm" onClick={handleAddSubType} className="h-12 px-3 rounded-xl bg-primary"><FolderPlus className="w-5 h-5" /></Button>
                </div>
              ) : (
                <Select value={formData.subTypeId} onValueChange={(v) => setFormData({ ...formData, subTypeId: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl"><SelectValue placeholder="All Subjects / Chapters" /></SelectTrigger>
                  <SelectContent className="glass border-white/10">
                    <SelectItem value="none" className="rounded-lg italic">None (General Test)</SelectItem>
                    {subTypes?.map((s: any) => <SelectItem key={s.id} value={s.id} className="rounded-lg">{s.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 md:col-span-2 gap-4">
            <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Duration (m)</Label><Input type="number" className="bg-white/5 border-white/10 h-11 rounded-xl" value={formData.durationMinutes} onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })} /></div>
            <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Est. Marks</Label><Input type="number" className="bg-white/5 border-white/10 h-11 rounded-xl" value={formData.fullMarks} onChange={(e) => setFormData({ ...formData, fullMarks: parseInt(e.target.value) || 0 })} /></div>
            <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Negative Marking</Label><Input type="number" step="0.01" className="bg-white/5 border-white/10 h-11 rounded-xl" value={formData.negativeMarks} onChange={(e) => setFormData({ ...formData, negativeMarks: parseFloat(e.target.value) || 0 })} /></div>
          </div>

          <div className="md:col-span-2 flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold">Public Content Asset</Label>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">Enable for free-tier student accessibility</p>
            </div>
            <Switch checked={formData.isFree} onCheckedChange={(v) => setFormData({ ...formData, isFree: v })} />
          </div>
        </div>

        <DialogFooter className="gap-3 pt-8">
          <Button variant="outline" onClick={onClose} disabled={isSaving} className="border-white/10 rounded-2xl h-12 flex-1">Discard</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white rounded-2xl flex-[2] h-12 font-bold shadow-xl shadow-primary/20 transition-all">
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Synchronize Module
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
