
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
  GripVertical,
  ChevronDown
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
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
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { logAction } from "@/services/audit";

export default function MockTypeManagementPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isSubTypeModalOpen, setIsSubTypeModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<{ path: string, id: string, title: string } | null>(null);

  // Fetch Primary Mock Types
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

  const handleSoftDelete = async () => {
    if (!db || !itemToDelete || !user) return;
    try {
      await updateDoc(doc(db, itemToDelete.path, itemToDelete.id), { 
        deleted: true, 
        isActive: false,
        updatedAt: serverTimestamp() 
      });
      await logAction(db, user, "delete_type", itemToDelete.id, "mock_type", `Soft deleted: ${itemToDelete.title}`);
      toast({ title: "Archived", description: `"${itemToDelete.title}" removed successfully.` });
      if (selectedTypeId === itemToDelete.id) setSelectedTypeId(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Action Failed", description: e.message });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleToggleStatus = async (path: string, id: string, current: boolean, title: string) => {
    if (!db || !user) return;
    try {
      await updateDoc(doc(db, path, id), { 
        isActive: !current,
        updatedAt: serverTimestamp() 
      });
      toast({ title: "Status Updated", description: `${title} is now ${!current ? 'active' : 'hidden'}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-bold text-foreground">Hierarchy <span className="text-accent">Manager</span></h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">Define dynamic mock test types and nested sub-categories for all series.</p>
        </div>
        <Button 
          onClick={() => { setEditingItem(null); setIsTypeModalOpen(true); }}
          className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 h-11 shadow-lg shadow-primary/20 font-bold"
        >
          <Plus className="w-4 h-4" />
          Add Primary Type
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
        {/* Left Panel: Primary Types */}
        <Card className="lg:col-span-5 glass border-white/10 overflow-hidden shadow-xl">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Primary Types
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-wider">Master Categories</CardDescription>
              </div>
              <Badge variant="outline" className="bg-white/5 border-white/10">{mockTypes?.length || 0}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {typesLoading ? (
              <div className="p-12 text-center flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-[10px] uppercase font-bold text-muted-foreground animate-pulse">Syncing Types...</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {mockTypes?.map((type) => (
                  <div 
                    key={type.id} 
                    className={cn(
                      "flex items-center justify-between p-4 md:p-5 hover:bg-white/[0.02] transition-all group cursor-pointer border-l-4",
                      selectedTypeId === type.id ? "bg-primary/[0.08] border-primary" : "border-transparent"
                    )}
                    onClick={() => setSelectedTypeId(type.id)}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="p-2.5 rounded-xl bg-white/5 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm md:text-base truncate group-hover:text-primary transition-colors">{type.title}</h4>
                        <p className="text-[10px] text-muted-foreground truncate font-mono uppercase tracking-tighter opacity-60">ID: {type.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3" onClick={e => e.stopPropagation()}>
                      <Badge className={cn(
                        "h-5 px-2 text-[9px] font-bold uppercase", 
                        type.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-muted-foreground"
                      )}>
                        {type.isActive ? "Active" : "Hidden"}
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/10"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass border-white/10 w-48 p-1">
                          <DropdownMenuItem className="gap-2 focus:bg-white/5 py-2" onClick={() => { setEditingItem(type); setIsTypeModalOpen(true); }}>
                            <Edit2 className="w-3.5 h-3.5" /> Edit Configuration
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 focus:bg-white/5 py-2" onClick={() => handleToggleStatus("mockTypes", type.id, type.isActive, type.title)}>
                            {type.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />} 
                            {type.isActive ? "Hide from Users" : "Make Live"}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="gap-2 text-rose-400 focus:text-rose-400 focus:bg-rose-500/10 py-2" 
                            onClick={() => setItemToDelete({ path: "mockTypes", id: type.id, title: type.title })}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Category
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", selectedTypeId === type.id ? "rotate-90 text-primary" : "group-hover:translate-x-1")} />
                    </div>
                  </div>
                ))}
                {mockTypes?.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground italic text-sm">No types defined yet. Click "Add Primary Type" to start.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel: Sub-Types & Subjects */}
        <Card className="lg:col-span-7 glass border-white/10 overflow-hidden min-h-[400px] shadow-xl">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-6 gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-accent" />
                Subjects & Sub-Categories
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-wider">Nested levels for selection</CardDescription>
            </div>
            {selectedTypeId && (
              <Button 
                size="sm" 
                className="rounded-xl bg-accent text-white h-10 gap-2 font-bold shadow-lg shadow-accent/20 px-6"
                onClick={() => { setEditingItem(null); setIsSubTypeModalOpen(true); }}
              >
                <Plus className="w-4 h-4" /> Add Sub-Type
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {!selectedTypeId ? (
              <div className="h-[400px] flex flex-col items-center justify-center gap-6 text-muted-foreground opacity-30 text-center p-8">
                <div className="w-20 h-20 rounded-[2rem] bg-white/5 flex items-center justify-center">
                  <Layers className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-headline font-bold uppercase tracking-widest">No Selection</p>
                  <p className="text-sm">Select a Primary Type on the left to manage its subjects.</p>
                </div>
              </div>
            ) : subTypesLoading ? (
              <div className="p-12 text-center flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <p className="text-[10px] uppercase font-bold text-muted-foreground animate-pulse">Syncing Subjects...</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Title & Slug</th>
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Visibility</th>
                      <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {subTypes?.map((sub) => (
                      <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                              <span className="font-bold text-sm md:text-base group-hover:text-accent transition-colors">{sub.title}</span>
                              <span className="text-[10px] font-mono text-muted-foreground opacity-60 uppercase">{sub.slug}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={cn(
                            "h-5 px-2 text-[9px] font-bold uppercase", 
                            sub.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-muted-foreground"
                          )}>
                            {sub.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-white/10"
                              onClick={() => { setEditingItem(sub); setIsSubTypeModalOpen(true); }}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/10"><MoreVertical className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="glass border-white/10 w-48 p-1">
                                <DropdownMenuItem className="gap-2 focus:bg-white/5 py-2" onClick={() => handleToggleStatus(`mockTypes/${selectedTypeId}/subTypes`, sub.id, sub.isActive, sub.title)}>
                                  {sub.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />} 
                                  {sub.isActive ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="gap-2 text-rose-400 focus:text-rose-400 focus:bg-rose-500/10 py-2" 
                                  onClick={() => setItemToDelete({ path: `mockTypes/${selectedTypeId}/subTypes`, id: sub.id, title: sub.title })}
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete Subject
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {subTypes?.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-20 text-center text-muted-foreground italic text-sm">No subjects defined for this category.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <TypeModal isOpen={isTypeModalOpen} onClose={() => setIsTypeModalOpen(false)} editingItem={editingItem} />
      <SubTypeModal isOpen={isSubTypeModalOpen} onClose={() => setIsSubTypeModalOpen(false)} editingItem={editingItem} parentTypeId={selectedTypeId!} />
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="glass border-white/10 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-headline font-bold">Archive Category?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to remove <span className="text-white font-bold">"{itemToDelete?.title}"</span>? 
              This will hide it from students but preserve existing test data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="border-white/10 rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSoftDelete} className="bg-rose-500 hover:bg-rose-600 rounded-xl font-bold">Archive Item</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TypeModal({ isOpen, onClose, editingItem }: any) {
  const db = useFirestore();
  const { user } = useUser();
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
    if (!db || !user || !formData.title.trim()) return;
    setIsSaving(true);
    try {
      const slug = formData.slug.trim() || formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const data = { 
        ...formData, 
        slug, 
        deleted: false, 
        updatedAt: serverTimestamp() 
      };
      
      if (editingItem) {
        await updateDoc(doc(db, "mockTypes", editingItem.id), data);
        await logAction(db, user, "update_type", editingItem.id, "mock_type", `Updated: ${formData.title}`);
      } else {
        const docRef = await addDoc(collection(db, "mockTypes"), { ...data, createdAt: serverTimestamp() });
        await logAction(db, user, "create_type", docRef.id, "mock_type", `Created: ${formData.title}`);
      }
      toast({ title: "Success", description: "Mock type saved to global registry." });
      onClose();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save Failed", description: e.message });
    } finally { setIsSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/10 sm:max-w-md w-[95%] shadow-3xl">
        <DialogHeader><DialogTitle className="text-xl font-headline font-bold">{editingItem ? "Edit Mock Type" : "New Primary Type"}</DialogTitle></DialogHeader>
        <div className="space-y-5 py-6">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Type Title</Label>
            <Input placeholder="e.g. Subject Test" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="bg-white/5 border-white/10 h-12 text-lg font-medium" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">URL Slug</Label>
              <Input placeholder="auto-generated" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="bg-white/5 border-white/10 h-11 font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Sort Order</Label>
              <Input type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} className="bg-white/5 border-white/10 h-11 font-mono" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Short Description</Label>
            <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-white/5 border-white/10 h-11" placeholder="Brief hint for admins..." />
          </div>
        </div>
        <DialogFooter className="gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="border-white/10 rounded-xl h-11 flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary text-white font-bold rounded-xl h-11 flex-[2] shadow-lg shadow-primary/20">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubTypeModal({ isOpen, onClose, editingItem, parentTypeId }: any) {
  const db = useFirestore();
  const { user } = useUser();
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
    if (!db || !user || !formData.title.trim() || !parentTypeId) return;
    setIsSaving(true);
    try {
      const slug = formData.slug.trim() || formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const data = { 
        ...formData, 
        slug, 
        deleted: false, 
        parentTypeId,
        updatedAt: serverTimestamp() 
      };
      
      if (editingItem) {
        await updateDoc(doc(db, "mockTypes", parentTypeId, "subTypes", editingItem.id), data);
        await logAction(db, user, "update_subtype", editingItem.id, "mock_subtype", `Updated Subject: ${formData.title}`);
      } else {
        const docRef = await addDoc(collection(db, "mockTypes", parentTypeId, "subTypes"), { ...data, createdAt: serverTimestamp() });
        await logAction(db, user, "create_subtype", docRef.id, "mock_subtype", `Added Subject: ${formData.title}`);
      }
      toast({ title: "Success", description: "Subject synchronized successfully." });
      onClose();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save Failed", description: e.message });
    } finally { setIsSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/10 sm:max-w-md w-[95%] shadow-3xl">
        <DialogHeader><DialogTitle className="text-xl font-headline font-bold">{editingItem ? "Edit Subject" : "New Subject"}</DialogTitle></DialogHeader>
        <div className="space-y-5 py-6">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Subject Name</Label>
            <Input placeholder="e.g. Mathematics" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="bg-white/5 border-white/10 h-12 text-lg font-medium" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">URL Slug</Label>
              <Input placeholder="auto-generated" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="bg-white/5 border-white/10 h-11 font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Sort Order</Label>
              <Input type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} className="bg-white/5 border-white/10 h-11 font-mono" />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="border-white/10 rounded-xl h-11 flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-accent text-white font-bold rounded-xl h-11 flex-[2] shadow-lg shadow-accent/20">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Sync Subject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
