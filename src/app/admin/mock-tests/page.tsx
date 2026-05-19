
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
  const [filters, setFilters] = useState({ examId: "all", typeId: "all" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Fetch Exams
  const examsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "exams"), orderBy("name", "asc")) : null, 
  [db]);
  const { data: exams } = useCollection<any>(examsQuery);

  // Fetch Dynamic Mock Types
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
      const matchesSearch = (mock.title || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "all" || mock.status === activeTab;
      const matchesExam = filters.examId === "all" || mock.examId === filters.examId;
      const matchesType = filters.typeId === "all" || mock.typeId === filters.typeId;
      return matchesSearch && matchesTab && matchesExam && matchesType;
    });
  }, [mockTests, searchQuery, activeTab, filters]);

  const handleDeleteMock = async (id: string, title: string) => {
    if (!db || !user || !confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
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
              Ingest Content
            </Button>
          </Link>
          <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-primary text-white rounded-xl shadow-lg shadow-primary/20 h-10 md:h-11 font-bold">
            <Plus className="w-4 h-4 mr-2" />
            New Mock Series
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
              <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-lg", viewMode === "table" ? "bg-primary text-white shadow-lg" : "text-muted-foreground")} onClick={() => setViewMode("table")}><List className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-lg", viewMode === "grid" ? "bg-primary text-white shadow-lg" : "text-muted-foreground")} onClick={() => setViewMode("grid")}><LayoutGrid className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CONTENT */}
      {mocksLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-[10px] font-bold uppercase tracking-widest animate-pulse">Syncing Mock Library...</p>
        </div>
      ) : viewMode === "table" ? (
        <Card className="glass border-white/10 overflow-hidden shadow-xl">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Test Title & Exam</th>
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Hierarchy</th>
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] text-center">Config</th>
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Lifecycle</th>
                  <th className="p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredMocks.map((mock: any) => (
                  <tr key={mock.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-foreground text-sm md:text-base line-clamp-1">{mock.title}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-tight">{exams?.find((e: any) => e.id === mock.examId)?.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[9px] h-5">{mock.typeName}</Badge>
                        {mock.subTypeName && <ChevronRight className="w-3 h-3 text-muted-foreground opacity-30" />}
                        {mock.subTypeName && <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 text-[9px] h-5">{mock.subTypeName}</Badge>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-muted-foreground">
                        <div className="flex flex-col items-center"><span>Qs</span><span className="text-foreground">{mock.totalQuestions || 0}</span></div>
                        <div className="flex flex-col items-center"><span>Mins</span><span className="text-foreground">{mock.durationMinutes || 0}</span></div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={cn(
                        "h-6 font-bold uppercase text-[9px] tracking-widest", 
                        mock.status === 'Published' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      )}>{mock.status} {mock.isFree ? '(FREE)' : ''}</Badge>
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
                            <DropdownMenuItem className="gap-2 py-2" onClick={() => router.push(`/admin/upload-json?mockId=${mock.id}`)}><UploadCloud className="w-3.5 h-3.5 text-primary" /> Import Items</DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-rose-400 focus:text-rose-400 focus:bg-rose-500/10 gap-2 py-2" 
                              asChild
                            >
                              <button 
                                className="w-full text-left flex items-center"
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handleDeleteMock(mock.id, mock.title); 
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
                              </button>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredMocks.length === 0 && (
                  <tr><td colSpan={5} className="p-20 text-center text-muted-foreground italic">No mock tests found matching your criteria.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMocks.map((mock: any) => (
            <Card key={mock.id} className="glass border-white/10 p-6 flex flex-col gap-6 group hover:border-primary/50 transition-all duration-300 shadow-lg">
              <div className="flex justify-between items-start">
                <div className="flex flex-wrap gap-1.5 min-w-0">
                  <Badge className="bg-primary/20 text-primary text-[9px] uppercase tracking-widest border-primary/10">{mock.typeName}</Badge>
                  {mock.subTypeName && <Badge className="bg-accent/20 text-accent text-[9px] uppercase tracking-widest border-accent/10">{mock.subTypeName}</Badge>}
                </div>
                <Badge className={cn("h-5 text-[9px] font-bold uppercase", mock.status === 'Published' ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400")}>{mock.status}</Badge>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg group-hover:text-primary transition-colors line-clamp-2 min-h-[3.5rem] leading-tight">{mock.title}</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">
                  {exams?.find((e: any) => e.id === mock.examId)?.name}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                <div className="space-y-0.5"><p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Items</p><p className="text-xl font-headline font-bold">{mock.totalQuestions || 0}</p></div>
                <div className="space-y-0.5"><p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Minutes</p><p className="text-xl font-headline font-bold">{mock.durationMinutes || 0}</p></div>
              </div>
              <div className="flex justify-between items-center mt-auto">
                 <Button variant="ghost" className="h-10 px-4 rounded-xl text-xs font-bold gap-2 text-primary hover:bg-primary/10" onClick={() => router.push(`/admin/upload-json?mockId=${mock.id}`)}>
                   <UploadCloud className="w-4 h-4" /> Import Content
                 </Button>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-white/10 rounded-xl"><MoreVertical className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass border-white/10 w-44 p-1">
                       <DropdownMenuItem className="gap-2 py-2" onClick={() => { setEditingItem(mock); setIsModalOpen(true); }}><Edit2 className="w-3.5 h-3.5" /> Edit Settings</DropdownMenuItem>
                       <DropdownMenuItem 
                        className="gap-2 text-rose-400 focus:text-rose-400 focus:bg-rose-500/10 py-2" 
                        asChild
                       >
                         <button 
                          className="w-full text-left flex items-center"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleDeleteMock(mock.id, mock.title); 
                          }}
                         >
                           <Trash2 className="w-3.5 h-3.5" /> Delete Mock
                         </button>
                       </DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
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
        mockTypes={mockTypes || []} 
      />
    </div>
  );
}

function MockTestModal({ isOpen, onClose, editingItem, exams, mockTypes }: any) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
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
    db && formData.typeId 
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
      isFree: editingItem.isFree ?? true,
      status: editingItem.status || "Draft"
    });
    else setFormData({ title: "", slug: "", examId: "", typeId: "", typeName: "", subTypeId: "", subTypeName: "", durationMinutes: 90, totalQuestions: 100, totalMarks: 100, negativeMarks: 0.33, isFree: true, status: "Draft" });
  }, [editingItem, isOpen]);

  const handleSave = async () => {
    if (!db || !user || !formData.title.trim() || !formData.examId || !formData.typeId) {
      toast({ variant: "destructive", title: "Validation Error", description: "Title, Exam, and Mock Type are required." });
      return;
    }
    
    setIsSaving(true);
    try {
      const selectedExam = exams.find((e: any) => e.id === formData.examId);
      const selectedType = mockTypes.find((t: any) => t.id === formData.typeId);
      const selectedSubType = subTypes?.find((s: any) => s.id === formData.subTypeId);

      const data = {
        ...formData,
        typeName: selectedType?.title || "",
        subTypeName: selectedSubType?.title || "",
        updatedAt: serverTimestamp(),
        categoryId: selectedExam?.categoryId || "",
        categorySlug: selectedExam?.categorySlug || "",
        examSlug: selectedExam?.slug || "",
        slug: formData.slug.trim() || formData.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      };

      if (editingItem) {
        await updateDoc(doc(db, "mockTests", editingItem.id), data);
        await logAction(db, user, "update_mock", editingItem.id, "mock_test", `Updated: ${formData.title}`);
        toast({ title: "Updated", description: "Series configuration synchronized." });
      } else {
        const docRef = await addDoc(collection(db, "mockTests"), { ...data, createdAt: serverTimestamp() });
        await logAction(db, user, "create_mock", docRef.id, "mock_test", `Created: ${formData.title}`);
        toast({ title: "Created", description: "New mock series added to platform." });
      }
      onClose();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: error?.message });
    } finally { setIsSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="max-w-2xl glass border-white/10 max-h-[95vh] overflow-y-auto w-[95%] shadow-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline font-bold flex items-center gap-3">
             <Layers className="w-6 h-6 text-primary" />
             {editingItem ? "Edit Series Config" : "New Mock Series"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground uppercase text-[10px] tracking-widest font-bold">Configure core exam parameters</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-y border-white/5 mt-4">
          <div className="md:col-span-2 space-y-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Mock Series Title</Label>
            <Input className="bg-white/5 border-white/10 h-14 text-lg font-headline font-bold focus:border-primary/50" placeholder="e.g. SSC CGL 2024 Full Mock 12" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Target Exam Listing</Label>
            <Select value={formData.examId} onValueChange={(v) => setFormData({ ...formData, examId: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary/50"><SelectValue placeholder="Select Exam" /></SelectTrigger>
              <SelectContent className="glass border-white/10">
                {exams?.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Primary Mock Category</Label>
            <Select value={formData.typeId} onValueChange={(v) => setFormData({ ...formData, typeId: v, subTypeId: "", subTypeName: "" })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary/50"><SelectValue placeholder="Select Category" /></SelectTrigger>
              <SelectContent className="glass border-white/10">
                {mockTypes?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                <DropdownMenuSeparator className="bg-white/5" />
                <Button variant="ghost" size="sm" className="w-full text-primary justify-start px-2 h-9 text-[10px] font-bold" onClick={() => router.push('/admin/mock-types')}>+ Manage Hierarchy</Button>
              </SelectContent>
            </Select>
          </div>

          {formData.typeId && subTypes && subTypes.length > 0 && (
            <div className="md:col-span-2 space-y-2 animate-in slide-in-from-top-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Nested Subject / Chapter</Label>
              <Select value={formData.subTypeId} onValueChange={(v) => setFormData({ ...formData, subTypeId: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary/50"><SelectValue placeholder="All Subjects / Chapters" /></SelectTrigger>
                <SelectContent className="glass border-white/10">
                  <SelectItem value="none">None (Global Series)</SelectItem>
                  {subTypes.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                  <DropdownMenuSeparator className="bg-white/5" />
                  <Button variant="ghost" size="sm" className="w-full text-accent justify-start px-2 h-9 text-[10px] font-bold" onClick={() => router.push('/admin/mock-types')}>+ Add Subject</Button>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-3 md:col-span-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest text-center block">Mins</Label>
              <Input type="number" className="bg-white/5 border-white/10 h-11 text-center font-bold" value={formData.durationMinutes} onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest text-center block">Marks</Label>
              <Input type="number" className="bg-white/5 border-white/10 h-11 text-center font-bold" value={formData.totalMarks} onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest text-center block">Penalty</Label>
              <Input type="number" step="0.01" className="bg-white/5 border-white/10 h-11 text-center font-bold" value={formData.negativeMarks} onChange={(e) => setFormData({ ...formData, negativeMarks: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>

          <div className="md:col-span-2 flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/20 group hover:border-primary/40 transition-colors">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold block">Free Selection Accessibility</Label>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Allow non-premium users to attempt this module</p>
            </div>
            <Switch checked={formData.isFree} onCheckedChange={(val) => setFormData({ ...formData, isFree: val })} />
          </div>
        </div>

        <DialogFooter className="gap-3 pt-6">
          <Button variant="outline" onClick={onClose} disabled={isSaving} className="border-white/10 rounded-xl h-12 flex-1 font-bold">Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 rounded-xl h-12 flex-[2] font-bold shadow-xl shadow-primary/20">
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Synchronize Test Config
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
