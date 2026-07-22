import React, { useState, useEffect } from "react";
import { 
  User, 
  Shield, 
  LogOut, 
  Loader2, 
  Check, 
  ShieldAlert, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Moon, 
  Sun,
  X,
  ChevronRight,
  Mail,
  FileText,
  Info,
  HelpCircle,
  Ticket,
  Clock,
  MessageSquare,
  Maximize2,
  RefreshCw,
  ChevronDown
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface AccountState {
  vendor_id: string;
  email_address: string;
  primary_phone: string;
  shop_name: string;
}

interface SupportTicket {
  id: string;
  vendor_id: string;
  issue_type: string;
  title: string;
  description: string;
  screenshot_url: string | null;
  priority: string;
  status: string;
  admin_reply?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at?: string | null;
}

interface SettingsProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onNavigate?: (page: string) => void;
}

export function Settings({ isDark, onToggleTheme, onNavigate }: SettingsProps) {
  const [account, setAccount] = useState<AccountState | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  
  // Modal States
  const [isTicketsModalOpen, setIsTicketsModalOpen] = useState(false);

  // Support Tickets States
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [openQueueMap, setOpenQueueMap] = useState<Record<string, number>>({});
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Feedback Messaging States
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Password Change States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fetchAccountData = async () => {
    try {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      
      if (!auth?.user) {
        setLoading(false);
        return;
      }

      const { data: vendorCore } = await supabase
        .from("vendors")
        .select("id, shop_name, email, phone")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();

      if (!vendorCore) {
        setLoading(false);
        return;
      }

      setAccount({
        vendor_id: vendorCore.id,
        email_address: vendorCore.email || auth.user.email || "",
        primary_phone: vendorCore.phone || "",
        shop_name: vendorCore.shop_name || "Storefront"
      });
    } catch (err) {
      console.error("Error fetching account attributes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountData();
  }, []);

  const fetchTickets = async () => {
    if (!account?.vendor_id) return;

    try {
      setTicketsLoading(true);

      const { data: userTickets, error: ticketsErr } = await supabase
        .from("vendor_support_tickets")
        .select("*")
        .eq("vendor_id", account.vendor_id)
        .order("created_at", { ascending: false });

      if (ticketsErr) throw ticketsErr;

      setTickets((userTickets as SupportTicket[]) || []);

      const { data: allOpenTickets, error: openErr } = await supabase
        .from("vendor_support_tickets")
        .select("id, created_at")
        .eq("status", "open")
        .order("created_at", { ascending: true });

      if (!openErr && allOpenTickets) {
        const queuePositions: Record<string, number> = {};
        allOpenTickets.forEach((item, index) => {
          queuePositions[item.id] = index + 1;
        });
        setOpenQueueMap(queuePositions);
      }

    } catch (err) {
      console.error("Error loading vendor support tickets:", err);
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    if (account?.vendor_id) {
      fetchTickets();
      const interval = setInterval(fetchTickets, 30000);
      return () => clearInterval(interval);
    }
  }, [account?.vendor_id]);

  const triggerFeedback = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    if (!account.email_address.trim()) {
      triggerFeedback("error", "Email Address is required.");
      return;
    }
    if (!account.primary_phone.trim()) {
      triggerFeedback("error", "Phone Number is required.");
      return;
    }

    const isPasswordAttempted = currentPassword || newPassword || confirmPassword;

    if (isPasswordAttempted) {
      if (!currentPassword) {
        triggerFeedback("error", "Current password is required to change password.");
        return;
      }
      if (!newPassword || newPassword.length < 6) {
        triggerFeedback("error", "New password must be at least 6 characters long.");
        return;
      }
      if (newPassword !== confirmPassword) {
        triggerFeedback("error", "New password and confirmation do not match.");
        return;
      }
    }

    try {
      setSavingAccount(true);

      // 1. If password provided, verify and update
      if (isPasswordAttempted) {
        const { data: authUser } = await supabase.auth.getUser();
        if (!authUser?.user?.email) {
          triggerFeedback("error", "User authentication state invalid.");
          setSavingAccount(false);
          return;
        }

        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: authUser.user.email,
          password: currentPassword,
        });

        if (signInErr) {
          triggerFeedback("error", "Current password verification failed. Please check credentials.");
          setSavingAccount(false);
          return;
        }

        const { error: passwordErr } = await supabase.auth.updateUser({ password: newPassword });
        if (passwordErr) throw passwordErr;
      }

      // 2. Update Vendor Record details
      const { error: vendorErr } = await supabase
        .from("vendors")
        .update({
          email: account.email_address.trim(),
          phone: account.primary_phone.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", account.vendor_id);

      if (vendorErr) throw vendorErr;

      triggerFeedback(
        "success", 
        isPasswordAttempted 
          ? "Account details and password updated successfully!" 
          : "Account information saved successfully!"
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

    } catch (err: any) {
      triggerFeedback("error", err.message || "Failed to update account information.");
    } finally {
      setSavingAccount(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out process error:", err);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    }
  };

  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  const renderStatusBadge = (status: string) => {
    const st = status?.toLowerCase();

    switch (st) {
      case "open":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 uppercase tracking-wider">
            Open
          </span>
        );
      case "in_progress":
      case "in progress":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 uppercase tracking-wider">
            In Progress
          </span>
        );
      case "resolved":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 uppercase tracking-wider">
            Resolved
          </span>
        );
      case "closed":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
            Closed
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40 uppercase tracking-wider">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-semibold tracking-widest text-muted-foreground animate-pulse uppercase">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 w-full max-w-5xl mx-auto space-y-8 pb-20">
      
      {/* Header & Top Dark Mode Row */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">System access controls, support channels, and legal compliance.</p>
        </div>

        {/* Compact Top-Right Dark Mode Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition-all flex items-center gap-2 shadow-xs cursor-pointer"
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-500" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Toast Feedback */}
      {statusMessage && (
        <div className={`border rounded-xl p-4 flex items-start gap-2.5 text-xs font-semibold shadow-sm transition-all animate-in fade-in duration-200 ${
          statusMessage.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-300" 
            : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900/40 dark:text-red-300"
        }`}>
          {statusMessage.type === "success" ? (
            <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          ) : (
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          )}
          <p className="leading-snug">{statusMessage.text}</p>
        </div>
      )}

      {/* 1. Account Information Card */}
      <form onSubmit={handleSaveAccount} className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#10B981] border border-emerald-200/50 dark:border-emerald-900/40">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-foreground">Account Information</h2>
            <p className="text-[11px] text-muted-foreground">Manage storefront credentials and security access codes</p>
          </div>
        </div>

        {/* Read only & Editable Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-muted-foreground">Shop Name</label>
            <input
              type="text"
              value={account?.shop_name || ""}
              disabled
              className="w-full h-9 px-3 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground font-semibold cursor-not-allowed opacity-80"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-muted-foreground">Email Address</label>
            <input
              type="email"
              value={account?.email_address || ""}
              onChange={e => setAccount(s => s ? ({ ...s, email_address: e.target.value }) : null)}
              placeholder="vendor@domain.com"
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/10 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-muted-foreground">Mobile Number</label>
            <input
              type="text"
              value={account?.primary_phone || ""}
              onChange={e => setAccount(s => s ? ({ ...s, primary_phone: e.target.value }) : null)}
              placeholder="Enter active phone number"
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/10 transition-all"
            />
          </div>
        </div>

        {/* Security Sub-section */}
        <div className="pt-2 border-t border-border/40 space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-3.5 h-3.5 text-[#10B981]" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Security & Password</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current Password */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-muted-foreground">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full h-9 pl-3 pr-9 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-muted-foreground">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full h-9 pl-3 pr-9 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-muted-foreground">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full h-9 pl-3 pr-9 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Unified Save Action */}
        <div className="flex justify-end pt-2 border-t border-border/40">
          <button
            type="submit"
            disabled={savingAccount}
            className="h-9 px-5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {savingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save Account</span>
          </button>
        </div>
      </form>

      {/* 2. Full-Width Support Settings Section */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Support & Operations</h3>
        <div className="bg-card border border-border rounded-xl divide-y divide-border/60 shadow-xs overflow-hidden">
          
          <button
            type="button"
            onClick={() => {
              fetchTickets();
              setIsTicketsModalOpen(true);
            }}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900/40 flex items-center justify-center text-[#10B981]">
                <Ticket className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="block text-xs font-bold text-foreground">My Support Tickets</span>
                  {tickets.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#10B981]/15 text-[#10B981]">
                      {tickets.length}
                    </span>
                  )}
                </div>
                <span className="block text-[11px] text-muted-foreground mt-0.5">Track submitted inquiries, responses and queue status</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <a
            href="mailto:rivo.cityhelp1@gmail.com"
            className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors text-left block"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200/50 dark:border-purple-900/40 flex items-center justify-center text-purple-500">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-xs font-bold text-foreground">Contact Support</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">rivo.cityhelp1@gmail.com</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </a>

        </div>
      </div>

      {/* 3. Full-Width Legal & Information Settings Section */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Legal & Platform Documents</h3>
        <div className="bg-card border border-border rounded-xl divide-y divide-border/60 shadow-xs overflow-hidden">
          
          <button
            type="button"
            onClick={() => handleNavigate("terms")}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-border flex items-center justify-center text-foreground">
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <span className="block text-xs font-bold text-foreground">Terms & Conditions</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">Official marketplace policies and vendor terms</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => handleNavigate("privacy")}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-border flex items-center justify-center text-foreground">
                <Shield className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <span className="block text-xs font-bold text-foreground">Privacy Policy</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">Data collection, merchant data safety and usage guidelines</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => handleNavigate("refund-policy")}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-border flex items-center justify-center text-foreground">
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <span className="block text-xs font-bold text-foreground">Refund Policy</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">Store dispute guidelines, order cancellations and refunds</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => handleNavigate("disclaimer")}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-border flex items-center justify-center text-foreground">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <span className="block text-xs font-bold text-foreground">Disclaimer</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">Store inventory responsibilities and product disclaimers</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => handleNavigate("liability")}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-border flex items-center justify-center text-foreground">
                <ShieldAlert className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <span className="block text-xs font-bold text-foreground">Limitation of Liability</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">Legal protection and platform operational boundaries</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => handleNavigate("contact")}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-border flex items-center justify-center text-foreground">
                <Mail className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <span className="block text-xs font-bold text-foreground">Contact Us</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">Reach out to Rivo platform customer delight channels</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => handleNavigate("about")}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-border flex items-center justify-center text-foreground">
                <Info className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <span className="block text-xs font-bold text-foreground">About Rivo</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">Learn more about Rivo.City platform ecosystem</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

        </div>
      </div>

      {/* MY SUPPORT TICKETS SLIDE-OVER / MODAL */}
      {isTicketsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-card border-l border-border w-full max-w-xl h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 overflow-hidden">
            
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-[#10B981]" />
                <div>
                  <h3 className="font-bold text-sm text-foreground">My Support Tickets</h3>
                  <p className="text-[11px] text-muted-foreground">Auto-refreshes every 30 seconds</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchTickets}
                  disabled={ticketsLoading}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted cursor-pointer"
                  title="Refresh tickets"
                >
                  <RefreshCw className={`w-4 h-4 ${ticketsLoading ? "animate-spin text-[#10B981]" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsTicketsModalOpen(false)}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {ticketsLoading && tickets.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground animate-pulse flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#10B981]" />
                  <span>Loading support tickets...</span>
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-border rounded-xl text-center space-y-3 bg-muted/20">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                    <Ticket className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">No support tickets yet.</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">When you report an issue, it will appear here.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => {
                    const isExpanded = expandedTicketId === ticket.id;
                    const isStatusOpen = ticket.status?.toLowerCase() === "open";
                    const queuePos = isStatusOpen ? openQueueMap[ticket.id] : null;

                    return (
                      <div
                        key={ticket.id}
                        className="bg-background border border-border rounded-xl overflow-hidden shadow-2xs hover:border-[#10B981]/50 transition-all"
                      >
                        <div
                          onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                          className="p-4 cursor-pointer space-y-3 select-none"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded-md bg-muted border border-border">
                                  {ticket.issue_type}
                                </span>
                                {renderStatusBadge(ticket.status)}
                                {queuePos && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Queue Position #{queuePos}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-sm text-foreground truncate pt-0.5">{ticket.title}</h4>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 mt-1 ${isExpanded ? "rotate-180" : ""}`} />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                            <span>
                              Created: {new Date(ticket.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className="capitalize font-semibold">Priority: {ticket.priority}</span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 bg-muted/30 border-t border-border/60 space-y-4 text-xs animate-in slide-in-from-top-1 duration-150">
                            <div className="space-y-1">
                              <span className="block font-bold text-muted-foreground uppercase text-[10px]">Description</span>
                              <p className="text-foreground leading-relaxed whitespace-pre-wrap bg-background p-3 rounded-lg border border-border">
                                {ticket.description}
                              </p>
                            </div>

                            {ticket.screenshot_url && (
                              <div className="space-y-1">
                                <span className="block font-bold text-muted-foreground uppercase text-[10px]">Attached Screenshot</span>
                                <div className="relative group rounded-lg overflow-hidden border border-border max-h-48 bg-black/80 flex items-center justify-center">
                                  <img
                                    src={ticket.screenshot_url}
                                    alt="Ticket Screenshot"
                                    className="object-contain max-h-48 w-full"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImageUrl(ticket.screenshot_url)}
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 font-bold cursor-pointer"
                                  >
                                    <Maximize2 className="w-4 h-4" />
                                    <span>Click to Preview</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {(ticket.admin_reply || ticket.resolution_notes) && (
                              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-lg space-y-1">
                                <span className="block font-extrabold text-emerald-800 dark:text-emerald-300 uppercase text-[10px] flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3 text-[#10B981]" />
                                  Support Reply
                                </span>
                                <p className="text-emerald-900 dark:text-emerald-200 leading-relaxed font-medium">
                                  {ticket.admin_reply || ticket.resolution_notes}
                                </p>
                              </div>
                            )}

                            <div className="text-[10px] text-muted-foreground pt-1 flex justify-between">
                              <span>Ticket ID: {ticket.id.substring(0, 8)}</span>
                              {ticket.updated_at && (
                                <span>Updated: {new Date(ticket.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                Total Tickets: {tickets.length}
              </span>
              <button
                type="button"
                onClick={() => setIsTicketsModalOpen(false)}
                className="h-9 px-4 rounded-lg bg-background border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FULL IMAGE PREVIEW MODAL */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-3xl max-h-[85vh] w-full bg-black rounded-xl overflow-hidden border border-white/20 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImageUrl}
              alt="Full Preview"
              className="object-contain max-h-[85vh] w-full"
            />
          </div>
        </div>
      )}

      {/* Fixed Sign Out Footer Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full h-11 px-5 text-xs font-bold rounded-xl border border-red-200/80 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100/80 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out Session</span>
        </button>
      </div>

    </div>
  );
}