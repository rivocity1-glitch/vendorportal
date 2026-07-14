import React from "react";
import { BarChart3 } from "lucide-react";
// Import ComingSoon directly since it's sitting in the same pages folder
import { ComingSoon } from "./ComingSoon";

export function Analytics() {
  return (
    <ComingSoon 
      title="Analytics & Reports" 
      icon={BarChart3} 
      description="Deep sales metrics, live revenue summaries, and real-time performance graphs are currently in production."
    />
  );
}