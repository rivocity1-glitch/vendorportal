import React, { useState } from "react";
import { Plus, Tag, Percent, ShoppingBag, Gift, Package, Zap, Bell, X, Calendar, Edit2, Trash2 } from "lucide-react";

const offerTypes = [
  { id: "percentage", label: "Percentage Discount", icon: Percent, desc: "e.g. 20% off on Dairy", color: "text-[#10B981]", bg: "bg-[#ECFDF5]" },
  { id: "flat", label: "Flat Discount", icon: Tag, desc: "e.g. ₹50 off on ₹500", color: "text-[#3B82F6]", bg: "bg-[#EFF6FF]" },
  { id: "bxgy", label: "Buy X Get Y", icon: Gift, desc: "e.g. Buy 2 Get 1 Free", color: "text-[#8B5CF6]", bg: "bg-[#EDE9FE]" },
  { id: "b1g1", label: "Buy 1 Get 1", icon: ShoppingBag, desc: "Classic BOGO offer", color: "text-[#F59E0B]", bg: "bg-[#FEF3C7]" },
  { id: "combo", label: "Combo Offer", icon: Package, desc: "Bundle products together", color: "text-[#06B6D4]", bg: "bg-[#CFFAFE]" },
  { id: "category", label: "Category Offer", icon: Tag, desc: "Discount on entire category", color: "text-[#10B981]", bg: "bg-[#ECFDF5]" },
  { id: "free", label: "Free Product", icon: Gift, desc: "Free item with purchase", color: "text-[#EF4444]", bg: "bg-[#FEE2E2]" },
  { id: "spend", label: "Spend Based", icon: Zap, desc: "Spend ₹500 Get ₹50 Off", color: "text-[#F97316]", bg: "bg-[#FEF3C7]" },
];

const activeOffers = [
  { id: 1, name: "Breakfast Combo Deal", type: "Combo Offer", desc: "Bread + Milk + Eggs bundle", discount: "₹30 off", validity: "Expires Dec 31, 2024", status: "Active", uses: 124 },
  { id: 2, name: "Buy 2 Get 1 Free Chips", type: "Buy X Get Y", desc: "On all chips & snacks", discount: "1 Free", validity: "Expires Jan 15, 2025", status: "Active", uses: 87 },
  { id: 3, name: "Spend ₹500 Get ₹50 Off", type: "Spend Based", desc: "Min order ₹500", discount: "₹50 off", validity: "Expires Dec 25, 2024", status: "Active", uses: 203 },
  { id: 4, name: "20% Off on Dairy", type: "Category Offer", desc: "All dairy products", discount: "20%", validity: "Expired Dec 10, 2024", status: "Expired", uses: 456 },
  { id: 5, name: "Flash Sale - Beverages", type: "Percentage Discount", desc: "All cold drinks 15% off", discount: "15%", validity: "Starts Dec 20, 2024", status: "Scheduled", uses: 0 },
];

const campaigns = [
  { id: "store-open", label: "Store Open Alert", icon: Bell, desc: "Notify customers when store opens", active: true },
  { id: "store-closed", label: "Store Closed Alert", icon: Bell, desc: "Alert when store closes for the day", active: false },
  { id: "new-product", label: "New Product Announcement", icon: Package, desc: "Announce new additions to catalogue", active: true },
  { id: "festival", label: "Festival Campaign", icon: Zap, desc: "Special seasonal offers", active: false },
  { id: "flash-sale", label: "Flash Sale Campaign", icon: Zap, desc: "Limited-time sale push notifications", active: false },
];

const statusStyles: Record<string, string> = {
  Active: "bg-[#D1FAE5] text-[#065F46]",
  Expired: "bg-[#FEE2E2] text-[#991B1B]",
  Scheduled: "bg-[#DBEAFE] text-[#1E40AF]",
  Draft: "bg-muted text-muted-foreground",
};

export function Offers() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [campaignStates, setCampaignStates] = useState(Object.fromEntries(campaigns.map(c => [c.id, c.active])));
  const [offerList, setOfferList] = useState(activeOffers);
  const [activeTab, setActiveTab] = useState<"offers" | "campaigns">("offers");
  const [createForm, setCreateForm] = useState({ name: "", desc: "", discount: "", validity: "" });

  const toggleCampaign = (id: string) => setCampaignStates(p => ({ ...p, [id]: !p[id] }));
  const deleteOffer = (id: number) => setOfferList(prev => prev.filter(o => o.id !== id));

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Offer Types Grid */}
      <div>
        <h2 className="font-semibold text-foreground mb-3">Create New Offer</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {offerTypes.map(type => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => { setSelectedType(type.id); setShowCreateModal(true); }}
                className={`bg-card border border-border rounded-xl p-4 text-left hover:border-[#10B981] hover:shadow-md transition-all group ${selectedType === type.id ? "border-[#10B981] ring-2 ring-[#10B981]/20" : ""}`}
              >
                <div className={`w-9 h-9 rounded-lg ${type.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${type.color}`} />
                </div>
                <p className="text-xs font-semibold text-foreground leading-tight">{type.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{type.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("offers")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "offers" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          Active Offers ({offerList.filter(o => o.status === "Active").length})
        </button>
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "campaigns" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          Push Campaigns
        </button>
      </div>

      {activeTab === "offers" ? (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Offer Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Discount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Validity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Uses</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {offerList.map(offer => (
                  <tr key={offer.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{offer.name}</p>
                      <p className="text-xs text-muted-foreground">{offer.desc}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{offer.type}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#10B981]">{offer.discount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {offer.validity}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground font-medium">{offer.uses.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[offer.status]}`}>{offer.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-[#10B981] hover:bg-[#ECFDF5] transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteOffer(offer.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const Icon = c.icon;
            const isActive = campaignStates[c.id];
            return (
              <div key={c.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? "bg-[#ECFDF5]" : "bg-muted"}`}>
                  <Icon className={`w-5 h-5 ${isActive ? "text-[#10B981]" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium ${isActive ? "text-[#10B981]" : "text-muted-foreground"}`}>
                    {isActive ? "Active" : "Inactive"}
                  </span>
                  <button
                    onClick={() => toggleCampaign(c.id)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${isActive ? "bg-[#10B981]" : "bg-muted"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? "translate-x-5" : ""}`} />
                  </button>
                  <button className="h-8 px-3 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-medium transition-colors">
                    Configure
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Offer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-card rounded-2xl border border-border w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">
                Create {offerTypes.find(t => t.id === selectedType)?.label}
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Offer Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Weekend Dairy Sale"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <input
                  type="text"
                  value={createForm.desc}
                  onChange={e => setCreateForm(f => ({ ...f, desc: e.target.value }))}
                  placeholder="Brief description of the offer"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Discount Value</label>
                  <input
                    type="text"
                    value={createForm.discount}
                    onChange={e => setCreateForm(f => ({ ...f, discount: e.target.value }))}
                    placeholder="20% or ₹50"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Validity</label>
                  <input
                    type="date"
                    value={createForm.validity}
                    onChange={e => setCreateForm(f => ({ ...f, validity: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
              <button onClick={() => setShowCreateModal(false)} className="flex-1 h-9 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium transition-colors">
                Create Offer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
