
"use client";

import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  FileText, 
  UploadCloud,
  CheckCircle2, 
  Clock,
  LayoutGrid,
  List,
  Copy,
  Eye,
  ChevronDown
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  getDocs
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogDescription,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const MOCK_TYPES = ["Full Test", "Subject Test", "Chapter Test", "Previous Year", "Daily Quiz", "Mini Mock"];
const STATUS_OPTIONS = ["Draft", "Published", "Hidden", "Scheduled"];

export default function MockTestManagementPage() {
  const db = useFirestore();
  
  // Data fetching stabilized with useMemoFirebase
  const categoriesQuery = useMemoFirebase(() => 
    db ? query(collection(db, "examCategories"), orderBy("title", "asc")) : null, 
  [db]);
  const { data: categories } = useCollection(categoriesQuery);

  const examsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "exams"), orderBy("name", "asc")) : null, 
  [db]);
  const { data: exams } = useCollection(examsQuery);

  const mockTestsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "mockTests"), orderBy("createdAt", "desc")) : null, 
  [db]);
  const { data: mockTests, loading: mocksLoading } = useCollection(mockTestsQuery);

  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [activeTab, setActiveTab] = useState<"all" | "Draft" | "Published">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ categoryId: "all", examId: "all", type: "all" });
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Computed lists
  const filteredMocks = useMemo(() => {
    if (!mockTests) return [];
    return mockTests.filter(mock => {
      const matchesSearch = mock.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           mock.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "all" || mock.status === activeTab;
      const matchesCategory = filters.categoryId === "all" || mock.categoryId === filters.categoryId;
      const matchesExam = filters.examId === "all" || mock.examId === filters.examId;
      const matchesType = filters.type === "all" || mock.type === filters.type;
      
      return matchesSearch && matchesTab && matchesCategory && matchesExam && matchesType;
    });
  }, [mockTests, searchQuery, activeTab, filters]);

  const handleDeleteMock = async (id: string) => {
    if (!db || !confirm("Are you sure you want to delete this mock test? This will not delete the questions but will unlink them.")) return;
    try {
      await deleteDoc(doc(db, "mockTests", id));
    } catch (e) {
      console.error("Error deleting mock:", e);
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: "Draft"
      });
    } catch (e) {
      console.error("Error duplicating mock:", e);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Mock <span className="text-accent">Tests</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Design, configure and manage your examination library.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="border-white/10 hover:bg-white/5 rounded-xl gap-2 h-11"
            onClick={() => {/* Bulk logic placeholder */}}
          >
            <UploadCloud className="w-4 h-4" />
            Bulk Create
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 h-11 shadow-lg shadow-primary/20"
            onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
          >
            <Plus className="w-4 h-4" />
            Create Mock Test
          </Button>
        </div>
      </div>

      {/* Top Filter Bar */}
      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="bg-white/5 p-1 rounded-xl border border-white/5">
            <TabsList className="bg-transparent border-0 h-9">
              <TabsTrigger value="all" className="rounded-lg px-6 data-[state=active]:bg-primary">All</TabsTrigger>
              <TabsTrigger value="Draft" className="rounded-lg px-6 data-[state=active]:bg-primary">Drafts</TabsTrigger>
              <TabsTrigger value="Published" className="rounded-lg px-6 data-[state=active]:bg-primary">Published</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="h-8 w-px bg-white/10 hidden md:block" />

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by title..." 
              className="pl-10 bg-white/5 border-white/5 h-10 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={filters.examId} onValueChange={(v) => setFilters(f => ({ ...f, examId: v }))}>
            <SelectTrigger className="w-[180px] bg-white/5 border-white/5 h-10 rounded-xl">
              <SelectValue placeholder="All Exams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              {exams?.map(exam => (
                <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.type} onValueChange={(v) => setFilters(f => ({ ...f, type: v }))}>
            <SelectTrigger className="w-[150px] bg-white/5 border-white/5 h-10 rounded-xl">
              <SelectValue placeholder="Mock Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {MOCK_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-8 w-8 rounded-lg", viewMode === 'table' ? "bg-white/10 text-primary" : "text-muted-foreground")}
            onClick={() => setViewMode('table')}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-8 w-8 rounded-lg", viewMode === 'grid' ? "bg-white/10 text-primary" : "text-muted-foreground")}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main List Area */}
      {mocksLoading ? (
        <div className="flex items-center justify-center h-64">
          <Clock className="w-8 h-8 animate-spin text-primary/40" />
        </div>
      ) : viewMode === 'table' ? (
        <Card className="glass border-white/10 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                    <th className="px-6 py-4 font-semibold text-muted-foreground">Mock Title & Exam</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground">Config</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground">Type</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground">Status</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredMocks.map((mock) => (
                    <tr key={mock.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-base">{mock.title}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                            {exams?.find(e => e.id === mock.examId)?.name || 'Unlinked Exam'} 
                            <span className="opacity-20">•</span> 
                            {mock.slug}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex flex-col">
                            <span className="text-muted-foreground">Questions</span>
                            <span className="font-medium">{mock.totalQuestions}</span>
                          </div>
                          <div className="flex flex-col border-l border-white/5 pl-4">
                            <span className="text-muted-foreground">Duration</span>
                            <span className="font-medium">{mock.durationMinutes}m</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="bg-white/5 border-white/10 font-medium">
                          {mock.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={cn(
                          "h-6 gap-1.5",
                          mock.status === 'Published' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          mock.status === 'Draft' ? "bg-amber-500/10 text-amber-400 border-emerald-500/20" :
                          "bg-slate-500/10 text-slate-400 border-slate-500/20"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", 
                            mock.status === 'Published' ? "bg-emerald-400" :
                            mock.status === 'Draft' ? "bg-amber-400" : "bg-slate-400"
                          )} />
                          {mock.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass border-white/10 w-48">
                            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => { setEditingItem(mock); setIsModalOpen(true); }}>
                              <Edit2 className="w-3.5 h-3.5" /> Edit Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => handleDuplicateMock(mock)}>
                              <Copy className="w-3.5 h-3.5" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem className="cursor-pointer gap-2 text-primary font-bold">
                              <UploadCloud className="w-3.5 h-3.5" /> Upload Questions
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2">
                              <Eye className="w-3.5 h-3.5" /> Preview Engine
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem 
                              className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => handleDeleteMock(mock.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                  {filteredMocks.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-32 text-center">
                        <div className="flex flex-col items-center gap-4 text-muted-foreground">
                          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                            <FileText className="w-8 h-8 opacity-20" />
                          </div>
                          <div>
                            <p className="font-bold">No mock tests found</p>
                            <p className="text-xs">Try adjusting your search or filters.</p>
                          </div>
                          <Button variant="outline" className="mt-2 border-white/10 rounded-xl" onClick={() => { setSearchQuery(""); setFilters({ categoryId: "all", examId: "all", type: "all" }); }}>
                            Reset All Filters
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMocks.map(mock => (
            <Card key={mock.id} className="glass border-white/10 overflow-hidden group">
              <CardHeader className="p-6 pb-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="bg-white/5 border-white/10">{mock.type}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass border-white/10">
                       <DropdownMenuItem onClick={() => { setEditingItem(mock); setIsModalOpen(true); }}>Edit Settings</DropdownMenuItem>
                       <DropdownMenuItem onClick={() => handleDuplicateMock(mock)}>Duplicate</DropdownMenuItem>
                       <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteMock(mock.id)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="text-xl font-bold leading-tight">{mock.title}</CardTitle>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">
                  {exams?.find(e => e.id === mock.examId)?.name}
                </p>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Questions</div>
                    <div className="text-lg font-bold">{mock.totalQuestions}</div>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Duration</div>
                    <div className="text-lg font-bold">{mock.durationMinutes}m</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <Badge className={cn(
                       "h-5",
                       mock.status === 'Published' ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-muted-foreground"
                     )}>{mock.status}</Badge>
                     {mock.isFree && <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/20 h-5">Free</Badge>}
                   </div>
                   <Button size="sm" className="bg-white/5 hover:bg-primary border border-white/10 rounded-lg text-xs font-bold gap-2">
                      <UploadCloud className="w-3 h-3" /> Questions
                   </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <MockTestModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingItem={editingItem}
        categories={categories || []}
        exams={exams || []}
      />
    </div>
  );
}

function MockTestModal({ isOpen, onClose, editingItem, categories, exams }: any) {
  const db = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({
    title: "",
    slug: "",
    categoryId: "",
    examId: "",
    type: "Full Test",
    subject: "",
    chapter: "",
    durationMinutes: 90,
    totalQuestions: 100,
    totalMarks: 100,
    negativeMarks: 0.33,
    languages: ["English", "Hindi"],
    instructions: "Standard exam instructions apply. No calculators allowed.",
    isFree: true,
    status: "Draft"
  });

  React.useEffect(() => {
    if (editingItem) setFormData(editingItem);
    else setFormData({
      title: "",
      slug: "",
      categoryId: "",
      examId: "",
      type: "Full Test",
      subject: "",
      chapter: "",
      durationMinutes: 90,
      totalQuestions: 100,
      totalMarks: 100,
      negativeMarks: 0.33,
      languages: ["English", "Hindi"],
      instructions: "Standard exam instructions apply. No calculators allowed.",
      isFree: true,
      status: "Draft"
    });
  }, [editingItem, isOpen]);

  // Filter exams based on category for selection
  const availableExams = useMemo(() => {
    if (!formData.categoryId) return exams;
    return exams.filter((e: any) => e.categoryId === formData.categoryId);
  }, [exams, formData.categoryId]);

  const handleSave = async () => {
    if (!db || !formData.title || !formData.slug || !formData.examId) return;
    setIsSaving(true);
    try {
      const data = {
        ...formData,
        updatedAt: serverTimestamp(),
        categoryId: exams.find((e: any) => e.id === formData.examId)?.categoryId || formData.categoryId
      };
      
      if (editingItem) {
        await updateDoc(doc(db, "mockTests", editingItem.id), data);
      } else {
        await addDoc(collection(db, "mockTests"), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/10 sm:max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle>{editingItem ? "Edit Mock Test" : "Create New Mock Test"}</DialogTitle>
          <DialogDescription>Configure the settings and hierarchy for this test series.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
          {/* Basic Info */}
          <div className="col-span-2 space-y-2">
            <Label>Mock Test Title</Label>
            <Input 
              placeholder="e.g. SSC CGL Full Mock 01" 
              className="bg-white/5 border-white/10 h-12"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Slug (Unique ID)</Label>
            <Input 
              placeholder="e.g. ssc-cgl-mock-01" 
              className="bg-white/5 border-white/10 h-11 font-mono text-xs"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
            />
          </div>

          <div className="space-y-2">
            <Label>Mock Type</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOCK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Hierarchy */}
          <div className="space-y-2">
            <Label>Target Exam</Label>
            <Select value={formData.examId} onValueChange={(v) => setFormData({ ...formData, examId: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-11">
                <SelectValue placeholder="Select Exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Publish Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Config */}
          <div className="space-y-2">
            <Label>Duration (Minutes)</Label>
            <Input 
              type="number"
              className="bg-white/5 border-white/10 h-11"
              value={formData.durationMinutes}
              onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>Total Questions</Label>
            <Input 
              type="number"
              className="bg-white/5 border-white/10 h-11"
              value={formData.totalQuestions}
              onChange={(e) => setFormData({ ...formData, totalQuestions: parseInt(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>Total Marks</Label>
            <Input 
              type="number"
              className="bg-white/5 border-white/10 h-11"
              value={formData.totalMarks}
              onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>Negative Marks</Label>
            <Input 
              type="number"
              step="0.01"
              className="bg-white/5 border-white/10 h-11"
              value={formData.negativeMarks}
              onChange={(e) => setFormData({ ...formData, negativeMarks: parseFloat(e.target.value) })}
            />
          </div>

          <div className="col-span-2 flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
             <div className="space-y-0.5">
               <Label className="text-base">Free Test</Label>
               <p className="text-xs text-muted-foreground">Make this test accessible to guest users.</p>
             </div>
             <Switch 
               checked={formData.isFree}
               onCheckedChange={(v) => setFormData({ ...formData, isFree: v })}
             />
          </div>

          <div className="col-span-2 space-y-2">
            <Label>Instructions (Markdown supported)</Label>
            <textarea 
              className="w-full min-h-[100px] bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="border-t border-white/5 pt-6 gap-2">
          <Button variant="outline" onClick={onClose} className="border-white/10 h-12 rounded-xl flex-1">Cancel</Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white h-12 rounded-xl flex-1 font-bold shadow-lg shadow-primary/20" disabled={isSaving}>
            {isSaving ? <Clock className="w-4 h-4 animate-spin mr-2" /> : editingItem ? "Save Changes" : "Create Mock Test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
