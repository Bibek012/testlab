
'use client';

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { ZoomIn, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  src: string;
  alt?: string;
  className?: string;
}

/**
 * Responsive image component for exam questions with built-in lightbox for zooming.
 */
export const QuestionImage = ({ src, alt = "Exam illustration", className }: Props) => {
  if (!src) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className={cn(
          "relative group cursor-zoom-in rounded-2xl overflow-hidden border border-white/5 bg-white/5 p-4 transition-all hover:border-primary/30",
          className
        )}>
          <img 
            src={src} 
            alt={alt} 
            className="max-h-[350px] w-auto object-contain mx-auto transition-transform duration-500 group-hover:scale-[1.02]" 
            loading="lazy" 
          />
          <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[2px]">
            <div className="bg-primary text-white p-3 rounded-full shadow-2xl shadow-primary/40 transform scale-75 group-hover:scale-100 transition-transform">
              <ZoomIn className="w-6 h-6" />
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-[98vw] sm:max-w-[90vw] h-[90vh] p-4 border-white/10 bg-slate-950/95 backdrop-blur-2xl">
        <div className="relative w-full h-full flex flex-col items-center justify-center gap-4">
           <img 
            src={src} 
            alt={alt} 
            className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-3xl" 
           />
           <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{alt}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
