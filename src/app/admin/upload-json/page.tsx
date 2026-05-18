
"use client";

import React, { useState, useMemo, useRef } from "react";
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
  X
} from "lucide-react";
import { useFirestore, useCollection } from "@/firebase";
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

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    sections: number;
    questions: number;
    bilingual: boolean;
    images: number;
  };
}

export default function UploadJsonPage() {
  const db = useFirestore();
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/json") {
      setFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          processJson(json);
        } catch (err) {
          toast({
            variant: "destructive",
            title: "Invalid JSON",
            description: "Could not parse the uploaded file."
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
    
    if (!json.sections || !Array.isArray(json.sections)) errors.push("Missing 'sections' array.");
    if (!json.questions || !Array.isArray(json.questions)) errors.push("Missing 'questions' array.");
    
    let totalImages = 0;
    if (json.questions) {
      json.questions.forEach((q: any, i: number) => {
        if (!q.id) errors.push(`Question at index ${i} is missing an ID.`);
        if (!q.sectionId) errors.push(`Question ${q.id || i} is missing sectionId.`);
        if (!q.options || q.options.length < 2) errors.push(`Question ${q.id || i} must have at least 2 options.`);
        if (!q.answer) errors.push(`Question ${q.id || i} is missing correct answer ID.`);
        
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
        bilingual: true, // Simplified check
        images: totalImages
      }
    });
  };

  const handleUploadToFirestore = async () => {
    if (!db || !parsedData || !selectedMockId) return;

    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      const { sections, questions } = parsedData;
      
      // Batch write for sections
      const sectionsBatch = writeBatch(db);
      sections.forEach((sec: any) => {
        const secRef = doc(db, "mockTests", selectedMockId, "sections", sec.id);
        sectionsBatch.set(secRef, { ...sec, mockId: selectedMockId });
      });
      await sectionsBatch.commit();
      setUploadProgress(40);

      // Batch write for questions (max 500 per batch)
      // For standard tests (~100-200 qs), one batch is enough.
      const questionsBatch = writeBatch(db);
      questions.forEach((q: any) => {
        const qRef = doc(db, "mockTests", selectedMockId, "questions", q.id);
        questionsBatch.set(qRef, { ...q, mockId: selectedMockId });
      });
      await questionsBatch.commit();
      setUploadProgress(80);

      // Update Mock status
      await updateDoc(doc(db, "mockTests", selectedMockId), {
        status: "Published",
        updatedAt: serverTimestamp()
      });
      
      setUploadProgress(100);
      toast({
        title: "Upload Successful",
        description: `Successfully uploaded ${questions.length} questions across ${sections.length} sections.`
      });
      
      // Reset
      setFile(null);
      setParsedData(null);
      setValidation(null);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: err.message
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">JSON <span className="text-accent">Ingestion</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Upload and validate mock test content in bilingual formats.</p>
        </div>
        <Button variant="ghost" className="gap-2" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Configuration Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="glass border-white/10">
            <CardHeader>
              <CardTitle className="text-lg">Target Selection</CardTitle>
              <CardDescription>Select the mock test that will receive this data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Category</label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="bg-white/5 border-white/10">
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
                <label className="text-xs font-bold text-muted-foreground uppercase">Exam</label>
                <Select value={selectedExamId} onValueChange={setSelectedExamId} disabled={!selectedCategoryId}>
                  <SelectTrigger className="bg-white/5 border-white/10">
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
                <label className="text-xs font-bold text-muted-foreground uppercase">Mock Test</label>
                <Select value={selectedMockId} onValueChange={setSelectedMockId} disabled={!selectedExamId}>
                  <SelectTrigger className="bg-white/5 border-white/10">
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

          {/* Upload Area */}
          <div 
            className={cn(
              "p-10 border-2 border-dashed rounded-3xl transition-all flex flex-col items-center justify-center gap-4 text-center cursor-pointer hover:bg-white/5",
              file ? "border-primary/50 bg-primary/5" : "border-white/10"
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
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                  <FileJson className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-muted-foreground">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold">Click to Upload JSON</p>
                  <p className="text-xs text-muted-foreground">Drag and drop mock test files</p>
                </div>
              </>
            )}
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1" />
            </div>
          )}

          <Button 
            className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-lg shadow-primary/20"
            disabled={!validation?.isValid || !selectedMockId || isUploading}
            onClick={handleUploadToFirestore}
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Database className="w-5 h-5 mr-2" /> Save to Firestore</>}
          </Button>
        </div>

        {/* Validation & Preview Area */}
        <div className="lg:col-span-8 space-y-6">
          {validation && (
            <Card className={cn("glass overflow-hidden", validation.isValid ? "border-emerald-500/20" : "border-rose-500/20")}>
              <div className={cn("px-6 py-4 flex items-center justify-between", validation.isValid ? "bg-emerald-500/10" : "bg-rose-500/10")}>
                <div className="flex items-center gap-2">
                  {validation.isValid ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
                  <span className="font-bold text-sm">
                    {validation.isValid ? "Validation Passed" : "Structure Errors Found"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-white/5">{validation.summary.sections} Sections</Badge>
                  <Badge variant="outline" className="bg-white/5">{validation.summary.questions} Questions</Badge>
                </div>
              </div>
              <CardContent className="p-6">
                {!validation.isValid && (
                  <ScrollArea className="h-40 mb-6 border border-rose-500/10 rounded-xl p-4 bg-rose-500/5">
                    <ul className="space-y-2">
                      {validation.errors.map((err, i) => (
                        <li key={i} className="text-xs text-rose-400 flex items-start gap-2">
                          <X className="w-3 h-3 mt-0.5 shrink-0" /> {err}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                )}

                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="bg-white/5 p-1 rounded-xl mb-6">
                    <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
                    <TabsTrigger value="preview" className="rounded-lg">Question Preview</TabsTrigger>
                    <TabsTrigger value="raw" className="rounded-lg">Raw JSON</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <SummaryItem icon={Database} label="Sections" value={validation.summary.sections} />
                      <SummaryItem icon={CheckCircle2} label="Questions" value={validation.summary.questions} />
                      <SummaryItem icon={Eye} label="Bilingual" value="Enabled" />
                      <SummaryItem icon={FileJson} label="Images" value={validation.summary.images} />
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase text-muted-foreground tracking-widest">Section Breakdown</h4>
                      <div className="grid gap-2">
                        {parsedData.sections?.map((sec: any) => (
                          <div key={sec.id} className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                            <span className="text-sm font-medium">{sec.title?.en} / {sec.title?.hn}</span>
                            <Badge className="bg-primary/20 text-primary">{parsedData.questions?.filter((q: any) => q.sectionId === sec.id).length} Qs</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="preview">
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-8">
                        {parsedData.questions?.slice(0, 10).map((q: any, i: number) => (
                          <div key={i} className="space-y-4 p-6 border border-white/5 rounded-2xl bg-white/[0.02]">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">Q{i+1}</Badge>
                              <Badge className="bg-accent/10 text-accent">{q.sectionId}</Badge>
                            </div>
                            <div className="space-y-4">
                              <div className="text-sm border-l-2 border-primary pl-4 py-1">
                                <div dangerouslySetInnerHTML={{ __html: q.en_html || q.en }} />
                              </div>
                              <div className="text-sm border-l-2 border-accent pl-4 py-1 font-hindi">
                                <div dangerouslySetInnerHTML={{ __html: q.hn_html || q.hn }} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {q.options?.map((opt: any) => (
                                <div key={opt.id} className={cn(
                                  "p-2 text-[10px] rounded-lg border",
                                  q.answer === opt.id ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-white/5 border-white/5 text-muted-foreground"
                                )}>
                                  {opt.en}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {parsedData.questions?.length > 10 && (
                          <p className="text-center text-xs text-muted-foreground py-4 italic">Showing first 10 questions only...</p>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="raw">
                    <ScrollArea className="h-[500px] bg-black/40 rounded-xl p-6 font-mono text-[10px] text-emerald-400/80">
                      <pre>{JSON.stringify(parsedData, null, 2)}</pre>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {!validation && !file && (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground opacity-30 py-40">
              <UploadCloud className="w-20 h-20" />
              <p className="font-bold">Upload a JSON file to see validation and preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ icon: Icon, label, value }: any) {
  return (
    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center space-y-1">
      <Icon className="w-5 h-5 mx-auto mb-2 text-primary/60" />
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">{label}</div>
    </div>
  );
}
