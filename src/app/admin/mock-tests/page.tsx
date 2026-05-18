"use client";

import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  FileText, 
  UploadCloud, 
  Clock,
  LayoutGrid,
  List,
  Copy,
  Eye
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
  serverTimestamp
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import Link from "next/link";
import { useRouter } from "next/navigation";

const MOCK_TYPES = ["Full Test", "Subject Test", "Chapter Test", "Previous Year", "Daily Quiz", "Mini Mock"];
const STATUS_OPTIONS = ["Draft", "Published", "Hidden", "Scheduled"];

export default function MockTestManagementPage() {
  const db = useFirestore();
  const router = useRouter();
  
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
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Mock <span className="text-accent">Tests</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Design and manage your examination library.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/upload-json">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 rounded-xl gap-2 h-11">
              <UploadCloud className="w-4 h-4" />
              Ingest Module
            </Button>
          </Link>
          <Button 
            className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 h-11 shadow-lg shadow-primary/20"
            onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
          >
            <Plus className="w-4 h-4" />
            Create Mock Test
          </Button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="bg-white/5 p-1 rounded-xl border border-white/5">
            <TabsList className="bg-transparent border-0 h-9">
              <TabsTrigger value="all" className="rounded-lg px-6 data-[state=active]:bg-primary">All</TabsTrigger>
              <TabsTrigger value="Draft" className="rounded-lg px-6 data-[state=active]:bg-primary">Drafts</TabsTrigger>
              <TabsTrigger value="Published" className="rounded-lg px-6 data-[state=active]:bg-primary">Published</TabsTrigger>
            </TabsList>
          </Tabs>

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
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
          <Button 
            variant="ghost" size="icon" 
            className={cn("h-8 w-8 rounded-lg", viewMode === 'table' ? "bg-white/10 text-primary" : "text-muted-foreground")}
            onClick={() => setViewMode('table')}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" size="icon" 
            className={cn("h-8 w-8 rounded-lg", viewMode === 'grid' ? "bg-white/10 text-primary" : "text-muted-foreground")}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {mocksLoading ? (
        <div className="flex items-center justify-center h-64">
          <Clock className="w-8 h-8 animate-spin text-primary/40" />
        </div>
      ) : viewMode === 'table' ? (
        <Card className="glass border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Title & Exam</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground text-center">Config</th>
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
                        <span className="font-bold text-foreground">{mock.title}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{exams?.find(e => e.id === mock.examId)?.name || 'Unlinked'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-4 text-[10px] font-bold">
                        <div className="flex flex-col"><span>{mock.totalQuestions}</span><span className="text-muted-foreground font-normal">Qs</span></div>
                        <div className="flex flex-col"><span>{mock.durationMinutes}m</span><span className="text-muted-foreground font-normal">Time</span></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="bg-white/5 border-white/10 font-medium text-[10px]">{mock.type}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={cn(
                        "h-6 gap-1.5",
                        mock.status === 'Published' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", mock.status === 'Published' ? "bg-emerald-400" : "bg-slate-400")} />
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
                          <DropdownMenuItem className="cursor-pointer gap-2 text-primary font-bold" onClick={() => router.push(`/admin/upload-json?mockId=${mock.id}`)}>
                            <UploadCloud className="w-3.5 h-3.5" /> Upload Questions
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer gap-2 text-destructive" onClick={() => handleDeleteMock(mock.id)}>
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMocks.map(mock => (
            <Card key={mock.id} className="glass border-white/10 p-6 flex flex-col group hover:border-primary/40 transition-all">
              <div className="flex justify-between items-start mb-4">
                <Badge variant="outline" className="bg-white/5 border-white/10">{mock.type}</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2"><MoreVertical className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass border-white/10">
                     <DropdownMenuItem onClick={() => { setEditingItem(mock); setIsModalOpen(true); }}>Edit</DropdownMenuItem>
                     <DropdownMenuItem onClick={() => router.push(`/admin/upload-json?mockId=${mock.id}`)}>Upload Questions</DropdownMenuItem>
                     <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteMock(mock.id)}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <h3 className="text-lg font-bold mb-1 leading-tight">{mock.title}</h3>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-6">
                {exams?.find(e => e.id === mock.examId)?.name}
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Questions</div>
                    <div className="text-lg font-bold">{mock.totalQuestions}</div>
                 </div>
                 <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Duration</div>
                    <div className="text-lg font-bold">{mock.durationMinutes}m</div>
                 </div>
              </div>
              <div className="mt-auto flex items-center justify-between">
                 <Badge className={mock.status === 'Published' ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-muted-foreground"}>
                    {mock.status}
                 </Badge>
                 <Button size="sm" variant="ghost" className="text-primary gap-2" onClick={() => router.push(`/admin/upload-json?mockId=${mock.id}`)}>
                    Add Qs <UploadCloud className="w-3 h-3" />
                 </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

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
    title: "", slug: "", categoryId: "", examId: "", type: "Full Test", durationMinutes: 90, totalQuestions: 100, totalMarks: 100, negativeMarks: 0.33, isFree: true, status: "Draft"
  });

  React.useEffect(() => {
    if (editingItem) setFormData(editingItem);
    else setFormData({ title: "", slug: "", categoryId: "", examId: "", type: "Full Test", durationMinutes: 90, totalQuestions: 100, totalMarks: 100, negativeMarks: 0.33, isFree: true, status: "Draft" });
  }, [editingItem, isOpen]);

  const handleSave = async () => {
    if (!db || !formData.title || !formData.examId) return;
    setIsSaving(true);
    try {
      const data = {
        ...formData,
        updatedAt: serverTimestamp(),
        categoryId: exams.find((e: any) => e.id === formData.examId)?.categoryId || formData.categoryId,
        slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-')
      };
      if (editingItem) {
        await updateDoc(doc(db, "mockTests", editingItem.id), data);
      } else {
        await addDoc(collection(db, "mockTests"), { ...data, createdAt: serverTimestamp() });
      }
      onClose();
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/10 sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingItem ? "Edit Mock Test" : "Create New Mock Test"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
          <div className="col-span-2 space-y-2">
            <Label>Title</Label>
            <Input className="bg-white/5 border-white/10" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Target Exam</Label>
            <Select value={formData.examId} onValueChange={(v) => setFormData({ ...formData, examId: v })}>
              <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{exams.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mock Type</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
              <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>{MOCK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Duration (Min)</Label>
            <Input type="number" className="bg-white/5 border-white/10" value={formData.durationMinutes} onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Questions Count</Label>
            <Input type="number" className="bg-white/5 border-white/10" value={formData.totalQuestions} onChange={(e) => setFormData({ ...formData, totalQuestions: parseInt(e.target.value) })} />
          </div>
          <div className="col-span-2 flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
             <Label>Free Test Accessibility</Label>
             <Switch checked={formData.isFree} onCheckedChange={(v) => setFormData({ ...formData, isFree: v })} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-white/10">Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-white" disabled={isSaving}>
            {isSaving ? <Clock className="w-4 h-4 animate-spin mr-2" /> : "Save Mock Test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}