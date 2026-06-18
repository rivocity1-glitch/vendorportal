import React, { useState } from "react";
import { Upload, X, ImagePlus, ChevronLeft, Info } from "lucide-react";

const categories = ["Dairy", "Bakery", "Snacks", "Beverages", "Personal Care", "Grains & Staples", "Instant Food", "Fruits & Vegetables", "Household"];

interface Props {
  onNavigate: (page: string) => void;
}

export function AddEditProduct({ onNavigate }: Props) {
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "", description: "", category: "", mrp: "", price: "", stock: "", sku: "", barcode: "", weight: "", unit: "g",
  });
  const [saved, setSaved] = useState(false);

  const handleField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handlePublish = () => {
    setSaved(true);
    setTimeout(() => { onNavigate("products"); }, 1200);
  };

  const discount = form.mrp && form.price
    ? Math.round(((+form.mrp - +form.price) / +form.mrp) * 100)
    : 0;

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => onNavigate("products")}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-semibold text-foreground">Add New Product</h1>
          <p className="text-xs text-muted-foreground">Fill in details and publish to your store</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basic Info */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#10B981] text-white text-xs flex items-center justify-center font-bold">1</span>
              Basic Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Product Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleField("name", e.target.value)}
                  placeholder="e.g. Amul Full Cream Milk 1L"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => handleField("description", e.target.value)}
                  placeholder="Describe the product — ingredients, usage, benefits..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Category *</label>
                <select
                  value={form.category}
                  onChange={e => handleField("category", e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                >
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#10B981] text-white text-xs flex items-center justify-center font-bold">2</span>
              Pricing
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">MRP (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                  <input
                    type="number"
                    value={form.mrp}
                    onChange={e => handleField("mrp", e.target.value)}
                    placeholder="0.00"
                    className="w-full h-9 pl-7 pr-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Selling Price (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => handleField("price", e.target.value)}
                    placeholder="0.00"
                    className="w-full h-9 pl-7 pr-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                  />
                </div>
              </div>
            </div>
            {discount > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="bg-[#D1FAE5] text-[#065F46] px-2 py-0.5 rounded-full font-medium">{discount}% off</span>
                <span className="text-muted-foreground">Customers see this discount</span>
              </div>
            )}
          </div>

          {/* Inventory */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#10B981] text-white text-xs flex items-center justify-center font-bold">3</span>
              Inventory & Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Stock Quantity *</label>
                <input
                  type="number"
                  value={form.stock}
                  onChange={e => handleField("stock", e.target.value)}
                  placeholder="0"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">SKU</label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={e => handleField("sku", e.target.value)}
                  placeholder="SKU-001"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Weight / Volume</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.weight}
                    onChange={e => handleField("weight", e.target.value)}
                    placeholder="500"
                    className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                  />
                  <select
                    value={form.unit}
                    onChange={e => handleField("unit", e.target.value)}
                    className="w-16 h-9 px-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-[#10B981]"
                  >
                    {["g", "kg", "ml", "L", "pcs"].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Barcode</label>
                <input
                  type="text"
                  value={form.barcode}
                  onChange={e => handleField("barcode", e.target.value)}
                  placeholder="8901234567890"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Images */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-muted-foreground" />
              Product Images
            </h3>
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-[#10B981] transition-colors cursor-pointer group mb-3">
              <Upload className="w-6 h-6 text-muted-foreground group-hover:text-[#10B981] mx-auto mb-2 transition-colors" />
              <p className="text-xs font-medium text-foreground">Upload Images</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG up to 5MB</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="aspect-square bg-muted rounded-lg flex items-center justify-center border border-dashed border-border">
                  <Plus className="w-4 h-4 text-muted-foreground opacity-40" />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
              <Info className="w-3 h-3" /> First image is displayed as the main product image
            </p>
          </div>

          {/* Publish */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-2">
            <h3 className="font-medium text-foreground mb-3">Publish</h3>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-xs text-muted-foreground">Visibility</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-8 h-4 bg-muted rounded-full peer peer-checked:bg-[#10B981] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4" />
              </label>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-muted-foreground">Track Stock</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-8 h-4 bg-muted rounded-full peer peer-checked:bg-[#10B981] transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4" />
              </label>
            </div>
            {saved && (
              <div className="bg-[#D1FAE5] text-[#065F46] rounded-lg p-2 text-xs font-medium text-center">
                ✓ Product saved! Redirecting...
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
                Save Draft
              </button>
              <button
                onClick={handlePublish}
                className="flex-1 h-9 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium transition-colors shadow-sm"
              >
                Publish
              </button>
            </div>
          </div>

          {/* Preview chip */}
          <div className="bg-[#ECFDF5] rounded-xl p-3 text-xs text-[#065F46]">
            <p className="font-medium mb-1">Product Preview</p>
            <p className="font-bold text-sm text-[#0F172A]">{form.name || "Product Name"}</p>
            {form.price && <p className="text-[#10B981] font-semibold">₹{form.price} {form.mrp && <span className="text-[#94A3B8] line-through text-xs ml-1">₹{form.mrp}</span>}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
