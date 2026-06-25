import React from "react";
import { Banknote } from "lucide-react";
// Import ComingSoon directly since it sits in the same pages folder
import { ComingSoon } from "./ComingSoon";

export function Settlements() {
  return (
    <ComingSoon 
      title="Settlements & Payouts" 
      icon={Banknote} 
      description="Automated bank deposits, payout tracking dashboards, and weekly settlement cycles are currently in production."
    />
  );
}