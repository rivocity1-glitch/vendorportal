import React, { useState } from "react";
import {
  MessageCircle,
  X,
  Star,
  Bug,
  Headphones,
  Mail,
  Ticket,
  ChevronRight,
} from "lucide-react";

type Page = "contact";

interface FloatingSupportProps {
  onNavigate: (page: Page) => void;
}

export function FloatingSupport({ onNavigate }: FloatingSupportProps) {
  const [open, setOpen] = useState(false);

  const goToContact = () => {
    setOpen(false);
    onNavigate("contact");
  };

  return (
    <div className="fixed bottom-5 right-5 z-[100]">
      {open && (
        <div className="absolute bottom-16 right-0 w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#10B981]/10 text-[#10B981]">
              <Headphones className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">Rivo Support</p>
              <p className="text-[11px] text-muted-foreground">How can we help?</p>
            </div>
          </div>

          <div className="space-y-1 p-2">
            <button
              type="button"
              onClick={goToContact}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <Star className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">Send Feedback</span>
                <span className="block text-[11px] text-muted-foreground">Rate your experience</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={goToContact}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <Bug className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">Report a Problem</span>
                <span className="block text-[11px] text-muted-foreground">Tell us what went wrong</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={goToContact}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Ticket className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">Support & Tickets</span>
                <span className="block text-[11px] text-muted-foreground">View help and contact options</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={goToContact}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <Mail className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">Contact Us</span>
                <span className="block text-[11px] text-muted-foreground">Reach the Rivo support team</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-label={open ? "Close support menu" : "Open Rivo support"}
        aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#10B981] text-white shadow-xl shadow-[#10B981]/30 transition-all duration-200 hover:scale-105 hover:bg-[#059669] focus:outline-none focus:ring-4 focus:ring-[#10B981]/20"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
