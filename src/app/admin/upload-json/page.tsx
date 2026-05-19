
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
  BadgeInfo
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
    fullMarks: 100,
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
        const json = JSON.parse(content);

        updateItem(item.id, { status: 'validating', progress: 30 });
        const questions = normalizeQuestions(json);
        if (questions.length === 0) throw new Error("No valid questions found.");

        updateItem(item.id, { status: 'syncing', progress: 50 });
        
        const exam = exams?.find(e => e.id === batchConfig.examId);
        const type = mockTypes?.find(t => t.id === batchConfig.typeId);
        const sub = subTypes?.find(s => s.id === batchConfig.subTypeId);

        const mockId = item.name.replace('.json', '').toLowerCase().replace(/[^a-z0-9]/g, '-');
        const mockRef = doc(db, "mockTests", mockId);

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
          fullMarks: parseFloat(batchConfig.fullMarks) || 100,
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

        const batch = writeBatch(db);
        questions.forEach((q, idx) => {
          const qRef = doc(db, "mockTests", mockId, "questions", q.id || `q-${idx}`);
          batch.set(qRef, { ...q, mockId, status: "Verified", updatedAt: serverTimestamp() });
        });
        await batch.commit();

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

  const normalizeQuestions = (json: any) => {
    let raw: any[] = Array.isArray(json) ? json : json.questions || (json.sections ? json.sections.flatMap((s: any) => s.questions || []) : []);
    return raw.map((q, i) => ({
      id: q.id || `q-${i}`,
      en: q.en || q.text || "",
      hn: q.hn || "",
      en_html: q.en_html || "",
      hn_html: q.hn_html || "",
      options: (q.options || []).map((o: any, oi: number) => ({
        id: o.id || `opt-${oi}`,
        en: o.en || (typeof o === 'string' ? o : ""),
        hn: o.hn || ""
      })),
      answer: q.answer || q.correctAnswer || "",
      marks: q.marks || 1,
      negativeMarks: q.negativeMarks || 0.33,
      explanation: q.explanation || {}
    })).filter(q => q.en || q.en_html);
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
            className="bg-primary hover:bg-primary/90 text-white rounded-xl h-10 md:h-12 shadow-xl shadow-primary/20 gap-2 px-8 font-bold"
           >
             {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
             Initiate Batch
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left: Configuration Form */}
        <div className="lg:col-span-6 space-y-6">
           <Card className="glass border-white/10 overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5 p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                      <Settings2 className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Batch Parameters</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Detect</span>
                    <Switch checked={autoDetect} onCheckedChange={setAutoDetect} />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-4 md:p-6 space-y-8">
                {/* Section 1: Hierarchy */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest mb-2">
                    <Layers className="w-3 h-3" /> Hierarchy & Selection
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Target Exam Series</Label>
                    <Select value={batchConfig.examId} onValueChange={(v) => setBatchConfig({ ...batchConfig, examId: v, typeId: "", subTypeId: "" })}>
                      <SelectTrigger className="bg-white/5 border-white/10 h-11"><SelectValue placeholder="Select Exam" /></SelectTrigger>
                      <SelectContent>
                        {exams?.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Mock Type</Label>
                        {batchConfig.examId && (
                          <button onClick={() => setIsAddingType(true)} className="text-[9px] text-primary font-bold hover:underline">+ New</button>
                        )}
                      </div>
                      {isAddingType ? (
                        <div className="flex gap-2 animate-in slide-in-from-top-1">
                          <Input size="sm" className="h-11 bg-white/10" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Type title..." />
                          <Button size="sm" onClick={handleAddType} className="h-11 px-3"><PlusCircle className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <Select value={batchConfig.typeId} onValueChange={(v) => setBatchConfig({ ...batchConfig, typeId: v, subTypeId: "" })} disabled={!batchConfig.examId}>
                          <SelectTrigger className="bg-white/5 border-white/10 h-11"><SelectValue placeholder="Select Type" /></SelectTrigger>
                          <SelectContent>
                            {mockTypes?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Sub-Type / Subject</Label>
                        {batchConfig.typeId && (
                          <button onClick={() => setIsAddingSubType(true)} className="text-[9px] text-primary font-bold hover:underline">+ New</button>
                        )}
                      </div>
                      {isAddingSubType ? (
                        <div className="flex gap-2">
                          <Input size="sm" className="h-11 bg-white/10" value={newSubTypeName} onChange={(e) => setNewSubTypeName(e.target.value)} placeholder="Subject title..." />
                          <Button size="sm" onClick={handleAddSubType} className="h-11 px-3"><PlusCircle className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <Select value={batchConfig.subTypeId} onValueChange={(v) => setBatchConfig({ ...batchConfig, subTypeId: v })} disabled={!batchConfig.typeId}>
                          <SelectTrigger className="bg-white/5 border-white/10 h-11"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                          <SelectContent>
                            {subTypes?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 2: Logic */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">
                    <Layout className="w-3 h-3" /> Scoring & Timing
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1.5"><Label className="text-[10px] uppercase opacity-60">Full Marks</Label><Input type="number" className="h-10 bg-white/5" value={batchConfig.fullMarks} onChange={(e) => setBatchConfig({ ...batchConfig, fullMarks: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] uppercase opacity-60">Neg. Mark</Label><Input type="number" step="0.01" className="h-10 bg-white/5" value={batchConfig.negativeMarks} onChange={(e) => setBatchConfig({ ...batchConfig, negativeMarks: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] uppercase opacity-60">Passing</Label><Input type="number" className="h-10 bg-white/5" value={batchConfig.passingMarks} onChange={(e) => setBatchConfig({ ...batchConfig, passingMarks: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] uppercase opacity-60">Mins</Label><Input type="number" className="h-10 bg-white/5" value={batchConfig.durationMinutes} onChange={(e) => setBatchConfig({ ...batchConfig, durationMinutes: e.target.value })} /></div>
                  </div>
                </div>

                {/* Section 3: Access & Attributes */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-widest mb-2">
                    <Lock className="w-3 h-3" /> Access & Attributes
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase opacity-60">Language</Label>
                      <Select value={batchConfig.language} onValueChange={(v) => setBatchConfig({ ...batchConfig, language: v })}>
                        <SelectTrigger className="bg-white/5 h-10"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="en">English Only</SelectItem><SelectItem value="hn">Hindi Only</SelectItem><SelectItem value="bilingual">Bilingual</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase opacity-60">Difficulty</Label>
                      <Select value={batchConfig.difficulty} onValueChange={(v) => setBatchConfig({ ...batchConfig, difficulty: v })}>
                        <SelectTrigger className="bg-white/5 h-10"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="Easy">Easy</SelectItem><SelectItem value="Intermediate">Intermediate</SelectItem><SelectItem value="Hard">Hard</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase opacity-60">Lifecycle</Label>
                      <Select value={batchConfig.status} onValueChange={(v) => setBatchConfig({ ...batchConfig, status: v })}>
                        <SelectTrigger className="bg-white/5 h-10"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Published">Published</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                       <div className="space-y-0.5">
                          <p className="text-xs font-bold">Public Asset</p>
                          <p className="text-[9px] text-muted-foreground uppercase">Enable for Free Users</p>
                       </div>
                       <Switch checked={batchConfig.isFree} onCheckedChange={(v) => setBatchConfig({ ...batchConfig, isFree: v })} />
                    </div>
                    <div className="flex-1 p-4 rounded-xl bg-white/5 border border-white/5 space-y-1.5">
                       <Label className="text-[9px] font-bold uppercase text-muted-foreground">Attempt Limit</Label>
                       <Input type="number" className="h-8 bg-transparent" placeholder="0 = No limit" value={batchConfig.attemptLimit} onChange={(e) => setBatchConfig({ ...batchConfig, attemptLimit: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Section 4: Content Details */}
                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">
                    <MessageSquare className="w-3 h-3" /> Content & Metadata
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                       <Label className="text-[10px] uppercase opacity-60">Instructions (Markdown)</Label>
                       <Textarea className="bg-white/5 min-h-[80px] text-xs" value={batchConfig.instructions} onChange={(e) => setBatchConfig({ ...batchConfig, instructions: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[10px] uppercase opacity-60">Search Tags (Comma separated)</Label>
                       <Input className="bg-white/5 h-10 text-xs" placeholder="ssc, math, algebra, 2024" value={batchConfig.tags} onChange={(e) => setBatchConfig({ ...batchConfig, tags: e.target.value })} />
                    </div>
                  </div>
                </div>
              </CardContent>
           </Card>

           <Card className="glass border-white/10 p-4 md:p-6 space-y-4">
              <div className="flex items-center gap-3">
                <UploadCloud className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-sm uppercase tracking-widest">Ingestion Sources</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <UploadBtn label="JSON Files" icon={FileJson} onClick={() => fileInputRef.current?.click()} />
                <UploadBtn label="Folder" icon={FolderOpen} onClick={() => folderInputRef.current?.click()} />
                <UploadBtn label="ZIP Archive" icon={FileArchive} onClick={() => zipInputRef.current?.click()} />
              </div>
              <input type="file" ref={fileInputRef} className="hidden" multiple accept=".json" onChange={e => addToQueue(e.target.files || [])} />
              <input type="file" ref={folderInputRef} className="hidden" multiple {...({ webkitdirectory: "", directory: "" } as any)} onChange={e => addToQueue(e.target.files || [])} />
              <input type="file" ref={zipInputRef} className="hidden" accept=".zip" onChange={handleZipUpload} />
           </Card>
        </div>

        {/* Right: Queue & Stats */}
        <div className="lg:col-span-6 space-y-6">
           <Card className="glass border-white/10 flex flex-col h-[850px] overflow-hidden">
              <CardHeader className="p-4 md:p-6 border-b border-white/5 flex flex-row items-center justify-between shrink-0">
                 <div>
                    <CardTitle className="text-lg font-headline font-bold">Ingestion Queue</CardTitle>
                    <p className="text-xs text-muted-foreground">{queue.length} modules staged for processing</p>
                 </div>
                 {queue.length > 0 && !isProcessing && (
                   <Button variant="ghost" size="sm" onClick={() => setQueue([])} className="text-rose-400 h-8 gap-2 hover:bg-rose-500/10">
                     <Trash2 className="w-3.5 h-3.5" /> Clear
                   </Button>
                 )}
              </CardHeader>
              
              <ScrollArea className="flex-1">
                 {queue.length === 0 ? (
                   <div className="h-[500px] flex flex-col items-center justify-center opacity-20 gap-4">
                      <History className="w-16 h-16" />
                      <div className="text-center">
                        <p className="font-bold uppercase tracking-widest text-xs">Ready for intake</p>
                        <p className="text-[10px] max-w-[200px] mt-1">Upload JSON files from your dashboard or local database dumps.</p>
                      </div>
                   </div>
                 ) : (
                   <div className="divide-y divide-white/5">
                      {queue.map((item) => (
                        <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors group">
                           <div className={cn(
                             "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all",
                             item.status === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                             item.status === 'failed' ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                             isProcessing && item.status !== 'pending' ? "bg-primary/10 border-primary/20 text-primary" :
                             "bg-white/5 border-white/5 text-muted-foreground"
                           )}>
                              {item.status === 'success' ? <CheckCircle2 className="w-6 h-6" /> : 
                               item.status === 'failed' ? <AlertCircle className="w-6 h-6" /> : 
                               isProcessing && item.status !== 'pending' ? <Loader2 className="w-6 h-6 animate-spin" /> :
                               <FileJson className="w-6 h-6" />}
                           </div>
                           <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center justify-between">
                                 <span className="text-sm font-bold truncate pr-4">{item.name}</span>
                                 <Badge variant="outline" className={cn(
                                   "text-[8px] h-4 uppercase",
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
                              {item.error && <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1.5"><BadgeInfo className="w-3 h-3" /> {item.error}</p>}
                           </div>
                        </div>
                      ))}
                   </div>
                 )}
              </ScrollArea>

              <div className="p-4 md:p-6 bg-white/[0.02] border-t border-white/5 space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Zap className="w-4 h-4 text-accent fill-accent" />
                       <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Intelligence Report</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">Ready to Ingest</span>
                 </div>
                 <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                    <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                      "Batch consists of <span className="text-white font-bold">{queue.length} files</span>. 
                      Targeting <span className="text-white font-bold">{exams?.find(e => e.id === batchConfig.examId)?.name || '...'}</span> Exam series. 
                      Scoring set to <span className="text-emerald-400 font-bold">+{batchConfig.fullMarks}</span> / <span className="text-rose-400 font-bold">-{batchConfig.negativeMarks}</span>."
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
    <div className="flex items-center gap-3 bg-white/5 px-3 md:px-4 py-1.5 md:py-2 rounded-xl border border-white/10 shrink-0">
       <Icon className={cn("w-3.5 h-3.5 md:w-4 md:h-4", color)} />
       <div className="flex flex-col">
          <span className="text-xs md:text-sm font-bold leading-none">{value}</span>
          <span className="text-[8px] uppercase font-bold opacity-40 mt-0.5">{label}</span>
       </div>
    </div>
  );
}

function UploadBtn({ label, icon: Icon, onClick }: any) {
  return (
    <button 
      onClick={onClick} 
      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-white/[0.08] transition-all text-left group"
    >
       <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
       <span className="text-xs font-bold whitespace-nowrap">{label}</span>
    </button>
  );
}
