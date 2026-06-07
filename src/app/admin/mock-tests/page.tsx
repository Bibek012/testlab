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
  MoreVertical,
  Send,
  Eye,
  FileJson,
  AlertCircle
} from "lucide-react";

import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase
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
  writeBatch,
  getDocs,
  where,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal
} from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { logAction } from "@/services/audit";
import { validateAndNormalizeMockTest } from "@/lib/json-validator";

export default function MockTestManagementPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [activeTab, setActiveTab] = useState<"all" | "Draft" | "Published">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const examsQuery = useMemoFirebase(() =>
    db ? query(collection(db, "exams"), orderBy("name", "asc")) : null,
    [db]);
  const { data: exams } = useCollection<any>(examsQuery);

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

  const handleDeleteMock = async (mock: any) => {
    if (!db || !user) return;

    if (!confirm(`Delete "${mock.title}" permanently?`)) return;

    setDeletingId(mock.id);

    try {
      const questionsRef = collection(db, "mockTests", mock.id, "questions");
      const qsSnap = await getDocs(questionsRef);
      const sectionsRef = collection(db, "mockTests", mock.id, "sections");
      const secSnap = await getDocs(sectionsRef);

      const batch = writeBatch(db);
      qsSnap.forEach((docItem) => batch.delete(docItem.ref));
      secSnap.forEach((docItem) => batch.delete(docItem.ref));
      batch.delete(doc(db, "mockTests", mock.id));

      await batch.commit();

      try {
        const allMocksSnapshot = await getDocs(query(collection(db, "mockTests")));
        const remainingMocks = allMocksSnapshot.docs.filter(
          (d) => d.data()?.examId === mock.examId
        );

        let totalQuestionsCount = 0;
        remainingMocks.forEach((mockDoc) => {
          totalQuestionsCount += mockDoc.data()?.totalQuestions || 0;
        });

        await updateDoc(doc(db, "exams", mock.examId), {
          mockCount: remainingMocks.length,
          questionCount: totalQuestionsCount,
          updatedAt: serverTimestamp(),
        });
      } catch (counterError) {
        console.error("Counter update failed", counterError);
      }

      await logAction(db, user, "delete_mock", mock.id, "mock_test", `Deleted: ${mock.title}`);

      toast({
        title: "Deleted Successfully",
        description: `"${mock.title}" removed completely.`,
      });

    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Delete Failed", description: error?.message || "Unknown error" });
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold">Mock Test <span className="text-accent">Manager</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Manage exam-specific series and scoring rules.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/upload-json">
            <Button variant="outline" className="rounded-xl border-white/10 gap-2 h-11">
              <UploadCloud className="w-4 h-4" /> Ingest
            </Button>
          </Link>
          <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-primary text-white rounded-xl gap-2 h-11 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> New Mock
          </Button>
        </div>
      </div>

      <Card className="glass border-white/10 overflow-hidden">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full md:w-auto">
            <TabsList className="bg-white/5 border-white/5 h-10">
              <TabsTrigger value="all" className="px-6 text-xs font-bold uppercase">All</TabsTrigger>
              <TabsTrigger value="Draft" className="px-6 text-xs font-bold uppercase">Draft</TabsTrigger>
              <TabsTrigger value="Published" className="px-6 text-xs font-bold uppercase">Live</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-10 bg-white/5 border-white/5 rounded-xl h-10 text-sm" placeholder="Search by title..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", viewMode === "table" ? "bg-white/10 text-primary" : "text-muted-foreground")} onClick={() => setViewMode("table")}><List className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", viewMode === "grid" ? "bg-white/10 text-primary" : "text-muted-foreground")} onClick={() => setViewMode("grid")}><LayoutGrid className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {mocksLoading ? (
        <div className="h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" /></div>
      ) : viewMode === "table" ? (
        <Card className="glass border-white/10 overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="py-4 px-6 font-semibold text-muted-foreground">Test Details</th>
                  <th className="py-4 px-6 font-semibold text-muted-foreground text-center">Marks per Q</th>
                  <th className="py-4 px-6 font-semibold text-muted-foreground text-center">Total Score</th>
                  <th className="py-4 px-6 font-semibold text-muted-foreground">Status</th>
                  <th className="py-4 px-6 font-semibold text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredMocks.map((mock: any) => {
                  // Fallback calculation directly inside render view frame so it never shows 0
                  const renderTotalScore = mock.fullMarks && mock.fullMarks > 0 
                    ? mock.fullMarks 
                    : (Number(mock.totalQuestions || 0) * Number(mock.marksPerQuestion || 1));

                  return (
                    <tr key={mock.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-base max-w-[220px] truncate block">
                            {mock.title}
                          </span>
                          <span className="text-[10px] text-primary font-bold uppercase tracking-widest">{mock.examName || 'Unmapped'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center font-mono">{mock.marksPerQuestion || 1}</td>
                      <td className="py-4 px-6 text-center font-bold text-accent">{renderTotalScore}</td>
                      <td className="py-4 px-6">
                        <Badge className={cn("h-6", mock.status === 'Published' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20")}>
                          {mock.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10" onClick={() => { setEditingItem(mock); setIsModalOpen(true); }}><Edit2 className="w-4 h-4" /></Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuContent align="end" className="glass border-white/10 w-48">
                                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleDuplicateMock(mock)}><Copy className="w-3.5 h-3.5" /> Duplicate</DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => window.open(`/exams/all/${mock.examId}`, '_blank')}><Eye className="w-3.5 h-3.5" /> Preview</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive gap-2 cursor-pointer focus:bg-rose-500/10" onClick={() => handleDeleteMock(mock)}><Trash2 className="w-3.5 h-3.5" /> Delete Forever</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenuPortal>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMocks.map((mock: any) => {
            const renderTotalScoreGrid = mock.fullMarks && mock.fullMarks > 0 
              ? mock.fullMarks 
              : (Number(mock.totalQuestions || 0) * Number(mock.marksPerQuestion || 1));

            return (
              <Card key={mock.id} className="glass border-white/10 p-6 flex flex-col gap-4 group hover:border-primary/40 transition-all duration-300 shadow-xl">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">{mock.title}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{mock.examName}</p>
                  </div>
                  <Badge className={cn("h-6", mock.status === 'Published' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>{mock.status}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 py-3 border-y border-white/5">
                  <div className="space-y-1"><p className="text-[10px] text-muted-foreground uppercase font-bold">Max Score</p><p className="text-xl font-bold">{renderTotalScoreGrid}</p></div>
                  <div className="space-y-1 border-l border-white/5 pl-4"><p className="text-[10px] text-muted-foreground uppercase font-bold">Time (m)</p><p className="text-xl font-bold">{mock.durationMinutes}</p></div>
                </div>

                <div className="flex justify-between items-center mt-auto pt-2">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">{mock.totalQuestions} Questions</div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-white/10" onClick={() => { setEditingItem(mock); setIsModalOpen(true); }}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-rose-500/10 text-rose-400" onClick={() => handleDeleteMock(mock)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
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
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [validatedData, setValidatedData] = useState<any>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [formData, setFormData] = useState<any>({
    title: "",
    examId: "",
    examName: "",
    typeId: "",
    typeName: "",
    subTypeId: "",
    subTypeName: "",
    durationMinutes: 90,
    totalQuestions: 0,
    marksPerQuestion: 1,
    negativeMarks: 0.33,
    skipMarks: 0,
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

  // FIX: Pre-fill editing item states securely including totalQuestions
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
        totalQuestions: editingItem.totalQuestions || 0, // Fill accurately from old document tracking
        marksPerQuestion: editingItem.marksPerQuestion || 1,
        negativeMarks: editingItem.negativeMarks || 0.33,
        skipMarks: editingItem.skipMarks || 0,
        isFree: editingItem.isFree ?? true,
        status: editingItem.status || "Draft"
      });
    } else {
      setFormData({ title: "", examId: "", examName: "", typeId: "", typeName: "", subTypeId: "", subTypeName: "", durationMinutes: 90, totalQuestions: 0, marksPerQuestion: 1, negativeMarks: 0.33, skipMarks: 0, isFree: true, status: "Draft" });
    }
    setIsAddingType(false);
    setIsAddingSubType(false);
    setJsonFile(null);
    setValidatedData(null);
    setValidationError(null);
  }, [editingItem, isOpen]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setJsonFile(file);
    setValidationError(null);
    setValidatedData(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const questions = parsed?.sections?.flatMap((s: any) => s.questions || []) || parsed?.questions || [];

      setFormData((prev: any) => ({
        ...prev,
        title: parsed.title || prev.title,
        totalQuestions: questions.length,
      }));

      const validation = validateAndNormalizeMockTest(parsed);

      if (validation.success) {
        setValidatedData(validation.data);
      } else {
        setValidationError(validation.error);
        toast({ variant: "destructive", title: "Validation Warning", description: validation.error });
      }
    } catch (err: any) {
      setValidationError("Invalid JSON file format.");
      toast({ variant: "destructive", title: "Invalid JSON", description: "Unable to detect questions from uploaded file." });
    }
  };

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
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleSave = async () => {
    if (!db || !user || !formData.title.trim() || !formData.examId) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Title and Exam are required." });
      return;
    }

    if (jsonFile && !validatedData && validationError) {
      toast({ variant: "destructive", title: "Invalid File", description: "Please fix JSON errors before saving." });
      return;
    }

    setIsSaving(true);
    try {
      const selectedExam = exams.find(e => e.id === formData.examId);
      const selectedType = mockTypes?.find(t => t.id === formData.typeId);
      const selectedSubType = subTypes?.find(s => s.id === formData.subTypeId);

      // Strict calculations checking that values never fallback to zero strings
      const computedTotalQuestions = Number(formData.totalQuestions || 0);
      const computedMarksPerQ = Number(formData.marksPerQuestion || 1);
      const fullMarks = computedTotalQuestions * computedMarksPerQ;

      const mockData = {
        ...formData,
        totalQuestions: computedTotalQuestions,
        examName: selectedExam?.name || "",
        typeName: selectedType?.title || "",
        subTypeName: selectedSubType?.title || "",
        fullMarks: fullMarks,
        slug: formData.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        updatedAt: serverTimestamp(),
      };

      if (editingItem) {
        await updateDoc(doc(db, "mockTests", editingItem.id), mockData);
        await logAction(db, user, "update_mock", editingItem.id, "mock_test", `Updated: ${formData.title}`);
      } else {
        const mockRef = await addDoc(collection(db, "mockTests"), { ...mockData, createdAt: serverTimestamp() });

        if (validatedData) {
          const secBatch = writeBatch(db);
          validatedData.sections.forEach(sec => {
            const secRef = doc(db, "mockTests", mockRef.id, "sections", sec.id);
            secBatch.set(secRef, { id: sec.id, title: sec.title, questionCount: sec.questions.length });
          });
          await secBatch.commit();

          const questions = validatedData.sections.flatMap(s => s.questions);
          const CHUNK_SIZE = 50;
          for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
            const chunk = questions.slice(i, i + CHUNK_SIZE);
            const qBatch = writeBatch(db);
            chunk.forEach(q => {
              const qRef = doc(db, "mockTests", mockRef.id, "questions", q.id);

              qBatch.set(qRef, {
                ...q,
                marks: {
                  positive: formData.marksPerQuestion,
                  negative: formData.negativeMarks,
                  skipped: formData.skipMarks
                },
                mockId: mockRef.id,
                updatedAt: serverTimestamp()
              });
            });
            await qBatch.commit();
          }
        }

        const allMocks = await getDocs(query(collection(db, "mockTests")));
        const related = allMocks.docs.filter(d => d.data()?.examId === formData.examId);
        let totalQs = 0;
        related.forEach(d => totalQs += d.data()?.totalQuestions || 0);

        await updateDoc(doc(db, "exams", formData.examId), {
          mockCount: related.length,
          questionCount: totalQs,
          updatedAt: serverTimestamp()
        });

        await logAction(db, user, "create_mock", mockRef.id, "mock_test", `Created: ${formData.title}`);
      }

      toast({ title: "Mock Test Synchronized" });
      onClose();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync Error", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg glass border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-headline font-bold">
            {editingItem ? "Edit Mock Series" : "New Mock Series"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-y border-white/5 mt-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Series Title</Label>
            <Input className="bg-white/5 border-white/10 h-11" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Target Exam</Label>
            <Select value={formData.examId} onValueChange={(v) => setFormData({ ...formData, examId: v, typeId: "", subTypeId: "" })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-11"><SelectValue placeholder="Choose Exam" /></SelectTrigger>
              <SelectContent className="glass">
                {exams?.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Category</Label>
              <button onClick={() => setIsAddingType(true)} className="text-[10px] text-primary hover:underline">+ New</button>
            </div>
            {isAddingType ? (
              <div className="flex gap-1">
                <Input size="sm" className="h-11 text-xs bg-white/10" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Name..." />
                <Button size="sm" onClick={handleAddType} className="h-11 w-11 p-0"><Plus className="w-4 h-4" /></Button>
              </div>
            ) : (
              <Select value={formData.typeId} onValueChange={(v) => setFormData({ ...formData, typeId: v, subTypeId: "" })} disabled={!formData.examId}>
                <SelectTrigger className="bg-white/5 border-white/10 h-11"><SelectValue placeholder="Select Type" /></SelectTrigger>
                <SelectContent className="glass">
                  {mockTypes?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Subject / Chapter</Label>
              <button onClick={() => setIsAddingSubType(true)} className="text-[10px] text-accent hover:underline">+ New Subject</button>
            </div>
            {isAddingSubType ? (
              <div className="flex gap-1">
                <Input size="sm" className="h-11 text-xs bg-white/10" value={newSubTypeName} onChange={(e) => setNewSubTypeName(e.target.value)} placeholder="Subject name..." />
                <Button size="sm" onClick={handleAddSubType} className="h-11 w-11 p-0 bg-accent hover:bg-accent/90"><Plus className="w-4 h-4" /></Button>
              </div>
            ) : (
              <Select value={formData.subTypeId} onValueChange={(v) => setFormData({ ...formData, subTypeId: v })} disabled={!formData.typeId}>
                <SelectTrigger className="bg-white/5 border-white/10 h-11"><SelectValue placeholder="All Subjects / General" /></SelectTrigger>
                <SelectContent className="glass">
                  <SelectItem value="none">General</SelectItem>
                  {subTypes?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">
              Ingest Testbook JSON
            </Label>
            <label className={cn(
              "flex items-center justify-center gap-3 border border-dashed rounded-2xl p-6 cursor-pointer transition-colors",
              validationError ? "border-rose-500/50 bg-rose-500/5" : "border-primary/30 bg-white/5 hover:bg-white/10"
            )}>
              <FileJson className={cn("w-5 h-5", validationError ? "text-rose-400" : "text-primary")} />
              <div className="text-sm truncate max-w-[220px]">
                {jsonFile ? jsonFile.name : "Choose JSON File"}
              </div>
              <input type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
            </label>

            {validationError && (
              <p className="text-[10px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {validationError}
              </p>
            )}
          </div>

          <div className="md:col-span-2 grid grid-cols-3 gap-4 pt-2 border-t border-white/5 mt-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Positive (+)</Label>
              <Input type="number" step="0.1" className="bg-white/5 border-white/10 h-11" value={formData.marksPerQuestion} onChange={(e) => setFormData({ ...formData, marksPerQuestion: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Negative (-)</Label>
              <Input type="number" step="0.01" className="bg-white/5 border-white/10 h-11" value={formData.negativeMarks} onChange={(e) => setFormData({ ...formData, negativeMarks: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Skip Penalty</Label>
              <Input type="number" step="0.01" className="bg-white/5 border-white/10 h-11" value={formData.skipMarks} onChange={(e) => setFormData({ ...formData, skipMarks: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Duration (min)</Label>
            <Input type="number" className="bg-white/5 border-white/10 h-11" value={formData.durationMinutes} onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Total Questions</Label>
            <Input
              type="number"
              readOnly
              value={formData.totalQuestions}
              className="bg-white/5 border-white/10 h-11 opacity-80 cursor-not-allowed"
            />
            <p className="text-[10px] text-muted-foreground">
              Auto-detected or pre-filled from saved metrics
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Lifecycle Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-11"><SelectValue /></SelectTrigger>
              <SelectContent className="glass">
                <SelectItem value="Draft">Draft (Private)</SelectItem>
                <SelectItem value="Published">Published (Live)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-1.5 pt-2 border-t border-white/5 mt-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Premium Unlocking</Label>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 h-11">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Unlocked for Free Users</span>
              <Switch checked={formData.isFree} onCheckedChange={(v) => setFormData({ ...formData, isFree: v })} />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="border-white/10 h-12 flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white font-bold h-12 flex-[2]">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Sync Series
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
