"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useFirestore } from "@/firebase";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Languages, 
  CheckCircle2, 
  Zap, 
  Loader2,
  Trash2,
  Plus,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  useEffect(() => {
    const fetchQ = async () => {
      if (!db || !mockId || !qId) return;
      const ref = doc(db, "mockTests", mockId, "questions", qId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setFormData(snap.data());
      } else {
        toast({ variant: "destructive", title: "Question not found" });
        router.push("/admin/questions");
      }
    };
    fetchQ();
  }, [db, mockId, qId]);

  if (!formData) {
    return <div className="h-[80vh] flex items-center justify-center w-full"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  const handleSave = async () => {
    if (!db || !mockId || !qId) return;
    setIsSaving(true);
    try {
      const ref = doc(db, "mockTests", mockId, "questions", qId);
      await updateDoc(ref, { ...formData, updatedAt: serverTimestamp() });
      toast({ title: "Question synchronized" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const updateOption = (id: string, field: string, val: string) => {
    const newOptions = formData.options.map((opt: any) => opt.id === id ? { ...opt, [field]: val } : opt);
    setFormData({ ...formData, options: newOptions });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl border border-white/10 shrink-0 h-9 w-9 md:h-10 md:w-10">
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-headline font-bold truncate">Editing <span className="text-accent">{qId.slice(0, 12)}...</span></h1>
            <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest font-bold mt-0.5 truncate">Module: {mockId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 w-full xl:w-auto">
           <Button variant="outline" className="flex-1 xl:flex-none border-white/10 rounded-xl gap-2 h-10 md:h-11 text-xs md:text-sm" onClick={() => setActiveLang(activeLang === 'en' ? 'hn' : 'en')}>
              <Languages className="w-4 h-4" /> 
              <span className="hidden xs:inline">Toggle to</span> {activeLang === 'en' ? 'Hindi' : 'English'}
           </Button>
           <Button className="flex-1 xl:flex-none bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 h-10 md:h-11 shadow-lg shadow-primary/20 px-6 md:px-8 text-xs md:text-sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save</>}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        <div className="lg:col-span-8 space-y-6 w-full min-w-0">
          <Tabs defaultValue="editor" className="w-full">
            <TabsList className="bg-white/5 p-1 rounded-xl mb-4 w-full sm:w-auto flex h-auto">
              <TabsTrigger value="editor" className="flex-1 sm:flex-none rounded-lg gap-2 text-xs py-2 md:py-1.5">Primary Editor</TabsTrigger>
              <TabsTrigger value="preview" className="flex-1 sm:flex-none rounded-lg gap-2 text-xs py-2 md:py-1.5">Simulation</TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="space-y-6 m-0">
              <Card className="glass border-white/10 p-5 md:p-6 space-y-6">
                <div className="flex items-center justify-between mb-2">
                   <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground"><Languages className="w-4 h-4 text-primary" /> Content ({activeLang.toUpperCase()})</h3>
                   <Badge variant="outline" className="h-6 text-[9px] uppercase border-white/10">{activeLang === 'en' ? 'English Source' : 'Hindi Source'}</Badge>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Standard Text</Label>
                    <Textarea className="bg-white/5 border-white/10 min-h-[100px] text-base md:text-lg focus-visible:ring-primary/40" value={formData[activeLang] || ""} onChange={(e) => setFormData({ ...formData, [activeLang]: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">KaTeX / HTML Enhancement</Label>
                    <Textarea className="bg-white/5 border-white/10 min-h-[120px] font-mono text-xs md:text-sm text-emerald-400/90" value={formData[`${activeLang}_html`] || ""} onChange={(e) => setFormData({ ...formData, [`${activeLang}_html`]: e.target.value })} placeholder="<p>Expression: $x^2$</p>" />
                  </div>
                </div>
              </Card>

              <Card className="glass border-white/10 p-5 md:p-6 space-y-6">
                 <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Interactive Options</h3>
                 <div className="grid gap-3 md:gap-4">
                    {formData.options?.map((opt: any) => (
                      <div key={opt.id} className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 relative group">
                         <div className="flex items-center justify-between sm:flex-col sm:justify-start gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20 shrink-0">
                               {opt.id.split('-').pop()?.toUpperCase()}
                            </div>
                            <input 
                              type="radio" 
                              name="correctAnswer" 
                              checked={formData.answer === opt.id}
                              onChange={() => setFormData({ ...formData, answer: opt.id })}
                              className="w-5 h-5 accent-emerald-500 cursor-pointer"
                            />
                         </div>
                         <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div className="space-y-1.5">
                               <Label className="text-[9px] uppercase opacity-40">English Option</Label>
                               <Input className="bg-white/5 border-white/5 h-9 text-xs" value={opt.en_html || opt.en} onChange={(e) => updateOption(opt.id, 'en_html', e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                               <Label className="text-[9px] uppercase opacity-40">Hindi Option</Label>
                               <Input className="bg-white/5 border-white/5 h-9 text-xs" value={opt.hn_html || opt.hn} onChange={(e) => updateOption(opt.id, 'hn_html', e.target.value)} />
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </Card>

              <Card className="glass border-white/10 p-5 md:p-6 space-y-6">
                 <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Explanation</h3>
                 <Textarea className="bg-white/5 border-white/10 min-h-[150px] text-sm leading-relaxed" placeholder="Detailed solution steps..." value={formData.explanation?.[`${activeLang}_html`] || formData.explanation?.[activeLang] || ""} onChange={(e) => setFormData({ ...formData, explanation: { ...formData.explanation, [`${activeLang}_html`]: e.target.value } })} />
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-8 pb-32 m-0">
               <div className="p-6 md:p-10 border border-white/10 rounded-[2rem] bg-slate-900/50 space-y-8 max-w-full overflow-hidden">
                  <div className="flex items-center justify-between">
                     <Badge className="bg-primary/20 text-primary border-primary/10 uppercase tracking-widest text-[9px] md:text-[10px] h-6 px-3">Live Simulation</Badge>
                     <div className="text-[10px] font-bold text-muted-foreground uppercase">{activeLang === 'en' ? 'English View' : 'Hindi View'}</div>
                  </div>

                  <div className="space-y-6 w-full">
                    <RichTextRenderer content={formData[`${activeLang}_html`] || formData[activeLang]} className="text-lg md:text-2xl font-medium leading-relaxed text-slate-100" />
                    {formData.dom_images?.map((img: string, i: number) => (
                      <QuestionImage key={i} src={img} alt="Figure" />
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {formData.options.map((opt: any) => (
                      <div key={opt.id} className={cn(
                        "p-5 rounded-2xl border flex gap-4 transition-all min-w-0",
                        formData.answer === opt.id ? "bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "bg-white/5 border-white/5"
                      )}>
                         <div className={cn(
                           "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                           formData.answer === opt.id ? "bg-emerald-500 text-white" : "bg-white/10 text-muted-foreground"
                         )}>{opt.id.split('-').pop()?.toUpperCase()}</div>
                         <div className="flex-1 overflow-hidden min-w-0">
                           <RichTextRenderer content={opt[`${activeLang}_html`] || opt[activeLang]} className="text-sm font-medium" />
                         </div>
                         {formData.answer === opt.id && <CheckCircle2 className="w-5 h-5 ml-auto text-emerald-400 shrink-0" />}
                      </div>
                    ))}
                  </div>

                  {(formData.explanation?.[`${activeLang}_html`] || formData.explanation?.[activeLang]) && (
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-3">
                       <h5 className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                          <Zap className="w-3 h-3 fill-current" /> Detailed Solution
                       </h5>
                       <RichTextRenderer content={formData.explanation?.[`${activeLang}_html`] || formData.explanation?.[activeLang]} className="text-xs md:text-sm text-muted-foreground leading-relaxed" />
                    </div>
                  )}
               </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-4 space-y-6 w-full">
           <Card className="glass border-white/10 p-5 md:p-6">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6">Metadata & Verification</CardTitle>
              <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <Label className="text-[10px] uppercase font-bold text-muted-foreground">Marks</Label>
                       <Input type="number" value={formData.marks} onChange={(e) => setFormData({ ...formData, marks: parseFloat(e.target.value) })} className="bg-white/5 border-white/10 h-11" />
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[10px] uppercase font-bold text-muted-foreground">Penalty</Label>
                       <Input type="number" step="0.01" value={formData.negativeMarks} onChange={(e) => setFormData({ ...formData, negativeMarks: parseFloat(e.target.value) })} className="bg-white/5 border-white/10 h-11" />
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Status</Label>
                    <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                       <SelectTrigger className="bg-white/5 border-white/10 h-11"><SelectValue /></SelectTrigger>
                       <SelectContent>
                          <SelectItem value="Draft">Drafting</SelectItem>
                          <SelectItem value="Verified">Verified</SelectItem>
                          <SelectItem value="Needs Review">Correction Required</SelectItem>
                          <SelectItem value="Published">Live</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
              </div>
           </Card>

           <Card className="glass border-white/10 p-5 md:p-6">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6">Media Assets</CardTitle>
              <div className="space-y-5">
                 <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-1 gap-3">
                    {formData.dom_images?.map((img: string, i: number) => (
                      <div key={i} className="group relative rounded-xl overflow-hidden border border-white/10 aspect-video bg-black/20">
                         <img src={img} className="w-full h-full object-cover" alt="Asset" />
                         <button onClick={() => setFormData({ ...formData, dom_images: formData.dom_images.filter((_: any, idx: number) => idx !== i) })} className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full border-dashed border-white/20 h-24 flex flex-col gap-2 rounded-xl hover:bg-white/5">
                       <Plus className="w-5 h-5 opacity-30" />
                       <span className="text-[10px] font-bold opacity-30 uppercase">Attach Media</span>
                    </Button>
                 </div>
              </div>
           </Card>

           <div className="p-5 md:p-6 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 space-y-3">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-[10px] uppercase tracking-widest">
                 <AlertCircle className="w-4 h-4 shrink-0" /> Audit Checklist
              </div>
              <ul className="text-[10px] md:text-xs text-muted-foreground space-y-2.5">
                 <li className="flex items-center gap-2.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", (formData.en || formData.en_html) && (formData.hn || formData.hn_html) ? "bg-emerald-400" : "bg-rose-400")} /> 
                    Full Bilingual content presence
                 </li>
                 <li className="flex items-center gap-2.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", formData.answer ? "bg-emerald-400" : "bg-rose-400")} /> 
                    Valid answer mapping resolved
                 </li>
                 <li className="flex items-center gap-2.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", formData.explanation?.en || formData.explanation?.en_html ? "bg-emerald-400" : "bg-rose-400")} /> 
                    Step-by-step solution provided
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
    <Suspense fallback={<div className="h-[80vh] flex items-center justify-center w-full"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
      <QuestionEditorContent />
    </Suspense>
  );
}