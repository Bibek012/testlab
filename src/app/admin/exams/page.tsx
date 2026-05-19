
"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  ChevronRight,
  FolderOpen,
  Globe,
  Loader2,
  Filter,
  AlertTriangle
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  getDocs,
  serverTimestamp
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { logAction } from "@/services/audit";

export default function ExamManagementPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const filteredExams = useMemo(() => {
    if (!exams) return [];
    return exams.filter(exam => {
      const matchesSearch = exam.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "all" || exam.categoryId === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [exams, searchQuery, activeCategory]);

  const handleDeleteExam = async (
    examId: string,
    examName: string
  ) => {
    try {
      if (!db || !user || !examId) return;

      setDeletingId(examId);

      const mocksRef = collection(db, "mockTests");
      const q = query(mocksRef, where("examId", "==", examId));
      const mocksSnap = await getDocs(q);

      if (mocksSnap.size > 0) {
        toast({
          variant: "destructive",
          title: "Delete Restricted",
          description: `This exam has ${mocksSnap.size} linked mock tests. Delete them first.`,
        });
        return;
      }

      await deleteDoc(doc(db, "exams", examId));
      await logAction(db, user, "delete_exam", examId, "exam", `Deleted exam: ${examName}`);

      toast({
        title: "Exam Deleted",
        description: `"${examName}" deleted successfully`,
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: e?.message || "Unknown error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-bold">Exam <span className="text-accent">Hierarchy</span></h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">Manage categories and exam listings across the platform.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full xl:w-auto">
          <Button
            variant="outline"
            className="flex-1 xl:flex-none border-white/10 rounded-xl gap-2 h-10 md:h-11 text-xs md:text-sm"
            onClick={() => { setEditingItem(null); setIsCategoryModalOpen(true); }}
          >
            <FolderOpen className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline">New Category</span>
            <span className="xs:hidden">Category</span>
          </Button>
          <Button
            className="flex-[1.5] xl:flex-none bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 h-10 md:h-11 shadow-lg shadow-primary/20 text-xs md:text-sm"
            onClick={() => { setEditingItem(null); setIsExamModalOpen(true); }}
          >
            <Plus className="w-4 h-4 shrink-0" />
            Add Exam Listing
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        <aside className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between lg:mb-2 px-1">
            <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Quick Filters</Label>
            <Filter className="w-3 h-3 text-muted-foreground lg:hidden" />
          </div>
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible hide-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 pb-2 lg:pb-0">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 md:py-3 rounded-xl transition-all whitespace-nowrap lg:w-full border shrink-0",
                activeCategory === "all" ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground hover:bg-white/5 border-transparent"
              )}
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span className="text-xs md:text-sm font-medium">All Exams</span>
              <ChevronRight className={cn("ml-auto w-4 h-4 transition-transform hidden lg:block", activeCategory === "all" ? "rotate-90" : "")} />
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 md:py-3 rounded-xl transition-all whitespace-nowrap lg:w-full border shrink-0",
                  activeCategory === cat.id ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground hover:bg-white/5 border-transparent"
                )}
              >
                <FolderOpen className="w-4 h-4 shrink-0" />
                <span className="text-xs md:text-sm font-medium truncate max-w-[120px] lg:max-w-none">{cat.title}</span>
                <ChevronRight className={cn("ml-auto w-4 h-4 transition-transform hidden lg:block", activeCategory === cat.id ? "rotate-90" : "")} />
              </button>
            ))}
          </div>
        </aside>

        <main className="lg:col-span-9 space-y-6 w-full min-w-0">
          <Card className="glass border-white/10 overflow-hidden">
            <CardHeader className="p-4 md:p-6 border-b border-white/5 bg-white/[0.02]">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search within filter..." className="pl-10 bg-white/5 border-white/5 h-10 rounded-xl text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      <th className="px-6 py-4 font-semibold text-muted-foreground">Exam Title</th>
                      <th className="px-6 py-4 font-semibold text-muted-foreground">Slug / Path</th>
                      <th className="px-6 py-4 font-semibold text-muted-foreground">Difficulty</th>
                      <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {examsLoading ? (
                      <tr><td colSpan={4} className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20" /></td></tr>
                    ) : filteredExams.length === 0 ? (
                      <tr><td colSpan={4} className="p-20 text-center text-muted-foreground italic">No exams found for this category.</td></tr>
                    ) : filteredExams.map((exam) => (
                      <tr key={exam.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground truncate max-w-[200px]">{exam.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{categories?.find(c => c.id === exam.categoryId)?.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="font-mono text-[10px] text-accent lowercase bg-accent/5 border-accent/10">{exam.slug}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-xs font-medium",
                            exam.difficulty === 'Hard' ? "text-rose-400" : exam.difficulty === 'Easy' ? "text-emerald-400" : "text-amber-400"
                          )}>{exam.difficulty || 'Intermediate'}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {deletingId === exam.id ? (
                            <Loader2 className="w-4 h-4 animate-spin ml-auto mr-4 text-muted-foreground" />
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10"><MoreVertical className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="glass border-white/10 w-40">
                                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => { setEditingItem(exam); setIsExamModalOpen(true); }}><Edit2 className="w-3.5 h-3.5" /> Edit Details</DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive gap-2 cursor-pointer"
                                  onClick={() => handleDeleteExam(exam.id, exam.name)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete Exam
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
  const { user } = useUser();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ title: "", slug: "", description: "" });
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (editingItem) setFormData({
      title: editingItem.title || "",
      slug: editingItem.slug || "",
      description: editingItem.description || ""
    });
    else setFormData({ title: "", slug: "", description: "" });
  }, [editingItem, isOpen]);

  const handleSave = async () => {
    if (!db || !formData.title || !user) return;
    setIsSaving(true);
    try {
      const slug = formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (editingItem) {
        await updateDoc(doc(db, "examCategories", editingItem.id), { ...formData, slug });
        await logAction(db, user, "update_category", editingItem.id, "category", `Updated category: ${formData.title}`);
      } else {
        const docRef = await addDoc(collection(db, "examCategories"), { ...formData, slug, order: Date.now() });
        await logAction(db, user, "create_category", docRef.id, "category", `Created category: ${formData.title}`);
      }
      toast({ title: "Category Synchronized" });
      onClose();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally { setIsSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/10 w-[95%] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-xl font-headline">{editingItem ? "Edit Category" : "New Exam Category"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-muted-foreground">Category Title</Label>
            <Input className="bg-white/5 border-white/10 h-11" placeholder="e.g. Banking Exams" value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-muted-foreground">URL Slug (Optional)</Label>
            <Input className="bg-white/5 border-white/10 h-11 font-mono" placeholder="auto-generated" value={formData.slug || ""} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" className="flex-1 sm:flex-none border-white/10" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="flex-1 sm:flex-none bg-primary text-white" disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExamModal({ isOpen, onClose, editingItem, categories }: any) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: "", slug: "", categoryId: "", difficulty: "Intermediate", description: "" });
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (editingItem) setFormData({
      name: editingItem.name || "",
      slug: editingItem.slug || "",
      categoryId: editingItem.categoryId || "",
      difficulty: editingItem.difficulty || "Intermediate",
      description: editingItem.description || ""
    });
    else setFormData({ name: "", slug: "", categoryId: "", difficulty: "Intermediate", description: "" });
  }, [editingItem, isOpen]);

  const handleSave = async () => {
    if (!db || !formData.name || !formData.categoryId || !user) return;
    setIsSaving(true);
    try {
      const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const selectedCategory = categories.find((c: any) => c.id === formData.categoryId);
      const data = {
        ...formData,
        slug,
        categorySlug: selectedCategory?.slug || "",
        isActive: true,
        updatedAt: serverTimestamp()
      };

      if (editingItem) {
        await updateDoc(doc(db, "exams", editingItem.id), data);
        await logAction(db, user, "update_exam", editingItem.id, "exam", `Updated exam listing: ${formData.name}`);
      } else {
        const docRef = await addDoc(collection(db, "exams"), { ...data, testsCount: 0, questionsCount: 0, createdAt: serverTimestamp() });
        await logAction(db, user, "create_exam", docRef.id, "exam", `Created exam listing: ${formData.name}`);
      }
      toast({ title: "Exam Listing Synchronized" });
      onClose();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally { setIsSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/10 w-[95%] sm:max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-xl font-headline">{editingItem ? "Edit Exam Listing" : "New Exam Listing"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          <div className="sm:col-span-2 space-y-2">
            <Label className="text-xs uppercase font-bold text-muted-foreground">Exam Name</Label>
            <Input className="bg-white/5 border-white/10 h-11" placeholder="e.g. SBI PO Prelims" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-muted-foreground">Category</Label>
            <Select value={formData.categoryId || ""} onValueChange={(val) => setFormData({ ...formData, categoryId: val })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-11"><SelectValue placeholder="Select Category" /></SelectTrigger>
              <SelectContent>{categories.map((cat: any) => <SelectItem key={cat.id} value={cat.id}>{cat.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-muted-foreground">Difficulty</Label>
            <Select value={formData.difficulty || "Intermediate"} onValueChange={(val) => setFormData({ ...formData, difficulty: val })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-11"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Easy">Easy</SelectItem><SelectItem value="Intermediate">Intermediate</SelectItem><SelectItem value="Hard">Hard</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label className="text-xs uppercase font-bold text-muted-foreground">Description (Short)</Label>
            <Input className="bg-white/5 border-white/10 h-11" value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" className="w-full sm:w-auto border-white/10" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="w-full sm:w-auto bg-primary text-white font-bold" disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Exam"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
