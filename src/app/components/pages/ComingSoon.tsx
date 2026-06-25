import React, { useState, useEffect } from "react";
import { LucideIcon, ShoppingBag, Box, RefreshCw } from "lucide-react";

interface ComingSoonProps {
  title: string;
  icon: LucideIcon;
  description?: string;
}

export function ComingSoon({ 
  title, 
  icon: Icon, 
  description = "We're building smarter operational tools for Rivo vendors." 
}: ComingSoonProps) {
  
  const vendorQuotes = [
    "“Great stores are built one order at a time.” — Team Rivo",
    "“Quality is not an act, it is a habit that builds trust.” — Team Rivo",
    "“Consistency is what transforms average storefronts into landmark businesses.” — Team Rivo",
    "“Your dedication today shapes the marketplace of tomorrow.” — Team Rivo"
  ];

  // 1. Set up a state hook to hold the chosen quote dynamically
  const [pickedQuote, setPickedQuote] = useState("");

  // 2. Select a completely random index whenever this placeholder page mounts on your screen
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * vendorQuotes.length);
    setPickedQuote(vendorQuotes[randomIndex]);
  }, [title]); // Trigger update if the tab title changes

  return (
    <div className="flex items-center justify-center p-4 min-h-[70vh] bg-background text-foreground transition-colors duration-200">
      <div className="w-full max-w-2xl bg-card rounded-2xl border border-border p-8 text-center shadow-xl relative overflow-hidden transition-all">
        
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#10B981] to-[#059669]" />

        {/* Central Layout Icon Core Wrapper */}
        <div className="w-16 h-16 bg-[#10B981]/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-[#10B981]/20">
          <Icon className="w-8 h-8 text-[#10B981]" />
        </div>

        {/* Custom Section Context Pills Badge */}
        <div className="inline-flex items-center gap-1.5 bg-[#10B981]/10 border border-[#10B981]/20 rounded-full px-3 py-1 text-xs font-bold text-[#10B981] mb-4">
          <Icon className="w-3.5 h-3.5" />
          <span>{title}</span>
        </div>

        {/* Informative Display Area */}
        <h1 className="text-3xl font-black text-foreground tracking-tight mb-2">Coming Soon</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6 leading-relaxed">
          {description}
        </p>

        <hr className="border-border/60 my-6" />

        {/* Focus Guides Matrix */}
        <div className="text-left max-w-md mx-auto mb-8">
          <p className="text-muted-foreground/80 text-xs font-bold uppercase tracking-wider mb-3">For now, focus on:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 bg-muted border border-border/80 rounded-xl p-3 text-xs text-foreground/90 font-medium">
              <ShoppingBag className="w-4 h-4 text-[#10B981]" />
              <span>Managing Products</span>
            </div>
            <div className="flex items-center gap-2.5 bg-muted border border-border/80 rounded-xl p-3 text-xs text-foreground/90 font-medium">
              <Box className="w-4 h-4 text-[#10B981]" />
              <span>Processing Orders</span>
            </div>
          </div>
        </div>

        <hr className="border-border/60 my-6" />

        {/* Inspiring Quote Footer Card */}
        <div className="bg-muted/40 border border-border/60 rounded-xl p-4 max-w-md mx-auto">
          <p className="text-[#10B981] dark:text-[#10B981] text-xs font-semibold italic tracking-wide min-h-[1rem]">
            {pickedQuote}
          </p>
          
          <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[10px] text-muted-foreground/70 font-bold uppercase tracking-widest">
            <RefreshCw className="w-3 h-3 text-muted-foreground/60" />
            <span>Refresh page to check for new updates</span>
          </div>
        </div>

      </div>
    </div>
  );
}