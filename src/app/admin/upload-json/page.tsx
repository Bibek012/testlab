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
  X,
  Zap,
  Link as LinkIcon,
  Info,
  Languages
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
  const { data: categories } = useCollection(catsQuery);

  const exsQuery = useMemoFirebase(() => db ? query(collection(db, "exams"), orderBy("name", "asc")) : null, [db]);
  const { data: exams } = useCollection(exsQuery);

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

  // Auto-select hierarchy if mockId is provided in URL
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

  const normalizeText = (val: any): string => {
    if (val === null || val === undefined) return "";
    return String(val).replace(/<[^>]*>?/gm, '').trim().toLowerCase();
  };

  const processAndNormalizeJson = (json: any) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let extractedSections: any[] = [];
    let rawQuestions: any[] = [];
    let schemaType = "Unknown";

    if (Array.isArray(json)) {
      rawQuestions = json;
      schemaType = "Flat Array";
    } else if (json.sections && Array.isArray(json.sections)) {
      schemaType = "Sectioned Object";
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
      rawQuestions = json.questions;
      schemaType = "Questions Key";
    } else {
      schemaType = "Dynamic Search";
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

    const normalizedQuestions = rawQuestions.map((q, idx) => {
      const qId = (q.id || q.questionId || `q-${idx + 1}`).toString();
      const en = q.en || q.question?.en || q.en_html || "";
      const hn = q.hn || q.question?.hn || q.hn_html || "";
      
      const rawOptions = q.options || q.choices || [];
      const options = rawOptions.map((opt: any, oIdx: number) => ({
        id: (opt.id || `opt-${idx}-${oIdx}`).toString(),
        en: opt.en || opt.text || "",
        hn: opt.hn || "",
        en_html: opt.en_html || "",
        hn_html: opt.hn_html || ""
      }));

      // Find answer
      const rawAns = q.answer || q.raw_answer_id || "";
      const normAns = normalizeText(rawAns);
      const matched = options.find((o: any) => normalizeText(o.id) === normAns || normalizeText(o.en) === normAns || normalizeText(o.hn) === normAns);
      const answerId = matched?.id || (options[parseInt(rawAns)]?.id) || "";

      if (!en && !hn) brokenCount++;
      else validCount++;

      if (!en || !hn) fullyBilingual = false;
      if (q.en_html || q.hn_html) hasHtml = true;
      totalImages += (q.dom_images?.length || 0);

      return { id: qId, sectionId: q.sectionId || extractedSections[0].id, en, hn, en_html: q.en_html, hn_html: q.hn_html, options, answer: answerId, marks: q.marks || 1, negativeMarks: q.negativeMarks || 0.33, dom_images: q.dom_images || [], explanation: q.explanation || {} };
    });

    setNormalizedContent({ sections: extractedSections, questions: normalizedQuestions });
    setValidation({
      isValid: validCount > 0,
      errors, warnings,
      summary: { totalParsed: rawQuestions.length, validCount, brokenCount, sections: extractedSections.length, bilingual: fullyBilingual, images: totalImages, hasHtml, schemaType }
    });
  };

  const handleUpload = async () => {
    if (!db || !normalizedContent || !selectedMockId || !user) return;
    setIsUploading(true);
    setUploadProgress(10);
    try {
      const batch = writeBatch(db);
      normalizedContent.sections.forEach(s => {
        batch.set(doc(db, "mockTests", selectedMockId, "sections", s.id), { ...s, mockId: selectedMockId, updatedAt: serverTimestamp() });
      });
      await batch.commit();
      setUploadProgress(40);

      const qChunkSize = 100;
      for (let i = 0; i < normalizedContent.questions.length; i += qChunkSize) {
        const qBatch = writeBatch(db);
        normalizedContent.questions.slice(i, i + qChunkSize).forEach(q => {
          qBatch.set(doc(db, "mockTests", selectedMockId, "questions", q.id), { ...q, mockId: selectedMockId, status: 'Published', updatedAt: serverTimestamp() });
        });
        await qBatch.commit();
        setUploadProgress(40 + Math.floor((i / normalizedContent.questions.length) * 50));
      }

      await updateDoc(doc(db, "mockTests", selectedMockId), { status: "Published", totalQuestions: normalizedContent.questions.length, updatedAt: serverTimestamp() });
      await logAction(db, user, "import_json", selectedMockId, "mockTest", `Imported ${normalizedContent.questions.length} items.`);
      setUploadProgress(100);
      toast({ title: "Import Successful" });
      router.push("/admin/mock-tests");
    } catch (e: any) { toast({ variant: "destructive", title: "Failed", description: e.message }); } finally { setIsUploading(false); }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Content <span className="text-accent">Ingestion</span></h1>
          <p className="text-muted-foreground text-sm">Industrial-grade JSON normalizer and Firestore batch importer.</p>
        </div>
        <Button variant="outline" className="rounded-xl border-white/10" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" /> Return</Button>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card className="glass border-white/10 p-6 space-y-5">
            <h3 className="font-bold flex items-center gap-2 text-sm"><LinkIcon className="w-4 h-4 text-primary" /> Target Hierarchy</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Category</label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Choose Category" /></SelectTrigger>
                  <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Exam</label>
                <Select value={selectedExamId} onValueChange={setSelectedExamId} disabled={!selectedCategoryId}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Choose Exam" /></SelectTrigger>
                  <SelectContent>{filteredExams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Mock Test</label>
                <Select value={selectedMockId} onValueChange={setSelectedMockId} disabled={!selectedExamId}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Choose Mock" /></SelectTrigger>
                  <SelectContent>{filteredMocks.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <div 
            className={cn("p-10 border-2 border-dashed rounded-[2rem] transition-all flex flex-col items-center justify-center gap-4 text-center cursor-pointer hover:bg-white/5", file ? "border-primary/50 bg-primary/5" : "border-white/10")}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setFile(f);
                const r = new FileReader();
                r.onload = (ev) => { try { processAndNormalizeJson(JSON.parse(ev.target?.result as string)); } catch (err) { toast({ variant: "destructive", title: "Invalid JSON" }); } };
                r.readAsText(f);
              }
            }} />
            <FileJson className={cn("w-10 h-10", file ? "text-primary" : "text-muted-foreground")} />
            <p className="font-bold text-sm">{file ? file.name : "Select Source JSON"}</p>
          </div>

          <Button 
            className="w-full h-14 bg-primary text-white rounded-xl font-bold shadow-xl gap-3"
            disabled={!validation?.isValid || !selectedMockId || isUploading}
            onClick={handleUpload}
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Zap className="w-5 h-5 fill-current" /> Deploy to Firestore</>}
          </Button>

          {isUploading && (
            <div className="space-y-2 p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-primary">Uploading...</span><span>{uploadProgress}%</span></div>
              <Progress value={uploadProgress} className="h-1" />
            </div>
          )}
        </div>

        <div className="lg:col-span-8 space-y-6">
          {validation ? (
            <div className="space-y-6">
              <div className={cn("p-6 rounded-[2rem] flex items-center justify-between border", validation.isValid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400")}>
                <div className="flex items-center gap-3">
                  {validation.isValid ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  <span className="font-headline font-bold text-lg">{validation.isValid ? "Normalization Passed" : "Incompatible Structure"}</span>
                </div>
                <Badge variant="outline" className="h-7 text-[10px] uppercase font-bold px-4">{validation.summary.schemaType}</Badge>
              </div>

              <Tabs defaultValue="preview">
                <TabsList className="bg-white/5 p-1 rounded-xl mb-4">
                  <TabsTrigger value="preview" className="rounded-lg gap-2">Data Preview</TabsTrigger>
                  <TabsTrigger value="logs" className="rounded-lg gap-2">Parser Logs</TabsTrigger>
                </TabsList>
                <TabsContent value="preview">
                  <ScrollArea className="h-[500px] border border-white/5 rounded-[2rem] bg-slate-900/50 p-6">
                    <div className="space-y-6">
                      {normalizedContent?.questions.slice(0, 10).map((q, i) => (
                        <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-3">
                          <div className="flex justify-between items-center"><Badge variant="outline" className="text-[9px]">Item {i+1}</Badge><span className={q.answer ? "text-emerald-400 text-[10px] font-bold" : "text-rose-400 text-[10px] font-bold"}>{q.answer ? 'Answer Matched' : 'Missing Answer'}</span></div>
                          <RichTextRenderer content={q.en_html || q.en || q.hn_html || q.hn} className="text-sm font-medium" />
                          <div className="grid grid-cols-2 gap-2">
                             {q.options.map((o: any) => <div key={o.id} className={cn("p-2 border rounded-lg text-[10px]", q.answer === o.id ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/5")}>{o.en || o.en_html}</div>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="logs">
                  <Card className="glass border-white/10 p-6 font-mono text-[10px] space-y-2">
                    <p className="text-primary">> Initializing Deep Scanner...</p>
                    <p className="text-accent">> Detected Root Schema: {validation.summary.schemaType}</p>
                    <p className="text-foreground">> Parsed Questions: {validation.summary.totalParsed}</p>
                    <p className="text-emerald-400">> Valid Mappings: {validation.summary.validCount}</p>
                    <p className="text-rose-400">> Content Failures: {validation.summary.brokenCount}</p>
                    <p className="text-indigo-400">> Bilingual Mode: {validation.summary.bilingual ? 'Full' : 'Partial'}</p>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-muted-foreground opacity-20 py-48 border-2 border-dashed border-white/10 rounded-[3rem]">
              <FileJson className="w-12 h-12" />
              <p className="font-headline font-bold text-xl uppercase tracking-widest">Awaiting JSON Stream</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UploadJsonPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
      <UploadJsonContent />
    </Suspense>
  );
}