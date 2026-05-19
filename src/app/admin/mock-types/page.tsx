
"use client";

import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Layers, 
  Settings2, 
  Trash2, 
  Edit2, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  XCircle,
  GripVertical
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";
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
  DialogFooter 
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function MockTypeManagementPage() {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isSubTypeModalOpen, setIsSubTypeModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Fetch Mock Types
  const typesQuery = useMemoFirebase(() => 
    db ? query(collection(db, "mockTypes"), where("deleted", "==", false), orderBy("order", "asc")) : null,
  [db]);
  const { data: mockTypes, loading: typesLoading } = useCollection<any>(typesQuery);

  // Fetch Sub-Types for selected Type
  const subTypesQuery = useMemoFirebase(() => 
    db && selectedTypeId 
      ? query(collection(db, "mockTypes", selectedTypeId, "subTypes"), where("deleted", "==", false), orderBy("order", "asc")) 
      : null,
  [db, selectedTypeId]);
  const { data: subTypes, loading: subTypesLoading } = useCollection<any>(subTypesQuery);

  const handleDelete = async (path: string, id: string) => {
    if (!db || !confirm("Are you sure you want to delete this category?")) return;
    try {
      await updateDoc(doc(db, path, id), { 
        deleted: true, 
        isActive: false,
        deletedAt: serverTimestamp() 
      });
      toast({ title: "Deleted", description: "Category removed successfully." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleToggleStatus = async (path: string, id: string, current: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, path, id), { isActive: !current });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-foreground">Hierarchy <span className="text-accent">Manager</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Define dynamic mock test types and nested sub-categories.</p>
        </div>
        <Button 
          onClick={() => { setEditingItem(null); setIsTypeModalOpen(true); }}
          className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 h-11 shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Add New Type
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <Card className="lg:col-span-5 glass border-white/10 overflow-hidden">
          <CardHeader className="bg-white/[0.02] border-b border-white/5">
            <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Primary Mock Types
            </CardTitle>
            <CardDescription className="text-xs">Categories like Full Test, Subject Test, etc.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {typesLoading ? (
              <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-20" /></div>
            ) : (
              <div className="divide-y divide-white/5">
                {mockTypes?.map((type) => (
                  <div 
                    key={type.id} 
                    className={cn(
                      "flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors group cursor-pointer",
                      selectedTypeId === type.id && "bg-primary/[0.05] border-l-4 border-l-primary"
                    )}
                    onClick={() => setSelectedTypeId(type.id)}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-white/5 text-muted-foreground">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm truncate">{type.title}</h4>
                        <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">{type.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Badge className={cn("h-5 px-1.5 text-[9px]", type.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-muted-foreground")}>
                        {type.isActive ? "Active" : "Hidden"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/10"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass border-white/10">
                          <DropdownMenuItem className="gap-2" onClick={() => { setEditingItem(type); setIsTypeModalOpen(true); }}><Edit2 className="w-3.5 h-3.5" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => handleToggleStatus("mockTypes", type.id, type.isActive)}>{type.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />} {type.isActive ? "Deactivate" : "Activate"}</DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDelete("mockTypes", type.id)}><Trash2 className="w-3.5 h-3.5" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", selectedTypeId === type.id ? "rotate-90 text-primary" : "")} />
                    </div>
                  </div>
                ))}
                {mockTypes?.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground italic text-sm">No types defined yet.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-7 glass border-white/10 overflow-hidden min-h-[400px]">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-accent" />
                Sub-Types & Subjects
              </CardTitle>
              <CardDescription className="text-xs">Nested levels for the selected Mock Type.</CardDescription>
            </div>
            {selectedTypeId && (
              <Button 
                size="sm" 
                variant="outline" 
                className="rounded-lg border-white/10 h-9 gap-2"
                onClick={() => { setEditingItem(null); setIsSubTypeModalOpen(true); }}
              >
                <Plus className="w-4 h-4" /> Add Sub-Type
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {!selectedTypeId ? (
              <div className="h-[300px] flex flex-col items-center justify-center gap-4 text-muted-foreground opacity-30">
                <Layers className="w-12 h-12" />
                <p className="text-sm font-bold uppercase tracking-widest">Select a Primary Type</p>
              </div>
            ) : subTypesLoading ? (
              <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-20" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Sub-Type Title</th>
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Slug</th>
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Status</th>
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {subTypes?.map((sub) => (
                      <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-bold">{sub.title}</td>
                        <td className="px-6 py-4 font-mono text-[10px] text-muted-foreground">{sub.slug}</td>
                        <td className="px-6 py-4">
                          <Badge className={cn("h-5", sub.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-muted-foreground")}>
                            {sub.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-white/10"
                              onClick={() => { setEditingItem(sub); setIsSubTypeModalOpen(true); }}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400"
                              onClick={() => handleDelete(`mockTypes/${selectedTypeId}/subTypes`, sub.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {subTypes?.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-20 text-center text-muted-foreground italic">No sub-types defined for this category.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TypeModal isOpen={isTypeModalOpen} onClose={() => setIsTypeModalOpen(false)} editingItem={editingItem} />
      <SubTypeModal isOpen={isSubTypeModalOpen} onClose={() => setIsSubTypeModalOpen(false)} editingItem={editingItem} parentTypeId={selectedTypeId!} />
    </div>
  );
}

function TypeModal({ isOpen, onClose, editingItem }: any) {
  const db = useFirestore();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ title: "", slug: "", description: "", order: 0, isActive: true });
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (editingItem) setFormData({
      title: editingItem.title || "",
      slug: editingItem.slug || "",
      description: editingItem.description || "",
      order: editingItem.order ?? 0,
      isActive: editingItem.isActive ?? true
    });
    else setFormData({ title: "", slug: "", description: "", order: 0, isActive: true });
  }, [editingItem, isOpen]);

  const handleSave = async () => {
    if (!db || !formData.title) return;
    setIsSaving(true);
    try {
      const slug = formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const data = { ...formData, slug, deleted: false, updatedAt: serverTimestamp() };
      if (editingItem) await updateDoc(doc(db, "mockTypes", editingItem.id), data);
      else await addDoc(collection(db, "mockTypes"), { ...data, createdAt: serverTimestamp() });
      toast({ title: "Mock Type Saved" });
      onClose();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally { setIsSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/10 sm:max-w-md">
        <DialogHeader><DialogTitle>{editingItem ? "Edit Mock Type" : "New Mock Type"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Type Title</Label>
            <Input placeholder="e.g. Subject Test" value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="bg-white/5 border-white/10 h-11" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input placeholder="auto-generated" value={formData.slug || ""} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="bg-white/5 border-white/10 h-11 font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input type="number" value={formData.order ?? 0} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} className="bg-white/5 border-white/10 h-11" />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-white/10">Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary text-white font-bold px-8">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Primary Type"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubTypeModal({ isOpen, onClose, editingItem, parentTypeId }: any) {
  const db = useFirestore();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ title: "", slug: "", order: 0, isActive: true });
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (editingItem) setFormData({
      title: editingItem.title || "",
      slug: editingItem.slug || "",
      order: editingItem.order ?? 0,
      isActive: editingItem.isActive ?? true
    });
    else setFormData({ title: "", slug: "", order: 0, isActive: true });
  }, [editingItem, isOpen]);

  const handleSave = async () => {
    if (!db || !formData.title || !parentTypeId) return;
    setIsSaving(true);
    try {
      const slug = formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const data = { ...formData, slug, deleted: false, updatedAt: serverTimestamp() };
      if (editingItem) await updateDoc(doc(db, "mockTypes", parentTypeId, "subTypes", editingItem.id), data);
      else await addDoc(collection(db, "mockTypes", parentTypeId, "subTypes"), { ...data, createdAt: serverTimestamp() });
      toast({ title: "Sub-Type Saved" });
      onClose();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally { setIsSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/10 sm:max-w-md">
        <DialogHeader><DialogTitle>{editingItem ? "Edit Sub-Type" : "New Sub-Type"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Sub-Type / Subject Title</Label>
            <Input placeholder="e.g. Mathematics" value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="bg-white/5 border-white/10 h-11" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input placeholder="auto-generated" value={formData.slug || ""} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="bg-white/5 border-white/10 h-11 font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input type="number" value={formData.order ?? 0} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} className="bg-white/5 border-white/10 h-11" />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-white/10">Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-accent text-white font-bold px-8">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Sub-Type"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
