
"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Globe, 
  Palette, 
  ShieldCheck, 
  Zap, 
  Mail, 
  Bell, 
  Clock, 
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
  branding: {
    primaryColor: "#6366f1",
    accentColor: "#0ea5e9",
    logoUrl: "",
    faviconUrl: ""
  },
  mockSettings: {
    autoSubmitOnTimeout: true,
    allowPause: true,
    showPalette: true,
    negativeMarking: 0.33,
    defaultDuration: 90
  },
  features: {
    enableBookmarks: true,
    enableLeaderboard: true,
    enableAnalytics: true,
    enableDailyQuizzes: true,
    enableAIPredictions: false
  },
  security: {
    sessionTimeoutMinutes: 120,
    enforceStrongPasswords: true,
    restrictMultipleLogins: false
  }
};

export default function PlatformSettingsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const settingRef = db ? doc(db, "settings", "global") : null;
  const { data: cloudSettings, loading } = useDoc<any>(settingRef);
  
  const [formData, setFormData] = useState<any>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (cloudSettings) {
      setFormData({ ...DEFAULT_SETTINGS, ...cloudSettings });
    }
  }, [cloudSettings]);

  const handleSave = async () => {
    if (!db || !settingRef) return;
    setIsSaving(true);
    try {
      await setDoc(settingRef, {
        ...formData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      toast({
        title: "Settings Synchronized",
        description: "Global platform configuration has been updated successfully."
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: e.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading system configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">System <span className="text-accent">Settings</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Configure global platform behavior, branding, and feature flags.</p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 px-8 h-12 shadow-lg shadow-primary/20"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? "Syncing..." : "Save Changes"}
        </Button>
      </div>

      {formData.maintenanceMode && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4 text-rose-400">
           <AlertCircle className="w-5 h-5 shrink-0" />
           <p className="text-xs font-bold uppercase tracking-wider">Warning: Platform is currently in Maintenance Mode. Non-admin users may be restricted.</p>
        </div>
      )}

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-white/5 p-1 rounded-2xl border border-white/5 mb-8 overflow-x-auto h-auto flex flex-wrap lg:flex-nowrap">
          <TabsTrigger value="general" className="rounded-xl px-6 py-2.5 gap-2 data-[state=active]:bg-primary"><Settings className="w-4 h-4" /> General</TabsTrigger>
          <TabsTrigger value="mocks" className="rounded-xl px-6 py-2.5 gap-2 data-[state=active]:bg-primary"><Layout className="w-4 h-4" /> Mock Engine</TabsTrigger>
          <TabsTrigger value="branding" className="rounded-xl px-6 py-2.5 gap-2 data-[state=active]:bg-primary"><Palette className="w-4 h-4" /> Branding</TabsTrigger>
          <TabsTrigger value="features" className="rounded-xl px-6 py-2.5 gap-2 data-[state=active]:bg-primary"><Zap className="w-4 h-4" /> Feature Toggles</TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl px-6 py-2.5 gap-2 data-[state=active]:bg-primary"><ShieldCheck className="w-4 h-4" /> Security</TabsTrigger>
        </TabsList>

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <TabsContent value="general" className="space-y-6 m-0">
               <Card className="glass border-white/10 p-6 space-y-8">
                  <div className="space-y-6">
                    <h3 className="font-bold flex items-center gap-2 text-lg"><Globe className="w-5 h-5 text-primary" /> General Platform Info</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <Label>Platform Name</Label>
                          <Input 
                            className="bg-white/5 border-white/10 h-11"
                            value={formData.platformName}
                            onChange={(e) => setFormData({ ...formData, platformName: e.target.value })}
                          />
                       </div>
                       <div className="space-y-2">
                          <Label>Maintenance Mode</Label>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                             <span className="text-xs text-muted-foreground">Restrict user access</span>
                             <Switch 
                                checked={formData.maintenanceMode}
                                onCheckedChange={(v) => setFormData({ ...formData, maintenanceMode: v })}
                             />
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="font-bold flex items-center gap-2 text-lg"><Mail className="w-5 h-5 text-accent" /> Support & Contact</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <Label>Support Email</Label>
                          <Input 
                            className="bg-white/5 border-white/10 h-11"
                            value={formData.supportEmail}
                            onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                          />
                       </div>
                       <div className="space-y-2">
                          <Label>Contact Number</Label>
                          <Input 
                            className="bg-white/5 border-white/10 h-11"
                            value={formData.supportPhone}
                            onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                          />
                       </div>
                    </div>
                  </div>
               </Card>
            </TabsContent>

            <TabsContent value="mocks" className="space-y-6 m-0">
               <Card className="glass border-white/10 p-6 space-y-8">
                  <h3 className="font-bold flex items-center gap-2 text-lg"><Monitor className="w-5 h-5 text-emerald-400" /> Default Mock Engine Behavior</h3>
                  <div className="grid gap-6">
                     <ToggleItem 
                        title="Auto Submit on Timeout" 
                        desc="Automatically submits the test when the timer hits zero."
                        checked={formData.mockSettings.autoSubmitOnTimeout}
                        onCheckedChange={(v) => setFormData({ ...formData, mockSettings: { ...formData.mockSettings, autoSubmitOnTimeout: v } })}
                     />
                     <ToggleItem 
                        title="Allow Test Pause" 
                        desc="Enable students to pause their tests and resume later."
                        checked={formData.mockSettings.allowPause}
                        onCheckedChange={(v) => setFormData({ ...formData, mockSettings: { ...formData.mockSettings, allowPause: v } })}
                     />
                     <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                        <div className="space-y-2">
                           <Label>Default Negative Marking</Label>
                           <Input 
                              type="number" step="0.01"
                              className="bg-white/5 border-white/10 h-11"
                              value={formData.mockSettings.negativeMarking}
                              onChange={(e) => setFormData({ ...formData, mockSettings: { ...formData.mockSettings, negativeMarking: parseFloat(e.target.value) } })}
                           />
                        </div>
                        <div className="space-y-2">
                           <Label>Default Duration (Mins)</Label>
                           <Input 
                              type="number"
                              className="bg-white/5 border-white/10 h-11"
                              value={formData.mockSettings.defaultDuration}
                              onChange={(e) => setFormData({ ...formData, mockSettings: { ...formData.mockSettings, defaultDuration: parseInt(e.target.value) } })}
                           />
                        </div>
                     </div>
                  </div>
               </Card>
            </TabsContent>

            <TabsContent value="branding" className="space-y-6 m-0">
               <Card className="glass border-white/10 p-6 space-y-8">
                  <h3 className="font-bold flex items-center gap-2 text-lg"><Palette className="w-5 h-5 text-indigo-400" /> Visual Identity</h3>
                  <div className="grid md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div className="space-y-2">
                           <Label>Primary Brand Color</Label>
                           <div className="flex gap-3">
                              <Input 
                                type="text"
                                className="bg-white/5 border-white/10 h-11 font-mono"
                                value={formData.branding.primaryColor}
                                onChange={(e) => setFormData({ ...formData, branding: { ...formData.branding, primaryColor: e.target.value } })}
                              />
                              <div className="w-11 h-11 rounded-lg border border-white/10 shrink-0" style={{ backgroundColor: formData.branding.primaryColor }} />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <Label>Logo URL</Label>
                           <Input 
                              placeholder="https://..."
                              className="bg-white/5 border-white/10 h-11"
                              value={formData.branding.logoUrl}
                              onChange={(e) => setFormData({ ...formData, branding: { ...formData.branding, logoUrl: e.target.value } })}
                           />
                        </div>
                     </div>
                     <div className="p-8 rounded-3xl bg-white/[0.02] border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground">
                           <Monitor className="w-8 h-8" />
                        </div>
                        <p className="text-xs text-muted-foreground">Visual preview updates automatically on save.</p>
                     </div>
                  </div>
               </Card>
            </TabsContent>

            <TabsContent value="features" className="space-y-6 m-0">
               <Card className="glass border-white/10 p-6 space-y-8">
                  <h3 className="font-bold flex items-center gap-2 text-lg"><Zap className="w-5 h-5 text-amber-400" /> Advanced Feature Flags</h3>
                  <div className="grid gap-6">
                     <ToggleItem 
                        title="Leaderboard & Rankings" 
                        desc="Allow students to see how they rank against others."
                        checked={formData.features.enableLeaderboard}
                        onCheckedChange={(v) => setFormData({ ...formData, features: { ...formData.features, enableLeaderboard: v } })}
                     />
                     <ToggleItem 
                        title="AI Performance Insights" 
                        desc="Generate automated feedback using Gemini AI flows."
                        checked={formData.features.enableAIPredictions}
                        onCheckedChange={(v) => setFormData({ ...formData, features: { ...formData.features, enableAIPredictions: v } })}
                     />
                     <ToggleItem 
                        title="Daily Practice Quizzes" 
                        desc="Enable high-yield daily streak modules."
                        checked={formData.features.enableDailyQuizzes}
                        onCheckedChange={(v) => setFormData({ ...formData, features: { ...formData.features, enableDailyQuizzes: v } })}
                     />
                     <ToggleItem 
                        title="Question Bookmarks" 
                        desc="Allow users to save specific items for revision."
                        checked={formData.features.enableBookmarks}
                        onCheckedChange={(v) => setFormData({ ...formData, features: { ...formData.features, enableBookmarks: v } })}
                     />
                  </div>
               </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6 m-0">
               <Card className="glass border-white/10 p-6 space-y-8">
                  <h3 className="font-bold flex items-center gap-2 text-lg"><Lock className="w-5 h-5 text-rose-400" /> Access & Protection</h3>
                  <div className="grid gap-6">
                     <div className="space-y-2 max-w-sm">
                        <Label>Admin Session Timeout (Minutes)</Label>
                        <Input 
                           type="number"
                           className="bg-white/5 border-white/10 h-11"
                           value={formData.security.sessionTimeoutMinutes}
                           onChange={(e) => setFormData({ ...formData, security: { ...formData.security, sessionTimeoutMinutes: parseInt(e.target.value) } })}
                        />
                     </div>
                     <ToggleItem 
                        title="Enforce Strong Passwords" 
                        desc="Require uppercase, symbols, and length for registration."
                        checked={formData.security.enforceStrongPasswords}
                        onCheckedChange={(v) => setFormData({ ...formData, security: { ...formData.security, enforceStrongPasswords: v } })}
                     />
                     <ToggleItem 
                        title="Restrict Multiple Logins" 
                        desc="Prevent account sharing by limiting active sessions."
                        checked={formData.security.restrictMultipleLogins}
                        onCheckedChange={(v) => setFormData({ ...formData, security: { ...formData.security, restrictMultipleLogins: v } })}
                     />
                  </div>
               </Card>
            </TabsContent>
          </div>

          <div className="lg:col-span-4 space-y-6">
             <Card className="glass border-white/10 p-6">
                <CardTitle className="text-base font-bold mb-4">Live Status</CardTitle>
                <div className="space-y-4">
                   <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-muted-foreground">Last Synchronized</span>
                      <span className="text-[10px] font-mono">{cloudSettings?.updatedAt ? new Date(cloudSettings.updatedAt.toDate()).toLocaleTimeString() : 'Never'}</span>
                   </div>
                   <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-muted-foreground">Admin Status</span>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Active Session</Badge>
                   </div>
                   <div className="flex items-center justify-between py-2">
                      <span className="text-xs text-muted-foreground">Firestore Integrity</span>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                   </div>
                </div>
             </Card>

             <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-accent/10 rounded-3xl border border-white/10 space-y-4">
                <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase">
                   <Zap className="w-4 h-4 fill-current" /> Admin Logic
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                   "Changes to <span className="text-white">Feature Toggles</span> and <span className="text-white">Branding</span> will be reflected across all user dashboards instantly upon save. This affects your production Firestore environment."
                </p>
             </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

function ToggleItem({ title, desc, checked, onCheckedChange }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 group hover:bg-white/5 transition-colors">
       <div className="space-y-0.5">
          <Label className="text-sm font-bold">{title}</Label>
          <p className="text-[10px] text-muted-foreground">{desc}</p>
       </div>
       <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
