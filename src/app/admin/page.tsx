"use client";

import React from "react";
import { 
  Briefcase, 
  Files, 
  HelpCircle, 
  Users, 
  Plus, 
  UploadCloud, 
  TrendingUp,
  Activity,
  ArrowUpRight,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const stats = [
  { label: "Total Exams", value: "48", icon: Briefcase, color: "text-blue-400", trend: "+2 this month" },
  { label: "Mock Tests", value: "1,240", icon: Files, color: "text-accent", trend: "+124 this month" },
  { label: "Questions", value: "25.4k", icon: HelpCircle, color: "text-emerald-400", trend: "+1.2k this month" },
  { label: "Active Users", value: "8.6k", icon: Users, color: "text-purple-400", trend: "+450 this month" },
];

const activities = [
  { id: 1, type: "upload", user: "Admin", target: "SSC CGL Mock #142", time: "2 hours ago" },
  { id: 2, type: "update", user: "Moderator", target: "General Awareness Questions", time: "5 hours ago" },
  { id: 3, type: "user", user: "System", target: "New 500+ users batch detected", time: "12 hours ago" },
  { id: 4, type: "report", user: "Admin", target: "Monthly revenue report generated", time: "1 day ago" },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Admin <span className="text-accent">Overview</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your examination portal, mocks, and users from one place.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-white/10 hover:bg-white/5 rounded-xl gap-2 font-bold h-11">
            <UploadCloud className="w-4 h-4" />
            Upload JSON
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl gap-2 font-bold h-11 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            Create Mock
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="glass border-white/10 overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-white/5 ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-[10px] font-bold text-muted-foreground bg-white/5 px-2 py-1 rounded-lg">
                  {stat.trend}
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-headline font-bold">{stat.value}</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Main Chart Area Placeholder */}
        <Card className="lg:col-span-8 glass border-white/10 p-6">
          <CardHeader className="px-0 pt-0 pb-8 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-headline font-bold">Platform Activity</CardTitle>
              <CardDescription className="text-xs">Daily test attempts vs question solvings</CardDescription>
            </div>
            <div className="flex gap-2">
               <Badge className="bg-primary/10 text-primary border-primary/20">Attempts</Badge>
               <Badge variant="outline" className="border-white/10">Solved</Badge>
            </div>
          </CardHeader>
          <div className="h-[300px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
            <div className="flex flex-col items-center text-muted-foreground gap-4">
              <Activity className="w-12 h-12 opacity-20" />
              <p className="text-sm font-medium">Activity Chart Integration Ready</p>
            </div>
          </div>
        </Card>

        {/* Recent Activity Side */}
        <Card className="lg:col-span-4 glass border-white/10 p-6">
          <CardHeader className="px-0 pt-0 pb-6">
            <CardTitle className="text-lg font-headline font-bold">Recent Events</CardTitle>
            <CardDescription className="text-xs">Live stream of administrative logs</CardDescription>
          </CardHeader>
          <div className="space-y-6">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-4 group">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    {activity.type === 'upload' ? <UploadCloud className="w-4 h-4 text-accent" /> : 
                     activity.type === 'update' ? <Activity className="w-4 h-4 text-primary" /> : 
                     activity.type === 'user' ? <Users className="w-4 h-4 text-emerald-400" /> : 
                     <FileWarning className="w-4 h-4 text-amber-400" />}
                  </div>
                  {activity.id !== activities.length && (
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-6 bg-white/5" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">
                    <span className="text-foreground">{activity.user}</span>
                    <span className="text-muted-foreground"> {activity.type === 'upload' ? 'uploaded' : 'updated'} </span>
                    <span className="text-accent">{activity.target}</span>
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {activity.time}
                  </div>
                </div>
              </div>
            ))}
            <Button variant="ghost" className="w-full text-xs font-bold text-muted-foreground hover:text-foreground mt-4">
              View All Logs
              <ArrowUpRight className="w-3 h-3 ml-2" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Quick Access Area */}
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { title: "Manage Exams", desc: "Add or edit exam categories and states.", color: "from-blue-500/10 to-indigo-500/10" },
          { title: "Review Reports", desc: "Check user feedback and reported errors.", color: "from-rose-500/10 to-orange-500/10" },
          { title: "User Support", desc: "Manage subscription and account issues.", color: "from-emerald-500/10 to-teal-500/10" }
        ].map((item, i) => (
          <div key={i} className={`p-6 rounded-2xl bg-gradient-to-br ${item.color} border border-white/5 hover:border-white/10 transition-all cursor-pointer group`}>
            <h4 className="font-bold text-base mb-1 group-hover:text-foreground transition-colors">{item.title}</h4>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}