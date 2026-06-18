import React, { useState } from "react";
import { ShoppingBag, Package, Wallet, Tag, Settings, Trash2, CheckCheck, Bell, Filter } from "lucide-react";

const initialNotifications = [
  { id: 1, category: "Orders", icon: ShoppingBag, iconColor: "text-[#3B82F6]", iconBg: "bg-[#EFF6FF]", title: "New Order Received", message: "Order #ORD-4822 from Neha Gupta · ₹420", time: "2 min ago", read: false },
  { id: 2, category: "Orders", icon: ShoppingBag, iconColor: "text-[#F59E0B]", iconBg: "bg-[#FEF3C7]", title: "Order Pending Action", message: "Order #ORD-4820 has been waiting for 18 minutes. Please accept or reject.", time: "18 min ago", read: false },
  { id: 3, category: "Inventory", icon: Package, iconColor: "text-[#EF4444]", iconBg: "bg-[#FEE2E2]", title: "Critical Stock Alert", message: "Coca-Cola 2L is down to 2 units — below threshold of 12", time: "32 min ago", read: false },
  { id: 4, category: "Orders", icon: ShoppingBag, iconColor: "text-[#10B981]", iconBg: "bg-[#ECFDF5]", title: "Order Delivered", message: "Order #ORD-4819 was successfully delivered to Ananya Singh", time: "45 min ago", read: true },
  { id: 5, category: "Settlements", icon: Wallet, iconColor: "text-[#10B981]", iconBg: "bg-[#ECFDF5]", title: "Settlement Processed", message: "₹68,420 has been credited to your bank account · UTR24121500847", time: "2 hrs ago", read: true },
  { id: 6, category: "Inventory", icon: Package, iconColor: "text-[#F59E0B]", iconBg: "bg-[#FEF3C7]", title: "Low Stock Warning", message: "Lay's Classic Salted 100g — only 5 units remaining", time: "3 hrs ago", read: true },
  { id: 7, category: "Marketing", icon: Tag, iconColor: "text-[#8B5CF6]", iconBg: "bg-[#EDE9FE]", title: "Offer Expiring Soon", message: "Your 'Breakfast Combo Deal' offer expires in 2 days", time: "5 hrs ago", read: true },
  { id: 8, category: "System", icon: Settings, iconColor: "text-[#64748B]", iconBg: "bg-muted", title: "System Maintenance", message: "Scheduled maintenance on Dec 20 from 2–4 AM. Services may be briefly unavailable.", time: "Yesterday", read: true },
  { id: 9, category: "Orders", icon: ShoppingBag, iconColor: "text-[#EF4444]", iconBg: "bg-[#FEE2E2]", title: "Order Cancelled", message: "Order #ORD-4816 was cancelled by customer Arjun Reddy", time: "Yesterday", read: true },
  { id: 10, category: "Settlements", icon: Wallet, iconColor: "text-[#3B82F6]", iconBg: "bg-[#EFF6FF]", title: "Upcoming Settlement", message: "Your weekly settlement of ~₹38,200 is expected on Dec 22, 2024", time: "Yesterday", read: true },
];

const categories = ["All", "Orders", "Inventory", "Settlements", "Marketing", "System"];

export function Notifications() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = notifications.filter(n =>
    activeCategory === "All" || n.category === activeCategory
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotif = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="bg-[#EF4444] text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount} unread</span>
          )}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="h-8 px-3 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
          <button className="h-8 px-3 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {categories.map(cat => {
          const catCount = cat === "All"
            ? notifications.filter(n => !n.read).length
            : notifications.filter(n => n.category === cat && !n.read).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeCategory === cat
                  ? "bg-[#10B981] text-white"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
              {catCount > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeCategory === cat ? "bg-white/20 text-white" : "bg-[#EF4444] text-white"
                }`}>
                  {catCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">No notifications in this category</p>
          </div>
        )}
        {filtered.map(n => {
          const Icon = n.icon;
          return (
            <div
              key={n.id}
              className={`bg-card rounded-xl border transition-all ${n.read ? "border-border" : "border-[#10B981]/30 bg-[#ECFDF5]/30 dark:bg-[#064E3B]/20"}`}
            >
              <div className="flex items-start gap-3 p-4">
                <div className={`w-9 h-9 rounded-xl ${n.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon className={`w-4 h-4 ${n.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-medium ${n.read ? "text-foreground" : "text-foreground"}`}>{n.title}</p>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />}
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{n.category}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5">{n.time}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!n.read && (
                        <button onClick={() => markRead(n.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-[#10B981] hover:bg-[#ECFDF5] transition-all" title="Mark read">
                          <CheckCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => deleteNotif(n.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-all" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
