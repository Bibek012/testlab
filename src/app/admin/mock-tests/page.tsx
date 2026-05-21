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
  ChevronRight,
  PlusCircle,
  FolderPlus,
  MoreVertical,
  Send,
  Eye,
  FileJson
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
  serverTimestamp,
  writeBatch,
  getDocs,
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

  const handleDeleteMock = async (id: string, title: string) => {
    if (!db || !user) return;

    if (!confirm(`Delete "${title}" permanently?`)) return;

    setDeletingId(id);

    try {
      // Delete questions subcollection first
      const questionsRef = collection(db, "mockTests", id, "questions");
      const questionsSnapshot = await getDocs(questionsRef);

      const batch = writeBatch(db);

      questionsSnapshot.forEach((docItem) => {
        batch.delete(docItem.ref);
      });

      // Delete parent mock document
      batch.delete(doc(db, "mockTests", id));

      await batch.commit();

      await logAction(
        db,
        user,
        "delete_mock",
        id,
        "mock_test",
        `Deleted: ${title}`
      );

      toast({
        title: "Deleted Successfully",
        description: `"${title}" removed completely.`,
      });

    } catch (error: any) {
      console.error(error);

      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error?.message || "Unknown error",
      });
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
                {filteredMocks.map((mock: any) => (
                  <tr key={mock.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground text-base">{mock.title}</span>
                        <span className="text-[10px] text-primary font-bold uppercase tracking-widest">{mock.examName || 'Unmapped'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center font-mono">{mock.marksPerQuestion || 1}</td>
                    <td className="py-4 px-6 text-center font-bold text-accent">{mock.fullMarks || 0}</td>
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
                              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => window.open(`/exams/${mock.categoryId}/${mock.examId}/mock/${mock.id}`, '_blank')}><Eye className="w-3.5 h-3.5" /> Preview</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive gap-2 cursor-pointer focus:bg-rose-500/10" onClick={() => handleDeleteMock(mock.id, mock.title)}><Trash2 className="w-3.5 h-3.5" /> Delete Forever</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenuPortal>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMocks.map((mock: any) => (
            <Card key={mock.id} className="glass border-white/10 p-6 flex flex-col gap-4 group hover:border-primary/40 transition-all duration-300 shadow-xl">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">{mock.title}</h3>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{mock.examName}</p>
                </div>
                <Badge className={cn("h-6", mock.status === 'Published' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>{mock.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-y border-white/5">
                <div className="space-y-1"><p className="text-[10px] text-muted-foreground uppercase font-bold">Max Score</p><p className="text-xl font-bold">{mock.fullMarks}</p></div>
                <div className="space-y-1 border-l border-white/5 pl-4"><p className="text-[10px] text-muted-foreground uppercase font-bold">Time (m)</p><p className="text-xl font-bold">{mock.durationMinutes}</p></div>
              </div>

              <div className="flex justify-between items-center mt-auto pt-2">
                <div className="text-[10px] font-bold text-muted-foreground uppercase">{mock.totalQuestions} Questions</div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-white/10" onClick={() => { setEditingItem(mock); setIsModalOpen(true); }}><Edit2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-rose-500/10 text-rose-400" onClick={() => handleDeleteMock(mock.id, mock.title)}><Trash2 className="w-4 h-4" /></Button>
                </div>
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
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [isUploadingJson, setIsUploadingJson] = useState(false);

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
    marksPerQuestion: 1,
    negativeMarks: 0.33,
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
        totalQuestions: editingItem.totalQuestions || 100,
        marksPerQuestion: editingItem.marksPerQuestion || 1,
        negativeMarks: editingItem.negativeMarks || 0.33,
        isFree: editingItem.isFree ?? true,
        status: editingItem.status || "Draft"
      });
    } else {
      setFormData({ title: "", examId: "", examName: "", typeId: "", typeName: "", subTypeId: "", subTypeName: "", durationMinutes: 90, totalQuestions: 100, marksPerQuestion: 1, negativeMarks: 0.33, isFree: true, status: "Draft" });
    }
    setIsAddingType(false);
    setIsAddingSubType(false);
    setJsonFile(null);
  }, [editingItem, isOpen]);

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
      toast({ title: "Type Added" });
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
      toast({ title: "Subject Added" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleSave = async () => {
    if (!db || !user || !formData.title.trim() || !formData.examId) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Title and Exam are required.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const selectedExam = exams.find(
        (e: any) => e.id === formData.examId
      );

      const selectedType = mockTypes?.find(
        (t: any) => t.id === formData.typeId
      );

      const selectedSubType = subTypes?.find(
        (s: any) => s.id === formData.subTypeId
      );

      const fullMarks =
        (formData.totalQuestions || 0) *
        (formData.marksPerQuestion || 1);

      const data = {
        ...formData,

        examName: selectedExam?.name || "",

        typeName: selectedType?.title || "",

        subTypeName: selectedSubType?.title || "",

        fullMarks,

        hierarchyPath: `${selectedExam?.name} > ${
          selectedType?.title || "General"
        }${
          selectedSubType
            ? ` > ${selectedSubType.title}`
            : ""
        }`,

        slug: formData.title
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),

        updatedAt: serverTimestamp(),
      };

      // UPDATE EXISTING MOCK
      if (editingItem) {
        await updateDoc(
          doc(db, "mockTests", editingItem.id),
          data
        );

        await logAction(
          db,
          user,
          "update_mock",
          editingItem.id,
          "mock_test",
          `Updated: ${formData.title}`
        );

        toast({
          title: "Mock Updated Successfully",
        });

        onClose();
        return;
      }

      // CREATE NEW MOCK
      const mockRef = await addDoc(
        collection(db, "mockTests"),
        {
          ...data,
          createdAt: serverTimestamp(),
        }
      );

      // JSON INGEST
      if (jsonFile) {
        setIsUploadingJson(true);

        const text = await jsonFile.text();

        const parsed = JSON.parse(text);

        const questions =
          parsed?.sections?.flatMap(
            (section: any) =>
              section.questions || []
          ) || [];

        if (!questions.length) {
          throw new Error(
            "No questions found in uploaded JSON"
          );
        }

        const batch = writeBatch(db);

        questions.forEach(
          (q: any, index: number) => {
            const questionRef = doc(
              collection(
                db,
                "mockTests",
                mockRef.id,
                "questions"
              )
            );

            batch.set(questionRef, {
              questionId:
                q.id || `question_${index}`,

              type: q.type || "mcq",

              question: q.question || {},

              options: q.options || [],

              answer: q.answer || "",

              rawAnswerId:
                q.raw_answer_id || null,

              solution: q.solution || {},

              positiveMarks:
                q?.marks?.positive ||
                formData.marksPerQuestion,

              negativeMarks:
                q?.marks?.negative ||
                formData.negativeMarks,

              marks: q.marks || {
                positive:
                  formData.marksPerQuestion,

                negative:
                  formData.negativeMarks,

                skip: 0,
              },

              status: "Verified",

              createdAt: serverTimestamp(),

              updatedAt: serverTimestamp(),
            });
          }
        );

        await batch.commit();
      }

      await logAction(
        db,
        user,
        "create_mock",
        mockRef.id,
        "mock_test",
        `Created: ${formData.title}`
      );

      toast({
        title: "Mock Created Successfully",
        description: jsonFile
          ? "Questions uploaded successfully."
          : "Mock created without questions.",
      });

      onClose();

    } catch (error: any) {
      console.error(error);

      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.message || "Something went wrong",
      });
    } finally {
      setIsSaving(false);
      setIsUploadingJson(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg glass border-white/10 max-h-[90vh] overflow-y-auto pointer-events-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-headline font-bold">
            {editingItem ? "Edit Mock Series" : "New Mock Series"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-y border-white/5 mt-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Series Title</Label>
            <Input className="bg-white/5 border-white/10 h-11" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Target Exam</Label>
            <Select value={formData.examId} onValueChange={(v) => setFormData({ ...formData, examId: v, typeId: "", subTypeId: "" })}>
              <SelectTrigger className="bg-white/5 border-white/10 h-11"><SelectValue placeholder="Choose Exam" /></SelectTrigger>
              <SelectContent className="glass">
                {exams?.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Mock Category</Label>
              <button onClick={() => setIsAddingType(true)} className="text-[10px] text-primary hover:underline">+ New</button>
            </div>
            {isAddingType ? (
              <div className="flex gap-1">
                <Input size="sm" className="h-11 text-xs bg-white/10" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Name..." />
                <Button size="sm" onClick={handleAddType} className="h-11 w-11 p-0"><PlusCircle className="w-4 h-4" /></Button>
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

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Marks per Q</Label>
            <Input type="number" step="0.1" className="bg-white/5 border-white/10 h-11" value={formData.marksPerQuestion} onChange={(e) => setFormData({ ...formData, marksPerQuestion: parseFloat(e.target.value) || 0 })} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Negative per Q</Label>
            <Input type="number" step="0.01" className="bg-white/5 border-white/10 h-11" value={formData.negativeMarks} onChange={(e) => setFormData({ ...formData, negativeMarks: parseFloat(e.target.value) || 0 })} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Questions Count</Label>
            <Input
              type="number"
              readOnly
              className="bg-white/5 border-white/10 h-11 opacity-80 cursor-not-allowed"
              value={formData.totalQuestions}
            />
            <p className="text-[10px] text-muted-foreground">
              Auto-generated from uploaded JSON file
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Duration (min)</Label>
            <Input type="number" className="bg-white/5 border-white/10 h-11" value={formData.durationMinutes} onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })} />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
              Upload Questions JSON
            </Label>

            <label className="flex items-center justify-center gap-3 border border-dashed border-primary/30 rounded-2xl p-6 cursor-pointer bg-white/5 hover:bg-white/10 transition-colors">
              <FileJson className="w-5 h-5 text-primary" />

              <div className="text-sm truncate max-w-[220px]">
                {jsonFile ? jsonFile.name : "Choose JSON File"}
              </div>

              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];

                  if (!file) return;

                  setJsonFile(file);

                  try {
                    const text = await file.text();

                    const parsed = JSON.parse(text);

                    const questions =
                      parsed?.sections?.flatMap(
                        (section: any) =>
                          section.questions || []
                      ) || [];

                    setFormData((prev: any) => ({
                      ...prev,
                      totalQuestions: questions.length,
                    }));

                  } catch (error) {
                    console.error(error);

                    toast({
                      variant: "destructive",
                      title: "Invalid JSON",
                      description:
                        "Unable to read question count from file.",
                    });
                  }
                }}
              />
            </label>

            <p className="text-[10px] text-muted-foreground">
              Upload a single mock test JSON file with questions.
            </p>
          </div>

          <div className="md:col-span-2 flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold">Standard Release</Label>
              <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">Set to Live immediately upon saving</p>
            </div>
            <Switch checked={formData.status === 'Published'} onCheckedChange={(v) => setFormData({ ...formData, status: v ? 'Published' : 'Draft' })} />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving || isUploadingJson} className="border-white/10 h-12 flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || isUploadingJson} className="bg-primary hover:bg-primary/90 text-white font-bold h-12 flex-[2] shadow-lg shadow-primary/20">
            {isSaving || isUploadingJson ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Sync Mock Test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
