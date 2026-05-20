"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { 
  UploadCloud, 
  FileJson, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Zap,
  FolderOpen,
  FileArchive,
  Trash2,
  Play,
  Settings2,
  PlusCircle,
  Database,
  History,
  FileSearch,
  CheckCircle,
  ChevronRight,
  Globe,
  Lock,
  Layers,
  Layout,
  MessageSquare,
  BadgeInfo,
  Target
} from "lucide-react";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp,
  setDoc,
  query,
  orderBy,
  addDoc
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";

type IngestionStatus = 'pending' | 'parsing' | 'validating' | 'syncing' | 'success' | 'failed';

interface QueueItem {
  id: string;
  file: File;
  name: string;
  path: string;
  size: number;
  status: IngestionStatus;
  progress: number;
  error?: string;
}

export default function BulkIngestionPipeline() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({ total: 0, completed: 0, failed: 0 });
  const [autoDetect, setAutoDetect] = useState(false);

  // Batch Configuration State
  const [batchConfig, setBatchConfig] = useState<any>({
    examId: "",
    typeId: "",
    subTypeId: "",
    durationMinutes: 90,
    marksPerQuestion: 1.0, // Replaced fullMarks with marksPerQuestion
    negativeMarks: 0.33,
    passingMarks: 33,
    isFree: true,
    language: "en",
    difficulty: "Intermediate",
    status: "Published",
    attemptLimit: 0,
    instructions: "",
    tags: "",
    shuffleQuestions: true,
    sectionalTiming: false
  });

  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [isAddingSubType, setIsAddingSubType] = useState(false);
  const [newSubTypeName, setNewSubTypeName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Firestore Listeners
  const examsQuery = useMemoFirebase(() => db ? query(collection(db, "exams"), orderBy("name", "asc")) : null, [db]);
  const { data: exams } = useCollection<any>(examsQuery);

  const mockTypesQuery = useMemoFirebase(() => 
    db && batchConfig.examId ? query(collection(db, "exams", batchConfig.examId, "mockTypes"), orderBy("order", "asc")) : null,
  [db, batchConfig.examId]);
  const { data: mockTypes } = useCollection<any>(mockTypesQuery);

  const subTypesQuery = useMemoFirebase(() => 
    db && batchConfig.examId && batchConfig.typeId 
      ? query(collection(db, "exams", batchConfig.examId, "mockTypes", batchConfig.typeId, "subTypes"), orderBy("order", "asc")) 
      : null,
  [db, batchConfig.examId, batchConfig.typeId]);
  const { data: subTypes } = useCollection<any>(subTypesQuery);

  const handleAddType = async () => {
    if (!db || !batchConfig.examId || !newTypeName.trim()) return;
    try {
      const slug = newTypeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await addDoc(collection(db, "exams", batchConfig.examId, "mockTypes"), {
        title: newTypeName,
        slug,
        order: Date.now(),
        isActive: true,
        createdAt: serverTimestamp()
      });
      setNewTypeName("");
      setIsAddingType(false);
      toast({ title: "Mock Type Added" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleAddSubType = async () => {
    if (!db || !batchConfig.examId || !batchConfig.typeId || !newSubTypeName.trim()) return;
    try {
      const slug = newSubTypeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await addDoc(collection(db, "exams", batchConfig.examId, "mockTypes", batchConfig.typeId, "subTypes"), {
        title: newSubTypeName,
        slug,
        order: Date.now(),
        isActive: true
      });
      setNewSubTypeName("");
      setIsAddingSubType(false);
      toast({ title: "Sub-Type Added" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const addToQueue = useCallback((files: FileList | File[]) => {
    const newItems: QueueItem[] = Array.from(files)
      .filter(f => f.name.endsWith('.json'))
      .map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        path: (file as any).webkitRelativePath || file.name,
        size: file.size,
        status: 'pending',
        progress: 0
      }));
    if (newItems.length === 0) return;
    setQueue(prev => [...prev, ...newItems]);
    setStats(prev => ({ ...prev, total: prev.total + newItems.length }));
  }, []);

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const zip = await JSZip.loadAsync(file);
      const extracted: File[] = [];
      const promises = Object.keys(zip.files).map(async (name) => {
        const zipFile = zip.files[name];
        if (!zipFile.dir && name.endsWith('.json')) {
          const blob = await zipFile.async("blob");
          extracted.push(new File([blob], name, { type: "application/json" }));
        }
      });
      await Promise.all(promises);
      addToQueue(extracted);
    } catch (err: any) {
      toast({ variant: "destructive", title: "ZIP Failed", description: err.message });
    }
  };

  const updateItem = (id: string, updates: Partial<QueueItem>) => {
    setQueue(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const processQueue = async () => {
    if (!db || !user || isProcessing) return;
    if (!batchConfig.examId) {
      toast({ variant: "destructive", title: "Config Required", description: "Please select a target exam first." });
      return;
    }

    setIsProcessing(true);
    const pending = queue.filter(q => q.status === 'pending');

    for (const item of pending) {
      try {
        updateItem(item.id, { status: 'parsing', progress: 10 });
        
        const content = await item.file.text();
        let json;
        try {
          json = JSON.parse(content);
        } catch (e) {
          throw new Error("Invalid JSON format.");
        }

        updateItem(item.id, { status: 'validating', progress: 30 });
        const questions = normalizeQuestions(json, batchConfig.marksPerQuestion, batchConfig.negativeMarks);

        if (questions.length === 0) {
          throw new Error("No valid questions detected.");
        }

        updateItem(item.id, { status: 'syncing', progress: 50 });
        
        const exam = exams?.find(e => e.id === batchConfig.examId);
        const type = mockTypes?.find(t => t.id === batchConfig.typeId);
        const sub = subTypes?.find(s => s.id === batchConfig.subTypeId);

        const mockId = item.name.replace('.json', '').toLowerCase().replace(/[^a-z0-9]/g, '-');
        const mockRef = doc(db, "mockTests", mockId);

        // Dynamically calculate full marks based on summed question weights
        const totalMarks = questions.reduce((sum, q) => sum + (q.marks?.positive || 0), 0);

        const mockData = {
          id: mockId,
          title: json.title || item.name.replace('.json', '').replace(/_/g, ' '),
          examId: batchConfig.examId,
          examName: exam?.name || "Uncategorized",
          typeId: batchConfig.typeId,
          typeName: type?.title || "Full Test",
          subTypeId: batchConfig.subTypeId,
          subTypeName: sub?.title || "",
          hierarchyPath: `${exam?.name || 'Bulk'} > ${type?.title || 'Unknown'}${sub ? ` > ${sub.title}` : ''}`,
          totalQuestions: questions.length,
          durationMinutes: parseInt(batchConfig.durationMinutes) || 90,
          fullMarks: totalMarks, // Calculated dynamically
          negativeMarks: parseFloat(batchConfig.negativeMarks) || 0.33,
          passingMarks: parseFloat(batchConfig.passingMarks) || 33,
          isFree: batchConfig.isFree,
          language: batchConfig.language,
          difficulty: batchConfig.difficulty,
          status: batchConfig.status,
          attemptLimit: parseInt(batchConfig.attemptLimit) || 0,
          instructions: batchConfig.instructions,
          tags: batchConfig.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await setDoc(mockRef, mockData, { merge: true });

        const CHUNK_SIZE = 100;
        for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
          const chunk = questions.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          chunk.forEach((q, idx) => {
            const qRef = doc(db, "mockTests", mockId, "questions", q.id || `q-${i + idx}`);
            batch.set(qRef, { ...q, mockId, status: "Verified", updatedAt: serverTimestamp() });
          });
          await batch.commit();
          const chunkProgress = 50 + Math.floor((i / questions.length) * 40);
          updateItem(item.id, { progress: chunkProgress });
        }

        updateItem(item.id, { status: 'success', progress: 100 });
        setStats(prev => ({ ...prev, completed: prev.completed + 1 }));
      } catch (err: any) {
        updateItem(item.id, { status: 'failed', error: err.message });
        setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
      }
    }
    setIsProcessing(false);
    toast({ title: "Bulk Ingestion Finalized" });
  };

  const normalizeQuestions = (json: any, defaultPos: number, defaultNeg: number) => {
    let raw: any[] = [];
    if (Array.isArray(json)) {
      raw = json;
    } else if (json.sections && Array.isArray(json.sections)) {
      raw = json.sections.flatMap((s: any) => s.questions || []);
    } else if (json.questions && Array.isArray(json.questions)) {
      raw = json.questions;
    } else if (json.data && Array.isArray(json.data.questions)) {
      raw = json.data.questions;
    }

    return raw.map((q, i) => {
      const base = q.question || q;
      const solBase = q.explanation || q.solution || (Array.isArray(q.solutions) ? q.solutions[0] : {});

      let posMark = parseFloat(defaultPos) || 1;
      let negMark = parseFloat(defaultNeg) || 0.33;
      let skipMark = 0;

      if (typeof q.marks === 'object') {
        posMark = parseFloat(q.marks.positive) ?? posMark;
        negMark = parseFloat(q.marks.negative) ?? negMark;
        skipMark = parseFloat(q.marks.skip) ?? skipMark;
      } else if (q.marks !== undefined) {
        posMark = parseFloat(q.marks) ?? posMark;
      }

      return {
        id: q.id || q.questionId || q._id || `q-${i}`,
        type: q.type || 'mcq',
        sectionId: q.sectionId || 'general',
        en: base.en || base.text || (typeof base === 'string' ? base : ""),
        hn: base.hn || "",
        en_html: base.en_html || base.html || "",
        hn_html: base.hn_html || "",
        options: (q.options || []).map((o: any, oi: number) => ({
          id: o.id || o.optionId || `opt-${oi}`,
          en: o.en || o.text || (typeof o === 'string' ? o : ""),
          hn: o.hn || "",
          en_html: o.en_html || o.html || "",
          hn_html: o.hn_html || ""
        })),
        answer: q.answer || q.correctAnswer || q.correctOption || "",
        marks: {
          positive: posMark,
          negative: negMark,
          skip: skipMark
        },
        explanation: {
          en: solBase.en || solBase.text || "",
          hn: solBase.hn || "",
          en_html: solBase.en_html || solBase.html || "",
          hn_html: solBase.hn_html || ""
        },
        dom_images: q.dom_images || base.images || base.dom_images || [],
        memory_images: q.memory_images || base.memory_images || []
      };
    }).filter(q => q.en || q.hn || q.en_html || q.hn_html || (q.dom_images && q.dom_images.length > 0));
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-bold">Bulk Ingestion <span className="text-accent">Pipeline</span></h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">Orchestrate enterprise-scale exam libraries with hierarchical sync.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
           <div className="flex gap-2">
              <Stat label="Queue" value={stats.total} icon={FileJson} />
              <Stat label="Success" value={stats.completed} icon={CheckCircle} color="text-emerald-400" />
              <Stat label="Failed" value={stats.failed} icon={AlertCircle} color="text-rose-400" />
           </div>
           <Button 
            disabled={stats.total === 0 || isProcessing} 
            onClick={processQueue} 
            className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 shadow-xl shadow-primary/20 gap-2 px-8 font-bold"
           >
             {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
             Initiate Batch
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        <div className="lg:col-span-6 space-y-6">
           <Card className="glass border-white/10 overflow-hidden shadow-2xl">
              <CardHeader className="bg-white/5 border-b border-white/5 p-5 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                      <Settings2 className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Module Parameters</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Smart Detection</span>
                    <Switch checked={autoDetect} onCheckedChange={setAutoDetect} />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-5 md:p-8 space-y-10">
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest mb-3">
                    <Layers className="w-3.5 h-3.5" /> Logical Hierarchy
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Target Exam Group</Label>
                    <Select value={batchConfig.examId} onValueChange={(v) => setBatchConfig({ ...batchConfig, examId: v, typeId: "", subTypeId: "" })}>
                      <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl text-sm"><SelectValue placeholder="Select Examination" /></SelectTrigger>
                      <SelectContent className="glass border-white/10">
                        {exams?.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Mock Category</Label>
                        {batchConfig.examId && (
                          <button onClick={() => setIsAddingType(true)} className="text-[9px] text-primary font-bold hover:underline">+ New Type</button>
                        )}
                      </div>
                      {isAddingType ? (
                        <div className="flex gap-2 animate-in slide-in-from-top-1">
                          <Input size="sm" className="h-12 bg-white/10 border-white/10 rounded-xl" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Title..." />
                          <Button size="sm" onClick={handleAddType} className="h-12 px-3 rounded-xl bg-primary"><PlusCircle className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <Select value={batchConfig.typeId} onValueChange={(v) => setBatchConfig({ ...batchConfig, typeId: v, subTypeId: "" })} disabled={!batchConfig.examId}>
                          <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl text-sm"><SelectValue placeholder="Select Type" /></SelectTrigger>
                          <SelectContent className="glass border-white/10">
                            {mockTypes?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Sub-Type / Focus</Label>
                        {batchConfig.typeId && (
                          <button onClick={() => setIsAddingSubType(true)} className="text-[9px] text-primary font-bold hover:underline">+ New Subject</button>
                        )}
                      </div>
                      {isAddingSubType ? (
                        <div className="flex gap-2">
                          <Input size="sm" className="h-12 bg-white/10 border-white/10 rounded-xl" value={newSubTypeName} onChange={(e) => setNewSubTypeName(e.target.value)} placeholder="Title..." />
                          <Button size="sm" onClick={handleAddSubType} className="h-12 px-3 rounded-xl bg-primary"><FolderPlus className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <Select value={batchConfig.subTypeId} onValueChange={(v) => setBatchConfig({ ...batchConfig, subTypeId: v })} disabled={!batchConfig.typeId}>
                          <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl text-sm"><SelectValue placeholder="Select Focus" /></SelectTrigger>
                          <SelectContent className="glass border-white/10">
                            {subTypes?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3">
                    <Target className="w-3.5 h-3.5" /> Marking & Logic
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase opacity-60 font-bold tracking-tighter">Marks / Question</Label>
                      <Input type="number" step="0.5" className="h-12 bg-white/5 rounded-xl text-center font-bold" value={batchConfig.marksPerQuestion} onChange={(e) => setBatchConfig({ ...batchConfig, marksPerQuestion: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase opacity-60 font-bold tracking-tighter">Negative Marks</Label>
                      <Input type="number" step="0.01" className="h-12 bg-white/5 rounded-xl text-center font-bold text-rose-400" value={batchConfig.negativeMarks} onChange={(e) => setBatchConfig({ ...batchConfig, negativeMarks: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase opacity-60 font-bold tracking-tighter">Pass Target (%)</Label>
                      <Input type="number" className="h-12 bg-white/5 rounded-xl text-center font-bold" value={batchConfig.passingMarks} onChange={(e) => setBatchConfig({ ...batchConfig, passingMarks: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase opacity-60 font-bold tracking-tighter">Duration (m)</Label>
                      <Input type="number" className="h-12 bg-white/5 rounded-xl text-center font-bold text-accent" value={batchConfig.durationMinutes} onChange={(e) => setBatchConfig({ ...batchConfig, durationMinutes: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-widest mb-3">
                    <Lock className="w-3.5 h-3.5" /> Access Control
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase opacity-60 font-bold tracking-tighter">Primary Language</Label>
                      <Select value={batchConfig.language} onValueChange={(v) => setBatchConfig({ ...batchConfig, language: v })}>
                        <SelectTrigger className="bg-white/5 h-12 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="glass"><SelectItem value="en">English Only</SelectItem><SelectItem value="hn">Hindi Only</SelectItem><SelectItem value="bilingual">Bilingual</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase opacity-60 font-bold tracking-tighter">Complexity</Label>
                      <Select value={batchConfig.difficulty} onValueChange={(v) => setBatchConfig({ ...batchConfig, difficulty: v })}>
                        <SelectTrigger className="bg-white/5 h-12 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="glass"><SelectItem value="Easy">Easy</SelectItem><SelectItem value="Intermediate">Intermediate</SelectItem><SelectItem value="Hard">Hard</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase opacity-60 font-bold tracking-tighter">Visibility State</Label>
                      <Select value={batchConfig.status} onValueChange={(v) => setBatchConfig({ ...batchConfig, status: v })}>
                        <SelectTrigger className="bg-white/5 h-12 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="glass"><SelectItem value="Draft">Draft Mode</SelectItem><SelectItem value="Published">Live Asset</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                       <div className="space-y-0.5">
                          <p className="text-xs font-bold">Public Lead Magnet</p>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">Enable for Free Tier</p>
                       </div>
                       <Switch checked={batchConfig.isFree} onCheckedChange={(v) => setBatchConfig({ ...batchConfig, isFree: v })} />
                    </div>
                    <div className="flex-1 p-5 rounded-2xl bg-white/5 border border-white/5 space-y-1.5">
                       <Label className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Max Attempts</Label>
                       <Input type="number" className="h-8 bg-transparent text-sm font-bold border-none p-0 focus-visible:ring-0" placeholder="Unlimited" value={batchConfig.attemptLimit || ""} onChange={(e) => setBatchConfig({ ...batchConfig, attemptLimit: e.target.value })} />
                    </div>
                  </div>
                </div>
              </CardContent>
           </Card>

           <Card className="glass border-white/10 p-5 md:p-8 space-y-5 shadow-xl">
              <div className="flex items-center gap-3">
                <UploadCloud className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-sm uppercase tracking-widest">Content Inflow</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <UploadBtn label="Raw JSON" icon={FileJson} onClick={() => fileInputRef.current?.click()} />
                <UploadBtn label="Hierarchy" icon={FolderOpen} onClick={() => folderInputRef.current?.click()} />
                <UploadBtn label="ZIP Package" icon={FileArchive} onClick={() => zipInputRef.current?.click()} />
              </div>
              <input type="file" ref={fileInputRef} className="hidden" multiple accept=".json" onChange={e => addToQueue(e.target.files || [])} />
              <input type="file" ref={folderInputRef} className="hidden" multiple {...({ webkitdirectory: "", directory: "" } as any)} onChange={e => addToQueue(e.target.files || [])} />
              <input type="file" ref={zipInputRef} className="hidden" accept=".zip" onChange={handleZipUpload} />
           </Card>
        </div>

        <div className="lg:col-span-6 space-y-6">
           <Card className="glass border-white/10 flex flex-col h-[900px] overflow-hidden shadow-2xl">
              <CardHeader className="p-5 md:p-6 border-b border-white/5 flex flex-row items-center justify-between shrink-0 bg-white/[0.02]">
                 <div>
                    <CardTitle className="text-lg font-headline font-bold">Parser Queue</CardTitle>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">{queue.length} modules staged</p>
                 </div>
                 {queue.length > 0 && !isProcessing && (
                   <Button variant="ghost" size="sm" onClick={() => setQueue([])} className="text-rose-400 h-9 gap-2 hover:bg-rose-500/10 rounded-xl px-4 font-bold text-[10px] uppercase">
                     <Trash2 className="w-4 h-4" /> Reset Queue
                   </Button>
                 )}
              </CardHeader>
              
              <ScrollArea className="flex-1 custom-scrollbar">
                 {queue.length === 0 ? (
                   <div className="h-[500px] flex flex-col items-center justify-center opacity-20 gap-6 text-center p-10">
                      <div className="p-8 rounded-[3rem] bg-white/5 border border-white/5">
                        <History className="w-16 h-16" />
                      </div>
                      <div className="space-y-2">
                        <p className="font-bold uppercase tracking-[0.2em] text-xs">Ready for intake</p>
                        <p className="text-[10px] max-w-[250px] mx-auto leading-relaxed">
                          Staging area is empty. Upload examination modules to begin the ingestion workflow.
                        </p>
                      </div>
                   </div>
                 ) : (
                   <div className="divide-y divide-white/5">
                      {queue.map((item) => (
                        <div key={item.id} className="p-5 flex items-center gap-5 hover:bg-white/[0.02] transition-all group">
                           <div className={cn(
                             "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all shadow-lg",
                             item.status === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                             item.status === 'failed' ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                             isProcessing && item.status !== 'pending' ? "bg-primary/10 border-primary/20 text-primary animate-pulse" :
                             "bg-white/5 border-white/5 text-muted-foreground"
                           )}>
                              {item.status === 'success' ? <CheckCircle2 className="w-6 h-6" /> : 
                               item.status === 'failed' ? <AlertCircle className="w-6 h-6" /> : 
                               isProcessing && item.status !== 'pending' ? <Loader2 className="w-6 h-6 animate-spin" /> :
                               <FileJson className="w-6 h-6" />}
                           </div>
                           <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center justify-between">
                                 <span className="text-sm font-bold truncate pr-4 text-foreground">{item.name}</span>
                                 <Badge variant="outline" className={cn(
                                   "text-[8px] h-4 uppercase font-bold tracking-widest",
                                   item.status === 'success' ? "border-emerald-500/30 text-emerald-400" : 
                                   item.status === 'failed' ? "border-rose-500/30 text-rose-400" : "border-white/10"
                                 )}>{item.status}</Badge>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono truncate">
                                 <span className="flex items-center gap-1"><FileSearch className="w-3 h-3" /> {(item.size / 1024).toFixed(1)} KB</span>
                                 <span className="opacity-30">|</span>
                                 <span>{item.path}</span>
                              </div>
                              {item.status !== 'pending' && item.status !== 'success' && item.status !== 'failed' && (
                                <div className="space-y-1">
                                  <Progress value={item.progress} className="h-1 bg-white/5" />
                                </div>
                              )}
                              {item.error && <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1.5 mt-1"><BadgeInfo className="w-3 h-3" /> {item.error}</p>}
                           </div>
                        </div>
                      ))}
                   </div>
                 )}
              </ScrollArea>

              <div className="p-6 bg-white/[0.04] border-t border-white/5 space-y-5">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Zap className="w-4 h-4 text-accent fill-accent" />
                       <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Intelligence Report</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground opacity-40">Ready to Ingest</span>
                 </div>
                 <div className="p-5 rounded-[1.5rem] bg-indigo-500/10 border border-indigo-500/20 shadow-inner">
                    <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                      "Batch consists of <span className="text-white font-bold">{queue.length} files</span>. 
                      Targeting <span className="text-white font-bold">{exams?.find(e => e.id === batchConfig.examId)?.name || 'the selected'}</span> series. 
                      Scoring logic set to <span className="text-emerald-400 font-bold">+{batchConfig.marksPerQuestion}</span> / question."
                    </p>
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, color = "text-muted-foreground" }: any) {
  return (
    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10 shrink-0 shadow-lg">
       <Icon className={cn("w-4 h-4", color)} />
       <div className="flex flex-col">
          <span className="text-sm font-bold leading-none">{value}</span>
          <span className="text-[8px] uppercase font-bold opacity-40 mt-1 tracking-tighter">{label}</span>
       </div>
    </div>
  );
}

function UploadBtn({ label, icon: Icon, onClick }: any) {
  return (
    <button 
      onClick={onClick} 
      className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-white/[0.08] transition-all text-left group shadow-sm"
    >
       <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
       <span className="text-xs font-bold whitespace-nowrap">{label}</span>
    </button>
  );
}
