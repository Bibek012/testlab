
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
  Info
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

  // AUTO-DETECTION LOGIC: Link JSON metadata to Firestore hierarchy
  const autoDetectLinking = (json: any) => {
    if (!exams || !mockTests || !categories) return;

    console.log("IngestionEngine: Attempting auto-detection...");

    // 1. Try to find Exam
    const jsonExamName = json.examName?.toLowerCase() || json.metadata?.exam?.toLowerCase();
    const foundExam = exams.find(e => 
      e.name.toLowerCase() === jsonExamName || 
      e.slug.toLowerCase() === jsonExamName ||
      e.id === json.examId
    );

    if (foundExam) {
      setSelectedCategoryId(foundExam.categoryId);
      setSelectedExamId(foundExam.id);
      console.log("IngestionEngine: Auto-linked Exam:", foundExam.name);

      // 2. Try to find Mock Test
      const jsonMockTitle = json.title?.toLowerCase() || json.metadata?.mockTitle?.toLowerCase();
      const foundMock = mockTests.find(m => 
        (m.examId === foundExam.id) && 
        (m.title.toLowerCase() === jsonMockTitle || m.slug === json.mockSlug)
      );

      if (foundMock) {
        setSelectedMockId(foundMock.id);
        console.log("IngestionEngine: Auto-linked Mock:", foundMock.title);
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
    let totalImages = 0;
    let hasHtml = false;
    let bilingualCount = 0;

    // 1. Structural Checks
    if (!json.sections || !Array.isArray(json.sections)) errors.push("CRITICAL: Missing 'sections' array.");
    if (!json.questions || !Array.isArray(json.questions)) errors.push("CRITICAL: Missing 'questions' array.");
    
    if (json.sections && json.questions) {
      const sectionIds = new Set(json.sections.map((s: any) => s.id));
      const questionIds = new Set();

      json.questions.forEach((q: any, i: number) => {
        const qLabel = q.id || `at index ${i}`;

        // 2. Question Identity & Linking
        if (!q.id) errors.push(`CRITICAL: Question ${qLabel} is missing an ID.`);
        if (questionIds.has(q.id)) errors.push(`CRITICAL: Duplicate Question ID found: ${q.id}`);
        questionIds.add(q.id);

        if (!q.sectionId) errors.push(`CRITICAL: Question ${qLabel} is missing sectionId.`);
        else if (!sectionIds.has(q.sectionId)) errors.push(`CRITICAL: Question ${qLabel} links to non-existent section: ${q.sectionId}`);

        // 3. Content & Bilingual Checks
        if (!q.en && !q.en_html) errors.push(`CRITICAL: Question ${qLabel} has no English content.`);
        if (!q.hn && !q.hn_html) warnings.push(`WARNING: Question ${qLabel} is missing Hindi translation.`);
        else bilingualCount++;

        if (q.en_html || q.hn_html) hasHtml = true;

        // 4. Options & Answers
        if (!q.options || q.options.length < 2) errors.push(`CRITICAL: Question ${qLabel} must have at least 2 options.`);
        else {
           const optionIds = new Set(q.options.map((o: any) => o.id));
           if (!q.answer) errors.push(`CRITICAL: Question ${qLabel} is missing correct answer ID.`);
           else if (!optionIds.has(q.answer)) errors.push(`CRITICAL: Question ${qLabel} correct answer (${q.answer}) does not match any option ID.`);
        }

        // 5. Assets
        if (q.dom_images) totalImages += q.dom_images.length;
        if (q.memory_images) totalImages += q.memory_images.length;
      });
    }

    setValidation({
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        sections: json.sections?.length || 0,
        questions: json.questions?.length || 0,
        bilingual: bilingualCount === (json.questions?.length || 0),
        images: totalImages,
        hasHtml
      }
    });
  };

  const handleUploadToFirestore = async () => {
    if (!db || !parsedData || !selectedMockId || !user) return;

    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      const { sections, questions } = parsedData;
      
      // Atomic Batch write for sections
      const sectionsBatch = writeBatch(db);
      sections.forEach((sec: any) => {
        const secRef = doc(db, "mockTests", selectedMockId, "sections", sec.id);
        sectionsBatch.set(secRef, { 
          ...sec, 
          mockId: selectedMockId,
          updatedAt: serverTimestamp()
        });
      });
      await sectionsBatch.commit();
      setUploadProgress(40);

      // Atomic Batch write for questions (handles standard exam sizes)
      // Note: For 500+ questions, multiple chunks are needed, but for MVP standard mocks, 1 batch is efficient.
      const questionsBatch = writeBatch(db);
      questions.forEach((q: any) => {
        const qRef = doc(db, "mockTests", selectedMockId, "questions", q.id);
        questionsBatch.set(qRef, { 
          ...q, 
          mockId: selectedMockId,
          status: 'Published', // Auto-publish on successful import
          updatedAt: serverTimestamp()
        });
      });
      await questionsBatch.commit();
      setUploadProgress(80);

      // Update Mock status & stats
      await updateDoc(doc(db, "mockTests", selectedMockId), {
        status: "Published",
        updatedAt: serverTimestamp(),
        totalQuestions: questions.length,
        hasImportedContent: true
      });

      // Log the Action
      await logAction(db, user, "import_json", selectedMockId, "mockTest", `Uploaded ${questions.length} questions.`);
      
      setUploadProgress(100);
      toast({
        title: "Ingestion Complete",
        description: `Successfully imported ${questions.length} questions into Mock Test.`
      });
      
      // Cleanup
      setFile(null);
      setParsedData(null);
      setValidation(null);
    } catch (err: any) {
      console.error("IngestionError:", err);
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: err.message
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Content <span className="text-accent">Pipeline</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Industrial-grade JSON ingestion engine for bilingual mock tests.</p>
        </div>
        <Button variant="outline" className="gap-2 rounded-xl border-white/10" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4" /> Exit Pipeline
        </Button>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Step 1: Target & Upload */}
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
                  <p className="text-[10px] text-muted-foreground uppercase">Ready for Validation</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm">Drop JSON Source</p>
                  <p className="text-xs text-muted-foreground">Mock test content file</p>
                </div>
              </>
            )}
          </div>

          {isUploading && (
            <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5 animate-in slide-in-from-top-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="text-primary">Injecting Data...</span>
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
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Zap className="w-5 h-5 fill-current" /> Deploy Content</>}
          </Button>
        </div>

        {/* Step 2: Validation Report & Intelligence */}
        <div className="lg:col-span-8 space-y-6">
          {validation ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Status Banner */}
              <div className={cn(
                "p-4 rounded-2xl flex items-center justify-between border",
                validation.isValid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              )}>
                <div className="flex items-center gap-3">
                  {validation.isValid ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  <span className="font-headline font-bold text-lg">
                    {validation.isValid ? "Content Verified" : "Integrity Issues Found"}
                  </span>
                </div>
                <div className="flex gap-2">
                   {validation.warnings.length > 0 && (
                     <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 h-7">
                       {validation.warnings.length} Warnings
                     </Badge>
                   )}
                   <Badge variant="outline" className="bg-white/5 h-7">
                     {validation.summary.questions} Questions
                   </Badge>
                </div>
              </div>

              {/* Reports Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                 {/* Error Panel */}
                 <Card className="glass border-white/10 h-[400px] flex flex-col">
                    <CardHeader className="bg-rose-500/[0.02] border-b border-white/5 py-3">
                       <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                          <X className="w-3 h-3 text-rose-400" /> Critical Errors
                       </CardTitle>
                    </CardHeader>
                    <ScrollArea className="flex-1 p-4">
                       {validation.errors.length === 0 ? (
                         <div className="h-full flex flex-col items-center justify-center opacity-30 gap-2 py-10">
                            <CheckCircle2 className="w-8 h-8" />
                            <p className="text-[10px] font-bold uppercase">No Critical Issues</p>
                         </div>
                       ) : (
                         <ul className="space-y-3">
                            {validation.errors.map((err, i) => (
                              <li key={i} className="text-xs text-rose-400/80 flex items-start gap-2 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                                 <X className="w-3 h-3 mt-0.5 shrink-0" /> {err}
                              </li>
                            ))}
                         </ul>
                       )}
                    </ScrollArea>
                 </Card>

                 {/* Warning Panel */}
                 <Card className="glass border-white/10 h-[400px] flex flex-col">
                    <CardHeader className="bg-amber-500/[0.02] border-b border-white/5 py-3">
                       <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                          <FileWarning className="w-3 h-3 text-amber-400" /> Optimization Warnings
                       </CardTitle>
                    </CardHeader>
                    <ScrollArea className="flex-1 p-4">
                       {validation.warnings.length === 0 ? (
                         <div className="h-full flex flex-col items-center justify-center opacity-30 gap-2 py-10">
                            <Zap className="w-8 h-8" />
                            <p className="text-[10px] font-bold uppercase">Clean Structure</p>
                         </div>
                       ) : (
                         <ul className="space-y-3">
                            {validation.warnings.map((warn, i) => (
                              <li key={i} className="text-xs text-amber-400/80 flex items-start gap-2 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                                 <Info className="w-3 h-3 mt-0.5 shrink-0" /> {warn}
                              </li>
                            ))}
                         </ul>
                       )}
                    </ScrollArea>
                 </Card>
              </div>

              {/* Data Preview */}
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="bg-white/5 p-1 rounded-xl mb-6">
                  <TabsTrigger value="preview" className="rounded-lg gap-2"><Eye className="w-3.5 h-3.5" /> Simulation Preview</TabsTrigger>
                  <TabsTrigger value="stats" className="rounded-lg gap-2"><Database className="w-3.5 h-3.5" /> Component Stats</TabsTrigger>
                </TabsList>
                
                <TabsContent value="stats">
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <SummaryMetric label="Sections" value={validation.summary.sections} icon={Database} />
                      <SummaryMetric label="Bilingual" value={validation.summary.bilingual ? "Full" : "Partial"} icon={Eye} color={validation.summary.bilingual ? "text-emerald-400" : "text-amber-400"} />
                      <SummaryMetric label="Assets" value={validation.summary.images} icon={UploadCloud} />
                      <SummaryMetric label="Enhanced" value={validation.summary.hasHtml ? "HTML" : "Plain"} icon={Zap} />
                   </div>
                </TabsContent>

                <TabsContent value="preview">
                  <ScrollArea className="h-[600px] border border-white/5 rounded-[2rem] bg-slate-900/50 p-6">
                    <div className="space-y-8">
                      {parsedData.questions?.slice(0, 15).map((q: any, i: number) => (
                        <div key={i} className="space-y-4 p-6 border border-white/5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[10px]">Question {i+1} • {q.id}</Badge>
                            <Badge className="bg-accent/10 text-accent text-[10px]">{q.sectionId}</Badge>
                          </div>
                          <div className="space-y-6">
                            <div className="text-base font-medium text-slate-100 pl-4 border-l-2 border-primary/40 py-1">
                              <div dangerouslySetInnerHTML={{ __html: q.en_html || q.en }} />
                            </div>
                            {q.hn && (
                              <div className="text-base text-slate-300 pl-4 border-l-2 border-accent/40 py-1">
                                <div dangerouslySetInnerHTML={{ __html: q.hn_html || q.hn }} />
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {q.options?.map((opt: any) => (
                              <div key={opt.id} className={cn(
                                "p-3 text-[11px] rounded-xl border flex gap-3 items-center",
                                q.answer === opt.id ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" : "bg-white/5 border-white/5 text-muted-foreground"
                              )}>
                                <div className={cn(
                                  "w-5 h-5 rounded-full flex items-center justify-center text-[8px] border shrink-0",
                                  q.answer === opt.id ? "bg-emerald-500 border-emerald-500 text-white" : "border-white/10"
                                )}>
                                  {opt.id.split('-').pop()?.toUpperCase()}
                                </div>
                                <span className="truncate">{opt.en}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {parsedData.questions?.length > 15 && (
                        <div className="p-8 text-center text-xs text-muted-foreground italic border-t border-white/5">
                           Showing first 15 questions. Total questions in file: {parsedData.questions.length}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-muted-foreground opacity-20 py-48 border-2 border-dashed border-white/10 rounded-[3rem]">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center">
                 <FileJson className="w-12 h-12" />
              </div>
              <div className="text-center">
                 <p className="font-headline font-bold text-xl uppercase tracking-widest">Waiting for Input</p>
                 <p className="text-sm mt-1">Upload a mock test JSON to begin automatic verification.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value, icon: Icon, color }: any) {
  return (
    <div className="p-5 bg-white/5 border border-white/5 rounded-2xl text-center space-y-2 hover:bg-white/10 transition-colors">
      <Icon className="w-5 h-5 mx-auto mb-1 text-primary opacity-50" />
      <div className={cn("text-2xl font-headline font-bold", color)}>{value}</div>
      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter opacity-70">{label}</div>
    </div>
  );
}
