"use client";

import React, { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  UploadCloud, 
  FileJson, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Database,
  ArrowLeft,
  Zap,
  Link as LinkIcon,
  Languages,
  X
} from "lucide-react";
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase";
import { 
  collection, 
  doc, 
  writeBatch, 
  query, 
  orderBy, 
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RichTextRenderer } from "@/components/mock-test/RichTextRenderer";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { logAction } from "@/services/audit";

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalParsed: number;
    validCount: number;
    brokenCount: number;
    sections: number;
    bilingual: boolean;
    images: number;
    hasHtml: boolean;
    schemaType: string;
  };
}

function UploadJsonContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const mockIdParam = searchParams.get("mockId") || "";

  const catsQuery = useMemoFirebase(() => db ? query(collection(db, "examCategories"), orderBy("title", "asc")) : null, [db]);
  const { data: categories } = useCollection<any>(catsQuery);

  const exsQuery = useMemoFirebase(() => db ? query(collection(db, "exams"), orderBy("name", "asc")) : null, [db]);
  const { data: exams } = useCollection<any>(exsQuery);

  const mtQuery = useMemoFirebase(() => db ? query(collection(db, "mockTests"), orderBy("title", "asc")) : null, [db]);
  const { data: mockTests } = useCollection<any>(mtQuery);

  const [selectedMockId, setSelectedMockId] = useState<string>(mockIdParam);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  
  const [file, setFile] = useState<File | null>(null);
  const [normalizedContent, setNormalizedContent] = useState<{ sections: any[], questions: any[] } | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mockIdParam && mockTests && exams) {
      const mock = mockTests.find((m: any) => m.id === mockIdParam);
      if (mock) {
        setSelectedMockId(mock.id);
        setSelectedExamId(mock.examId);
        const exam = exams.find((e: any) => e.id === mock.examId);
        if (exam) setSelectedCategoryId(exam.categoryId);
      }
    }
  }, [mockIdParam, mockTests, exams]);

  const filteredExams = useMemo(() => 
    exams?.filter(e => e.categoryId === selectedCategoryId) || [], 
  [exams, selectedCategoryId]);

  const filteredMocks = useMemo(() => 
    mockTests?.filter(m => m.examId === selectedExamId) || [], 
  [mockTests, selectedExamId]);

  const sanitizeAndResolveAnswer = (q: any, options: any[]) => {
    const rawAnswer = q.answer ?? q.raw_answer_id ?? q.correct_option ?? q.correctAnswer ?? "";
    const cleanText = (val: any) => String(val).replace(/<[^>]*>?/gm, '').trim().toLowerCase();
    const normalizedRaw = cleanText(rawAnswer);

    let matched = options.find(o => cleanText(o.id) === normalizedRaw);
    if (!matched) matched = options.find(o => cleanText(o.en) === normalizedRaw || cleanText(o.hn) === normalizedRaw);
    if (!matched) matched = options.find(o => cleanText(o.en_html) === normalizedRaw || cleanText(o.hn_html) === normalizedRaw);
    
    const idx = parseInt(normalizedRaw);
    if (!matched && !isNaN(idx) && options[idx]) matched = options[idx];

    return matched?.id || "";
  };

  const processAndNormalizeJson = (json: any) => {
    let extractedSections: any[] = [];
    let rawQuestions: any[] = [];
    let schemaType = "Unknown";

    if (Array.isArray(json)) {
      rawQuestions = json;
      schemaType = "Flat Array";
    } else if (json.sections && Array.isArray(json.sections)) {
      schemaType = "Sectioned Hierarchy";
      json.sections.forEach((sec: any) => {
        const sId = (sec.id || `sec-${extractedSections.length + 1}`).toString();
        extractedSections.push({
          id: sId,
          title: typeof sec.title === 'string' ? { en: sec.title, hn: sec.title } : (sec.title || { en: 'General', hn: 'सामान्य' }),
          order: sec.order || extractedSections.length
        });
        if (sec.questions && Array.isArray(sec.questions)) {
          sec.questions.forEach((q: any) => rawQuestions.push({ ...q, sectionId: sId }));
        }
      });
    } else if (json.questions && Array.isArray(json.questions)) {
      schemaType = "Questions Keyed Object";
      rawQuestions = json.questions;
    } else {
      schemaType = "Auto-Searched Object";
      const key = Object.keys(json).find(k => Array.isArray(json[k]));
      if (key) rawQuestions = json[key];
    }

    if (extractedSections.length === 0) {
      extractedSections.push({ id: 'sec-default', title: { en: 'General', hn: 'सामान्य' }, order: 0 });
    }

    let validCount = 0;
    let brokenCount = 0;
    let fullyBilingual = true;
    let hasHtml = false;
    let totalImages = 0;

    const normalizedQuestions = rawQuestions.map((item, idx) => {
      const qId = (item.id || item.questionId || `q-${idx + 1}`).toString();
      const qData = item.question || item;
      
      const en = qData.en || qData.en_html || qData.text || qData.questionText || "";
      const hn = qData.hn || qData.hn_html || "";
      const en_html = qData.en_html || (qData.en && qData.en.includes('<') ? qData.en : "");
      const hn_html = qData.hn_html || (qData.hn && qData.hn.includes('<') ? qData.hn : "");

      const rawOptions = item.options || item.choices || [];
      const options = rawOptions.map((opt: any, oIdx: number) => ({
        id: (opt.id || `opt-${idx}-${oIdx}`).toString(),
        en: opt.en || opt.text || (typeof opt === 'string' ? opt : ""),
        hn: opt.hn || "",
        en_html: opt.en_html || "",
        hn_html: opt.hn_html || ""
      }));

      const answerId = sanitizeAndResolveAnswer(item, options);

      if (!en && !hn && !item.dom_images?.length) brokenCount++;
      else validCount++;

      if (!en || !hn) fullyBilingual = false;
      if (en_html || hn_html) hasHtml = true;
      totalImages += (item.dom_images?.length || 0);

      return {
        id: qId,
        sectionId: item.sectionId || extractedSections[0].id,
        en, hn, en_html, hn_html,
        options,
        answer: answerId,
        marks: item.marks || 1,
        negativeMarks: item.negativeMarks || 0.33,
        dom_images: item.dom_images || [],
        explanation: item.explanation || {}
      };
    });

    setNormalizedContent({ sections: extractedSections, questions: normalizedQuestions });
    setValidation({
      isValid: validCount > 0,
      errors: validCount === 0 ? ["No valid questions detected in the file."] : [],
      warnings: [],
      summary: { totalParsed: rawQuestions.length, validCount, brokenCount, sections: extractedSections.length, bilingual: fullyBilingual, images: totalImages, hasHtml, schemaType }
    });
  };

  const handleUpload = async () => {
    if (!db || !normalizedContent || !selectedMockId || !user) return;
    setIsUploading(true);
    setUploadProgress(5);
    try {
      const batch = writeBatch(db);
      normalizedContent.sections.forEach(s => {
        batch.set(doc(db, "mockTests", selectedMockId, "sections", s.id), { ...s, mockId: selectedMockId, updatedAt: serverTimestamp() });
      });
      await batch.commit();
      setUploadProgress(30);

      const qChunkSize = 50;
      for (let i = 0; i < normalizedContent.questions.length; i += qChunkSize) {
        const qBatch = writeBatch(db);
        normalizedContent.questions.slice(i, i + qChunkSize).forEach(q => {
          qBatch.set(doc(db, "mockTests", selectedMockId, "questions", q.id), { ...q, mockId: selectedMockId, status: 'Published', updatedAt: serverTimestamp() });
        });
        await qBatch.commit();
        setUploadProgress(30 + Math.floor((i / normalizedContent.questions.length) * 60));
      }

      await updateDoc(doc(db, "mockTests", selectedMockId), { status: "Published", totalQuestions: normalizedContent.questions.length, updatedAt: serverTimestamp() });
      await logAction(db, user, "import_json", selectedMockId, "mockTest", `Imported ${normalizedContent.questions.length} items.`);
      setUploadProgress(100);
      toast({ title: "Module Ingested Successfully" });
      router.push("/admin/mock-tests");
    } catch (e: any) { toast({ variant: "destructive", title: "Ingestion Failed", description: e.message }); } finally { setIsUploading(false); }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-bold">Content <span className="text-accent">Ingestion</span></h1>
          <p className="text-muted-foreground text-xs md:text-sm">Batch import examination items directly into Firestore.</p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto rounded-xl border-white/10 h-10 px-6 text-xs md:text-sm" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card className="glass border-white/10 p-5 md:p-6 space-y-5">
            <h3 className="font-bold flex items-center gap-2 text-xs md:text-sm uppercase tracking-wider text-muted-foreground"><LinkIcon className="w-4 h-4 text-primary" /> Target Test</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Hierarchy Category</label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-10 text-xs"><SelectValue placeholder="Select Category" /></SelectTrigger>
                  <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Linked Exam</label>
                <Select value={selectedExamId} onValueChange={setSelectedExamId} disabled={!selectedCategoryId}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-10 text-xs"><SelectValue placeholder="Select Exam" /></SelectTrigger>
                  <SelectContent>{filteredExams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Mock Test Module</label>
                <Select value={selectedMockId} onValueChange={setSelectedMockId} disabled={!selectedExamId}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-10 text-xs"><SelectValue placeholder="Select Mock Test" /></SelectTrigger>
                  <SelectContent>{filteredMocks.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <div 
            className={cn(
              "p-8 md:p-12 border-2 border-dashed rounded-[2rem] transition-all flex flex-col items-center justify-center gap-4 text-center cursor-pointer hover:bg-white/5",
              file ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_rgba(99,102,241,0.1)]" : "border-white/10"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setFile(f);
                const r = new FileReader();
                r.onload = (ev) => { try { processAndNormalizeJson(JSON.parse(ev.target?.result as string)); } catch (err) { toast({ variant: "destructive", title: "Parser Failure", description: "The uploaded file is not a valid JSON string." }); } };
                r.readAsText(f);
              }
            }} />
            <FileJson className={cn("w-10 h-10 md:w-12 md:h-12", file ? "text-primary" : "text-muted-foreground opacity-30")} />
            <div className="space-y-1">
               <p className="font-bold text-sm">{file ? file.name : "Choose JSON File"}</p>
               <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{file ? `${(file.size/1024).toFixed(1)} KB` : "Max 10MB recommended"}</p>
            </div>
            {file && (
              <Button variant="ghost" size="sm" className="h-7 text-[10px] rounded-full hover:bg-white/10" onClick={(e) => { e.stopPropagation(); setFile(null); setValidation(null); }}>
                <X className="w-3 h-3 mr-1" /> Reset
              </Button>
            )}
          </div>

          <Button 
            className="w-full h-12 md:h-14 bg-primary text-white rounded-xl font-bold shadow-xl gap-3 text-sm md:text-base"
            disabled={!validation?.isValid || !selectedMockId || isUploading}
            onClick={handleUpload}
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Zap className="w-5 h-5 fill-current" /> Deploy to Firestore</>}
          </Button>

          {isUploading && (
            <div className="space-y-2 p-4 bg-white/5 rounded-2xl border border-white/5 animate-in slide-in-from-top-2">
              <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-primary animate-pulse">Syncing...</span><span>{uploadProgress}%</span></div>
              <Progress value={uploadProgress} className="h-1.5 bg-white/5" />
            </div>
          )}
        </div>

        <div className="lg:col-span-8 space-y-6 w-full min-w-0">
          {validation ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className={cn(
                "p-5 md:p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between border gap-4",
                validation.isValid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              )}>
                <div className="flex items-center gap-3 text-center sm:text-left">
                  {validation.isValid ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <AlertCircle className="w-6 h-6 shrink-0" />}
                  <div className="min-w-0">
                    <span className="font-headline font-bold text-base md:text-lg block">{validation.isValid ? "Validator Passed" : "Critical Schema Issues"}</span>
                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Schema: {validation.summary.schemaType}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                   <Badge variant="outline" className="h-7 text-[10px] px-3 uppercase border-current">{validation.summary.validCount} Valid Items</Badge>
                   {validation.summary.brokenCount > 0 && <Badge variant="destructive" className="h-7 text-[10px] px-3 uppercase">{validation.summary.brokenCount} Broken</Badge>}
                </div>
              </div>

              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="bg-white/5 p-1 rounded-xl mb-4 w-full sm:w-auto overflow-x-auto hide-scrollbar flex h-auto">
                  <TabsTrigger value="preview" className="flex-1 sm:flex-none rounded-lg gap-2 text-xs py-2 md:py-1.5"><Database className="w-4 h-4" /> Data Preview</TabsTrigger>
                  <TabsTrigger value="logs" className="flex-1 sm:flex-none rounded-lg gap-2 text-xs py-2 md:py-1.5"><Languages className="w-4 h-4" /> Parser Logs</TabsTrigger>
                </TabsList>
                
                <TabsContent value="preview" className="m-0">
                  <ScrollArea className="h-[400px] md:h-[500px] border border-white/5 rounded-[2rem] bg-slate-900/50 p-4 md:p-6">
                    <div className="space-y-4 md:space-y-6">
                      {normalizedContent?.questions.slice(0, 20).map((q, i) => (
                        <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-3">
                          <div className="flex justify-between items-center"><Badge variant="outline" className="text-[9px] h-5 px-1.5">Item {i+1}</Badge><span className={q.answer ? "text-emerald-400 text-[10px] font-bold" : "text-rose-400 text-[10px] font-bold"}>{q.answer ? 'Answer Matched' : 'Unresolved Answer'}</span></div>
                          <RichTextRenderer content={q.en_html || q.en || q.hn_html || q.hn} className="text-xs md:text-sm font-medium line-clamp-3" />
                          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                             {q.options.slice(0, 4).map((o: any) => <div key={o.id} className={cn("p-2 border rounded-lg text-[9px] md:text-[10px] truncate", q.answer === o.id ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400" : "border-white/5 text-muted-foreground")}>{o.en || o.en_html || "Empty Option"}</div>)}
                          </div>
                        </div>
                      ))}
                      {normalizedContent && normalizedContent.questions.length > 20 && (
                        <p className="text-center text-[10px] text-muted-foreground uppercase font-bold py-4">... and {normalizedContent.questions.length - 20} more items</p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="logs" className="m-0">
                  <Card className="glass border-white/10 p-5 md:p-6 font-mono text-[10px] md:text-xs space-y-2 overflow-x-auto">
                    <p className="text-primary">&gt; Deep Scan Initialized...</p>
                    <p className="text-accent">&gt; Path Mapping: {validation.summary.schemaType}</p>
                    <p className="text-foreground">&gt; Total Items: {validation.summary.totalParsed}</p>
                    <p className="text-emerald-400">&gt; Valid Mappings: {validation.summary.validCount}</p>
                    <p className="text-rose-400">&gt; Content Failures: {validation.summary.brokenCount}</p>
                    <p className="text-indigo-400">&gt; Bilingual Mode: {validation.summary.bilingual ? 'Full' : 'Partial'}</p>
                    <p className="text-amber-400">&gt; Media Assets Detected: {validation.summary.images}</p>
                    <p className="text-muted-foreground">&gt; Integrity check complete.</p>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-muted-foreground opacity-30 py-24 md:py-48 border-2 border-dashed border-white/10 rounded-[3rem] text-center p-6">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 rounded-full flex items-center justify-center">
                 <FileJson className="w-8 h-8 md:w-10 md:h-10" />
              </div>
              <div className="space-y-1">
                 <p className="font-headline font-bold text-lg md:text-xl uppercase tracking-widest">Awaiting JSON Stream</p>
                 <p className="text-xs max-w-[250px] mx-auto">Upload a mock-test JSON file to begin the normalization and import process.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UploadJsonPage() {
  return (
    <Suspense fallback={<div className="h-[80vh] flex items-center justify-center w-full"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
      <UploadJsonContent />
    </Suspense>
  );
}