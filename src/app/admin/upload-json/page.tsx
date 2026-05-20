
"use client";

import React, { useState, useRef, useCallback, useMemo } from "react";
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
  History,
  FileSearch,
  CheckCircle,
  Globe,
  Lock,
  Layers,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

  const [batchConfig, setBatchConfig] = useState<any>({
    examId: "",
    typeId: "",
    subTypeId: "",
    durationMinutes: 90,
    marksPerQuestion: 1.0,
    negativeMarks: 0.33,
    passingMarks: 33,
    isFree: true,
    language: "en",
    difficulty: "Intermediate",
    status: "Published",
    attemptLimit: 0,
    instructions: "",
    tags: "",
  });

  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [isAddingSubType, setIsAddingSubType] = useState(false);
  const [newSubTypeName, setNewSubTypeName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

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
      const slug = newTypeName.toLowerCase().replace(/\s+/g, '-');
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
      const slug = newSubTypeName.toLowerCase().replace(/\s+/g, '-');
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
      for (const name of Object.keys(zip.files)) {
        const zipFile = zip.files[name];
        if (!zipFile.dir && name.endsWith('.json')) {
          const blob = await zipFile.async("blob");
          extracted.push(new File([blob], name, { type: "application/json" }));
        }
      }
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
      toast({ variant: "destructive", title: "Config Required", description: "Select target exam." });
      return;
    }

    setIsProcessing(true);
    const pending = queue.filter(q => q.status === 'pending');

    for (const item of pending) {
      try {
        updateItem(item.id, { status: 'parsing', progress: 10 });
        const content = await item.file.text();
        const json = JSON.parse(content);

        updateItem(item.id, { status: 'validating', progress: 30 });
        const questions = normalizeQuestions(json, batchConfig.marksPerQuestion, batchConfig.negativeMarks);

        if (questions.length === 0) throw new Error("No questions found.");

        updateItem(item.id, { status: 'syncing', progress: 50 });
        const exam = exams?.find(e => e.id === batchConfig.examId);
        const type = mockTypes?.find(t => t.id === batchConfig.typeId);
        const sub = subTypes?.find(s => s.id === batchConfig.subTypeId);

        const mockId = item.name.replace('.json', '').toLowerCase().replace(/[^a-z0-9]/g, '-');
        const mockRef = doc(db, "mockTests", mockId);

        // Unified Schema Implementation
        const mockData = {
          id: mockId,
          title: json.title || item.name.replace('.json', '').replace(/_/g, ' '),
          examId: batchConfig.examId,
          examName: exam?.name || "Global",
          typeId: batchConfig.typeId || "general",
          typeName: type?.title || "Full Test",
          subTypeId: batchConfig.subTypeId || "",
          subTypeName: sub?.title || "",
          totalQuestions: questions.length,
          marksPerQuestion: parseFloat(batchConfig.marksPerQuestion),
          negativeMarks: parseFloat(batchConfig.negativeMarks),
          fullMarks: questions.length * parseFloat(batchConfig.marksPerQuestion),
          durationMinutes: parseInt(batchConfig.durationMinutes) || 90,
          status: batchConfig.status,
          isFree: batchConfig.isFree,
          language: batchConfig.language,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await setDoc(mockRef, mockData, { merge: true });

        // Chunked Sync
        const CHUNK_SIZE = 50;
        for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
          const chunk = questions.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          chunk.forEach((q, idx) => {
            const qRef = doc(db, "mockTests", mockId, "questions", q.id || `q-${i + idx}`);
            batch.set(qRef, { ...q, mockId, updatedAt: serverTimestamp() });
          });
          await batch.commit();
          updateItem(item.id, { progress: 50 + Math.floor((i / questions.length) * 40) });
        }

        updateItem(item.id, { status: 'success', progress: 100 });
        setStats(prev => ({ ...prev, completed: prev.completed + 1 }));
      } catch (err: any) {
        updateItem(item.id, { status: 'failed', error: err.message });
        setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
      }
    }
    setIsProcessing(false);
    toast({ title: "Processing Finalized" });
  };

  const normalizeQuestions = (json: any, defPos: number, defNeg: number) => {
    let raw: any[] = [];
    if (Array.isArray(json)) raw = json;
    else if (json.sections) raw = json.sections.flatMap((s: any) => s.questions || []);
    else if (json.questions) raw = json.questions;

    return raw.map((q, i) => {
      const base = q.question || q;
      const sol = q.explanation || q.solution || {};
      return {
        id: q.id || q.questionId || `q-${i}`,
        en: base.en || base.text || "",
        hn: base.hn || "",
        en_html: base.en_html || base.html || "",
        hn_html: base.hn_html || "",
        options: (q.options || []).map((o: any, oi: number) => ({
          id: o.id || `opt-${oi}`,
          en: o.en || o.text || "",
          hn: o.hn || "",
          en_html: o.en_html || o.html || "",
          hn_html: o.hn_html || ""
        })),
        answer: q.answer || q.correctAnswer || "",
        marks: {
          positive: q.marks?.positive ?? defPos,
          negative: q.marks?.negative ?? defNeg,
          skip: 0
        },
        explanation: {
          en: sol.en || sol.text || "",
          hn: sol.hn || "",
          en_html: sol.en_html || sol.html || "",
          hn_html: sol.hn_html || ""
        },
        dom_images: q.dom_images || []
      };
    }).filter(q => q.en || q.en_html);
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-20 px-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold">Bulk Ingestion <span className="text-accent">Center</span></h1>
          <p className="text-muted-foreground text-xs mt-1">Sync standardized examination content to global registry.</p>
        </div>
        <div className="flex items-center gap-3">
           <Badge variant="outline" className="h-8 gap-2">Queue: {stats.total} | Success: {stats.completed}</Badge>
           <Button disabled={stats.total === 0 || isProcessing} onClick={processQueue} className="bg-primary h-10 px-8 font-bold gap-2">
             {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
             Start Batch
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
           <Card className="glass border-white/10 p-6 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase"><Layers className="w-4 h-4" /> Series Configuration</div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold opacity-60">Target Exam</Label>
                  <Select value={batchConfig.examId} onValueChange={(v) => setBatchConfig({ ...batchConfig, examId: v, typeId: "", subTypeId: "" })}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl"><SelectValue placeholder="Choose Exam" /></SelectTrigger>
                    <SelectContent className="glass">
                      {exams?.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase opacity-60">Category</Label>
                    {isAddingType ? (
                      <div className="flex gap-2"><Input className="h-12 bg-white/10" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} /><Button onClick={handleAddType} className="bg-primary h-12 px-3"><PlusCircle /></Button></div>
                    ) : (
                      <Select value={batchConfig.typeId} onValueChange={(v) => setBatchConfig({ ...batchConfig, typeId: v, subTypeId: "" })} disabled={!batchConfig.examId}>
                        <SelectTrigger className="bg-white/5 h-12"><SelectValue placeholder="Select Type" /></SelectTrigger>
                        <SelectContent className="glass">{mockTypes?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase opacity-60">Subject</Label>
                    {isAddingSubType ? (
                      <div className="flex gap-2"><Input className="h-12 bg-white/10" value={newSubTypeName} onChange={(e) => setNewSubTypeName(e.target.value)} /><Button onClick={handleAddSubType} className="bg-primary h-12 px-3"><PlusCircle /></Button></div>
                    ) : (
                      <Select value={batchConfig.subTypeId} onValueChange={(v) => setBatchConfig({ ...batchConfig, subTypeId: v })} disabled={!batchConfig.typeId}>
                        <SelectTrigger className="bg-white/5 h-12"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                        <SelectContent className="glass">{subTypes?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 uppercase"><Target className="w-4 h-4" /> Scoring Engine</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="space-y-1"><Label className="text-[10px] uppercase opacity-60">Marks / Q</Label><Input type="number" step="0.5" className="h-12 bg-white/5" value={batchConfig.marksPerQuestion} onChange={(e) => setBatchConfig({ ...batchConfig, marksPerQuestion: e.target.value })} /></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase opacity-60">Penalty</Label><Input type="number" step="0.01" className="h-12 bg-white/5" value={batchConfig.negativeMarks} onChange={(e) => setBatchConfig({ ...batchConfig, negativeMarks: e.target.value })} /></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase opacity-60">Duration (m)</Label><Input type="number" className="h-12 bg-white/5" value={batchConfig.durationMinutes} onChange={(e) => setBatchConfig({ ...batchConfig, durationMinutes: e.target.value })} /></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase opacity-60">Pass %</Label><Input type="number" className="h-12 bg-white/5" value={batchConfig.passingMarks} onChange={(e) => setBatchConfig({ ...batchConfig, passingMarks: e.target.value })} /></div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1"><Label className="text-[10px] uppercase opacity-60">Difficulty</Label><Select value={batchConfig.difficulty} onValueChange={(v) => setBatchConfig({ ...batchConfig, difficulty: v })}><SelectTrigger className="bg-white/5 h-12"><SelectValue /></SelectTrigger><SelectContent className="glass"><SelectItem value="Easy">Easy</SelectItem><SelectItem value="Intermediate">Intermediate</SelectItem><SelectItem value="Hard">Hard</SelectItem></SelectContent></Select></div>
                <div className="space-y-1"><Label className="text-[10px] uppercase opacity-60">Language</Label><Select value={batchConfig.language} onValueChange={(v) => setBatchConfig({ ...batchConfig, language: v })}><SelectTrigger className="bg-white/5 h-12"><SelectValue /></SelectTrigger><SelectContent className="glass"><SelectItem value="en">English</SelectItem><SelectItem value="hn">Hindi</SelectItem><SelectItem value="bilingual">Bilingual</SelectItem></SelectContent></Select></div>
                <div className="space-y-1"><Label className="text-[10px] uppercase opacity-60">Status</Label><Select value={batchConfig.status} onValueChange={(v) => setBatchConfig({ ...batchConfig, status: v })}><SelectTrigger className="bg-white/5 h-12"><SelectValue /></SelectTrigger><SelectContent className="glass"><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Published">Published</SelectItem></SelectContent></Select></div>
              </div>
           </Card>

           <Card className="glass border-white/10 p-6 space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-accent uppercase"><UploadCloud className="w-4 h-4" /> Data Inflow</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button variant="outline" className="h-20 flex-col gap-2 rounded-2xl border-white/10" onClick={() => fileInputRef.current?.click()}><FileJson className="w-5 h-5 text-primary" /> Raw JSON</Button>
                <Button variant="outline" className="h-20 flex-col gap-2 rounded-2xl border-white/10" onClick={() => folderInputRef.current?.click()}><FolderOpen className="w-5 h-5 text-accent" /> Folder</Button>
                <Button variant="outline" className="h-20 flex-col gap-2 rounded-2xl border-white/10" onClick={() => zipInputRef.current?.click()}><FileArchive className="w-5 h-5 text-emerald-400" /> ZIP Pack</Button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" multiple accept=".json" onChange={e => addToQueue(e.target.files || [])} />
              <input type="file" ref={folderInputRef} className="hidden" multiple {...({ webkitdirectory: "", directory: "" } as any)} onChange={e => addToQueue(e.target.files || [])} />
              <input type="file" ref={zipInputRef} className="hidden" accept=".zip" onChange={handleZipUpload} />
           </Card>
        </div>

        <div className="lg:col-span-5">
           <Card className="glass border-white/10 flex flex-col h-[700px] overflow-hidden">
              <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
                 <div className="font-bold text-sm">Parser Queue ({queue.length})</div>
                 {queue.length > 0 && !isProcessing && <Button variant="ghost" size="sm" onClick={() => setQueue([])} className="text-rose-400"><Trash2 className="w-4 h-4 mr-1" /> Clear</Button>}
              </div>
              
              <ScrollArea className="flex-1">
                 {queue.length === 0 ? (
                   <div className="h-[400px] flex flex-col items-center justify-center opacity-20 text-center p-10"><History className="w-12 h-12 mb-4" /><p className="text-xs font-bold uppercase tracking-widest">Staging Area Empty</p></div>
                 ) : (
                   <div className="divide-y divide-white/5">
                      {queue.map((item) => (
                        <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-white/[0.02]">
                           <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", item.status === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : item.status === 'failed' ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-white/5 border-white/10 text-muted-foreground")}>
                              {item.status === 'success' ? <CheckCircle2 className="w-5 h-5" /> : item.status === 'failed' ? <AlertCircle className="w-5 h-5" /> : <FileJson className="w-5 h-5" />}
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold truncate">{item.name}</span><Badge className="text-[8px] h-4 uppercase">{item.status}</Badge></div>
                              {item.status !== 'pending' && item.status !== 'success' && item.status !== 'failed' && <Progress value={item.progress} className="h-1 mt-2" />}
                              {item.error && <p className="text-[9px] text-rose-400 mt-1 truncate">{item.error}</p>}
                           </div>
                        </div>
                      ))}
                   </div>
                 )}
              </ScrollArea>
           </Card>
        </div>
      </div>
    </div>
  );
}
