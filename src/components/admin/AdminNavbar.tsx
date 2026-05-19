"use client";

import React from "react";
import { 
  Search, 
  Bell, 
  User, 
  Menu,
  LogOut,
  Settings,
  HelpCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSidebar } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export const AdminNavbar = ({ profile }: { profile: any }) => {
  const { toggleSidebar } = useSidebar();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/");
  };

  return (
    <header className="h-16 border-b border-white/5 bg-[#0b1120]/50 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 w-full shrink-0">
      <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden text-muted-foreground shrink-0"
          onClick={toggleSidebar}
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        <div className="relative max-w-xs xl:max-w-md w-full hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Quick search..." 
            className="pl-10 bg-white/5 border-white/5 h-9 rounded-xl focus-visible:ring-primary/50 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <div className="hidden lg:flex items-center mr-1">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-bold tracking-widest px-3 h-6">
            {profile?.role?.replace('-', ' ') || 'Admin'}
          </Badge>
        </div>

        <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-white/5 relative h-9 w-9">
          <Bell className="w-4 h-4 md:w-5 md:h-5" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-accent rounded-full border-2 border-[#0b1120]" />
        </Button>

        <div className="h-4 w-px bg-white/10 mx-1 md:mx-2" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 md:h-10 md:w-10 rounded-full p-0 overflow-hidden ring-primary/20 hover:ring-2 transition-all">
              <Avatar className="h-full w-full">
                <AvatarImage src={profile?.photoURL} alt="Admin" />
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                  {(profile?.displayName || profile?.email || 'A')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 glass border-white/10" align="end">
            <DropdownMenuLabel className="font-headline">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground truncate">{profile?.displayName || 'Admin'}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{profile?.role?.replace('-', ' ')}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem className="focus:bg-white/5 cursor-pointer py-2.5">
              <User className="mr-2 h-4 w-4" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
            {profile?.role === 'super-admin' && (
              <DropdownMenuItem className="focus:bg-white/5 cursor-pointer py-2.5" onClick={() => router.push('/admin/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>System Config</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="focus:bg-white/5 cursor-pointer py-2.5">
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Help Center</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem className="focus:bg-destructive/20 text-destructive cursor-pointer py-2.5" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};