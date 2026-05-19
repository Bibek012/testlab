
"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  UploadCloud,
  Clock,
  LayoutGrid,
  List,
  Copy,
  Loader2,
  Filter,
  Layers,
  ChevronRight
} from "lucide-react";

import {
  useFirestore,
  useCollection,
  useMemoFirebase,
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
  serverTimestamp,
  getDocs
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

export default function MockTestManagementPage() {
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [activeTab, setActiveTab] = useState<"all" | "Draft" | "Published">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ examId: "all", typeId: "all" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Fetch Exams
  const examsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "exams"), orderBy("name", "asc")) : null, 
  [db]);
  const { data: exams } = useCollection<any>(examsQuery);

  // Fetch Mock Types
  const typesQuery = useMemoFirebase(() => 
    db ? query(collection(db, "mockTypes"), where("deleted", "==", false), where("isActive", "==", true), orderBy("order", "asc")) : null,
  [db]);
  const { data: mockTypes } = useCollection<any>(typesQuery);

  // Fetch All Mock Tests
  const mockTestsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "mockTests"), orderBy("createdAt", "desc")) : null, 
  [db]);
  const { data: mockTests, loading: mocksLoading } = useCollection<any>(mockTestsQuery);

  const filteredMocks = useMemo(() => {
    if (!mockTests) return [];
    return mockTests.filter((mock: any) => {
      const matchesSearch = mock.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "all" || mock.status === activeTab;
      const matchesExam = filters.examId === "all" || mock.examId === filters.examId;
      const matchesType = filters.typeId === "all" || mock.typeId === filters.typeId;
      return matchesSearch && matchesTab && matchesExam && matchesType;
    });
  }, [mockTests, searchQuery, activeTab, filters]);

  const handleDeleteMock = async (id: string, title: string) => {
    if (!db || !confirm(`Are you sure you want to delete "${title}"?`)) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "mockTests", id));
      toast({ title: "Deleted Successfully" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: error?.message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicateMock = async (mock: any) => {
    if (!db) return;
    try {
      const { id, ...data } = mock;
      await addDoc(collection(db, "mockTests"), {
        ...data,
        title: `${data.title} (Copy)`,
        slug: `${data.slug}-copy`,
        status: "Draft",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Duplicated", description: "Mock test duplicated successfully" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Duplicate Failed", description: error?.message });
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Mock Test <span className="text-accent">Manager</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Create, edit, and orchestrate all exam-specific mock series.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <Link href="/admin/upload-json">
            <Button variant="outline" className="rounded-xl border-white/10 h-10 md:h-11">
              <UploadCloud className="w-4 h-4 mr-2" />
              Ingest JSON
            </Button>
          </Link>
          <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-primary text-white rounded-xl shadow-lg shadow-primary/20 h-10 md:h-11 font-bold">
            <Plus className="w-4 h-4 mr-2" />
            Create New Test
          </Button>
        </div>
      </div>

      {/* FILTERS */}
      <Card className="glass border-white/10">
        <CardContent className="p-4 flex flex-col xl:flex-row gap-4 items-center">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full xl:w-auto">
            <TabsList className="bg-white/5 border-white/10 grid grid-cols-3 w-full sm:w-auto">
              <TabsTrigger value="all" className="text-[10px] uppercase font-bold px-4">All</TabsTrigger>
              <TabsTrigger value="Draft" className="text-[10px] uppercase font-bold px-4">Draft</TabsTrigger>
              <TabsTrigger value="Published" className="text-[10px] uppercase font-bold px-4">Live</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative flex-1 w-full min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-10 bg-white/5 border-white/10 rounded-xl h-11" placeholder="Search tests by title..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>

          <div className="flex flex-wrap gap-2 w-full xl:w-auto shrink-0">
            <Select value={filters.examId} onValueChange={(v) => setFilters(prev => ({ ...prev, examId: v }))}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white/5 border-white/10 h-11 rounded-xl text-xs"><SelectValue placeholder="All Exams" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                {exams?.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.typeId} onValueChange={(v) => setFilters(prev => ({ ...prev, typeId: v }))}>
              <SelectTrigger className="w-full sm:w-[150px] bg-white/5 border-white/10 h-11 rounded-xl text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {mockTypes?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-lg", viewMode === "table" ? "bg-primary text-white" : "text-muted-foreground")} onClick={() => setViewMode("table")}><List className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-lg", viewMode === "grid" ? "bg-primary text-white" : "text-muted-foreground")} onClick={() => setViewMode("grid")}><LayoutGrid className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CONTENT */}
      {mocksLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest">Syncing Mock Library...</p>
        </div>
      ) : viewMode === "table" ? (
        <Card className="glass border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Test Title & Exam</th>
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Hierarchy</th>
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] text-center">Stats</th>
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Status</th>
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredMocks.map((mock: any) => (
                  <tr key={mock.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground text-sm">{mock.title}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{exams?.find((e: any) => e.id === mock.examId)?.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[9px] h-5">{mock.typeName || mock.type}</Badge>
                        {mock.subTypeName && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                        {mock.subTypeName && <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 text-[9px] h-5">{mock.subTypeName}</Badge>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-muted-foreground">
                        <div className="flex flex-col items-center"><span>Qs</span><span className="text-foreground">{mock.totalQuestions}</span></div>
                        <div className="flex flex-col items-center"><span>Mins</span><span className="text-foreground">{mock.durationMinutes}</span></div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={cn("h-6", mock.status === 'Published' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>{mock.status}</Badge>
                    </td>
                    <td className="p-4 text-right">
                      {deletingId === mock.id ? (
                        <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass border-white/10 w-48">
                            <DropdownMenuItem className="gap-2" onClick={() => { setEditingItem(mock); setIsModalOpen(true); }}><Edit2 className="w-3.5 h-3.5" /> Edit Configuration</DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => handleDuplicateMock(mock)}><Copy className="w-3.5 h-3.5" /> Duplicate Test</DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem className="gap-2" onClick={() => router.push(`/admin/upload-json?mockId=${mock.id}`)}><UploadCloud className="w-3.5 h-3.5 text-primary" /> Upload Questions</DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive gap-2" 
                              onSelect={(e) => { 
                                e.preventDefault(); 
                                handleDeleteMock(mock.id, mock.title); 
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete Mock
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredMocks.length === 0 && (
                  <tr><td colSpan={5} className="p-20 text-center text-muted-foreground italic">No mock tests found matching your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMocks.map((mock: any) => (
            <Card key={mock.id} className="glass border-white/10 p-6 flex flex-col gap-6 group hover:border-primary/50 transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className="flex flex-wrap gap-1.5">
                  <Badge className="bg-primary/20 text-primary text-[9px] uppercase tracking-widest">{mock.typeName || mock.type}</Badge>
                  {mock.subTypeName && <Badge className="bg-accent/20 text-accent text-[9px] uppercase tracking-widest">{mock.subTypeName}</Badge>}
                </div>
                <Badge className={cn("h-5 text-[9px]", mock.status === 'Published' ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400")}>{mock.status}</Badge>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg group-hover:text-primary transition-colors line-clamp-1">{mock.title}</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                  {exams?.find((e: any) => e.id === mock.examId)?.name}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                <div className="space-y-0.5"><p className="text-[9px] text-muted-foreground uppercase font-bold">Questions</p><p className="text-xl font-headline font-bold">{mock.totalQuestions}</p></div>
                <div className="space-y-0.5"><p className="text-[9px] text-muted-foreground uppercase font-bold">Duration</p><p className="text-xl font-headline font-bold">{mock.durationMinutes}m</p></div>
              </div>
              <div className="flex justify-between items-center mt-auto">
                 <Button variant="ghost" className="h-9 px-4 rounded-xl text-xs font-bold gap-2 text-primary" onClick={() => router.push(`/admin/upload-json?mockId=${mock.id}`)}>
                   <UploadCloud className="w-4 h-4" /> Add Questions
                 </Button>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/10"><MoreVertical className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass border-white/10">
                       <DropdownMenuItem className="gap-2" onClick={() => { setEditingItem(mock); setIsModalOpen(true); }}><Edit2 className="w-3.5 h-3.5" /> Edit</DropdownMenuItem>
                       <DropdownMenuItem 
                        className="gap-2 text-destructive" 
                        onSelect={(e) => { 
                          e.preventDefault(); 
                          handleDeleteMock(mock.id, mock.title); 
                        }}
                       >
                         <Trash2 className="w-3.5 h-3.5" /> Delete
                       </DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      <MockTestModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editingItem={editingItem} exams={exams || []} mockTypes={mockTypes || []} />
    </div>
  );
}

function MockTestModal({ isOpen, onClose, editingItem, exams, mockTypes }: any) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({
    title: "",
    slug: "",
    examId: "",
    typeId: "",
    typeName: "",
    subTypeId: "",
    subTypeName: "",
    durationMinutes: 90,
    totalQuestions: 100,
    totalMarks: 100,
    negativeMarks: 0.33,
    isFree: true,
    status: "Draft",
  });

  // Fetch Sub-Types for selected Type
  const subTypesQuery = useMemoFirebase(() => 
    db && formData.typeId && formData.typeId !== "new"
      ? query(collection(db, "mockTypes", formData.typeId, "subTypes"), where("deleted", "==", false), where("isActive", "==", true), orderBy("order", "asc")) 
      : null,
  [db, formData.typeId]);
  const { data: subTypes } = useCollection<any>(subTypesQuery);

  React.useEffect(() => {
    if (editingItem) setFormData({
      ...editingItem,
      title: editingItem.title || "",
      slug: editingItem.slug || "",
      examId: editingItem.examId || "",
      typeId: editingItem.typeId || "",
      subTypeId: editingItem.subTypeId || "",
      durationMinutes: editingItem.durationMinutes ?? 90,
      totalQuestions: editingItem.totalQuestions ?? 100,
      totalMarks: editingItem.totalMarks ?? 100,
      negativeMarks: editingItem.negativeMarks ?? 0.33,
    });
    else setFormData({ title: "", slug: "", examId: "", typeId: "", typeName: "", subTypeId: "", subTypeName: "", durationMinutes: 90, totalQuestions: 100, totalMarks: 100, negativeMarks: 0.33, isFree: true, status: "Draft" });
  }, [editingItem, isOpen]);

  const handleSave = async () => {
    if (!db || !formData.title || !formData.examId || !formData.typeId) return;
    setIsSaving(true);
    try {
      const selectedExam = exams.find((e: any) => e.id === formData.examId);
      const selectedType = mockTypes.find((t: any) => t.id === formData.typeId);
      const selectedSubType = subTypes?.find((s: any) => s.id === formData.subTypeId);

      const data = {
        ...formData,
        typeName: selectedType?.title || formData.typeName,
        subTypeName: selectedSubType?.title || (formData.subTypeId ? formData.subTypeName : ""),
        updatedAt: serverTimestamp(),
        categoryId: selectedExam?.categoryId || "",
        categorySlug: selectedExam?.categorySlug || "",
        examSlug: selectedExam?.slug || "",
        slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      };

      if (editingItem) {
        await updateDoc(doc(db, "mockTests", editingItem.id), data);
        toast({ title: "Updated", description: "Mock test updated successfully" });
      } else {
        await addDoc(collection(db, "mockTests"), { ...data, createdAt: serverTimestamp() });
        toast({ title: "Created", description: "Mock test created successfully" });
      }
      onClose();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Failed", description: error?.message });
    } finally { setIsSaving(false); }
  };

  const createNewType = async () => {
    const title = prompt("Enter new Mock Type name (e.g. Revision Test):");
    if (!title || !db) return;
    try {
      const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const docRef = await addDoc(collection(db, "mockTypes"), { title, slug, deleted: false, isActive: true, order: Date.now(), createdAt: serverTimestamp() });
      setFormData((prev: any) => ({ ...prev, typeId: docRef.id, typeName: title }));
      toast({ title: "New type created" });
    } catch (e: any) { toast({ variant: "destructive", title: "Failed", description: e.message }); }
  };

  const createNewSubType = async () => {
    const title = prompt("Enter new Sub-Type / Subject name (e.g. Algebra):");
    if (!title || !db || !formData.typeId) return;
    try {
      const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const docRef = await addDoc(collection(db, "mockTypes", formData.typeId, "subTypes"), { title, slug, deleted: false, isActive: true, order: Date.now(), createdAt: serverTimestamp() });
      setFormData((prev: any) => ({ ...prev, subTypeId: docRef.id, subTypeName: title }));
      toast({ title: "New sub-type created" });
    } catch (e: any) { toast({ variant: "destructive", title: "Failed", description: e.message }); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl glass border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editingItem ? "Edit Mock Configuration" : "New Mock Test Series"}</DialogTitle></DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
          <div className="md:col-span-2 space-y-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Mock Title</Label>
            <Input className="bg-white/5 border-white/10 h-12 text-lg font-headline font-bold" value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Target Exam</Label>
            <Select value={formData.examId || ""} onValueChange={(v) => setFormData({ ...formData, examId: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-11"><SelectValue placeholder="Select Exam" /></SelectTrigger>
              <SelectContent>
                {exams?.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Mock Category</Label>
            <div className="flex gap-2">
              <Select value={formData.typeId || ""} onValueChange={(v) => setFormData({ ...formData, typeId: v, subTypeId: "", subTypeName: "" })}>
                <SelectTrigger className="bg-white/5 border-white/10 h-11 flex-1"><SelectValue placeholder="Primary Type" /></SelectTrigger>
                <SelectContent>
                  {mockTypes?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                  <DropdownMenuSeparator className="bg-white/5" />
                  <Button variant="ghost" size="sm" className="w-full text-primary justify-start px-2 h-8 text-[10px]" onClick={createNewType}>+ Create New Type</Button>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.typeId && (subTypes?.length > 0 || formData.typeId === "new") && (
            <div className="space-y-2 animate-in slide-in-from-top-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Sub-Type / Subject</Label>
              <Select value={formData.subTypeId || ""} onValueChange={(v) => setFormData({ ...formData, subTypeId: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 h-11"><SelectValue placeholder="Select Sub-Type" /></SelectTrigger>
                <SelectContent>
                  {subTypes?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                  <DropdownMenuSeparator className="bg-white/5" />
                  <Button variant="ghost" size="sm" className="w-full text-accent justify-start px-2 h-8 text-[10px]" onClick={createNewSubType}>+ Create New Sub-Type</Button>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Time (Minutes)</Label>
            <Input type="number" className="bg-white/5 border-white/10 h-11" value={formData.durationMinutes ?? 0} onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })} />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Total Marks</Label>
            <Input type="number" className="bg-white/5 border-white/10 h-11" value={formData.totalMarks ?? 0} onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) || 0 })} />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Negative Marks</Label>
            <Input type="number" step="0.01" className="bg-white/5 border-white/10 h-11" value={formData.negativeMarks ?? 0} onChange={(e) => setFormData({ ...formData, negativeMarks: parseFloat(e.target.value) || 0 })} />
          </div>

          <div className="md:col-span-2 flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 group hover:border-primary/30 transition-colors">
            <div>
              <Label className="text-sm font-bold">Public & Free Accessibility</Label>
              <p className="text-[10px] text-muted-foreground">Allow non-premium users to attempt this module.</p>
            </div>
            <Switch checked={formData.isFree ?? true} onCheckedChange={(val) => setFormData({ ...formData, isFree: val })} />
          </div>
        </div>

        <DialogFooter className="gap-3 pt-6 border-t border-white/5">
          <Button variant="outline" onClick={onClose} className="border-white/10 rounded-xl h-11 px-8">Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 rounded-xl h-11 px-10 font-bold shadow-lg shadow-primary/20">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Sync Test Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
