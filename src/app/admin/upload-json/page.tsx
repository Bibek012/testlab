
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
  X,
  Play,
  Trash2,
  Activity,
  History,
  CheckCircle,
  PlusCircle,
  Settings2,
  ChevronRight
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
import { logAction } from "@/services/audit";
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
  const [autoDetect, setAutoDetect] = useState(true);

  // Batch Configuration State
  const [batchConfig, setBatchConfig] = useState<any>({
    examId: "",
    typeId: "",
    subTypeId: "",
    durationMinutes: 90,
    fullMarks: 100,
    negativeMarks: 0.33,
    isFree: true,
    language: "en"
  });

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
    if (!batchConfig.examId && !autoDetect) {
      toast({ variant: "destructive", title: "Config Required", description: "Select an Exam or enable Auto-Detect." });
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
        
        // Resolve Metadata
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
          durationMinutes: batchConfig.durationMinutes,
          fullMarks: batchConfig.fullMarks,
          negativeMarks: batchConfig.negativeMarks,
          isFree: batchConfig.isFree,
          status: "Published",
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
    toast({ title: "Ingestion Batch Finalized" });
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold">Bulk Ingestion <span className="text-accent">Pipeline</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Transform folder hierarchies into dynamic mock series instantly.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           <div className="flex gap-4">
              <Stat label="Total" value={stats.total} icon={FileJson} />
              <Stat label="Success" value={stats.completed} icon={CheckCircle} color="text-emerald-400" />
              <Stat label="Failed" value={stats.failed} icon={AlertCircle} color="text-rose-400" />
           </div>
           <Button disabled={stats.total === 0 || isProcessing} onClick={processQueue} className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 shadow-xl shadow-primary/20 gap-2 px-8">
             {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
             Start Batch Ingestion
           </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
           <Card className="glass border-white/10 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-widest"><Settings2 className="w-4 h-4 text-primary" /> Batch Config</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Auto-Detect</span>
                  <Switch checked={autoDetect} onCheckedChange={setAutoDetect} />
                </div>
              </div>

              {!autoDetect && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Target Exam</Label>
                    <Select value={batchConfig.examId} onValueChange={(v) => setBatchConfig({ ...batchConfig, examId: v, typeId: "", subTypeId: "" })}>
                      <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select Exam" /></SelectTrigger>
                      <SelectContent>{exams?.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Mock Type</Label>
                      <Select value={batchConfig.typeId} onValueChange={(v) => setBatchConfig({ ...batchConfig, typeId: v, subTypeId: "" })} disabled={!batchConfig.examId}>
                        <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select Type" /></SelectTrigger>
                        <SelectContent>{mockTypes?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Sub-Type</Label>
                      <Select value={batchConfig.subTypeId} onValueChange={(v) => setBatchConfig({ ...batchConfig, subTypeId: v })} disabled={!batchConfig.typeId}>
                        <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="All Subjects" /></SelectTrigger>
                        <SelectContent>{subTypes?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Mins</Label><Input type="number" className="h-9 bg-white/5" value={batchConfig.durationMinutes} onChange={(e) => setBatchConfig({ ...batchConfig, durationMinutes: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Marks</Label><Input type="number" className="h-9 bg-white/5" value={batchConfig.fullMarks} onChange={(e) => setBatchConfig({ ...batchConfig, fullMarks: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Neg.</Label><Input type="number" className="h-9 bg-white/5" value={batchConfig.negativeMarks} onChange={(e) => setBatchConfig({ ...batchConfig, negativeMarks: e.target.value })} /></div>
              </div>
           </Card>

           <Card className="glass border-white/10 p-6 space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2"><UploadCloud className="w-4 h-4 text-accent" /> Data Sources</h3>
              <div className="grid grid-cols-1 gap-2">
                <UploadBtn label="Upload Files" icon={FileJson} onClick={() => fileInputRef.current?.click()} />
                <UploadBtn label="Recursive Folder" icon={FolderOpen} onClick={() => folderInputRef.current?.click()} />
                <UploadBtn label="ZIP Archive" icon={FileArchive} onClick={() => zipInputRef.current?.click()} />
              </div>
              <input type="file" ref={fileInputRef} className="hidden" multiple accept=".json" onChange={e => addToQueue(e.target.files || [])} />
              <input type="file" ref={folderInputRef} className="hidden" multiple {...({ webkitdirectory: "", directory: "" } as any)} onChange={e => addToQueue(e.target.files || [])} />
              <input type="file" ref={zipInputRef} className="hidden" accept=".zip" onChange={handleZipUpload} />
           </Card>
        </div>

        <div className="lg:col-span-7">
           <Card className="glass border-white/10 flex flex-col h-[650px] overflow-hidden">
              <CardHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between">
                 <div>
                    <CardTitle className="text-lg font-headline font-bold">Ingestion Queue</CardTitle>
                    <p className="text-xs text-muted-foreground">{queue.length} files total • {stats.completed} synced</p>
                 </div>
                 {queue.length > 0 && !isProcessing && (
                   <Button variant="ghost" size="sm" onClick={() => setQueue([])} className="text-rose-400 h-8 gap-2"><Trash2 className="w-3.5 h-3.5" /> Clear Queue</Button>
                 )}
              </CardHeader>
              
              <ScrollArea className="flex-1">
                 {queue.length === 0 ? (
                   <div className="h-[400px] flex flex-col items-center justify-center opacity-20 gap-4">
                      <History className="w-12 h-12" />
                      <p className="font-bold uppercase tracking-widest text-xs">Queue Empty</p>
                   </div>
                 ) : (
                   <div className="divide-y divide-white/5">
                      {queue.map((item) => (
                        <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors group">
                           <div className={cn(
                             "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                             item.status === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                             item.status === 'failed' ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                             "bg-white/5 border-white/5 text-muted-foreground"
                           )}>
                              {item.status === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
                               item.status === 'failed' ? <AlertCircle className="w-5 h-5" /> : 
                               isProcessing && item.status !== 'pending' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                               <FileJson className="w-5 h-5" />}
                           </div>
                           <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between">
                                 <span className="text-sm font-bold truncate pr-4">{item.name}</span>
                                 <Badge variant="outline" className="text-[8px] h-4 border-white/10 uppercase">{item.status}</Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground font-mono truncate">{item.path}</p>
                              {item.status !== 'pending' && item.status !== 'success' && item.status !== 'failed' && (
                                <Progress value={item.progress} className="h-0.5 bg-white/5" />
                              )}
                              {item.error && <p className="text-[9px] text-rose-400 font-bold">{item.error}</p>}
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

function Stat({ label, value, icon: Icon, color = "text-muted-foreground" }: any) {
  return (
    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10 shrink-0">
       <Icon className={cn("w-4 h-4", color)} />
       <div className="flex flex-col">
          <span className="text-sm font-bold leading-none">{value}</span>
          <span className="text-[8px] uppercase font-bold opacity-40">{label}</span>
       </div>
    </div>
  );
}

function UploadBtn({ label, icon: Icon, onClick }: any) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-white/[0.08] transition-all text-left">
       <Icon className="w-4 h-4 text-muted-foreground" />
       <span className="text-xs font-bold">{label}</span>
    </button>
  );
}
