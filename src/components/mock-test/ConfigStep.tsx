
"use client";

import React, { useState } from "react";
import { MockTestData } from "@/lib/mock-test-engine-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Play, ArrowLeft, Globe } from "lucide-react";

interface Props {
  testData: MockTestData;
  onBack: () => void;
  onStart: (lang: 'en' | 'hn') => void;
}

export const ConfigStep = ({ testData, onBack, onStart }: Props) => {
  const [lang, setLang] = useState<'en' | 'hn'>('en');
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card className="glass border-white/10 shadow-2xl overflow-hidden rounded-[2rem]">
        <CardHeader className="bg-white/5 border-b border-white/5 p-8">
          <CardTitle className="text-2xl font-headline font-bold">Final Confirmation</CardTitle>
          <p className="text-xs text-muted-foreground">Set your preferences before starting the actual test.</p>
        </CardHeader>
        
        <CardContent className="p-8 space-y-8">
          <div className="space-y-4">
            <label className="text-sm font-bold flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Choose your default language:
            </label>
            <Select value={lang} onValueChange={(v: any) => setLang(v)}>
              <SelectTrigger className="bg-white/5 border-white/10 h-14 rounded-xl">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hn">Hindi (हिन्दी)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground italic">
              Note: You can also switch language for individual questions during the test.
            </p>
          </div>

          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
             <div className="flex items-start space-x-3">
               <Checkbox 
                 id="terms" 
                 checked={agreed} 
                 onCheckedChange={(v) => setAgreed(!!v)}
                 className="mt-1"
               />
               <label
                 htmlFor="terms"
                 className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
               >
                 I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. I agree that in case of not adhering to the instructions, I will be disqualified from the test.
               </label>
             </div>
          </div>

          <div className="pt-4 flex gap-4">
            <Button 
              variant="outline" 
              onClick={onBack} 
              className="flex-1 rounded-xl h-14 border-white/10 hover:bg-white/5"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button 
              disabled={!agreed}
              onClick={() => onStart(lang)}
              className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-14 font-bold gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Play className="w-4 h-4 fill-current" />
              I am ready to begin
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
