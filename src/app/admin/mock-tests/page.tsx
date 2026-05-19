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
  Filter
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
import { useToast } from "@/hooks/use-toast";

const MOCK_TYPES = ["Full Test", "Subject Test", "Chapter Test", "Previous Year", "Daily Quiz", "Mini Mock"];

export default function MockTestManagementPage() {
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const examsQuery = useMemoFirebase(() =>
    db ? query(collection(db, "exams"), orderBy("name", "asc")) : null,
    [db]);
  const { data: exams } = useCollection<any>(examsQuery);

  const mockTestsQuery = useMemoFirebase(() =>
    db ? query(collection(db, "mockTests"), orderBy("createdAt", "desc")) : null,
    [db]);
  const { data: mockTests, loading: mocksLoading } = useCollection<any>(mockTestsQuery);

  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [activeTab, setActiveTab] = useState<"all" | "Draft" | "Published">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ examId: "all" });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const filteredMocks = useMemo(() => {
    if (!mockTests) return [];
    return mockTests.filter(mock => {
      const matchesSearch = mock.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "all" || mock.status === activeTab;
      const matchesExam = filters.examId === "all" || mock.examId === filters.examId;
      return matchesSearch && matchesTab && matchesExam;
    });
  }, [mockTests, searchQuery, activeTab, filters]);

  const handleDeleteMock = async (id: string, title: string) => {
    console.log("DELETE CLICKED - TARGET ID:", id);
    if (!db) return;
    
    // Administrative Confirmation
    const isConfirmed = confirm(`Are you sure you want to permanently delete "${title}"? This action cannot be undone.`);
    if (!isConfirmed) return;
    
    console.log("CONFIRMED - DELETING FROM FIRESTORE...");
    try {
      await deleteDoc(doc(db, "mockTests", id));
      console.log("DELETE SUCCESSFUL");
      toast({
        title: "Mock Test Deleted",
        description: `"${title}" has been removed from the platform.`,
      });
    } catch (e: any) {
      console.error("ADMIN DELETE ERROR:", e);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: e.message || "Failed to remove the document. Check permissions.",
      });
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
      toast({
        title: "Success",
        description: "Mock test duplicated as draft.",
      });
    } catch (e: any) { 
      console.error(e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to duplicate test.",
      });
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-bold">Mock <span className="text-accent">Tests</span></h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">Design and manage your examination library.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full xl:w-auto">
          <Link href="/admin/upload-json" className="flex-1 xl:flex-none">
            <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 rounded-xl gap-2 h-10 md:h-11 text-xs md:text-sm">
              <UploadCloud className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline">Ingest Module</span>
              <span className="xs:hidden">Upload</span>
            </Button>
          </Link>
          <Button
            className="flex-[1.5] xl:flex-none bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 h-10 md:h-11 shadow-lg shadow-primary/20 text-xs md:text-sm"
            onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
          >
            <Plus className="w-4 h-4 shrink-0" />
            Create Test
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white/[0.02] border border-white/5 p-3 md:p-4 rounded-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4 w-full lg:w-auto">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="bg-white/5 p-1 rounded-xl border border-white/5 shrink-0">
            <TabsList className="bg-transparent border-0 h-9">
              <TabsTrigger value="all" className="rounded-lg px-4 md:px-6 text-[10px] md:text-xs data-[state=active]:bg-primary">All</TabsTrigger>
              <TabsTrigger value="Draft" className="rounded-lg px-4 md:px-6 text-[10px] md:text-xs data-[state=active]:bg-primary">Drafts</TabsTrigger>
              <TabsTrigger value="Published" className="rounded-lg px-4 md:px-6 text-[10px] md:text-xs data-[state=active]:bg-primary">Live</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative flex-1 lg:max-w-xs min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title..."
              className="pl-10 bg-white/5 border-white/5 h-10 rounded-xl text-sm w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={filters.examId} onValueChange={(v) => setFilters(f => ({ ...f, examId: v }))}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white/5 border-white/5 h-10 rounded-xl text-xs">
              <SelectValue placeholder="All Exams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              {exams?.map((exam: any) => (
                <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden lg:flex bg-white/5 p-1 rounded-xl border border-white/5 shrink-0">
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
        <div className="flex items-center justify-center h-64"><Clock className="w-8 h-8 animate-spin text-primary opacity-20" /></div>
      ) : viewMode === 'table' ? (
        <Card className="glass border-white/10 overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm min-w-[700px]">
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
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-foreground truncate max-w-[200px] md:max-w-[300px]">{mock.title}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{exams?.find((e: any) => e.id === mock.examId)?.name || 'Unlinked'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-4 text-[10px] font-bold">
                        <div className="flex flex-col"><span>{mock.totalQuestions}</span><span className="text-muted-foreground font-normal uppercase">Qs</span></div>
                        <div className="flex flex-col"><span>{mock.durationMinutes}m</span><span className="text-muted-foreground font-normal uppercase">Time</span></div>
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
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 transition-opacity"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass border-white/10 w-48">
                          <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => { setEditingItem(mock); setIsModalOpen(true); }}><Edit2 className="w-3.5 h-3.5" /> Edit Settings</DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => handleDuplicateMock(mock)}><Copy className="w-3.5 h-3.5" /> Duplicate</DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem className="cursor-pointer gap-2 text-primary font-bold" onSelect={() => router.push(`/admin/upload-json?mockId=${mock.id}`)}><UploadCloud className="w-3.5 h-3.5" /> Upload Questions</DropdownMenuItem>
                          
                          {/* CRITICAL FIX: Wrapped in native button + asChild + onSelect(preventDefault) */}
                          <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                             <button 
                              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-destructive focus:bg-destructive/10 outline-none transition-colors cursor-default"
                              onClick={() => {
                                console.log("ADMIN: TABLE DELETE CLICKED");
                                handleDeleteMock(mock.id, mock.title);
                              }}
                             >
                               <Trash2 className="w-3.5 h-3.5" />
                               <span>Delete Mock</span>
                             </button>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {filteredMocks.map(mock => (
            <Card key={mock.id} className="glass border-white/10 p-6 flex flex-col group hover:border-primary/40 transition-all min-h-[220px]">
              <div className="flex justify-between items-start mb-4">
                <Badge variant="outline" className="bg-white/5 border-white/10 text-[9px] uppercase tracking-wider">{mock.type}</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2"><MoreVertical className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass border-white/10">
                    <DropdownMenuItem className="cursor-pointer" onSelect={() => { setEditingItem(mock); setIsModalOpen(true); }}>Edit Settings</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onSelect={() => router.push(`/admin/upload-json?mockId=${mock.id}`)}>Upload Questions</DropdownMenuItem>
                    
                    {/* CRITICAL FIX: Wrapped in native button + asChild + onSelect(preventDefault) */}
                    <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                       <button 
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-destructive focus:bg-destructive/10 outline-none transition-colors cursor-default"
                        onClick={() => {
                          console.log("ADMIN: GRID DELETE CLICKED");
                          handleDeleteMock(mock.id, mock.title);
                        }}
                       >
                         <Trash2 className="w-3.5 h-3.5" />
                         <span>Delete Mock</span>
                       </button>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <h3 className="text-lg font-bold mb-1 leading-tight truncate">{mock.title}</h3>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-6">
                {exams?.find((e: any) => e.id === mock.examId)?.name}
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                  <div className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Questions</div>
                  <div className="text-lg font-bold">{mock.totalQuestions}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                  <div className="text-[9px] text-muted-foreground uppercase font-bold mb-0.5">Duration</div>
                  <div className="text-lg font-bold">{mock.durationMinutes}m</div>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between">
                <Badge className={cn(
                  "text-[10px]",
                  mock.status === 'Published' ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-muted-foreground"
                )}>
                  {mock.status}
                </Badge>
                <Button size="sm" variant="ghost" className="text-primary gap-2 text-xs font-bold" onClick={() => router.push(`/admin/upload-json?mockId=${mock.id}`)}>
                  Add Qs <UploadCloud className="w-3.5 h-3.5" />
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
        exams={exams || []}
      />
    </div>
  );
}

function MockTestModal({ isOpen, onClose, editingItem, exams }: any) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({
    title: "", slug: "", examId: "", type: "Full Test", durationMinutes: 90, totalQuestions: 100, totalMarks: 100, negativeMarks: 0.33, isFree: true, status: "Draft"
  });

  React.useEffect(() => {
    if (editingItem) setFormData(editingItem);
    else setFormData({ title: "", slug: "", examId: "", type: "Full Test", durationMinutes: 90, totalQuestions: 100, totalMarks: 100, negativeMarks: 0.33, isFree: true, status: "Draft" });
  }, [editingItem, isOpen]);

  const handleSave = async () => {
    if (!db || !formData.title || !formData.examId) return;
    setIsSaving(true);
    try {
      const selectedExam = exams.find((e: any) => e.id === formData.examId);
      const data = {
        ...formData,
        updatedAt: serverTimestamp(),
        categoryId: selectedExam?.categoryId || "",
        categorySlug: selectedExam?.categorySlug || "",
        examSlug: selectedExam?.slug || "",
        slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      };
      if (editingItem) { 
        await updateDoc(doc(db, "mockTests", editingItem.id), data);
        toast({ title: "Updated", description: "Mock test settings synchronized." });
      }
      else { 
        await addDoc(collection(db, "mockTests"), { ...data, createdAt: serverTimestamp() });
        toast({ title: "Created", description: "New mock test added to library." });
      }
      onClose();
    } catch (e: any) { 
      console.error(e);
      toast({ variant: "destructive", title: "Save Failed", description: e.message });
    } finally { setIsSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange => !open && onClose()}>
      <DialogContent className="glass border-white/10 w-[95%] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-xl font-headline">{editingItem ? "Edit Mock Test" : "Create New Mock Test"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 py-6">
          <div className="sm:col-span-2 space-y-2">
            <Label className="text-xs uppercase font-bold text-muted-foreground">Title</Label>
            <Input className="bg-white/5 border-white/10 h-11" placeholder="e.g. RRB NTPC Phase-1 Mock 01" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-muted-foreground">Target Exam</Label>
            <Select value={formData.examId} onValueChange={(v) => setFormData({ ...formData, examId: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-11"><SelectValue placeholder="Select Exam" /></SelectTrigger>
              <SelectContent>{exams.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-muted-foreground">Mock Type</Label>
            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{MOCK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-muted-foreground">Duration (Min)</Label>
            <Input type="number" className="bg-white/5 border-white/10 h-11" value={formData.durationMinutes} onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-muted-foreground">Expected Questions</Label>
            <Input type="number" className="bg-white/5 border-white/10 h-11" value={formData.totalQuestions} onChange={(e) => setFormData({ ...formData, totalQuestions: parseInt(e.target.value) })} />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 mt-2">
            <div className="space-y-0.5">
              <Label className="font-bold">Free Accessibility</Label>
              <p className="text-[10px] text-muted-foreground">Non-premium users can attempt this test.</p>
            </div>
            <Switch checked={formData.isFree} onCheckedChange={(v) => setFormData({ ...formData, isFree: v })} />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:flex-1 border-white/10">Cancel</Button>
          <Button onClick={handleSave} className="w-full sm:flex-1 bg-primary text-white font-bold h-11" disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Save Mock Test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
