
"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { 
  UploadCloud, 
  FileJson, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Database,
  ArrowLeft,
  Zap,
  FolderOpen,
  FileArchive,
  X,
  Play,
  Trash2,
  ChevronDown,
  ChevronUp,
  Activity,
  BarChart3,
  Clock,
  History,
  CheckCircle,
  FileText
} from "lucide-react";
import { useFirestore, useUser } from "@/firebase";
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp,
  updateDoc,
  setDoc,
  getDocs,
  query,
  where,
  limit
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { logAction } from "@/services/audit";
import JSZip from "jszip";

// --- Types & Interfaces ---

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
  parsedData?: any;
  metadata?: any;
}

interface IngestionStats {
  total: number;
  completed: number;
  failed: number;
  processing: number;
  startTime: number | null;
  endTime: number | null;
}

// --- Component ---

export default function BulkIngestionPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [concurrency, setConcurrency] = useState(5);
  const [stats, setStats] = useState<IngestionStats>({
    total: 0, completed: 0, failed: 0, processing: 0, startTime: null, endTime: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // --- Logic: Queue Management ---

  const addToQueue = useCallback((files: FileList | File[], pathPrefix: string = "") => {
    const newItems: QueueItem[] = Array.from(files)
      .filter(f => f.name.endsWith('.json'))
      .map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        path: (file as any).webkitRelativePath || pathPrefix + file.name,
        size: file.size,
        status: 'pending',
        progress: 0
      }));

    if (newItems.length === 0) {
      toast({ variant: "destructive", title: "No JSON Files Found", description: "The selection did not contain any valid .json files." });
      return;
    }

    setQueue(prev => [...prev, ...newItems]);
    setStats(prev => ({ ...prev, total: prev.total + newItems.length }));
  }, [toast]);

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast({ title: "Extracting Archive", description: "Reading ZIP contents..." });
    try {
      const zip = await JSZip.loadAsync(file);
      const extractedFiles: File[] = [];
      
      const promises = Object.keys(zip.files).map(async (filename) => {
        const zipFile = zip.files[filename];
        if (!zipFile.dir && filename.endsWith('.json')) {
          const blob = await zipFile.async("blob");
          extractedFiles.push(new File([blob], filename, { type: "application/json" }));
        }
      });

      await Promise.all(promises);
      addToQueue(extractedFiles, "ZIP/");
    } catch (err: any) {
      toast({ variant: "destructive", title: "ZIP Extraction Failed", description: err.message });
    }
  };

  // --- Logic: Ingestion Pipeline ---

  const processQueue = async () => {
    if (!db || !user || isProcessing) return;
    setIsProcessing(true);
    setStats(prev => ({ ...prev, startTime: Date.now(), endTime: null }));

    const pendingItems = queue.filter(item => item.status === 'pending');
    let completedCount = stats.completed;
    let failedCount = stats.failed;

    // Concurrency Worker Loop
    const work = async () => {
      while (true) {
        const item = pendingItems.shift();
        if (!item) break;

        try {
          await ingestFile(item);
          completedCount++;
        } catch (err) {
          failedCount++;
        }
        
        setStats(prev => ({ ...prev, completed: completedCount, failed: failedCount }));
      }
    };

    const workers = Array(Math.min(concurrency, pendingItems.length)).fill(null).map(() => work());
    await Promise.all(workers);

    setIsProcessing(false);
    setStats(prev => ({ ...prev, endTime: Date.now() }));
    toast({ title: "Ingestion Batch Complete", description: `Successfully processed ${completedCount} mock tests.` });
  };

  const ingestFile = async (item: QueueItem) => {
    updateItemStatus(item.id, 'parsing', 10);

    const content = await readFile(item.file);
    let json: any;
    try {
      json = JSON.parse(content);
    } catch (e) {
      updateItemStatus(item.id, 'failed', 0, "Invalid JSON format");
      throw e;
    }

    updateItemStatus(item.id, 'validating', 30);
    const { normalized, metadata } = normalizeMockData(json, item);

    if (normalized.questions.length === 0) {
      updateItemStatus(item.id, 'failed', 0, "No valid questions detected");
      throw new Error("Empty questions");
    }

    updateItemStatus(item.id, 'syncing', 50);
    
    try {
      // 1. Resolve or Create Hierarchy (Exam Category -> Exam)
      // This is a simplified version of hierarchy resolution for the bulk ingestor
      const mockId = metadata.mockSlug || Math.random().toString(36).substr(2, 9);
      
      // 2. Write Mock Test Root
      const mockRef = doc(db, "mockTests", mockId);
      await setDoc(mockRef, {
        id: mockId,
        title: metadata.title || item.name.replace('.json', ''),
        examId: metadata.exam || "General",
        type: metadata.type || "Full Test",
        totalQuestions: normalized.questions.length,
        durationMinutes: metadata.duration || 90,
        status: "Published",
        isFree: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 3. Write Questions in Batches (Firestore limit 500)
      const qBatchSize = 100;
      for (let i = 0; i < normalized.questions.length; i += qBatchSize) {
        const batch = writeBatch(db);
        const chunk = normalized.questions.slice(i, i + qBatchSize);
        chunk.forEach((q: any) => {
          const qRef = doc(db, "mockTests", mockId, "questions", q.id || Math.random().toString(36).substr(2, 9));
          batch.set(qRef, { ...q, mockId, updatedAt: serverTimestamp() });
        });
        await batch.commit();
        updateItemStatus(item.id, 'syncing', 50 + Math.floor((i / normalized.questions.length) * 40));
      }

      await logAction(db, user, "bulk_ingest_file", mockId, "mockTest", `Ingested via Bulk Pipeline: ${item.path}`);
      updateItemStatus(item.id, 'success', 100);
    } catch (err: any) {
      updateItemStatus(item.id, 'failed', 0, err.message);
      throw err;
    }
  };

  // --- Helpers ---

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const updateItemStatus = (id: string, status: IngestionStatus, progress: number, error?: string) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, status, progress, error } : item));
  };

  const normalizeMockData = (json: any, item: QueueItem) => {
    // Advanced Normalization Logic
    // Detects structure from naked arrays, keyed objects, or sectioned hierarchies
    let rawQuestions: any[] = [];
    if (Array.isArray(json)) rawQuestions = json;
    else if (json.questions && Array.isArray(json.questions)) rawQuestions = json.questions;
    else if (json.sections && Array.isArray(json.sections)) {
      json.sections.forEach((s: any) => {
        if (s.questions) rawQuestions.push(...s.questions.map((q: any) => ({ ...q, sectionId: s.id })));
      });
    }

    const questions = rawQuestions.map((q, idx) => {
      const data = q.question || q;
      return {
        id: q.id || `q-${idx}`,
        en: data.en || data.text || data.questionText || "",
        hn: data.hn || "",
        en_html: data.en_html || "",
        hn_html: data.hn_html || "",
        options: (q.options || q.choices || []).map((o: any, oIdx: number) => ({
          id: o.id || `opt-${oIdx}`,
          en: o.en || (typeof o === 'string' ? o : ""),
          hn: o.hn || ""
        })),
        answer: q.answer || q.correct_option || q.correctAnswer || "",
        marks: q.marks || 1,
        negativeMarks: q.negativeMarks || 0.33,
        explanation: q.explanation || {}
      };
    }).filter(q => q.en || q.en_html || q.hn || q.hn_html);

    // Metadata extraction from path: "SSC/Math/Geometry.json"
    const pathParts = item.path.split('/');
    const metadata = {
      title: json.title || item.name.replace('.json', '').replace(/_/g, ' '),
      exam: pathParts[0] !== "ZIP" ? pathParts[0] : "General",
      subject: pathParts[1] || "General",
      type: json.type || "Full Test",
      duration: json.duration || 90,
      mockSlug: item.name.replace('.json', '').toLowerCase().replace(/[^a-z0-9]/g, '-')
    };

    return { normalized: { questions }, metadata };
  };

  const clearQueue = () => {
    if (isProcessing) return;
    setQueue([]);
    setStats({ total: 0, completed: 0, failed: 0, processing: 0, startTime: null, endTime: null });
  };

  // --- UI Components ---

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold">Massive <span className="text-accent">Ingestion Pipeline</span></h1>
          <p className="text-muted-foreground text-sm mt-1">High-performance bulk import for enterprise-scale exam databases.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           <div className="grid grid-cols-2 md:flex gap-4">
              <StatMini label="Files" value={stats.total} icon={FileJson} />
              <StatMini label="Success" value={stats.completed} icon={CheckCircle} color="text-emerald-400" />
              <StatMini label="Failed" value={stats.failed} icon={AlertCircle} color="text-rose-400" />
           </div>
           <Button 
            disabled={stats.total === 0 || isProcessing} 
            onClick={processQueue}
            className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 px-8 h-12 shadow-xl shadow-primary/20"
           >
             {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
             {isProcessing ? "Processing Queue..." : "Start Ingestion"}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload Controls */}
        <div className="lg:col-span-4 space-y-6">
           <Card className="glass border-white/10 p-8 space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-12 transition-transform">
                <UploadCloud className="w-24 h-24 text-primary" />
              </div>
              
              <div className="space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2"><UploadCloud className="w-5 h-5 text-primary" /> Data Sources</h3>
                <div className="grid grid-cols-1 gap-3">
                   <UploadButton 
                    label="Choose Folder" 
                    desc="Recursive directory upload" 
                    icon={FolderOpen} 
                    onClick={() => folderInputRef.current?.click()} 
                   />
                   <UploadButton 
                    label="Upload ZIP" 
                    desc="Auto-extract & process" 
                    icon={FileArchive} 
                    onClick={() => zipInputRef.current?.click()} 
                   />
                   <UploadButton 
                    label="Select Files" 
                    desc="Batch select JSON files" 
                    icon={FileJson} 
                    onClick={() => fileInputRef.current?.click()} 
                   />
                </div>

                <input type="file" ref={fileInputRef} className="hidden" multiple accept=".json" onChange={e => addToQueue(e.target.files || [])} />
                <input type="file" ref={folderInputRef} className="hidden" multiple {...({ webkitdirectory: "", directory: "" } as any)} onChange={e => addToQueue(e.target.files || [])} />
                <input type="file" ref={zipInputRef} className="hidden" accept=".zip" onChange={handleZipUpload} />
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Concurrency</span>
                    <Badge variant="outline" className="text-primary border-primary/20">{concurrency} Threads</Badge>
                 </div>
                 <input 
                  type="range" min="1" max="20" value={concurrency} 
                  onChange={e => setConcurrency(parseInt(e.target.value))} 
                  className="w-full accent-primary bg-white/5 h-2 rounded-full cursor-pointer" 
                 />
                 <p className="text-[10px] text-muted-foreground italic text-center">Process multiple files in parallel for maximum speed.</p>
              </div>

              {queue.length > 0 && (
                <Button variant="ghost" className="w-full text-rose-400 hover:bg-rose-400/10 h-10 rounded-xl gap-2" onClick={clearQueue} disabled={isProcessing}>
                   <Trash2 className="w-4 h-4" /> Clear All
                </Button>
              )}
           </Card>

           <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] space-y-4">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
                 <Zap className="w-4 h-4 fill-current" /> Auto-Categorization
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                 "Our engine extracts exam hierarchy from your folder structure. Folders like <span className="text-white">SSC/CGL/Math</span> will automatically map to the correct Series, Listing, and Subject."
              </p>
           </div>
        </div>

        {/* Right Column: Queue Display */}
        <div className="lg:col-span-8">
           <Card className="glass border-white/10 flex flex-col h-[700px] overflow-hidden">
              <CardHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between">
                 <div>
                    <CardTitle className="text-lg font-headline font-bold">Ingestion Queue</CardTitle>
                    <p className="text-xs text-muted-foreground">{queue.length} files total • {queue.filter(q => q.status === 'success').length} synced</p>
                 </div>
                 {isProcessing && (
                   <div className="flex items-center gap-4 text-xs font-bold text-accent">
                      <div className="flex items-center gap-2 bg-accent/10 px-3 py-1.5 rounded-full border border-accent/20">
                         <Activity className="w-3 h-3 animate-pulse" />
                         Active Pipeline
                      </div>
                   </div>
                 )}
              </CardHeader>
              
              <ScrollArea className="flex-1">
                 {queue.length === 0 ? (
                   <div className="h-[500px] flex flex-col items-center justify-center text-center opacity-20 gap-4">
                      <History className="w-16 h-16" />
                      <p className="font-headline font-bold text-xl uppercase tracking-widest">Queue is Empty</p>
                   </div>
                 ) : (
                   <div className="divide-y divide-white/5">
                      {queue.map((item) => (
                        <div key={item.id} className="p-4 flex items-center gap-4 group hover:bg-white/[0.02] transition-colors">
                           <div className={cn(
                             "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                             item.status === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                             item.status === 'failed' ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                             item.status === 'pending' ? "bg-white/5 border-white/5 text-muted-foreground" :
                             "bg-primary/10 border-primary/20 text-primary"
                           )}>
                              {item.status === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
                               item.status === 'failed' ? <AlertCircle className="w-5 h-5" /> : 
                               item.status === 'pending' ? <FileJson className="w-5 h-5" /> :
                               <Loader2 className="w-5 h-5 animate-spin" />}
                           </div>
                           
                           <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between">
                                 <span className="text-sm font-bold truncate pr-4">{item.name}</span>
                                 <Badge variant="outline" className="text-[9px] uppercase tracking-tighter h-5 border-white/10">{item.status}</Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground font-mono truncate">{item.path}</p>
                              {(item.status === 'syncing' || item.status === 'parsing' || item.status === 'validating') && (
                                <Progress value={item.progress} className="h-1 bg-white/5" />
                              )}
                              {item.error && <p className="text-[10px] text-rose-400 font-bold">{item.error}</p>}
                           </div>

                           <div className="shrink-0 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-rose-400"
                                onClick={() => setQueue(prev => prev.filter(q => q.id !== item.id))}
                                disabled={isProcessing}
                              >
                                 <X className="w-4 h-4" />
                              </Button>
                           </div>
                        </div>
                      ))}
                   </div>
                 )}
              </ScrollArea>

              {queue.length > 0 && (
                <div className="p-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                   <span>Storage Load: {(queue.reduce((acc, curr) => acc + curr.size, 0) / 1024 / 1024).toFixed(2)} MB</span>
                   <span>Processing Batch ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
                </div>
              )}
           </Card>
        </div>
      </div>
    </div>
  );
}

// --- Internal Sub-Components ---

function StatMini({ label, value, icon: Icon, color = "text-muted-foreground" }: any) {
  return (
    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10 shrink-0">
       <Icon className={cn("w-4 h-4", color)} />
       <div className="flex flex-col">
          <span className="text-sm font-bold font-headline leading-none">{value}</span>
          <span className="text-[8px] uppercase tracking-widest font-bold opacity-40">{label}</span>
       </div>
    </div>
  );
}

function UploadButton({ label, desc, icon: Icon, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/40 hover:bg-white/[0.08] transition-all group text-left w-full"
    >
       <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-all">
          <Icon className="w-5 h-5" />
       </div>
       <div className="flex-1">
          <div className="text-sm font-bold">{label}</div>
          <p className="text-[10px] text-muted-foreground">{desc}</p>
       </div>
    </button>
  );
}
