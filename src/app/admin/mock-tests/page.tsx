
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
  FolderPlus
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
  where,
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
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Mock Test <span className="text-accent">Manager</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Orchestrate exam-specific mock series with hierarchical mapping.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <Link href="/admin/upload-json">
            <Button variant="outline" className="rounded-xl border-white/10 h-10 md:h-11">
              <UploadCloud className="w-4 h-4 mr-2" /> Ingest Content
            </Button>
          </Link>
          <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-primary text-white rounded-xl shadow-lg shadow-primary/20 h-10 md:h-11 font-bold">
            <Plus className="w-4 h-4 mr-2" /> New Mock Series
          </Button>
        </div>
      </div>

      <Card className="glass border-white/10">
        <CardContent className="p-4 flex flex-col xl:flex-row gap-4 items-center">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full xl:w-auto">
            <TabsList className="bg-white/5 border-white/10">
              <TabsTrigger value="all" className="text-[10px] uppercase font-bold">All</TabsTrigger>
              <TabsTrigger value="Draft" className="text-[10px] uppercase font-bold">Draft</TabsTrigger>
              <TabsTrigger value="Published" className="text-[10px] uppercase font-bold">Live</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-10 bg-white/5 border-white/10 rounded-xl h-11" placeholder="Search tests by title..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
            <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-lg", viewMode === "table" ? "bg-primary text-white shadow-lg" : "text-muted-foreground")} onClick={() => setViewMode("table")}><List className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-lg", viewMode === "grid" ? "bg-primary text-white shadow-lg" : "text-muted-foreground")} onClick={() => setViewMode("grid")}><LayoutGrid className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {mocksLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-[10px] font-bold uppercase tracking-widest animate-pulse">Syncing Library...</p>
        </div>
      ) : viewMode === "table" ? (
        <Card className="glass border-white/10 overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Test Title & Exam</th>
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Mapping</th>
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] text-center">Config</th>
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Lifecycle</th>
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredMocks.map((mock: any) => (
                  <tr key={mock.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground text-sm">{mock.title}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{mock.examName || 'Generic'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[9px] h-5">{mock.typeName}</Badge>
                        {mock.subTypeName && <ChevronRight className="w-3 h-3 text-muted-foreground opacity-30" />}
                        {mock.subTypeName && <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 text-[9px] h-5">{mock.subTypeName}</Badge>}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                       <span className="text-[10px] font-bold text-muted-foreground">{mock.totalQuestions} Qs • {mock.durationMinutes}m</span>
                    </td>
                    <td className="p-4">
                      <Badge className={cn(
                        "h-6 font-bold uppercase text-[9px] tracking-widest", 
                        mock.status === 'Published' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                      )}>{mock.status}</Badge>
                    </td>
                    <td className="p-4 text-right">
                      {deletingId === mock.id ? (
                        <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10 rounded-lg"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass border-white/10 w-48 p-1">
                            <DropdownMenuItem className="gap-2 py-2" onClick={() => { setEditingItem(mock); setIsModalOpen(true); }}><Edit2 className="w-3.5 h-3.5" /> Edit Config</DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 py-2" onClick={() => handleDuplicateMock(mock)}><Copy className="w-3.5 h-3.5" /> Duplicate</DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem 
                              className="text-rose-400 focus:text-rose-400 focus:bg-rose-500/10 gap-2 py-2" 
                              onSelect={(e) => { e.preventDefault(); if (confirm(`Delete ${mock.title}?`)) handleDeleteMock(mock.id, mock.title); }}
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Delete Mock
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMocks.map((mock: any) => (
            <Card key={mock.id} className="glass border-white/10 p-6 flex flex-col gap-6 group hover:border-primary/50 transition-all shadow-lg">
              <div className="flex justify-between items-start">
                <Badge className="bg-primary/20 text-primary text-[9px] uppercase tracking-widest">{mock.typeName}</Badge>
                <Badge className={cn("h-5 text-[9px] font-bold uppercase", mock.status === 'Published' ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400")}>{mock.status}</Badge>
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight mb-1">{mock.title}</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{mock.examName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                <div className="space-y-0.5"><p className="text-[9px] text-muted-foreground uppercase font-bold">Items</p><p className="text-xl font-bold">{mock.totalQuestions}</p></div>
                <div className="space-y-0.5"><p className="text-[9px] text-muted-foreground uppercase font-bold">Mins</p><p className="text-xl font-bold">{mock.durationMinutes}</p></div>
              </div>
              <div className="flex justify-end gap-2">
                 <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white/10" onClick={() => { setEditingItem(mock); setIsModalOpen(true); }}><Edit2 className="w-4 h-4" /></Button>
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="h-9 w-9 rounded-xl hover:bg-rose-500/10 text-rose-400"
                   onClick={() => { if (confirm(`Delete ${mock.title}?`)) handleDeleteMock(mock.id, mock.title); }}
                 ><Trash2 className="w-4 h-4" /></Button>
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
    if (editingItem) setFormData({ ...editingItem });
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
      <DialogContent className="max-w-2xl glass border-white/10 max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline font-bold">
             {editingItem ? "Edit Series Configuration" : "New Mock Series"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-y border-white/5 mt-4">
          <div className="md:col-span-2 space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Series Title</Label>
            <Input className="bg-white/5 border-white/10 h-12 text-lg font-bold" placeholder="e.g. SSC CGL 2024 Tier-1 Mock 01" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Target Exam</Label>
            <Select value={formData.examId} onValueChange={(v) => setFormData({ ...formData, examId: v, typeId: "", subTypeId: "" })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-11 rounded-xl"><SelectValue placeholder="Select Exam" /></SelectTrigger>
              <SelectContent>
                {exams?.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Mock Type</Label>
              {formData.examId && (
                <button onClick={() => setIsAddingType(true)} className="text-[10px] text-primary font-bold hover:underline">+ Add New</button>
              )}
            </div>
            {isAddingType ? (
              <div className="flex gap-2 animate-in slide-in-from-top-1">
                <Input size="sm" className="h-9 text-xs" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Type name..." />
                <Button size="sm" onClick={handleAddType} className="h-9 px-2"><PlusCircle className="w-4 h-4" /></Button>
              </div>
            ) : (
              <Select value={formData.typeId} onValueChange={(v) => setFormData({ ...formData, typeId: v, subTypeId: "" })} disabled={!formData.examId}>
                <SelectTrigger className="bg-white/5 border-white/10 h-11 rounded-xl"><SelectValue placeholder="Select Type" /></SelectTrigger>
                <SelectContent>
                  {mockTypes?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {formData.typeId && (
            <div className="md:col-span-2 space-y-2 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nested Subject / Chapter</Label>
                <button onClick={() => setIsAddingSubType(true)} className="text-[10px] text-primary font-bold hover:underline">+ Add New</button>
              </div>
              {isAddingSubType ? (
                <div className="flex gap-2">
                  <Input size="sm" className="h-9 text-xs" value={newSubTypeName} onChange={(e) => setNewSubTypeName(e.target.value)} placeholder="Subject name..." />
                  <Button size="sm" onClick={handleAddSubType} className="h-9 px-2"><FolderPlus className="w-4 h-4" /></Button>
                </div>
              ) : (
                <Select value={formData.subTypeId} onValueChange={(v) => setFormData({ ...formData, subTypeId: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-11 rounded-xl"><SelectValue placeholder="All Subjects / Chapters" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (General Test)</SelectItem>
                    {subTypes?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 md:col-span-2 gap-4">
            <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Mins</Label><Input type="number" className="bg-white/5 border-white/10" value={formData.durationMinutes} onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })} /></div>
            <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Marks</Label><Input type="number" className="bg-white/5 border-white/10" value={formData.fullMarks} onChange={(e) => setFormData({ ...formData, fullMarks: parseInt(e.target.value) || 0 })} /></div>
            <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Neg.</Label><Input type="number" step="0.01" className="bg-white/5 border-white/10" value={formData.negativeMarks} onChange={(e) => setFormData({ ...formData, negativeMarks: parseFloat(e.target.value) || 0 })} /></div>
          </div>

          <div className="md:col-span-2 flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold">Public Accessibility</Label>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Allow free-tier users to attempt this module</p>
            </div>
            <Switch checked={formData.isFree} onCheckedChange={(v) => setFormData({ ...formData, isFree: v })} />
          </div>
        </div>

        <DialogFooter className="gap-3 pt-6">
          <Button variant="outline" onClick={onClose} disabled={isSaving} className="border-white/10 flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 rounded-xl flex-[2] font-bold shadow-xl shadow-primary/20">
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Sync Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
