import React from "react";
import { Gift } from "lucide-react";
// Since it's in the same folder, we use the direct dot relative path link
import { ComingSoon } from "./ComingSoon";

// Changed function name from OffersPage to Offers to clear the App.tsx syntax error
export function Offers() {
  return (
    <ComingSoon 
      title="Offers & Marketing" 
      icon={Gift} 
      description="Powerful offer campaigns, discounts, and marketing tools will be available in a future update."
    />
  );
}