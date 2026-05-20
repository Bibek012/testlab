
"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  UploadCloud,
  LayoutGrid,
  List,
  Copy,
  Loader2,
  Layers,
  ChevronRight,
  PlusCircle,
  FolderPlus,
  AlertCircle,
  Eye
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
  serverTimestamp,
  getDocs,
  where
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    if (!window.confirm(`Confirm permanent deletion of "${title}"?`)) return;

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
    <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 px-2 md:px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-headline font-bold tracking-tight">Mock Test <span className="text-accent">Manager</span></h1>
          <p className="text-muted-foreground text-xs mt-0.5">Orchestrate exam-specific mock series with hierarchical mapping.</p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
          <Link href="/admin/upload-json" className="flex-1 sm:flex-none">
            <Button variant="outline" size="sm" className="w-full rounded-lg border-white/10 h-9 text-xs">
              <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Ingest Content
            </Button>
          </Link>
          <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} size="sm" className="flex-1 sm:flex-none bg-primary text-white rounded-lg shadow-md shadow-primary/10 h-9 text-xs font-semibold">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Mock Series
          </Button>
        </div>
      </div>

      <Card className="glass border-white/5 shadow-md overflow-hidden">
        <CardContent className="p-2 md:p-3 flex flex-col md:flex-row gap-3 items-center">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full md:w-auto">
            <TabsList className="bg-white/5 border-white/5 h-9 p-0.5">
              <TabsTrigger value="all" className="px-3 text-[10px] uppercase font-bold tracking-wider h-8">All</TabsTrigger>
              <TabsTrigger value="Draft" className="px-3 text-[10px] uppercase font-bold tracking-wider h-8">Draft</TabsTrigger>
              <TabsTrigger value="Published" className="px-3 text-[10px] uppercase font-bold tracking-wider h-8">Live</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70" />
            <Input className="pl-9 bg-white/5 border-white/5 rounded-lg h-9 text-xs focus-visible:ring-primary/30" placeholder="Search tests by title..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>

          <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5 shrink-0 ml-auto md:ml-0 self-end md:self-auto">
            <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-md transition-all", viewMode === "table" ? "bg-white/10 text-white shadow" : "text-muted-foreground")} onClick={() => setViewMode("table")}><List className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-md transition-all", viewMode === "grid" ? "bg-white/10 text-white shadow" : "text-muted-foreground")} onClick={() => setViewMode("grid")}><LayoutGrid className="w-3.5 h-3.5" /></Button>
          </div>
        </CardContent>
      </Card>

      {mocksLoading ? (
        <div className="h-48 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-[9px] font-bold uppercase tracking-widest animate-pulse text-muted-foreground/80">Syncing Library Hierarchy...</p>
        </div>
      ) : viewMode === "table" ? (
        <Card className="glass border-white/5 overflow-hidden shadow-lg rounded-xl">
          <div className="overflow-x-auto w-full custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="py-3 px-4 font-semibold text-muted-foreground/80 uppercase tracking-wider text-[9px] w-[40%]">Test Title & Exam</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground/80 uppercase tracking-wider text-[9px] w-[20%]">Mapping</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground/80 uppercase tracking-wider text-[9px] text-center w-[15%]">Scoring</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground/80 uppercase tracking-wider text-[9px] w-[10%]">Lifecycle</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground/80 uppercase tracking-wider text-[9px] text-right w-[15%]">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredMocks.map((mock: any) => (
                  <tr key={mock.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground text-sm tracking-tight leading-snug group-hover:text-primary transition-colors line-clamp-1">{mock.title}</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                           <span className="text-[9px] text-zinc-500 font-mono">ID: {mock.id?.slice(0, 8)}</span>
                           <span className="text-[10px] text-primary/80 font-medium tracking-wide uppercase">{mock.examName || 'Generic'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="bg-white/5 text-zinc-300 border-white/5 text-[9px] px-1.5 font-medium">{mock.typeName || 'Full Test'}</Badge>
                        {mock.subTypeName && <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
                        {mock.subTypeName && <Badge variant="outline" className="bg-accent/5 text-accent border-accent/10 text-[9px] px-1.5 font-medium">{mock.subTypeName}</Badge>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                       <div className="inline-flex flex-col items-center">
                          <span className="text-xs font-semibold text-foreground">{mock.fullMarks || 0} Marks</span>
                          <span className="text-[9px] text-muted-foreground/70">{mock.totalQuestions} Qs • {mock.marksPerQuestion || 1} ea</span>
                       </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={cn(
                        "h-5 font-semibold text-[9px] px-2 gap-1 rounded-md", 
                        mock.status === 'Published' ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20" : "bg-amber-500/5 text-amber-400 border-amber-500/20"
                      )}>
                        {mock.status === 'Published' ? 'Live' : mock.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                       <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/5" onClick={() => { setEditingItem(mock); setIsModalOpen(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Edit Configuration</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/5" onClick={() => handleDuplicateMock(mock)}><Copy className="w-3.5 h-3.5" /></Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Duplicate</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-rose-500/10 text-rose-400" onClick={() => handleDeleteMock(mock.id, mock.title)} disabled={deletingId === mock.id}>
                                  {deletingId === mock.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Delete Forever</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMocks.map((mock: any) => (
            <Card key={mock.id} className="glass border-white/5 p-4 flex flex-col gap-4 group hover:border-primary/30 transition-all duration-300 shadow-md relative overflow-hidden rounded-xl">
              <div className="flex justify-between items-center">
                <Badge className="bg-white/5 text-zinc-300 text-[9px] px-1.5 h-5">{mock.typeName || "Full Test"}</Badge>
                <Badge className={cn("h-5 text-[9px] px-1.5 rounded-md", mock.status === 'Published' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>{mock.status}</Badge>
              </div>
              
              <div className="space-y-0.5">
                <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2 min-h-[2.5rem]">{mock.title}</h3>
                <p className="text-[9px] text-primary/80 font-medium tracking-wide uppercase">{mock.examName}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 py-2 border-y border-white/5 text-xs">
                <div className="space-y-0.5"><p className="text-[9px] text-muted-foreground uppercase">Max Marks</p><p className="text-base font-bold">{mock.fullMarks}</p></div>
                <div className="space-y-0.5 border-l border-white/5 pl-3"><p className="text-[9px] text-muted-foreground uppercase">Duration</p><p className="text-base font-bold">{mock.durationMinutes} m</p></div>
              </div>

              <div className="flex justify-end gap-1.5 mt-auto pt-1">
                 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-white/5" onClick={() => { setEditingItem(mock); setIsModalOpen(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-rose-500/10 text-rose-400" onClick={() => handleDeleteMock(mock.id, mock.title)} disabled={deletingId === mock.id}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </Card>
          ))}
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
    marksPerQuestion: 1,
    negativeMarks: 0.33,
    isFree: true,
    status: "Draft",
  });

  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [isAddingSubType, setIsAddingSubType] = useState(false);
  const [newSubTypeName, setNewSubTypeName] = useState("");

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
    if (editingItem) {
      setFormData({ 
        title: editingItem.title || "",
        examId: editingItem.examId || "",
        examName: editingItem.examName || "",
        typeId: editingItem.typeId || "",
        typeName: editingItem.typeName || "",
        subTypeId: editingItem.subTypeId || "",
        subTypeName: editingItem.subTypeName || "",
        durationMinutes: editingItem.durationMinutes || 90,
        totalQuestions: editingItem.totalQuestions || 100,
        marksPerQuestion: editingItem.marksPerQuestion || 1,
        negativeMarks: editingItem.negativeMarks || 0.33,
        isFree: editingItem.isFree ?? true,
        status: editingItem.status || "Draft"
      });
    } else {
      setFormData({ title: "", examId: "", examName: "", typeId: "", typeName: "", subTypeId: "", subTypeName: "", durationMinutes: 90, totalQuestions: 100, marksPerQuestion: 1, negativeMarks: 0.33, isFree: true, status: "Draft" });
    }
    setIsAddingType(false);
    setIsAddingSubType(false);
  }, [editingItem, isOpen]);

  const handleAddType = async () => {
    if (!db || !formData.examId || !newTypeName.trim()) return;
    try {
      const slug = newTypeName.toLowerCase().replace(/\s+/g, '-');
      const docRef = await addDoc(collection(db, "exams", formData.examId, "mockTypes"), {
        title: newTypeName,
        slug,
        order: Date.now(),
        isActive: true,
        createdAt: serverTimestamp()
      });
      setFormData((prev: any) => ({ ...prev, typeId: docRef.id, typeName: newTypeName }));
      setNewTypeName("");
      setIsAddingType(false);
      toast({ title: "Type Added" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleAddSubType = async () => {
    if (!db || !formData.examId || !formData.typeId || !newSubTypeName.trim()) return;
    try {
      const slug = newSubTypeName.toLowerCase().replace(/\s+/g, '-');
      const docRef = await addDoc(collection(db, "exams", formData.examId, "mockTypes", formData.typeId, "subTypes"), {
        title: newSubTypeName,
        slug,
        order: Date.now(),
        isActive: true
      });
      setFormData((prev: any) => ({ ...prev, subTypeId: docRef.id, subTypeName: newSubTypeName }));
      setNewSubTypeName("");
      setIsAddingSubType(false);
      toast({ title: "Subject Added" });
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

      // Auto-calculate full marks for standardized schema
      const fullMarks = (formData.totalQuestions || 0) * (formData.marksPerQuestion || 1);

      const data = {
        ...formData,
        examName: selectedExam?.name || "",
        typeName: selectedType?.title || "",
        subTypeName: selectedSubType?.title || "",
        fullMarks,
        hierarchyPath: `${selectedExam?.name} > ${selectedType?.title || 'General'}${selectedSubType ? ` > ${selectedSubType.title}` : ''}`,
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
      toast({ title: "Synchronized Successfully" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally { setIsSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg glass border-white/10 max-h-[90vh] overflow-y-auto p-5">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
             {editingItem ? "Edit Configuration" : "New Mock Series"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-y border-white/5 mt-4">
          <div className="md:col-span-2 space-y-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground/80">Series Title</Label>
            <Input className="bg-white/5 border-white/10 h-10" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground/80">Examination</Label>
            <Select value={formData.examId} onValueChange={(v) => setFormData({ ...formData, examId: v, typeId: "", subTypeId: "" })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-10"><SelectValue placeholder="Select Exam" /></SelectTrigger>
              <SelectContent className="glass">
                {exams?.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground/80">Mock Category</Label>
              <button onClick={() => setIsAddingType(true)} className="text-[10px] text-primary hover:underline">+ New</button>
            </div>
            {isAddingType ? (
              <div className="flex gap-1">
                <Input size="sm" className="h-10 text-xs bg-white/10" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Type name..." />
                <Button size="sm" onClick={handleAddType} className="h-10 w-10 p-0"><PlusCircle className="w-4 h-4" /></Button>
              </div>
            ) : (
              <Select value={formData.typeId} onValueChange={(v) => setFormData({ ...formData, typeId: v, subTypeId: "" })} disabled={!formData.examId}>
                <SelectTrigger className="bg-white/5 border-white/10 h-10"><SelectValue placeholder="Select Type" /></SelectTrigger>
                <SelectContent className="glass">
                  {mockTypes?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {formData.typeId && (
            <div className="md:col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground/80">Subject Focus</Label>
                <button onClick={() => setIsAddingSubType(true)} className="text-[10px] text-primary hover:underline">+ New</button>
              </div>
              {isAddingSubType ? (
                <div className="flex gap-1">
                  <Input size="sm" className="h-10 text-xs bg-white/10" value={newSubTypeName} onChange={(e) => setNewSubTypeName(e.target.value)} placeholder="Subject..." />
                  <Button size="sm" onClick={handleAddSubType} className="h-10 w-10 p-0"><FolderPlus className="w-4 h-4" /></Button>
                </div>
              ) : (
                <Select value={formData.subTypeId} onValueChange={(v) => setFormData({ ...formData, subTypeId: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-10"><SelectValue placeholder="All Subjects" /></SelectTrigger>
                  <SelectContent className="glass">
                    {subTypes?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:col-span-2 gap-3">
            <div className="space-y-1">
               <Label className="text-[10px] uppercase font-bold text-muted-foreground/80">Marks per Q</Label>
               <Input type="number" step="0.5" className="bg-white/5 border-white/10 h-10" value={formData.marksPerQuestion} onChange={(e) => setFormData({ ...formData, marksPerQuestion: parseFloat(e.target.value) || 1 })} />
            </div>
            <div className="space-y-1">
               <Label className="text-[10px] uppercase font-bold text-muted-foreground/80">Negative Marks</Label>
               <Input type="number" step="0.01" className="bg-white/5 border-white/10 h-10" value={formData.negativeMarks} onChange={(e) => setFormData({ ...formData, negativeMarks: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:col-span-2 gap-3">
            <div className="space-y-1">
               <Label className="text-[10px] uppercase font-bold text-muted-foreground/80">Total Questions</Label>
               <Input type="number" className="bg-white/5 border-white/10 h-10" value={formData.totalQuestions} onChange={(e) => setFormData({ ...formData, totalQuestions: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
               <Label className="text-[10px] uppercase font-bold text-muted-foreground/80">Duration (m)</Label>
               <Input type="number" className="bg-white/5 border-white/10 h-10" value={formData.durationMinutes} onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })} />
            </div>
          </div>

          <div className="md:col-span-2 flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold">Free Test</Label>
              <p className="text-[10px] text-muted-foreground">Accessible without premium plan</p>
            </div>
            <Switch checked={formData.isFree} onCheckedChange={(v) => setFormData({ ...formData, isFree: v })} />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving} className="border-white/5 flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white flex-[2]">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Sync Metadata
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
