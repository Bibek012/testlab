"use client";

import React, { useState, useMemo, useRef } from "react";
import { 
  UploadCloud, 
  FileJson, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Eye, 
  Loader2,
  Database,
  ArrowLeft,
  X,
  Zap,
  Link as LinkIcon,
  Info,
  Languages
} from "lucide-react";
import { useFirestore, useCollection, useUser } from "@/firebase";
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
    sections: number;
    questions: number;
    bilingual: boolean;
    images: number;
    hasHtml: boolean;
    schemaType: string;
  };
}

export default function UploadJsonPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const { data: categories } = useCollection(db ? query(collection(db, "examCategories"), orderBy("title", "asc")) : null);
  const { data: exams } = useCollection(db ? query(collection(db, "exams"), orderBy("name", "asc")) : null);
  const { data: mockTests } = useCollection(db ? query(collection(db, "mockTests"), orderBy("title", "asc")) : null);

  const [selectedMockId, setSelectedMockId] = useState<string>("");
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  
  const [file, setFile] = useState<File | null>(null);
  const [normalizedContent, setNormalizedContent] = useState<{ sections: any[], questions: any[] } | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredExams = useMemo(() => 
    exams?.filter(e => e.categoryId === selectedCategoryId) || [], 
  [exams, selectedCategoryId]);

  const filteredMocks = useMemo(() => 
    mockTests?.filter(m => m.examId === selectedExamId) || [], 
  [mockTests, selectedExamId]);

  const autoDetectLinking = (json: any) => {
    if (!exams || !mockTests) return;
    const titleMatch = (json.title || json.examName || "").toLowerCase();
    const foundExam = exams.find(e => titleMatch.includes(e.name.toLowerCase()) || titleMatch.includes(e.slug.toLowerCase()));
    if (foundExam) {
      setSelectedCategoryId(foundExam.categoryId);
      setSelectedExamId(foundExam.id);
      const foundMock = mockTests.find(m => m.examId === foundExam.id && titleMatch.includes(m.title.toLowerCase()));
      if (foundMock) setSelectedMockId(foundMock.id);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          processAndNormalizeJson(json);
          autoDetectLinking(json);
        } catch (err) {
          toast({ variant: "destructive", title: "Invalid JSON", description: "Parser failed. Ensure file is valid JSON." });
        }
      };
      reader.readAsText(file);
    }
  };

  const processAndNormalizeJson = (json: any) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let extractedSections: any[] = [];
    let rawQuestions: any[] = [];
    let schemaType = "Unknown";

    // 1. NORMALIZE TOP LEVEL STRUCTURE
    if (Array.isArray(json)) {
      rawQuestions = json;
      schemaType = "Flat Array";
    } else if (json.sections && Array.isArray(json.sections)) {
      schemaType = "Sectioned Object";
      json.sections.forEach((sec: any) => {
        const sId = sec.id || `sec-${extractedSections.length + 1}`;
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
      schemaType = "Questions-Key Object";
    }

    if (extractedSections.length === 0) {
      extractedSections.push({ id: 'sec-default', title: { en: 'General', hn: 'सामान्य' }, order: 0 });
    }

    // 2. NORMALIZE QUESTIONS
    const normalizedQuestions = rawQuestions.map((q, idx) => {
      const id = (q.id || q.questionId || `q-${idx + 1}`).toString();
      const sectionId = q.sectionId || extractedSections[0].id;
      
      const en = q.en || q.text || q.questionText || q.content || "";
      const hn = q.hn || "";
      const en_html = q.en_html || "";
      const hn_html = q.hn_html || "";

      const rawOptions = q.options || q.choices || q.choices_list || [];
      const options = rawOptions.map((opt: any, oIdx: number) => {
        const oId = (opt.id || `opt-${idx}-${oIdx}`).toString();
        return {
          id: oId,
          en: typeof opt === 'string' ? opt : (opt.en || opt.text || ""),
          hn: typeof opt === 'string' ? "" : (opt.hn || ""),
          en_html: opt.en_html || "",
          hn_html: opt.hn_html || "",
          image: opt.image || ""
        };
      });

      const rawAnswer = q.answer ?? q.raw_answer_id ?? q.correctAnswer ?? q.answerId ?? q.correct_option;
      let resolvedAnswer = "";
      if (rawAnswer !== undefined && rawAnswer !== null) {
        const optMatch = options.find((o: any) => o.id === rawAnswer.toString());
        if (optMatch) resolvedAnswer = optMatch.id;
        else if (options[parseInt(rawAnswer)]) resolvedAnswer = options[parseInt(rawAnswer)].id;
      }

      const rawExpl = q.explanation || q.solution || {};
      const explanation = {
        en: typeof rawExpl === 'string' ? rawExpl : (rawExpl.en || ""),
        hn: typeof rawExpl === 'string' ? "" : (rawExpl.hn || ""),
        en_html: rawExpl.en_html || "",
        hn_html: rawExpl.hn_html || ""
      };

      return {
        id, sectionId, en, hn, en_html, hn_html, options, 
        answer: resolvedAnswer, 
        marks: parseFloat(q.marks) || 1, 
        negativeMarks: parseFloat(q.negativeMarks) || 0.33,
        dom_images: q.dom_images || [],
        explanation
      };
    });

    // 3. VALIDATION
    if (normalizedQuestions.length === 0) errors.push("CRITICAL: No questions detected in file.");

    let fullyBilingual = true;
    let hasHtml = false;
    let totalImages = 0;

    normalizedQuestions.forEach((q, i) => {
      const label = `Item ${i+1}`;
      if (!q.en && !q.en_html && !q.hn && !q.hn_html && q.dom_images.length === 0) errors.push(`CRITICAL: ${label} has no content.`);
      if (q.options.length < 2) errors.push(`CRITICAL: ${label} needs at least 2 options.`);
      if (!q.answer) errors.push(`CRITICAL: ${label} has missing or unresolvable correct answer.`);
      
      if ((!q.en && !q.en_html) || (!q.hn && !q.hn_html)) {
        fullyBilingual = false;
        warnings.push(`WARNING: ${label} is missing one language translation.`);
      }
      if (q.en_html || q.hn_html) hasHtml = true;
      totalImages += q.dom_images.length;
    });

    setNormalizedContent({ sections: extractedSections, questions: normalizedQuestions });
    setValidation({
      isValid: errors.length === 0,
      errors, warnings,
      summary: {
        sections: extractedSections.length,
        questions: normalizedQuestions.length,
        bilingual: fullyBilingual,
        images: totalImages,
        hasHtml, schemaType
      }
    });
  };

  const handleUploadToFirestore = async () => {
    if (!db || !normalizedContent || !selectedMockId || !user) return;
    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      const { sections, questions } = normalizedContent;
      const batch = writeBatch(db);
      
      sections.forEach(s => {
        batch.set(doc(db, "mockTests", selectedMockId, "sections", s.id), { ...s, mockId: selectedMockId, updatedAt: serverTimestamp() });
      });
      await batch.commit();
      setUploadProgress(40);

      const chunkSize = 400;
      for (let i = 0; i < questions.length; i += chunkSize) {
        const qBatch = writeBatch(db);
        questions.slice(i, i + chunkSize).forEach(q => {
          qBatch.set(doc(db, "mockTests", selectedMockId, "questions", q.id), { ...q, mockId: selectedMockId, status: 'Published', updatedAt: serverTimestamp() });
        });
        await qBatch.commit();
        setUploadProgress(40 + Math.floor((i / questions.length) * 50));
      }

      await updateDoc(doc(db, "mockTests", selectedMockId), { status: "Published", totalQuestions: questions.length, updatedAt: serverTimestamp() });
      await logAction(db, user, "import_json", selectedMockId, "mockTest", `Imported ${questions.length} questions.`);
      
      setUploadProgress(100);
      toast({ title: "Success", description: "Mock test ingested successfully." });
      setFile(null); setNormalizedContent(null); setValidation(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Import Failed", description: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Content <span className="text-accent">Ingestion</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Industrial JSON ingestion engine for high-fidelity bilingual content.</p>
        </div>
        <Button variant="outline" className="gap-2 rounded-xl border-white/10" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4" /> Exit
        </Button>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card className="glass border-white/10">
            <CardHeader className="bg-white/5 border-b border-white/5 py-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-primary" /> Destination Target
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Category</label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-11"><SelectValue placeholder="Select Category" /></SelectTrigger>
                  <SelectContent>{categories?.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Exam Series</label>
                <Select value={selectedExamId} onValueChange={setSelectedExamId} disabled={!selectedCategoryId}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-11"><SelectValue placeholder="Select Exam" /></SelectTrigger>
                  <SelectContent>{filteredExams.map(exam => <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Mock Test</label>
                <Select value={selectedMockId} onValueChange={setSelectedMockId} disabled={!selectedExamId}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-11"><SelectValue placeholder="Select Mock" /></SelectTrigger>
                  <SelectContent>{filteredMocks.map(mock => <SelectItem key={mock.id} value={mock.id}>{mock.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div 
            className={cn("p-10 border-2 border-dashed rounded-[2rem] transition-all flex flex-col items-center justify-center gap-4 text-center cursor-pointer hover:bg-white/5", file ? "border-primary/50 bg-primary/5" : "border-white/10")}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
            <UploadCloud className={cn("w-10 h-10", file ? "text-primary" : "text-muted-foreground")} />
            <div className="space-y-1">
              <p className="font-bold text-sm">{file ? file.name : "Drop JSON Source"}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Supports all major exam formats</p>
            </div>
          </div>

          {isUploading && (
            <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-primary">Deploying...</span><span>{uploadProgress}%</span></div>
              <Progress value={uploadProgress} className="h-1.5" />
            </div>
          )}

          <Button 
            className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-xl gap-3"
            disabled={!validation?.isValid || !selectedMockId || isUploading}
            onClick={handleUploadToFirestore}
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Zap className="w-5 h-5 fill-current" /> Ingest Mock Test</>}
          </Button>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {validation ? (
            <div className="space-y-6">
              <div className={cn("p-4 rounded-2xl flex items-center justify-between border", validation.isValid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400")}>
                <div className="flex items-center gap-3">
                  {validation.isValid ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  <span className="font-headline font-bold text-lg">{validation.isValid ? "Integrity Passed" : "Critical Issues Found"}</span>
                </div>
                <Badge variant="outline" className="bg-white/5 h-7 uppercase text-[10px]">{validation.summary.schemaType}</Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                 <Card className="glass border-white/10 h-[300px] flex flex-col">
                    <CardHeader className="bg-rose-500/[0.02] border-b border-white/5 py-3"><CardTitle className="text-[10px] font-bold uppercase">Critical Errors</CardTitle></CardHeader>
                    <ScrollArea className="flex-1 p-4">
                       {validation.errors.length === 0 ? <div className="h-full flex items-center justify-center opacity-30 text-xs italic">No errors found.</div> : 
                         <ul className="space-y-2">{validation.errors.map((err, i) => <li key={i} className="text-xs text-rose-400 flex items-start gap-2"><X className="w-3 h-3 mt-0.5" /> {err}</li>)}</ul>}
                    </ScrollArea>
                 </Card>
                 <Card className="glass border-white/10 h-[300px] flex flex-col">
                    <CardHeader className="bg-amber-500/[0.02] border-b border-white/5 py-3"><CardTitle className="text-[10px] font-bold uppercase">Warnings</CardTitle></CardHeader>
                    <ScrollArea className="flex-1 p-4">
                       {validation.warnings.length === 0 ? <div className="h-full flex items-center justify-center opacity-30 text-xs italic">Clean dataset.</div> : 
                         <ul className="space-y-2">{validation.warnings.map((warn, i) => <li key={i} className="text-xs text-amber-400 flex items-start gap-2"><Info className="w-3 h-3 mt-0.5" /> {warn}</li>)}</ul>}
                    </ScrollArea>
                 </Card>
              </div>

              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="bg-white/5 p-1 rounded-xl mb-6">
                  <TabsTrigger value="preview" className="rounded-lg gap-2"><Eye className="w-3.5 h-3.5" /> Simulation</TabsTrigger>
                  <TabsTrigger value="stats" className="rounded-lg gap-2"><Database className="w-3.5 h-3.5" /> Metadata</TabsTrigger>
                </TabsList>
                <TabsContent value="stats">
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <SummaryMetric label="Bilingual" value={validation.summary.bilingual ? "Full" : "Partial"} icon={Languages} />
                      <SummaryMetric label="Media Assets" value={validation.summary.images} icon={UploadCloud} />
                      <SummaryMetric label="KaTeX Support" value={validation.summary.hasHtml ? "Active" : "Off"} icon={Zap} />
                      <SummaryMetric label="Sections" value={validation.summary.sections} icon={Database} />
                   </div>
                </TabsContent>
                <TabsContent value="preview">
                  <ScrollArea className="h-[600px] border border-white/5 rounded-[2rem] bg-slate-900/50 p-6">
                    <div className="space-y-8">
                      {normalizedContent?.questions.slice(0, 10).map((q, i) => (
                        <div key={i} className="space-y-4 p-6 border border-white/5 rounded-2xl bg-white/[0.02]">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[10px]">Q{i+1} • {q.id}</Badge>
                            <Badge className="bg-accent/10 text-accent text-[10px]">{q.sectionId}</Badge>
                          </div>
                          <RichTextRenderer content={q.en_html || q.en || q.hn_html || q.hn} className="text-base font-medium" />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options?.map((opt: any) => (
                              <div key={opt.id} className={cn("p-2 text-[11px] rounded-lg border", q.answer === opt.id ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/5")}>
                                <RichTextRenderer content={opt.en_html || opt.en || opt.hn_html || opt.hn} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {normalizedContent && normalizedContent.questions.length > 10 && <div className="text-center py-4 text-xs text-muted-foreground italic">Showing first 10 items...</div>}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-muted-foreground opacity-20 py-48 border-2 border-dashed border-white/10 rounded-[3rem]">
              <FileJson className="w-12 h-12" />
              <div className="text-center">
                 <p className="font-headline font-bold text-xl uppercase tracking-widest">Awaiting JSON</p>
                 <p className="text-sm mt-1">Upload a real-world test file to start verification.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value, icon: Icon }: any) {
  return (
    <div className="p-5 bg-white/5 border border-white/5 rounded-2xl text-center space-y-2">
      <Icon className="w-5 h-5 mx-auto mb-1 text-primary opacity-50" />
      <div className="text-2xl font-headline font-bold">{value}</div>
      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">{label}</div>
    </div>
  );
}
