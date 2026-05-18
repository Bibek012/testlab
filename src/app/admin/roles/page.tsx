"use client";

import React, { useState, useMemo } from "react";
import { 
  ShieldCheck, 
  UserPlus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  Shield
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, updateDoc, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
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
import { ROLE_PERMISSIONS, AdminRole } from "@/lib/rbac";
import { useToast } from "@/hooks/use-toast";

export default function StaffRolesPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch all users who have a role other than 'student'
  const staffQuery = useMemoFirebase(() => 
    db ? query(collection(db, "users"), where("role", "!=", "student")) : null, 
  [db]);

  const { data: staff, loading } = useCollection<any>(staffQuery);

  const filteredStaff = useMemo(() => {
    if (!staff) return [];
    return staff.filter(u => 
      u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [staff, searchQuery]);

  const handleUpdateRole = async (uid: string, newRole: AdminRole) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "users", uid), { role: newRole });
      toast({ title: "Role Updated", description: `User role changed to ${newRole}.` });
      setIsModalOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Staff <span className="text-accent">Roles</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Manage administrative permissions and assign roles to your team.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 h-11">
          <UserPlus className="w-4 h-4" />
          Invite Staff Member
        </Button>
      </div>

      {/* Role Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.keys(ROLE_PERMISSIONS).filter(r => r !== 'student').map((role) => (
          <Card key={role} className="glass border-white/10 p-4 space-y-2 relative overflow-hidden group">
            <div className="absolute -top-1 -right-1 p-2 opacity-5 w-12 h-12 text-primary">
              <Shield className="w-full h-full" />
            </div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{role.replace('-', ' ')}</div>
            <div className="text-2xl font-bold font-headline">
              {staff?.filter(s => s.role === role).length || 0}
            </div>
          </Card>
        ))}
      </div>

      {/* Search & Filter */}
      <Card className="glass border-white/10">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search staff members..." 
              className="pl-10 bg-white/5 border-white/5 h-11 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card className="glass border-white/10 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                    <th className="px-6 py-4 font-semibold text-muted-foreground">Staff Member</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground">Role</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground">Permissions</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground">Status</th>
                    <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20" /></td></tr>
                  ) : filteredStaff.map(member => (
                    <tr key={member.uid} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <Avatar className="h-10 w-10 border border-white/10">
                              <AvatarImage src={member.photoURL} />
                              <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                                {(member.displayName || member.email || 'S')[0].toUpperCase()}
                              </AvatarFallback>
                           </Avatar>
                           <div className="flex flex-col">
                              <span className="font-bold text-foreground">{member.displayName || 'Unnamed'}</span>
                              <span className="text-[10px] text-muted-foreground">{member.email}</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className="bg-primary/10 text-primary border-primary/20 h-6 px-3">
                          {member.role.replace('-', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {Object.entries(ROLE_PERMISSIONS[member.role as AdminRole]).map(([key, val]) => (
                            val && <div key={key} className="w-2 h-2 rounded-full bg-emerald-400" title={key} />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <Badge className={cn(
                           "h-6 gap-1.5",
                           member.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                         )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", member.status === 'active' ? "bg-emerald-400" : "bg-rose-400")} />
                            {member.status}
                         </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-white/10"
                            onClick={() => { setEditingUser(member); setIsModalOpen(true); }}
                           >
                              <Edit2 className="w-4 h-4 text-primary" />
                           </Button>
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10">
                                    <MoreVertical className="w-4 h-4" />
                                 </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="glass border-white/10">
                                 <DropdownMenuItem onClick={() => handleUpdateRole(member.uid, 'student')} className="text-destructive">
                                   Revoke Admin Access
                                 </DropdownMenuItem>
                              </DropdownMenuContent>
                           </DropdownMenu>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </CardContent>
      </Card>

      <RoleEditModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        user={editingUser} 
        onSave={handleUpdateRole} 
      />
    </div>
  );
}

function RoleEditModal({ isOpen, onClose, user, onSave }: any) {
  const [selectedRole, setSelectedRole] = useState<AdminRole>('support-staff');

  React.useEffect(() => {
    if (user) setSelectedRole(user.role);
  }, [user]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modify Staff Role</DialogTitle>
          <DialogDescription>Update permissions for {user?.email}</DialogDescription>
        </DialogHeader>
        <div className="py-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Select Role</label>
            <Select value={selectedRole} onValueChange={(v: any) => setSelectedRole(v)}>
              <SelectTrigger className="bg-white/5 border-white/10 h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super-admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="content-manager">Content Manager</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="support-staff">Support Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
             <h5 className="text-[10px] font-bold text-primary uppercase tracking-widest">Active Permissions</h5>
             <div className="grid grid-cols-2 gap-y-2">
                {Object.entries(ROLE_PERMISSIONS[selectedRole]).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    {val ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-white/10" />}
                    <span className={cn("text-[10px] truncate", val ? "text-foreground" : "text-muted-foreground")}>
                      {key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                ))}
             </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/10">Cancel</Button>
          <Button onClick={() => onSave(user.uid, selectedRole)} className="bg-primary hover:bg-primary/90 text-white font-bold px-8 shadow-lg shadow-primary/20">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
