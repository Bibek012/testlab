"use client";

import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  ChevronRight,
  FolderOpen,
  Globe,
  Loader2,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  query,
  orderBy
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

export default function ExamManagementPage() {
  const db = useFirestore();
  
  const categoriesQuery = useMemoFirebase(() => 
    db ? query(collection(db, "examCategories"), orderBy("title", "asc")) : null, 
  [db]);

  const examsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "exams"), orderBy("name", "asc")) : null, 
  [db]);

  const { data: categories, loading: catsLoading } = useCollection<any>(categoriesQuery);
  const { data: exams, loading: examsLoading } = useCollection<any>(examsQuery);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const filteredExams = useMemo(() => {
    if (!exams) return [];
    return exams.filter(exam => {
      const matchesSearch = exam.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "all" || exam.categoryId === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [exams, searchQuery, activeCategory]);

  const handleToggleStatus = async (examId: string, currentStatus: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "exams", examId), { isActive: !currentStatus });
    } catch (e) {
      console.error("Error toggling status:", e);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (!db || !confirm("Are you sure you want to delete this exam?")) return;
    try {
      await deleteDoc(doc(db, "exams", examId));
    } catch (e) {
      console.error("Error deleting exam:", e);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Exam <span className="text-accent">Hierarchy</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Manage categories and exam listings.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="border-white/10 rounded-xl gap-2 h-11"
            onClick={() => { setEditingItem(null); setIsCategoryModalOpen(true); }}
          >
            <FolderOpen className="w-4 h-4" />
            New Category
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 h-11 shadow-lg shadow-primary/20"
            onClick={() => { setEditingItem(null); setIsExamModalOpen(true); }}
          >
            <Plus className="w-4 h-4" />
            Add Exam
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-3 space-y-4">
          <div className="space-y-1">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                activeCategory === "all" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-white/5 border border-transparent"
              )}
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">All Exams</span>
              <ChevronRight className={cn("ml-auto w-4 h-4 transition-transform", activeCategory === "all" ? "rotate-90" : "")} />
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                  activeCategory === cat.id ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-white/5 border border-transparent"
                )}
              >
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm font-medium truncate">{cat.title}</span>
                <ChevronRight className={cn("ml-auto w-4 h-4 transition-transform", activeCategory === cat.id ? "rotate-90" : "")} />
              </button>
            ))}
          </div>
        </aside>

        <main className="lg:col-span-9 space-y-6">
          <Card className="glass border-white/10 overflow-hidden">
            <CardHeader className="p-6 border-b border-white/5 bg-white/[0.02]">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search exams..." className="pl-10 bg-white/5 border-white/5 h-10 rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      <th className="px-6 py-4 font-semibold text-muted-foreground">Exam Name</th>
                      <th className="px-6 py-4 font-semibold text-muted-foreground">Slug</th>
                      <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {examsLoading ? (
                      <tr><td colSpan={3} className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20" /></td></tr>
                    ) : filteredExams.map((exam) => (
                      <tr key={exam.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{exam.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{categories?.find(c => c.id === exam.categoryId)?.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-[10px] text-accent">{exam.slug}</td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass border-white/10">
                              <DropdownMenuItem onClick={() => { setEditingItem(exam); setIsExamModalOpen(true); }}>Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteExam(exam.id)}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      <CategoryModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} editingItem={editingItem} />
      <ExamModal isOpen={isExamModalOpen} onClose={() => setIsExamModalOpen(false)} editingItem={editingItem} categories={categories || []} />
    </div>
  );
}

function CategoryModal({ isOpen, onClose, editingItem }: any) {
  const db = useFirestore();
  const [formData, setFormData] = useState({ title: "", slug: "" });
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (editingItem) setFormData(editingItem);
    else setFormData({ title: "", slug: "" });
  }, [editingItem, isOpen]);

  const handleSave = async () => {
    if (!db || !formData.title) return;
    setIsSaving(true);
    try {
      const slug = formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-');
      if (editingItem) { await updateDoc(doc(db, "examCategories", editingItem.id), { ...formData, slug }); }
      else { await addDoc(collection(db, "examCategories"), { ...formData, slug, order: Date.now() }); }
      onClose();
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/10 sm:max-w-md">
        <DialogHeader><DialogTitle>{editingItem ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Category Title</Label>
            <Input className="bg-white/5 border-white/10" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>
        </div>
        <DialogFooter><Button onClick={handleSave} className="bg-primary text-white" disabled={isSaving}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExamModal({ isOpen, onClose, editingItem, categories }: any) {
  const db = useFirestore();
  const [formData, setFormData] = useState({ name: "", slug: "", categoryId: "", difficulty: "Intermediate", isActive: true });
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (editingItem) setFormData(editingItem);
    else setFormData({ name: "", slug: "", categoryId: "", difficulty: "Intermediate", isActive: true });
  }, [editingItem, isOpen]);

  const handleSave = async () => {
    if (!db || !formData.name || !formData.categoryId) return;
    setIsSaving(true);
    try {
      const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-');
      if (editingItem) { await updateDoc(doc(db, "exams", editingItem.id), { ...formData, slug }); }
      else { await addDoc(collection(db, "exams"), { ...formData, slug, testsCount: 0 }); }
      onClose();
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/10 sm:max-w-lg">
        <DialogHeader><DialogTitle>{editingItem ? "Edit Exam" : "New Exam"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="col-span-2 space-y-2">
            <Label>Exam Name</Label>
            <Input className="bg-white/5 border-white/10" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={formData.categoryId} onValueChange={(val) => setFormData({ ...formData, categoryId: val })}>
              <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{categories.map((cat: any) => <SelectItem key={cat.id} value={cat.id}>{cat.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select value={formData.difficulty} onValueChange={(val) => setFormData({ ...formData, difficulty: val })}>
              <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Easy">Easy</SelectItem><SelectItem value="Intermediate">Intermediate</SelectItem><SelectItem value="Hard">Hard</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={handleSave} className="bg-primary text-white" disabled={isSaving}>Save Exam</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}