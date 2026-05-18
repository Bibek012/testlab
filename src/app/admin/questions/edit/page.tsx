
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Languages, 
  ImageIcon, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Zap,
  Loader2,
  Trash2,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RichTextRenderer } from "@/components/mock-test/RichTextRenderer";
import { QuestionImage } from "@/components/mock-test/QuestionImage";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function QuestionEditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();

  const mockId = searchParams.get("mockId");
  const qId = searchParams.get("qId");

  const [formData, setFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeLang, setActiveLang] = useState<'en' | 'hn'>('en');

  // Fetch question
  useEffect(() => {
    const fetchQ = async () => {
      if (!db || !mockId || !qId) return;
      const ref = doc(db, "mockTests", mockId, "questions", qId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setFormData(snap.data());
      } else {
        toast({ variant: "destructive", title: "Not Found", description: "Question not found." });
        router.push("/admin/questions");
      }
    };
    fetchQ();
  }, [db, mockId, qId]);

  if (!formData) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const handleSave = async () => {
    if (!db || !mockId || !qId) return;
    setIsSaving(true);
    try {
      const ref = doc(db, "mockTests", mockId, "questions", qId);
      await updateDoc(ref, {
        ...formData,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Saved Successfully", description: "Question updated in Firestore." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save Failed", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const updateOption = (id: string, field: string, val: string) => {
    const newOptions = formData.options.map((opt: any) => 
      opt.id === id ? { ...opt, [field]: val } : opt
    );
    setFormData({ ...formData, options: newOptions });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl border border-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-headline font-bold truncate max-w-md">Edit Question <span className="text-accent">{qId}</span></h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">Mock ID: {mockId}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" className="border-white/10 rounded-xl gap-2 h-11" onClick={() => {/* Live Preview Logic */}}>
              <Eye className="w-4 h-4" /> Live Preview
           </Button>
           <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 h-11 shadow-lg shadow-primary/20 px-8" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
           </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Editor Main */}
        <div className="lg:col-span-8 space-y-6">
          <Tabs defaultValue="editor" className="w-full">
            <TabsList className="bg-white/5 p-1 rounded-xl mb-6">
              <TabsTrigger value="editor" className="rounded-lg gap-2">Core Editor</TabsTrigger>
              <TabsTrigger value="preview" className="rounded-lg gap-2">Simulated Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="space-y-6">
              {/* Question Text Sections */}
              <Card className="glass border-white/10 p-6 space-y-8">
                <div className="flex items-center justify-between">
                   <h3 className="font-bold flex items-center gap-2"><Languages className="w-5 h-5 text-primary" /> Question Content</h3>
                   <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10">
                      <button 
                        onClick={() => setActiveLang('en')}
                        className={cn("px-3 py-1 text-xs font-bold rounded", activeLang === 'en' ? "bg-accent text-white" : "text-muted-foreground")}
                      >English</button>
                      <button 
                        onClick={() => setActiveLang('hn')}
                        className={cn("px-3 py-1 text-xs font-bold rounded", activeLang === 'hn' ? "bg-accent text-white" : "text-muted-foreground")}
                      >Hindi</button>
                   </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Plain Text Version</Label>
                    <Textarea 
                      className="bg-white/5 border-white/10 min-h-[100px] text-lg"
                      value={formData[activeLang] || ""}
                      onChange={(e) => setFormData({ ...formData, [activeLang]: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">HTML Enhanced Version (KaTeX Supported)</Label>
                    <Textarea 
                      className="bg-white/5 border-white/10 min-h-[120px] font-mono text-sm text-emerald-400"
                      value={formData[`${activeLang}_html`] || ""}
                      onChange={(e) => setFormData({ ...formData, [`${activeLang}_html`]: e.target.value })}
                      placeholder="<p>Use $x^2$ for inline math or $$...$$ for blocks.</p>"
                    />
                  </div>
                </div>
              </Card>

              {/* Options Editor */}
              <Card className="glass border-white/10 p-6 space-y-6">
                 <h3 className="font-bold">Options & Mapping</h3>
                 <div className="grid gap-4">
                    {formData.options?.map((opt: any, i: number) => (
                      <div key={opt.id} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                         <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                               {opt.id.split('-').pop()?.toUpperCase()}
                            </div>
                            <input 
                              type="radio" 
                              name="correctAnswer" 
                              checked={formData.answer === opt.id}
                              onChange={() => setFormData({ ...formData, answer: opt.id })}
                              className="w-4 h-4 accent-emerald-500"
                            />
                         </div>
                         <div className="flex-1 grid md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                               <Label className="text-[10px] uppercase opacity-50">English Option HTML</Label>
                               <Input 
                                 className="bg-white/5 border-white/5 h-10 font-mono text-xs" 
                                 value={opt.en_html || opt.en} 
                                 onChange={(e) => updateOption(opt.id, 'en_html', e.target.value)}
                               />
                            </div>
                            <div className="space-y-1">
                               <Label className="text-[10px] uppercase opacity-50">Hindi Option HTML</Label>
                               <Input 
                                 className="bg-white/5 border-white/5 h-10 font-mono text-xs" 
                                 value={opt.hn_html || opt.hn}
                                 onChange={(e) => updateOption(opt.id, 'hn_html', e.target.value)}
                               />
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </Card>

              {/* Solution/Explanation Editor */}
              <Card className="glass border-white/10 p-6 space-y-6">
                 <h3 className="font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-amber-400" /> Explanation / Solution</h3>
                 <div className="space-y-4">
                    <Textarea 
                      className="bg-white/5 border-white/10 min-h-[150px]"
                      placeholder="Use HTML and KaTeX for detailed proofs..."
                      value={formData.explanation?.[`${activeLang}_html`] || formData.explanation?.[activeLang] || ""}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        explanation: { ...formData.explanation, [`${activeLang}_html`]: e.target.value } 
                      })}
                    />
                 </div>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-8 pb-32">
               <div className="p-8 border border-white/10 rounded-[2rem] bg-slate-900/50 space-y-8">
                  <div className="flex items-center justify-between">
                     <Badge className="bg-primary/20 text-primary border-primary/10 uppercase tracking-widest text-[10px]">Production Simulation</Badge>
                     <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10">
                        <button onClick={() => setActiveLang('en')} className={cn("px-3 py-1 text-xs font-bold rounded", activeLang === 'en' ? "bg-accent text-white" : "text-muted-foreground")}>EN</button>
                        <button onClick={() => setActiveLang('hn')} className={cn("px-3 py-1 text-xs font-bold rounded", activeLang === 'hn' ? "bg-accent text-white" : "text-muted-foreground")}>HN</button>
                     </div>
                  </div>

                  <div className="space-y-6">
                    <RichTextRenderer 
                      content={formData[`${activeLang}_html`] || formData[activeLang]}
                      className="text-xl md:text-2xl font-medium leading-relaxed text-slate-100"
                    />
                    {formData.dom_images?.map((img: string, i: number) => (
                      <QuestionImage key={i} src={img} alt="Editor Preview" />
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.options.map((opt: any) => (
                      <div key={opt.id} className={cn(
                        "p-5 rounded-2xl border flex gap-4 transition-all",
                        formData.answer === opt.id ? "bg-emerald-500/10 border-emerald-500/40" : "bg-white/5 border-white/5"
                      )}>
                         <div className={cn(
                           "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                           formData.answer === opt.id ? "bg-emerald-500 text-white" : "bg-white/10 text-muted-foreground"
                         )}>{opt.id.split('-').pop()?.toUpperCase()}</div>
                         <div className="flex-1 overflow-hidden">
                           <RichTextRenderer 
                            content={opt[`${activeLang}_html`] || opt[activeLang]}
                            className="text-sm font-medium"
                           />
                         </div>
                         {formData.answer === opt.id && <CheckCircle2 className="w-5 h-5 ml-auto text-emerald-400 shrink-0" />}
                      </div>
                    ))}
                  </div>

                  {(formData.explanation?.[`${activeLang}_html`] || formData.explanation?.[activeLang]) && (
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4">
                       <h5 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                          <Zap className="w-4 h-4 fill-current" /> Detailed Solution
                       </h5>
                       <RichTextRenderer 
                          content={formData.explanation?.[`${activeLang}_html`] || formData.explanation?.[activeLang]}
                          className="text-sm text-muted-foreground leading-relaxed"
                       />
                    </div>
                  )}
               </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-6">
           <Card className="glass border-white/10">
              <CardHeader><CardTitle className="text-lg">Scoring & Metadata</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label>Positive Marks</Label>
                       <Input 
                        type="number" 
                        value={formData.marks} 
                        onChange={(e) => setFormData({ ...formData, marks: parseFloat(e.target.value) })}
                        className="bg-white/5 border-white/10 h-11"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label>Negative Marks</Label>
                       <Input 
                        type="number" 
                        step="0.01"
                        value={formData.negativeMarks} 
                        onChange={(e) => setFormData({ ...formData, negativeMarks: parseFloat(e.target.value) })}
                        className="bg-white/5 border-white/10 h-11"
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <Label>Verification Status</Label>
                    <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                       <SelectTrigger className="bg-white/5 border-white/10 h-11">
                          <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="Draft">Draft (Editing)</SelectItem>
                          <SelectItem value="Verified">Verified (Quality Passed)</SelectItem>
                          <SelectItem value="Needs Review">Needs Review (Issue Found)</SelectItem>
                          <SelectItem value="Published">Published (Live)</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
              </CardContent>
           </Card>

           <Card className="glass border-white/10">
              <CardHeader><CardTitle className="text-lg">Asset Management</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                 <div className="space-y-4">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Reference Images</Label>
                    <div className="grid gap-3">
                       {formData.dom_images?.map((img: string, i: number) => (
                         <div key={i} className="group relative rounded-xl overflow-hidden border border-white/10 aspect-video bg-black/20">
                            <img src={img} className="w-full h-full object-cover" alt="Q-Asset" />
                            <button 
                              onClick={() => {
                                const newImgs = formData.dom_images.filter((_: any, idx: number) => idx !== i);
                                setFormData({ ...formData, dom_images: newImgs });
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                               <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                       ))}
                       <Button variant="outline" className="w-full border-dashed border-white/20 h-24 flex flex-col gap-2 rounded-xl hover:bg-white/5">
                          <Plus className="w-5 h-5 opacity-40" />
                          <span className="text-xs font-bold opacity-40">Add Reference Image</span>
                       </Button>
                    </div>
                 </div>
              </CardContent>
           </Card>

           <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
                 <AlertCircle className="w-4 h-4" /> Verification Check
              </div>
              <ul className="text-xs text-muted-foreground space-y-2">
                 <li className="flex items-center gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full", (formData.en || formData.en_html) && (formData.hn || formData.hn_html) ? "bg-emerald-400" : "bg-rose-400")} /> 
                    Bilingual text presence
                 </li>
                 <li className="flex items-center gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full", formData.answer ? "bg-emerald-400" : "bg-rose-400")} /> 
                    Correct answer selected
                 </li>
                 <li className="flex items-center gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full", formData.explanation?.en || formData.explanation?.en_html ? "bg-emerald-400" : "bg-rose-400")} /> 
                    Detailed solution provided
                 </li>
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
}

export default function EditQuestionPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
      <QuestionEditorContent />
    </Suspense>
  );
}
