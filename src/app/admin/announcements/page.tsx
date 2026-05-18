
"use client";

import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Megaphone, 
  Send, 
  Search, 
  Filter, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  Clock,
  AlertCircle,
  Users,
  Target,
  Loader2,
  Info,
  Zap,
  Settings
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function AnnouncementManagementPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const announcementsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "announcements"), orderBy("createdAt", "desc")) : null,
  [db]);
  const { data: announcements, loading } = useCollection(announcementsQuery);

  const categoriesQuery = useMemoFirebase(() => db ? collection(db, "examCategories") : null, [db]);
  const { data: categories } = useCollection(categoriesQuery);

  const filteredAnnouncements = useMemo(() => {
    if (!announcements) return [];
    return announcements.filter(a => 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.message.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [announcements, searchQuery]);

  const handleDelete = async (id: string) => {
    if (!db || !confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await deleteDoc(doc(db, "announcements", id));
      toast({ title: "Deleted", description: "Announcement removed successfully." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "announcements", id), { status });
      toast({ title: "Status Updated", description: `Announcement is now ${status}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Platform <span className="text-accent">Announcements</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Broadcast important updates, exam alerts, and news to students.</p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 h-11 shadow-lg shadow-primary/20"
          onClick={() => { setEditingAnnouncement(null); setIsModalOpen(true); }}
        >
          <Plus className="w-4 h-4" />
          New Announcement
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard label="Total Broadcasts" value={announcements?.length || 0} icon={Megaphone} color="text-primary" />
        <SummaryCard label="Active Alerts" value={announcements?.filter(a => a.status === 'Published').length || 0} icon={Send} color="text-emerald-400" />
        <SummaryCard label="Targeted Categories" value={categories?.length || 0} icon={Target} color="text-accent" />
        <SummaryCard label="Pending Drafts" value={announcements?.filter(a => a.status === 'Draft').length || 0} icon={Clock} color="text-amber-400" />
      </div>

      {/* Search & List */}
      <Card className="glass border-white/10 overflow-hidden">
        <CardHeader className="p-6 border-b border-white/5 bg-white/[0.02]">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search announcements..." 
                  className="pl-10 bg-white/5 border-white/5 h-10 rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-white/5">
                <Filter className="w-4 h-4" />
              </Button>
           </div>
        </CardHeader>
        <CardContent className="p-0">
           <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                 <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                       <th className="px-6 py-4 font-semibold text-muted-foreground">Broadcast Details</th>
                       <th className="px-6 py-4 font-semibold text-muted-foreground">Target</th>
                       <th className="px-6 py-4 font-semibold text-muted-foreground">Type</th>
                       <th className="px-6 py-4 font-semibold text-muted-foreground">Status</th>
                       <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20" /></td></tr>
                    ) : filteredAnnouncements.map((a) => (
                      <tr key={a.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                           <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-foreground">{a.title}</span>
                              <span className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{a.message}</span>
                              <span className="text-[10px] text-muted-foreground mt-1">
                                Created {a.createdAt?.toDate ? format(a.createdAt.toDate(), "MMM dd, HH:mm") : '—'}
                              </span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <Badge variant="outline" className="bg-white/5 border-white/10 uppercase text-[10px]">
                              {a.targetType === 'all' ? 'Everyone' : a.targetId}
                           </Badge>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                              <TypeIcon type={a.type} />
                              <span className="capitalize">{a.type}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <Badge className={cn(
                             "h-6 gap-1.5",
                             a.status === 'Published' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                             a.status === 'Draft' ? "bg-slate-500/10 text-slate-400 border-slate-500/20" :
                             "bg-rose-500/10 text-rose-400 border-rose-500/20"
                           )}>
                              <div className={cn("w-1.5 h-1.5 rounded-full", 
                                a.status === 'Published' ? "bg-emerald-400" :
                                a.status === 'Draft' ? "bg-slate-400" : "bg-rose-400"
                              )} />
                              {a.status}
                           </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-2">
                             <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-white/10"
                              onClick={() => { setEditingAnnouncement(a); setIsModalOpen(true); }}
                             >
                               <Edit2 className="w-4 h-4" />
                             </Button>
                             <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400"
                              onClick={() => handleDelete(a.id)}
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAnnouncements.length === 0 && !loading && (
                      <tr>
                        <td colSpan={5} className="px-6 py-32 text-center">
                           <div className="flex flex-col items-center gap-4 text-muted-foreground">
                              <Megaphone className="w-12 h-12 opacity-10" />
                              <p className="font-bold">No announcements found</p>
                              <Button variant="outline" size="sm" className="rounded-xl border-white/10" onClick={() => setIsModalOpen(true)}>
                                 Create First Broadcast
                              </Button>
                           </div>
                        </td>
                      </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </CardContent>
      </Card>

      <AnnouncementModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        categories={categories || []}
        editingItem={editingAnnouncement}
      />
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="glass border-white/10 p-6 space-y-2 relative overflow-hidden group">
       <Icon className={cn("absolute top-0 right-0 p-4 opacity-5 w-16 h-16 transition-opacity group-hover:opacity-10", color)} />
       <div className="text-2xl font-bold font-headline">{value}</div>
       <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{label}</p>
    </Card>
  );
}

function TypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'info': return <Info className="w-3.5 h-3.5 text-blue-400" />;
    case 'exam': return <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
    case 'mock': return <Zap className="w-3.5 h-3.5 text-primary" />;
    case 'system': return <Settings className="w-3.5 h-3.5 text-slate-400" />;
    default: return <Info className="w-3.5 h-3.5" />;
  }
}

function AnnouncementModal({ isOpen, onClose, categories, editingItem }: any) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({
    title: "",
    message: "",
    type: "info",
    targetType: "all",
    targetId: "",
    status: "Draft"
  });

  React.useEffect(() => {
    if (editingItem) setFormData(editingItem);
    else setFormData({ title: "", message: "", type: "info", targetType: "all", targetId: "", status: "Published" });
  }, [editingItem, isOpen]);

  const handleSave = async () => {
    if (!db || !formData.title || !formData.message) return;
    setIsSaving(true);
    try {
      if (editingItem) {
        await updateDoc(doc(db, "announcements", editingItem.id), { ...formData, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, "announcements"), { ...formData, createdAt: serverTimestamp() });
      }
      toast({ title: "Success", description: "Announcement saved successfully." });
      onClose();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/10 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Edit Announcement' : 'New Broadcast'}</DialogTitle>
          <DialogDescription>Create a message that will appear in students' notification centers.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input 
              placeholder="e.g. New SSC CGL Mocks Live!" 
              className="bg-white/5 border-white/10 h-11"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea 
              placeholder="Enter broadcast details..." 
              className="bg-white/5 border-white/10 min-h-[100px]"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Alert Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                 <SelectTrigger className="bg-white/5 border-white/10 h-11">
                    <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                    <SelectItem value="info">General Info</SelectItem>
                    <SelectItem value="exam">Exam Alert</SelectItem>
                    <SelectItem value="mock">New Mock Test</SelectItem>
                    <SelectItem value="system">System Update</SelectItem>
                 </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select value={formData.targetType} onValueChange={(v) => setFormData({ ...formData, targetType: v })}>
                 <SelectTrigger className="bg-white/5 border-white/10 h-11">
                    <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                    <SelectItem value="all">Global (All Users)</SelectItem>
                    <SelectItem value="category">Specific Category</SelectItem>
                    <SelectItem value="state">Specific State</SelectItem>
                 </SelectContent>
              </Select>
            </div>
          </div>
          {formData.targetType === 'category' && (
            <div className="space-y-2 animate-in slide-in-from-top-2">
              <Label>Select Category</Label>
              <Select value={formData.targetId} onValueChange={(v) => setFormData({ ...formData, targetId: v })}>
                 <SelectTrigger className="bg-white/5 border-white/10 h-11">
                    <SelectValue placeholder="Choose Category" />
                 </SelectTrigger>
                 <SelectContent>
                    {categories.map((cat: any) => <SelectItem key={cat.id} value={cat.slug}>{cat.title}</SelectItem>)}
                 </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="border-white/10">Cancel</Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white font-bold px-8 shadow-lg shadow-primary/20" disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingItem ? 'Save Changes' : 'Broadcast Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
