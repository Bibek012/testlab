"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Globe, 
  Palette, 
  ShieldCheck, 
  Zap, 
  Mail, 
  Lock,
  Save,
  Loader2,
  AlertCircle,
  Monitor,
  Layout
} from "lucide-react";
import { useFirestore, useDoc } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const DEFAULT_SETTINGS = {
  platformName: "Testlab",
  supportEmail: "support@testlab.edu",
  supportPhone: "+91 98765 43210",
  maintenanceMode: false,
  branding: { primaryColor: "#6366f1", accentColor: "#0ea5e9", logoUrl: "" },
  mockSettings: { autoSubmitOnTimeout: true, allowPause: true, showPalette: true, negativeMarking: 0.33, defaultDuration: 90 },
  features: { enableBookmarks: true, enableLeaderboard: true, enableAnalytics: true, enableDailyQuizzes: true, enableAIPredictions: false },
  security: { sessionTimeoutMinutes: 120, enforceStrongPasswords: true, restrictMultipleLogins: false }
};

export default function PlatformSettingsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const settingRef = db ? doc(db, "settings", "global") : null;
  const { data: cloudSettings, loading } = useDoc<any>(settingRef);
  
  const [formData, setFormData] = useState<any>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (cloudSettings) setFormData({ ...DEFAULT_SETTINGS, ...cloudSettings });
  }, [cloudSettings]);

  const handleSave = async () => {
    if (!db || !settingRef) return;
    setIsSaving(true);
    try {
      await setDoc(settingRef, { ...formData, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: "Configuration Synchronized" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update failed", description: e.message });
    } finally { setIsSaving(false); }
  };

  if (loading) return <div className="h-[80vh] flex items-center justify-center w-full"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-bold">System <span className="text-accent">Settings</span></h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">Configure global platform behavior and feature flags.</p>
        </div>
        <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 px-8 h-10 md:h-12 shadow-lg shadow-primary/20 text-sm font-bold" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Sync System
        </Button>
      </div>

      {formData.maintenanceMode && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4 text-rose-400">
           <AlertCircle className="w-5 h-5 shrink-0" />
           <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Platform is currently restricted to Administrative Access Only.</p>
        </div>
      )}

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-white/5 p-1 rounded-2xl border border-white/5 mb-6 md:mb-8 overflow-x-auto hide-scrollbar flex h-auto w-full lg:w-auto">
          <TabsTrigger value="general" className="flex-1 lg:flex-none rounded-xl px-4 md:px-6 py-2.5 gap-2 text-[10px] md:text-xs font-bold data-[state=active]:bg-primary uppercase"><Settings className="w-4 h-4 hidden xs:block" /> General</TabsTrigger>
          <TabsTrigger value="mocks" className="flex-1 lg:flex-none rounded-xl px-4 md:px-6 py-2.5 gap-2 text-[10px] md:text-xs font-bold data-[state=active]:bg-primary uppercase"><Layout className="w-4 h-4 hidden xs:block" /> Engine</TabsTrigger>
          <TabsTrigger value="features" className="flex-1 lg:flex-none rounded-xl px-4 md:px-6 py-2.5 gap-2 text-[10px] md:text-xs font-bold data-[state=active]:bg-primary uppercase"><Zap className="w-4 h-4 hidden xs:block" /> Features</TabsTrigger>
          <TabsTrigger value="security" className="flex-1 lg:flex-none rounded-xl px-4 md:px-6 py-2.5 gap-2 text-[10px] md:text-xs font-bold data-[state=active]:bg-primary uppercase"><ShieldCheck className="w-4 h-4 hidden xs:block" /> Security</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
          <div className="lg:col-span-8 w-full min-w-0">
            <TabsContent value="general" className="space-y-6 m-0">
               <Card className="glass border-white/10 p-5 md:p-6 space-y-8">
                  <div className="space-y-6">
                    <h3 className="font-bold flex items-center gap-2 text-sm md:text-base uppercase tracking-wider text-muted-foreground"><Globe className="w-5 h-5 text-primary" /> Platform Info</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Platform Name</Label>
                          <Input className="bg-white/5 border-white/10 h-11" value={formData.platformName} onChange={(e) => setFormData({ ...formData, platformName: e.target.value })} />
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Maintenance Toggle</Label>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                             <span className="text-[10px] text-muted-foreground font-bold uppercase">Restrict Public</span>
                             <Switch checked={formData.maintenanceMode} onCheckedChange={(v) => setFormData({ ...formData, maintenanceMode: v })} />
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="font-bold flex items-center gap-2 text-sm md:text-base uppercase tracking-wider text-muted-foreground"><Mail className="w-5 h-5 text-accent" /> Support Pipeline</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Escalation Email</Label>
                          <Input className="bg-white/5 border-white/10 h-11" value={formData.supportEmail} onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })} />
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Support Contact</Label>
                          <Input className="bg-white/5 border-white/10 h-11" value={formData.supportPhone} onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })} />
                       </div>
                    </div>
                  </div>
               </Card>
            </TabsContent>

            <TabsContent value="mocks" className="space-y-6 m-0">
               <Card className="glass border-white/10 p-5 md:p-6 space-y-8">
                  <h3 className="font-bold flex items-center gap-2 text-sm md:text-base uppercase tracking-wider text-muted-foreground"><Monitor className="w-5 h-5 text-emerald-400" /> Default Logic</h3>
                  <div className="grid gap-4 md:gap-6">
                     <ToggleItem title="Auto-Submit" desc="Force submission on timer expiry." checked={formData.mockSettings.autoSubmitOnTimeout} onCheckedChange={(v: boolean) => setFormData({ ...formData, mockSettings: { ...formData.mockSettings, autoSubmitOnTimeout: v } })} />
                     <ToggleItem title="Test Pause" desc="Allow users to resume sessions later." checked={formData.mockSettings.allowPause} onCheckedChange={(v: boolean) => setFormData({ ...formData, mockSettings: { ...formData.mockSettings, allowPause: v } })} />
                     <div className="grid grid-cols-2 gap-4 md:gap-6 pt-4 border-t border-white/5">
                        <div className="space-y-1.5">
                           <Label className="text-[10px] uppercase font-bold text-muted-foreground">Default Penalty</Label>
                           <Input type="number" step="0.01" className="bg-white/5 border-white/10 h-11" value={formData.mockSettings.negativeMarking} onChange={(e) => setFormData({ ...formData, mockSettings: { ...formData.mockSettings, negativeMarking: parseFloat(e.target.value) } })} />
                        </div>
                        <div className="space-y-1.5">
                           <Label className="text-[10px] uppercase font-bold text-muted-foreground">Base Duration (m)</Label>
                           <Input type="number" className="bg-white/5 border-white/10 h-11" value={formData.mockSettings.defaultDuration} onChange={(e) => setFormData({ ...formData, mockSettings: { ...formData.mockSettings, defaultDuration: parseInt(e.target.value) } })} />
                        </div>
                     </div>
                  </div>
               </Card>
            </TabsContent>

            <TabsContent value="features" className="space-y-6 m-0">
               <Card className="glass border-white/10 p-5 md:p-6 space-y-8">
                  <h3 className="font-bold flex items-center gap-2 text-sm md:text-base uppercase tracking-wider text-muted-foreground"><Zap className="w-5 h-5 text-amber-400" /> Module Toggles</h3>
                  <div className="grid gap-4 md:gap-6">
                     <ToggleItem title="Global Leaderboard" desc="Real-time competitive rankings." checked={formData.features.enableLeaderboard} onCheckedChange={(v: boolean) => setFormData({ ...formData, features: { ...formData.features, enableLeaderboard: v } })} />
                     <ToggleItem title="AI Performance Lab" desc="Gemini-powered gap analysis." checked={formData.features.enableAIPredictions} onCheckedChange={(v: boolean) => setFormData({ ...formData, features: { ...formData.features, enableAIPredictions: v } })} />
                     <ToggleItem title="Daily Drills" desc="High-yield daily streak sets." checked={formData.features.enableDailyQuizzes} onCheckedChange={(v: boolean) => setFormData({ ...formData, features: { ...formData.features, enableDailyQuizzes: v } })} />
                     <ToggleItem title="Saved Items" desc="Enable question bookmarking." checked={formData.features.enableBookmarks} onCheckedChange={(v: boolean) => setFormData({ ...formData, features: { ...formData.features, enableBookmarks: v } })} />
                  </div>
               </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6 m-0">
               <Card className="glass border-white/10 p-5 md:p-6 space-y-8">
                  <h3 className="font-bold flex items-center gap-2 text-sm md:text-base uppercase tracking-wider text-muted-foreground"><Lock className="w-5 h-5 text-rose-400" /> Hardening</h3>
                  <div className="grid gap-4 md:gap-6">
                     <div className="space-y-1.5 max-w-sm">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Admin Timeout (Minutes)</Label>
                        <Input type="number" className="bg-white/5 border-white/10 h-11" value={formData.security.sessionTimeoutMinutes} onChange={(e) => setFormData({ ...formData, security: { ...formData.security, sessionTimeoutMinutes: parseInt(e.target.value) } })} />
                     </div>
                     <ToggleItem title="Strong Passwords" desc="Enforce complexity requirements." checked={formData.security.enforceStrongPasswords} onCheckedChange={(v: boolean) => setFormData({ ...formData, security: { ...formData.security, enforceStrongPasswords: v } })} />
                     <ToggleItem title="Single Session" desc="Restrict concurrent logins." checked={formData.security.restrictMultipleLogins} onCheckedChange={(v: boolean) => setFormData({ ...formData, security: { ...formData.security, restrictMultipleLogins: v } })} />
                  </div>
               </Card>
            </TabsContent>
          </div>

          <aside className="lg:col-span-4 space-y-6 w-full">
             <Card className="glass border-white/10 p-5 md:p-6">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Environment Health</CardTitle>
                <div className="space-y-4">
                   <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-muted-foreground font-medium">Last Sync</span>
                      <span className="text-[10px] font-mono opacity-60">{cloudSettings?.updatedAt ? new Date(cloudSettings.updatedAt.toDate()).toLocaleTimeString() : 'Init'}</span>
                   </div>
                   <div className="flex items-center justify-between py-2">
                      <span className="text-xs text-muted-foreground font-medium">DB Connection</span>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-bold h-5 uppercase tracking-tighter">Healthy</Badge>
                   </div>
                </div>
             </Card>

             <div className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-[2rem] border border-white/10 shadow-inner">
                <Zap className="w-5 h-5 text-accent mb-4" />
                <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed italic">
                   "Changes to <span className="text-white font-bold">Feature Drills</span> and <span className="text-white font-bold">Security Protocols</span> propagate to user dashboards instantly upon synchronization."
                </p>
             </div>
          </aside>
        </div>
      </Tabs>
    </div>
  );
}

function ToggleItem({ title, desc, checked, onCheckedChange }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 group hover:bg-white/5 transition-colors">
       <div className="space-y-0.5 min-w-0 pr-4">
          <Label className="text-sm font-bold block truncate">{title}</Label>
          <p className="text-[10px] text-muted-foreground leading-tight">{desc}</p>
       </div>
       <Switch checked={checked} onCheckedChange={onCheckedChange} className="shrink-0" />
    </div>
  );
}