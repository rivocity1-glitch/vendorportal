import React, { useState } from "react";
import { Lock, Bell, Palette, Globe, Shield, Eye, EyeOff, Check, ChevronRight, Smartphone, Monitor } from "lucide-react";

interface Props {
  isDark: boolean;
  onToggleTheme: () => void;
}

const languages = ["English", "हिंदी", "ಕನ್ನಡ", "தமிழ்", "తెలుగు", "মাংলা"];

export function Settings({ isDark, onToggleTheme }: Props) {
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [language, setLanguage] = useState("English");
  const [twoFactor, setTwoFactor] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);
  const [notifPrefs, setNotifPrefs] = useState({
    newOrder: true, lowStock: true, settlement: true, offers: false, reviews: true, system: false,
  });

  const handleSave = (section: string) => {
    setSaved(section);
    setTimeout(() => setSaved(null), 2000);
  };

  const Section = ({ id, title, icon: Icon, children }: { id: string; title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Icon className="w-4 h-4 text-[#10B981]" />
          {title}
        </h3>
        {saved === id && (
          <span className="text-xs text-[#10B981] flex items-center gap-1">
            <Check className="w-3 h-3" /> Saved!
          </span>
        )}
      </div>
      {children}
    </div>
  );

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${checked ? "bg-[#10B981]" : "bg-muted"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
      {/* Change Password */}
      <Section id="password" title="Change Password" icon={Lock}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showOldPw ? "text" : "password"}
                placeholder="Enter current password"
                className="w-full h-9 px-3 pr-10 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
              />
              <button onClick={() => setShowOldPw(!showOldPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showOldPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">New Password</label>
            <div className="relative">
              <input
                type={showNewPw ? "text" : "password"}
                placeholder="Minimum 8 characters"
                className="w-full h-9 px-3 pr-10 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
              />
              <button onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Confirm New Password</label>
            <input type="password" placeholder="Repeat new password" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20" />
          </div>
          <button onClick={() => handleSave("password")} className="h-9 px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium transition-colors">
            Update Password
          </button>
        </div>
      </Section>

      {/* Notifications */}
      <Section id="notifications" title="Notification Preferences" icon={Bell}>
        <div className="space-y-3">
          {[
            { key: "newOrder", label: "New Order Alerts", desc: "Get notified when a new order arrives" },
            { key: "lowStock", label: "Low Stock Alerts", desc: "Alert when products fall below threshold" },
            { key: "settlement", label: "Settlement Updates", desc: "Notifications for payment settlements" },
            { key: "offers", label: "Offer & Campaign Updates", desc: "Updates about your active offers" },
            { key: "reviews", label: "New Reviews", desc: "Notify when customers leave reviews" },
            { key: "system", label: "System Announcements", desc: "Maintenance and platform updates" },
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <Toggle
                checked={notifPrefs[n.key as keyof typeof notifPrefs]}
                onChange={() => setNotifPrefs(p => ({ ...p, [n.key]: !p[n.key as keyof typeof notifPrefs] }))}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Theme */}
      <Section id="theme" title="Appearance" icon={Palette}>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "light", label: "Light", icon: Monitor, isActive: !isDark },
            { id: "dark", label: "Dark", icon: Monitor, isActive: isDark },
            { id: "system", label: "System", icon: Smartphone, isActive: false },
          ].map(theme => (
            <button
              key={theme.id}
              onClick={() => {
                if ((theme.id === "dark") !== isDark) onToggleTheme();
              }}
              className={`relative rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all ${
                theme.isActive ? "border-[#10B981] bg-[#ECFDF5]" : "border-border hover:border-[#10B981]/30"
              }`}
            >
              <div className={`w-10 h-8 rounded-lg ${theme.id === "dark" ? "bg-[#0F172A]" : "bg-[#F8FAFC]"} border border-border flex items-center justify-center`}>
                <div className={`w-4 h-1 rounded ${theme.id === "dark" ? "bg-[#10B981]" : "bg-[#0F172A]/30"}`} />
              </div>
              <span className="text-xs font-medium text-foreground">{theme.label}</span>
              {theme.isActive && <Check className="absolute top-2 right-2 w-3 h-3 text-[#10B981]" />}
            </button>
          ))}
        </div>
      </Section>

      {/* Language */}
      <Section id="language" title="Language & Region" icon={Globe}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {languages.map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                language === lang
                  ? "border-[#10B981] bg-[#ECFDF5] text-[#065F46]"
                  : "border-border text-foreground hover:border-[#10B981]/30"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">Selected: {language}</p>
      </Section>

      {/* Security */}
      <Section id="security" title="Security Settings" icon={Shield}>
        <div className="space-y-3">
          {[
            { label: "Two-Factor Authentication", desc: "Require OTP on every login", checked: twoFactor, toggle: () => setTwoFactor(!twoFactor) },
            { label: "Login Activity Alerts", desc: "Get email alerts for new login sessions", checked: loginAlerts, toggle: () => setLoginAlerts(!loginAlerts) },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <Toggle checked={s.checked} onChange={s.toggle} />
            </div>
          ))}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Active Sessions</p>
              <p className="text-xs text-muted-foreground">2 devices · last seen today</p>
            </div>
            <button className="text-xs text-[#EF4444] hover:underline font-medium">Sign out all</button>
          </div>
        </div>
      </Section>

      {/* Danger Zone */}
      <div className="bg-[#FEF2F2] rounded-xl border border-[#FECACA] p-5">
        <h3 className="font-semibold text-[#991B1B] mb-3">Danger Zone</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#991B1B]">Deactivate Store</p>
            <p className="text-xs text-[#EF4444]/70">Temporarily pause your store on Rivo. Orders won't be accepted.</p>
          </div>
          <button className="h-8 px-3 rounded-lg border border-[#EF4444] text-[#EF4444] text-xs font-medium hover:bg-[#EF4444] hover:text-white transition-colors">
            Deactivate
          </button>
        </div>
      </div>
    </div>
  );
}
