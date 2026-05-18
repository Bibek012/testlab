
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, serverTimestamp, collection, query } from "firebase/firestore";
import { 
  ArrowLeft, 
  Send, 
  Shield, 
  Eye, 
  Clock, 
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Archive,
  Loader2,
  Zap,
  Lock,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function PublishControlPanel() {
  const { mockId } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();

  const mockRef = useMemoFirebase(() => db ? doc(db, "mockTests", mockId as string) : null, [db, mockId]);
  const { data: mock, loading: mockLoading } = useDoc<any>(mockRef);
  
  const questionsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "mockTests", mockId as string, "questions")) : null, 
  [db, mockId]);
  const { data: questions, loading: qsLoading } = useCollection<any>(questionsQuery);

  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({
    status: "Draft",
    visibility: "Public",
    isFree: true,
    scheduledAt: null
  });

  useEffect(() => {
    if (mock) {
      setFormData({
        status: mock.status || "Draft",
        visibility: mock.visibility || "Public",
        isFree: mock.isFree ?? true,
        scheduledAt: mock.scheduledAt || null
      });
    }
  }, [mock]);

  const validation = useMemo(() => {
    if (!mock || !questions) return null;
    
    const errors: string[] = [];
    if (questions.length === 0) errors.push("No questions uploaded.");
    if (questions.length < (mock.totalQuestions || 0)) errors.push(`Question count mismatch (${questions.length}/${mock.totalQuestions}).`);
    
    const unverified = questions.filter(q => q.status !== 'Verified' && q.status !== 'Published');
    if (unverified.length > 0) errors.push(`${unverified.length} questions are not verified.`);
    
    if (!mock.durationMinutes || mock.durationMinutes <= 0) errors.push("Duration not set correctly.");
    if (!mock.examId) errors.push("Not linked to any exam.");

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [mock, questions]);

  const handleSave = async () => {
    if (!db || !mockRef) return;
    setIsSaving(true);
    try {
      await updateDoc(mockRef, {
        ...formData,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Updated", description: "Publish settings updated successfully." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (mockLoading || qsLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  if (!mock) return <div className="p-20 text-center">Mock test not found.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl border border-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-headline font-bold">Publishing <span className="text-accent">Center</span></h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">{mock.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" className="border-white/10 rounded-xl gap-2 h-11" onClick={() => window.open(`/#exams`, '_blank')}>
              <Eye className="w-4 h-4" /> Live Preview
           </Button>
           <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 h-11 shadow-lg shadow-primary/20 px-8" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Apply Changes</>}
           </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Validation Column */}
        <div className="lg:col-span-4 space-y-6">
           <Card className={cn("glass overflow-hidden", validation?.isValid ? "border-emerald-500/20" : "border-amber-500/20")}>
              <CardHeader className={cn("pb-4", validation?.isValid ? "bg-emerald-500/10" : "bg-amber-500/10")}>
                 <div className="flex items-center gap-2">
                    {validation?.isValid ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-amber-400" />}
                    <CardTitle className="text-sm font-bold uppercase tracking-wider">Publication Readiness</CardTitle>
                 </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                 <div className="space-y-2">
                    <CheckItem label="Total Questions" value={`${questions?.length || 0} / ${mock.totalQuestions}`} valid={questions?.length === mock.totalQuestions} />
                    <CheckItem label="Verified Content" value={`${questions?.filter(q => q.status === 'Verified' || q.status === 'Published').length || 0} Ready`} valid={validation?.isValid} />
                    <CheckItem label="Scoring Logic" value={`${mock.marks} Marks / -${mock.negativeMarks}`} valid={!!mock.marks} />
                    <CheckItem label="Time Configuration" value={`${mock.durationMinutes} Minutes`} valid={!!mock.durationMinutes} />
                 </div>
                 {!validation?.isValid && (
                   <div className="pt-4 border-t border-white/5 space-y-2">
                      <p className="text-[10px] font-bold text-amber-400 uppercase">Critical Warnings:</p>
                      <ul className="space-y-1">
                        {validation?.errors.map((err, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-2">
                            <AlertCircle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" /> {err}
                          </li>
                        ))}
                      </ul>
                   </div>
                 )}
              </CardContent>
           </Card>

           <div className="p-6 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 space-y-4">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase">
                 <Zap className="w-4 h-4 fill-current" /> Admin Insights
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                 "This test is currently linked to <span className="text-indigo-400">{mock.examId}</span>. Publishing will make it immediately visible to {formData.visibility === 'Public' ? 'all users' : 'premium users'}."
              </p>
           </div>
        </div>

        {/* Control Column */}
        <div className="lg:col-span-8 space-y-8">
           {/* Lifecycle Status */}
           <Card className="glass border-white/10 p-6 space-y-6">
              <h3 className="font-bold flex items-center gap-2"><Send className="w-5 h-5 text-primary" /> Lifecycle Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Current State</Label>
                    <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                       <SelectTrigger className="bg-white/5 border-white/10 h-12">
                          <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="Draft">Draft (Private Editor)</SelectItem>
                          <SelectItem value="Published">Published (Live & Visible)</SelectItem>
                          <SelectItem value="Hidden">Hidden (Temporarily Unavailable)</SelectItem>
                          <SelectItem value="Scheduled">Scheduled (Auto-Publish)</SelectItem>
                          <SelectItem value="Archived">Archived (Legacy Test)</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>

                 {formData.status === 'Scheduled' && (
                   <div className="space-y-4 animate-in slide-in-from-top-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Auto-Publish Date</Label>
                      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3 h-12">
                         <CalendarIcon className="w-4 h-4 text-primary" />
                         <span className="text-sm">Not Configured (Future Feature)</span>
                      </div>
                   </div>
                 )}
              </div>
           </Card>

           {/* Access & Visibility */}
           <Card className="glass border-white/10 p-6 space-y-6">
              <h3 className="font-bold flex items-center gap-2"><Lock className="w-5 h-5 text-accent" /> Access & Visibility</h3>
              <div className="grid gap-6">
                 <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="space-y-0.5">
                       <Label className="text-base font-bold">Public Accessibility</Label>
                       <p className="text-xs text-muted-foreground">Controls if the test is searchable by general users.</p>
                    </div>
                    <Select value={formData.visibility} onValueChange={(v) => setFormData({ ...formData, visibility: v })}>
                       <SelectTrigger className="w-40 bg-white/5 border-white/10">
                          <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="Public">Public Access</SelectItem>
                          <SelectItem value="Premium">Premium Only</SelectItem>
                          <SelectItem value="Private">Private URL</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>

                 <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="space-y-0.5">
                       <Label className="text-base font-bold">Monetization: Free Test</Label>
                       <p className="text-xs text-muted-foreground">Free tests are used as high-yield lead magnets for new users.</p>
                    </div>
                    <Switch 
                       checked={formData.isFree}
                       onCheckedChange={(v) => setFormData({ ...formData, isFree: v })}
                    />
                 </div>
              </div>
           </Card>

           {/* Preview Mockup */}
           <div className="p-8 border-2 border-dashed border-white/10 rounded-[2.5rem] bg-white/[0.01] text-center space-y-4">
              <Globe className="w-12 h-12 mx-auto opacity-10" />
              <div className="space-y-1">
                 <h4 className="font-bold opacity-30">User-End Simulation</h4>
                 <p className="text-xs text-muted-foreground opacity-30">Render test listing preview exactly as it appears in student dashboards.</p>
              </div>
              <Button variant="outline" className="border-white/10 rounded-xl opacity-30" disabled>
                 Generate Mockup Preview
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}

function CheckItem({ label, value, valid }: { label: string, value: string, valid?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
       <span className="text-xs text-muted-foreground">{label}</span>
       <div className="flex items-center gap-2">
          <span className={cn("text-xs font-bold", valid ? "text-foreground" : "text-amber-400")}>{value}</span>
          {valid ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
       </div>
    </div>
  );
}
