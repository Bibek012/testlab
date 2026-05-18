
"use client";

import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  XCircle,
  ChevronRight,
  FolderOpen,
  MapPin,
  Globe
} from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
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
import { STATES } from "@/lib/exam-data";

export default function ExamManagementPage() {
  const db = useFirestore();
  
  // Real-time collections
  const categoriesQuery = useMemo(() => db ? query(collection(db, "examCategories"), orderBy("order", "asc")) : null, [db]);
  const examsQuery = useMemo(() => db ? query(collection(db, "exams"), orderBy("name", "asc")) : null, [db]);

  const { data: categories, loading: catsLoading } = useCollection(categoriesQuery);
  const { data: exams, loading: examsLoading } = useCollection(examsQuery);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  
  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Filtered Exams
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Exam <span className="text-accent">Hierarchy</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Manage categories, exams, and state-wise listings.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="border-white/10 hover:bg-white/5 rounded-xl gap-2 h-11"
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
        {/* Categories Sidebar */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Categories</h3>
            <Badge variant="outline" className="text-[10px] border-white/10">{categories?.length || 0}</Badge>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => setActiveCategory("all")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeCategory === "all" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-white/5 border border-transparent"
              }`}
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">All Exams</span>
              <ChevronRight className={`ml-auto w-4 h-4 transition-transform ${activeCategory === "all" ? "rotate-90" : ""}`} />
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeCategory === cat.id ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-white/5 border border-transparent"
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm font-medium">{cat.title}</span>
                <ChevronRight className={`ml-auto w-4 h-4 transition-transform ${activeCategory === cat.id ? "rotate-90" : ""}`} />
              </button>
            ))}
          </div>
        </aside>

        {/* Exams List Area */}
        <main className="lg:col-span-9 space-y-6">
          <Card className="glass border-white/10 overflow-hidden">
            <CardHeader className="p-6 border-b border-white/5 bg-white/[0.02]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search exams by name or slug..." 
                    className="pl-10 bg-white/5 border-white/5 h-10 rounded-xl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-white/5 h-10 w-10">
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      <th className="px-6 py-4 font-semibold text-muted-foreground">Exam Name</th>
                      <th className="px-6 py-4 font-semibold text-muted-foreground">Category</th>
                      <th className="px-6 py-4 font-semibold text-muted-foreground">Hierarchy</th>
                      <th className="px-6 py-4 font-semibold text-muted-foreground">Status</th>
                      <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredExams.map((exam) => (
                      <tr key={exam.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{exam.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">{exam.slug}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="bg-white/5 border-white/10 font-medium">
                            {categories?.find(c => c.id === exam.categoryId)?.title || "Unknown"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {exam.stateSlug ? (
                              <div className="flex items-center gap-1.5 text-accent font-medium">
                                <MapPin className="w-3 h-3" />
                                {STATES.find(s => s.slug === exam.stateSlug)?.name}
                              </div>
                            ) : (
                              <span className="opacity-50">— National —</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {exam.isActive ? (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1.5 h-6">
                                <CheckCircle2 className="w-3 h-3" /> Active
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 gap-1.5 h-6">
                                <XCircle className="w-3 h-3" /> Inactive
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass border-white/10">
                              <DropdownMenuItem 
                                className="cursor-pointer gap-2"
                                onClick={() => { setEditingItem(exam); setIsExamModalOpen(true); }}
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Edit Exam
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer gap-2">
                                <Eye className="w-3.5 h-3.5" /> View Mocks
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="cursor-pointer gap-2"
                                onClick={() => handleToggleStatus(exam.id, exam.isActive)}
                              >
                                {exam.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                {exam.isActive ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => handleDeleteExam(exam.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                    {filteredExams.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-4 text-muted-foreground">
                            <FolderOpen className="w-12 h-12 opacity-10" />
                            <p>No exams found matching your criteria.</p>
                            <Button variant="outline" className="border-white/10" onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}>
                              Clear Filters
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
        </main>
      </div>

      {/* Category Modal */}
      <CategoryModal 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)}
        editingItem={editingItem}
      />

      {/* Exam Modal */}
      <ExamModal 
        isOpen={isExamModalOpen} 
        onClose={() => setIsExamModalOpen(false)}
        editingItem={editingItem}
        categories={categories || []}
      />
    </div>
  );
}

function CategoryModal({ isOpen, onClose, editingItem }: any) {
  const db = useFirestore();
  const [formData, setFormData] = useState({ title: "", slug: "", description: "" });
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (editingItem) setFormData(editingItem);
    else setFormData({ title: "", slug: "", description: "" });
  }, [editingItem, isOpen]);

  const handleSave = async () => {
    if (!db || !formData.title || !formData.slug) return;
    setIsSaving(true);
    try {
      if (editingItem) {
        await updateDoc(doc(db, "examCategories", editingItem.id), formData);
      } else {
        await addDoc(collection(db, "examCategories"), { ...formData, order: Date.now() });
      }
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingItem ? "Edit Category" : "New Category"}</DialogTitle>
          <DialogDescription>Create a top-level grouping for your exams.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Category Title</Label>
            <Input 
              id="title" 
              placeholder="e.g. SSC, Banking" 
              className="bg-white/5 border-white/10"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL Path)</Label>
            <Input 
              id="slug" 
              placeholder="e.g. ssc, banking" 
              className="bg-white/5 border-white/10 font-mono"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Input 
              id="desc" 
              placeholder="Short description..." 
              className="bg-white/5 border-white/10"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/10">Cancel</Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white" disabled={isSaving}>
            {editingItem ? "Update Category" : "Create Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExamModal({ isOpen, onClose, editingItem, categories }: any) {
  const db = useFirestore();
  const [formData, setFormData] = useState({ 
    name: "", 
    slug: "", 
    categoryId: "", 
    stateSlug: "none", 
    difficulty: "Intermediate",
    description: "",
    isActive: true 
  });
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (editingItem) setFormData({ ...editingItem, stateSlug: editingItem.stateSlug || "none" });
    else setFormData({ name: "", slug: "", categoryId: "", stateSlug: "none", difficulty: "Intermediate", description: "", isActive: true });
  }, [editingItem, isOpen]);

  const handleSave = async () => {
    if (!db || !formData.name || !formData.slug || !formData.categoryId) return;
    setIsSaving(true);
    try {
      const data = { ...formData, stateSlug: formData.stateSlug === "none" ? null : formData.stateSlug };
      if (editingItem) {
        await updateDoc(doc(db, "exams", editingItem.id), data);
      } else {
        await addDoc(collection(db, "exams"), { ...data, testsCount: 0, questionsCount: 0 });
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
      <DialogContent className="glass border-white/10 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingItem ? "Edit Exam" : "New Exam Listing"}</DialogTitle>
          <DialogDescription>Add or update a specific competitive exam.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="examName">Exam Name</Label>
            <Input 
              id="examName" 
              placeholder="e.g. SSC CGL 2024" 
              className="bg-white/5 border-white/10"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select 
              value={formData.categoryId} 
              onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
            >
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>State Selection (Optional)</Label>
            <Select 
              value={formData.stateSlug} 
              onValueChange={(val) => setFormData({ ...formData, stateSlug: val })}
            >
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">National / No State</SelectItem>
                {STATES.map((state) => (
                  <SelectItem key={state.slug} value={state.slug}>{state.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="examSlug">Slug</Label>
            <Input 
              id="examSlug" 
              placeholder="e.g. ssc-cgl" 
              className="bg-white/5 border-white/10 font-mono"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
            />
          </div>
          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select 
              value={formData.difficulty} 
              onValueChange={(val) => setFormData({ ...formData, difficulty: val })}
            >
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Intermediate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-4 pt-2">
             <div className="flex items-center justify-between">
                <Label htmlFor="active" className="cursor-pointer">Published & Visible</Label>
                <Switch 
                  id="active" 
                  checked={formData.isActive}
                  onCheckedChange={(val) => setFormData({ ...formData, isActive: val })}
                />
             </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/10">Cancel</Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white" disabled={isSaving}>
            {editingItem ? "Save Changes" : "Create Exam"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
