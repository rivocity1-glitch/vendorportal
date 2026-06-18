import React, { useState } from "react";
import { Store, User, FileText, MapPin, Phone, Mail, Building, Check, Camera } from "lucide-react";

export function Profile() {
  const [saved, setSaved] = useState(false);
  const [store, setStore] = useState({
    name: "Green Basket Grocery", tagline: "Fresh groceries, delivered fast",
    category: "Grocery", gst: "29AABCG1234F1Z5", fssai: "10024045001234",
    drugLicense: "",
  });
  const [owner, setOwner] = useState({
    name: "Anil Kumar", email: "anil@greenbasket.in", phone: "+91 98765 43210", alternatePhone: "+91 87654 32109",
  });
  const [address, setAddress] = useState({
    line1: "12, 5th Main, HSR Layout", line2: "Sector 2", city: "Bangalore", state: "Karnataka",
    pincode: "560102", landmark: "Near HSR BDA Complex",
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#10B981]" />
        {title}
      </h3>
      {children}
    </div>
  );

  const Field = ({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
      />
    </div>
  );

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
      {/* Store card */}
      <div className="bg-gradient-to-r from-[#10B981] to-[#059669] rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold text-white">
              GB
            </div>
            <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md">
              <Camera className="w-3 h-3 text-[#10B981]" />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{store.name}</h2>
            <p className="text-white/80 text-sm">{store.tagline}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">SHOP-001</span>
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{store.category}</span>
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">⭐ 4.6 Rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* Store Details */}
      <Section title="Store Details" icon={Store}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Store Name" value={store.name} onChange={v => setStore(s => ({ ...s, name: v }))} placeholder="Store name" />
          <Field label="Tagline" value={store.tagline} onChange={v => setStore(s => ({ ...s, tagline: v }))} placeholder="Brief description" />
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Store Category</label>
            <select
              value={store.category}
              onChange={e => setStore(s => ({ ...s, category: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
            >
              {["Grocery", "Pharmacy", "Electronics", "Restaurant", "Bakery", "Clothing"].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </Section>

      {/* Owner Details */}
      <Section title="Owner Details" icon={User}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Owner Name" value={owner.name} onChange={v => setOwner(o => ({ ...o, name: v }))} placeholder="Full name" />
          <Field label="Email Address" value={owner.email} onChange={v => setOwner(o => ({ ...o, email: v }))} type="email" placeholder="email@store.com" />
          <Field label="Primary Phone" value={owner.phone} onChange={v => setOwner(o => ({ ...o, phone: v }))} placeholder="+91 98765 43210" />
          <Field label="Alternate Phone" value={owner.alternatePhone} onChange={v => setOwner(o => ({ ...o, alternatePhone: v }))} placeholder="+91 87654 32109" />
        </div>
      </Section>

      {/* GST & Compliance */}
      <Section title="GST & Compliance" icon={FileText}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <div className="bg-[#ECFDF5] rounded-lg p-3 flex items-start gap-2 mb-3">
              <Check className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-[#065F46]">GST Verified</p>
                <p className="text-xs text-[#065F46]/70">Your GST certificate has been verified by Rivo compliance team</p>
              </div>
            </div>
          </div>
          <Field label="GST Number" value={store.gst} onChange={v => setStore(s => ({ ...s, gst: v }))} placeholder="29AABCG1234F1Z5" />
          <Field label="FSSAI License" value={store.fssai} onChange={v => setStore(s => ({ ...s, fssai: v }))} placeholder="10024045001234" />
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Drug License (if applicable)</label>
            <div className="h-9 flex items-center">
              <input
                type="text"
                value={store.drugLicense}
                onChange={e => setStore(s => ({ ...s, drugLicense: e.target.value }))}
                placeholder="Leave blank if not applicable"
                className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Store Address */}
      <Section title="Store Address" icon={MapPin}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Field label="Address Line 1" value={address.line1} onChange={v => setAddress(a => ({ ...a, line1: v }))} placeholder="Building, Street" />
          </div>
          <Field label="Address Line 2" value={address.line2} onChange={v => setAddress(a => ({ ...a, line2: v }))} placeholder="Area, Locality" />
          <Field label="Landmark" value={address.landmark} onChange={v => setAddress(a => ({ ...a, landmark: v }))} placeholder="Near..." />
          <Field label="City" value={address.city} onChange={v => setAddress(a => ({ ...a, city: v }))} placeholder="City" />
          <Field label="State" value={address.state} onChange={v => setAddress(a => ({ ...a, state: v }))} placeholder="State" />
          <Field label="PIN Code" value={address.pincode} onChange={v => setAddress(a => ({ ...a, pincode: v }))} placeholder="560001" />
        </div>
      </Section>

      {/* Bank Details */}
      <Section title="Bank Account" icon={Building}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Account Holder Name" value="Anil Kumar" onChange={() => {}} />
          <Field label="Bank Name" value="HDFC Bank" onChange={() => {}} />
          <Field label="Account Number" value="••••••••••1234" onChange={() => {}} />
          <Field label="IFSC Code" value="HDFC0001234" onChange={() => {}} />
          <div className="sm:col-span-2">
            <div className="bg-[#ECFDF5] rounded-lg p-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-[#10B981]" />
              <p className="text-xs text-[#065F46]">Bank account verified · Settlements are credited every Monday</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Save */}
      <div className="flex items-center justify-end gap-3 pb-4">
        {saved && (
          <span className="text-sm text-[#10B981] flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Profile saved!
          </span>
        )}
        <button className="h-10 px-6 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
          Discard Changes
        </button>
        <button onClick={handleSave} className="h-10 px-6 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium transition-colors shadow-sm">
          Save Profile
        </button>
      </div>
    </div>
  );
}
