import React, { useState } from "react";
import { Upload, Clock, MapPin, ShoppingBag, Truck, Image, ChevronRight, Check, X } from "lucide-react";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const initialHours = daysOfWeek.map(day => ({
  day,
  open: day !== "Sunday",
  openTime: day === "Sunday" ? "09:00" : "07:00",
  closeTime: day === "Sunday" ? "21:00" : "23:00",
}));

const banners = [
  { id: 1, name: "Homepage Banner", status: "Active", img: "HB" },
  { id: 2, name: "Festival Diwali Banner", status: "Active", img: "FB" },
  { id: 3, name: "Weekend Sale Banner", status: "Draft", img: "WB" },
];

export function StoreManagement() {
  const [storeStatus, setStoreStatus] = useState<"open" | "closed" | "busy">("open");
  const [hours, setHours] = useState(initialHours);
  const [settings, setSettings] = useState({
    deliveryRadius: "3", minOrder: "99", prepTime: "20", deliveryFee: "30",
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const statusConfig = {
    open: { label: "Open", dot: "bg-[#10B981]", bg: "bg-[#D1FAE5]", text: "text-[#065F46]" },
    closed: { label: "Closed", dot: "bg-[#EF4444]", bg: "bg-[#FEE2E2]", text: "text-[#991B1B]" },
    busy: { label: "Busy", dot: "bg-[#F59E0B]", bg: "bg-[#FEF3C7]", text: "text-[#92400E]" },
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      {/* Store Status */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">Store Status</h3>
        <div className="flex flex-wrap gap-3">
          {(["open", "closed", "busy"] as const).map(status => {
            const cfg = statusConfig[status];
            const isActive = storeStatus === status;
            return (
              <button
                key={status}
                onClick={() => setStoreStatus(status)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                  isActive ? "border-[#10B981] bg-[#ECFDF5]" : "border-border hover:border-[#10B981]/30 bg-card"
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${cfg.dot} ${isActive && status === "open" ? "animate-pulse" : ""}`} />
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">{cfg.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {status === "open" ? "Accepting orders" : status === "closed" ? "Not accepting orders" : "High demand, longer wait"}
                  </p>
                </div>
                {isActive && <Check className="w-4 h-4 text-[#10B981] ml-2" />}
              </button>
            );
          })}
        </div>
        <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current status visible to customers</span>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusConfig[storeStatus].bg} ${statusConfig[storeStatus].text}`}>
            {statusConfig[storeStatus].label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Delivery Settings */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#10B981]" /> Delivery Settings
          </h3>
          <div className="space-y-3">
            {[
              { label: "Delivery Radius (km)", key: "deliveryRadius", icon: MapPin, suffix: "km", placeholder: "3" },
              { label: "Minimum Order Amount (₹)", key: "minOrder", icon: ShoppingBag, suffix: "₹", placeholder: "99" },
              { label: "Preparation Time (mins)", key: "prepTime", icon: Clock, suffix: "min", placeholder: "20" },
              { label: "Delivery Fee (₹)", key: "deliveryFee", icon: Truck, suffix: "₹", placeholder: "30" },
            ].map(field => {
              const Icon = field.icon;
              return (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{field.label}</label>
                  <div className="relative">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="number"
                      value={settings[field.key as keyof typeof settings]}
                      onChange={e => setSettings(s => ({ ...s, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full h-9 pl-9 pr-10 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.suffix}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operating Hours */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#10B981]" /> Operating Hours
          </h3>
          <div className="space-y-2">
            {hours.map((h, i) => (
              <div key={h.day} className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={h.open}
                    onChange={e => setHours(prev => prev.map((p, j) => j === i ? { ...p, open: e.target.checked } : p))}
                    className="sr-only peer"
                  />
                  <div className="w-7 h-4 bg-muted rounded-full peer peer-checked:bg-[#10B981] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-3" />
                </label>
                <span className={`text-xs w-20 ${h.open ? "text-foreground font-medium" : "text-muted-foreground"}`}>{h.day.slice(0, 3)}</span>
                {h.open ? (
                  <>
                    <input
                      type="time"
                      value={h.openTime}
                      onChange={e => setHours(prev => prev.map((p, j) => j === i ? { ...p, openTime: e.target.value } : p))}
                      className="flex-1 h-7 px-2 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none focus:border-[#10B981]"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="time"
                      value={h.closeTime}
                      onChange={e => setHours(prev => prev.map((p, j) => j === i ? { ...p, closeTime: e.target.value } : p))}
                      className="flex-1 h-7 px-2 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none focus:border-[#10B981]"
                    />
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground ml-1">Closed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Banner Management */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Image className="w-4 h-4 text-[#10B981]" /> Banner Management
          </h3>
          <button className="h-8 px-3 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-medium flex items-center gap-1.5 transition-colors">
            <Upload className="w-3.5 h-3.5" /> Upload Banner
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {banners.map(b => (
            <div key={b.id} className="rounded-xl border border-border overflow-hidden group">
              <div className="aspect-[16/5] bg-gradient-to-br from-[#ECFDF5] to-[#EFF6FF] flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#10B981]/20 flex items-center justify-center">
                  <Image className="w-6 h-6 text-[#10B981]" />
                </div>
              </div>
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">{b.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${b.status === "Active" ? "bg-[#D1FAE5] text-[#065F46]" : "bg-muted text-muted-foreground"}`}>
                    {b.status}
                  </span>
                </div>
                <button className="text-xs text-[#10B981] hover:underline">Edit</button>
              </div>
            </div>
          ))}
          <button className="rounded-xl border-2 border-dashed border-border hover:border-[#10B981] transition-colors p-4 flex flex-col items-center justify-center gap-2 group">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-[#ECFDF5] transition-colors">
              <Upload className="w-5 h-5 text-muted-foreground group-hover:text-[#10B981] transition-colors" />
            </div>
            <p className="text-xs text-muted-foreground group-hover:text-[#10B981] transition-colors">Add new banner</p>
          </button>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-sm text-[#10B981] flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Settings saved!
          </span>
        )}
        <button onClick={handleSave} className="h-10 px-6 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium transition-colors shadow-sm shadow-[#10B981]/20">
          Save Changes
        </button>
      </div>
    </div>
  );
}
