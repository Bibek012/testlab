"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { 
  UploadCloud, 
  FileJson, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Eye, 
  Trash2, 
  Loader2,
  Database,
  ArrowLeft,
  X,
  FileWarning,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { QuestionImage } from "@/components/mock-test/QuestionImage";
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
  };
}

export default function UploadJsonPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  // Hierarchy Data
  const { data: categories } = useCollection(db ? query(collection(db, "examCategories"), orderBy("title", "asc")) : null);
  const { data: exams } = useCollection(db ? query(collection(db, "exams"), orderBy("name", "asc")) : null);
  const { data: mockTests } = useCollection(db ? query(collection(db, "mockTests"), orderBy("title", "asc")) : null);

  // Form State
  const [selectedMockId, setSelectedMockId] = useState<string>("");
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  
  // File State
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [normalizedContent, setNormalizedContent] = useState<{ sections: any[], questions: any[] } | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered Options
  const filteredExams = useMemo(() => 
    exams?.filter(e => e.categoryId === selectedCategoryId) || [], 
  [exams, selectedCategoryId]);

  const filteredMocks = useMemo(() => 
    mockTests?.filter(m => m.examId === selectedExamId) || [], 
  [mockTests, selectedExamId]);

  // AUTO-DETECTION LOGIC
  const autoDetectLinking = (json: any) => {
    if (!exams || !mockTests || !categories) return;

    const jsonExamName = json.examName?.toLowerCase() || json.metadata?.exam?.toLowerCase();
    const foundExam = exams.find(e => 
      e.name.toLowerCase() === jsonExamName || 
      e.slug.toLowerCase() === jsonExamName ||
      e.id === json.examId
    );

    if (foundExam) {
      setSelectedCategoryId(foundExam.categoryId);
      setSelectedExamId(foundExam.id);

      const jsonMockTitle = json.title?.toLowerCase() || json.metadata?.mockTitle?.toLowerCase();
      const foundMock = mockTests.find(m => 
        (m.examId === foundExam.id) && 
        (m.title.toLowerCase() === jsonMockTitle || m.slug === json.mockSlug)
      );

      if (foundMock) {
        setSelectedMockId(foundMock.id);
        toast({ title: "Auto-linked Successfully", description: `Linked to ${foundExam.name} > ${foundMock.title}` });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "application/json" || file.name.endsWith('.json'))) {
      setFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          processJson(json);
          autoDetectLinking(json);
        } catch (err) {
          toast({
            variant: "destructive",
            title: "Invalid JSON",
            description: "Could not parse the uploaded file. Ensure it is valid JSON."
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const processJson = (json: any) => {
    setParsedData(json);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    let extractedSections: any[] = [];
    let extractedQuestions: any[] = [];

    // Normalize Structure
    if (json.sections && Array.isArray(json.sections)) {
      json.sections.forEach((sec: any) => {
        const sectionId = sec.id || `sec-${extractedSections.length + 1}`;
        extractedSections.push({
          id: sectionId,
          title: sec.title || { en: 'General', hn: 'सामान्य' },
          order: sec.order || extractedSections.length
        });

        // Handle nested questions if present
        if (sec.questions && Array.isArray(sec.questions)) {
          sec.questions.forEach((q: any) => {
            extractedQuestions.push({ ...q, sectionId });
          });
        }
      });
    }

    // Handle flat questions if present
    if (json.questions && Array.isArray(json.questions)) {
      const defaultSecId = extractedSections[0]?.id || 'sec-default';
      if (extractedSections.length === 0) {
        extractedSections.push({ id: defaultSecId, title: { en: 'General', hn: 'सामान्य' }, order: 0 });
      }
      
      json.questions.forEach((q: any) => {
        extractedQuestions.push({
          ...q,
          sectionId: q.sectionId || defaultSecId
        });
      });
    }

    setNormalizedContent({ sections: extractedSections, questions: extractedQuestions });

    // Validation Logic
    if (extractedSections.length === 0) errors.push("CRITICAL: No sections found in the file.");
    if (extractedQuestions.length === 0) errors.push("CRITICAL: No questions found in the file.");

    let totalImages = 0;
    let hasHtml = false;
    let fullyBilingualCount = 0;
    const questionIds = new Set();
    const sectionIds = new Set(extractedSections.map(s => s.id));

    extractedQuestions.forEach((q, i) => {
      const qLabel = q.id || `at index ${i}`;
      
      // ID Check
      if (!q.id) errors.push(`CRITICAL: Question ${qLabel} is missing a unique ID.`);
      else if (questionIds.has(q.id)) errors.push(`CRITICAL: Duplicate Question ID: ${q.id}`);
      if (q.id) questionIds.add(q.id);

      // Section Check
      if (!sectionIds.has(q.sectionId)) errors.push(`CRITICAL: Question ${qLabel} links to invalid section: ${q.sectionId}`);

      // Content Integrity Check
      const hasEn = !!(q.en || q.en_html);
      const hasHn = !!(q.hn || q.hn_html);

      if (!hasEn && !hasHn) {
        errors.push(`CRITICAL: Question ${qLabel} is completely empty (no English or Hindi content).`);
      } else if (!hasEn) {
        warnings.push(`WARNING: Question ${qLabel} is missing English content.`);
      } else if (!hasHn) {
        warnings.push(`WARNING: Question ${qLabel} is missing Hindi translation.`);
      }

      if (hasEn && hasHn) fullyBilingualCount++;
      if (q.en_html || q.hn_html) hasHtml = true;

      // Options Check
      if (!q.options || q.options.length < 2) {
        errors.push(`CRITICAL: Question ${qLabel} must have at least 2 options.`);
      } else {
        const optionIds = new Set(q.options.map((o: any) => o.id));
        const answerVal = q.answer || q.raw_answer_id;
        
        let answerFound = false;
        if (answerVal !== undefined && answerVal !== null) {
          if (optionIds.has(answerVal)) {
            answerFound = true;
          } else if (typeof answerVal === 'number' && q.options[answerVal]) {
            answerFound = true;
            // Normalize to ID if numeric index was provided
            q.answer = q.options[answerVal].id;
          }
        }

        if (!answerFound) {
          errors.push(`CRITICAL: Question ${qLabel} has an invalid answer reference: "${answerVal}"`);
        }

        // Deep Option Content Check
        q.options.forEach((opt: any, optIdx: number) => {
          if (!opt.en && !opt.en_html && !opt.hn && !opt.hn_html && !opt.image) {
            errors.push(`CRITICAL: Option ${optIdx + 1} for Question ${qLabel} is empty.`);
          }
        });
      }

      // Metadata Warnings
      if (!q.explanation || (!q.explanation.en && !q.explanation.en_html && !q.explanation.hn && !q.explanation.hn_html)) {
        warnings.push(`WARNING: Question ${qLabel} is missing a solution/explanation.`);
      }

      if (q.dom_images) totalImages += q.dom_images.length;
    });

    setValidation({
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        sections: extractedSections.length,
        questions: extractedQuestions.length,
        bilingual: fullyBilingualCount === extractedQuestions.length,
        images: totalImages,
        hasHtml
      }
    });
  };

  const handleUploadToFirestore = async () => {
    if (!db || !normalizedContent || !selectedMockId || !user) return;

    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      const { sections, questions } = normalizedContent;
      
      // Batch write for sections
      const sectionsBatch = writeBatch(db);
      sections.forEach((sec) => {
        const secRef = doc(db, "mockTests", selectedMockId, "sections", sec.id);
        sectionsBatch.set(secRef, { 
          ...sec, 
          mockId: selectedMockId,
          updatedAt: serverTimestamp()
        });
      });
      await sectionsBatch.commit();
      setUploadProgress(40);

      // Batch write for questions (max 500 per batch)
      const batchSize = 400;
      for (let i = 0; i < questions.length; i += batchSize) {
        const qBatch = writeBatch(db);
        const chunk = questions.slice(i, i + batchSize);
        chunk.forEach(q => {
          const qRef = doc(db, "mockTests", selectedMockId, "questions", q.id);
          qBatch.set(qRef, { 
            ...q, 
            mockId: selectedMockId,
            status: 'Published', 
            updatedAt: serverTimestamp()
          });
        });
        await qBatch.commit();
        setUploadProgress(40 + Math.floor((i / questions.length) * 40));
      }

      await updateDoc(doc(db, "mockTests", selectedMockId), {
        status: "Published",
        updatedAt: serverTimestamp(),
        totalQuestions: questions.length,
        hasImportedContent: true
      });

      await logAction(db, user, "import_json", selectedMockId, "mockTest", `Imported ${questions.length} questions in ${sections.length} sections.`);
      
      setUploadProgress(100);
      toast({ title: "Import Successful", description: `Uploaded ${questions.length} questions.` });
      
      setFile(null);
      setParsedData(null);
      setNormalizedContent(null);
      setValidation(null);
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
          <h1 className="text-3xl font-headline font-bold">Content <span className="text-accent">Pipeline</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Multi-section JSON ingestion for high-fidelity bilingual mock tests.</p>
        </div>
        <Button variant="outline" className="gap-2 rounded-xl border-white/10" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4" /> Exit
        </Button>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card className="glass border-white/10 overflow-hidden">
            <CardHeader className="bg-white/5 border-b border-white/5">
              <CardTitle className="text-base flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-primary" /> Target Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Category</label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-11 rounded-xl">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Exam Listing</label>
                <Select value={selectedExamId} onValueChange={setSelectedExamId} disabled={!selectedCategoryId}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-11 rounded-xl">
                    <SelectValue placeholder="Select Exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredExams.map(exam => (
                      <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Destination Mock</label>
                <Select value={selectedMockId} onValueChange={setSelectedMockId} disabled={!selectedExamId}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-11 rounded-xl">
                    <SelectValue placeholder="Select Mock Test" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredMocks.map(mock => (
                      <SelectItem key={mock.id} value={mock.id}>{mock.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div 
            className={cn(
              "p-10 border-2 border-dashed rounded-[2rem] transition-all flex flex-col items-center justify-center gap-4 text-center cursor-pointer hover:bg-white/5",
              file ? "border-primary/50 bg-primary/5 shadow-2xl shadow-primary/10" : "border-white/10"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json"
              onChange={handleFileChange} 
            />
            {file ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary animate-in zoom-in duration-300">
                  <FileJson className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm truncate max-w-[200px]">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Validated Content</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm">Drop JSON Source</p>
                  <p className="text-xs text-muted-foreground">Supports Sectioned or Flat Arrays</p>
                </div>
              </>
            )}
          </div>

          {isUploading && (
            <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5 animate-in slide-in-from-top-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="text-primary">Deploying...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1.5" />
            </div>
          )}

          <Button 
            className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-xl shadow-primary/20 gap-3"
            disabled={!validation?.isValid || !selectedMockId || isUploading}
            onClick={handleUploadToFirestore}
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Zap className="w-5 h-5 fill-current" /> Ingest Mock Test</>}
          </Button>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {validation ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className={cn(
                "p-4 rounded-2xl flex items-center justify-between border",
                validation.isValid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              )}>
                <div className="flex items-center gap-3">
                  {validation.isValid ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  <span className="font-headline font-bold text-lg">
                    {validation.isValid ? "Integrity Passed" : "Critical Issues Found"}
                  </span>
                </div>
                <div className="flex gap-2">
                   <Badge variant="outline" className="bg-white/5 h-7">
                     {validation.summary.sections} Sections
                   </Badge>
                   <Badge variant="outline" className="bg-white/5 h-7">
                     {validation.summary.questions} Questions
                   </Badge>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                 <Card className="glass border-white/10 h-[300px] flex flex-col">
                    <CardHeader className="bg-rose-500/[0.02] border-b border-white/5 py-3">
                       <CardTitle className="text-xs font-bold uppercase tracking-widest">Critical Errors</CardTitle>
                    </CardHeader>
                    <ScrollArea className="flex-1 p-4">
                       {validation.errors.length === 0 ? (
                         <div className="h-full flex flex-col items-center justify-center opacity-30 gap-2">
                            <CheckCircle2 className="w-8 h-8" />
                            <p className="text-[10px] font-bold uppercase">No Errors</p>
                         </div>
                       ) : (
                         <ul className="space-y-2">
                            {validation.errors.map((err, i) => (
                              <li key={i} className="text-xs text-rose-400/80 flex items-start gap-2 bg-rose-500/5 p-2 rounded-lg">
                                 <X className="w-3 h-3 mt-0.5 shrink-0" /> {err}
                              </li>
                            ))}
                         </ul>
                       )}
                    </ScrollArea>
                 </Card>

                 <Card className="glass border-white/10 h-[300px] flex flex-col">
                    <CardHeader className="bg-amber-500/[0.02] border-b border-white/5 py-3">
                       <CardTitle className="text-xs font-bold uppercase tracking-widest">Warnings & Suggestions</CardTitle>
                    </CardHeader>
                    <ScrollArea className="flex-1 p-4">
                       {validation.warnings.length === 0 ? (
                         <div className="h-full flex flex-col items-center justify-center opacity-30 gap-2">
                            <Zap className="w-8 h-8" />
                            <p className="text-[10px] font-bold uppercase">Perfect Structure</p>
                         </div>
                       ) : (
                         <ul className="space-y-2">
                            {validation.warnings.map((warn, i) => (
                              <li key={i} className="text-xs text-amber-400/80 flex items-start gap-2 bg-amber-500/5 p-2 rounded-lg">
                                 <Info className="w-3 h-3 mt-0.5 shrink-0" /> {warn}
                              </li>
                            ))}
                         </ul>
                       )}
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
                      {normalizedContent && normalizedContent.questions.length > 10 && (
                        <div className="text-center py-4 text-xs text-muted-foreground italic">
                          Showing first 10 of {normalizedContent.questions.length} questions...
                        </div>
                      )}
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
                 <p className="text-sm mt-1">Upload a test file to start verification.</p>
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
