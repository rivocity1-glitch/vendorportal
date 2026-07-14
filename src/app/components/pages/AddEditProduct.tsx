import React, { useState, useEffect, useRef } from "react";
import { Upload, X, ImagePlus, ChevronLeft, Info, Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";

const categories = ["Dairy", "Bakery", "Snacks", "Beverages", "Personal Care", "Grains & Staples", "Instant Food", "Fruits & Vegetables", "Household"];

interface Props {
  onNavigate: (page: string) => void;
  product?: any;
}

export function AddEditProduct({ onNavigate, product }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isImageError, setIsImageError] = useState(false);

  const [form, setForm] = useState({
    name: "", description: "", category: "", mrp: "", price: "", stock: "", sku: "", barcode: "", weight: "", unit: "g",
  });
  const [saved, setSaved] = useState(false);

  // Populate state if editing an existing product context
  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || "",
        description: product.description || "",
        category: product.category || "",
        mrp: product.mrp ? String(product.mrp) : "",
        price: product.price ? String(product.price) : "",
        stock: product.stock ? String(product.stock) : "",
        sku: product.sku || "",
        barcode: product.barcode || "",
        weight: product.weight || "",
        unit: product.unit || "g",
      });
      setImageUrl(product.image_url || "");
      setIsImageError(false);
    } else {
      setImageUrl("");
      setIsImageError(false);
    }
  }, [product]);

  const handleField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Dynamic Image Upload Handling via Supabase Storage
  const uploadImage = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Maximum file size exceeded. Max size limit is 5MB.");
      return;
    }
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Invalid format. Accepted formats are: JPG, JPEG, PNG, WEBP");
      return;
    }

    try {
      setIsUploading(true);
      setIsImageError(false);
      const fileExt = file.name.split('.').pop() || "jpg";
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      setImageUrl(data.publicUrl);
    } catch (err: any) {
      console.error(err);
      alert("Failed to upload image: " + (err.message || err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadImage(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadImage(e.target.files[0]);
    }
  };

  const handleRemoveImage = async () => {
    if (!imageUrl) return;
    try {
      const urlParts = imageUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];
      if (fileName) {
        await supabase.storage.from("product-images").remove([fileName]);
      }
    } catch (err) {
      console.error("Failed to delete file from storage:", err);
    }
    setImageUrl("");
    setIsImageError(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePublish = () => {
    setSaved(true);

    const payload = {
      ...form,
      image_url: imageUrl.trim() || null
    };
    console.log("Publishing Product Payload Setup:", payload);

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
          <h1 className="font-semibold text-foreground">{product ? "Edit Product" : "Add New Product"}</h1>
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

              {/* Modern Product Image Upload & Media Drop Area */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Product Image</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg, image/jpg, image/png, image/webp"
                  className="hidden"
                />
                
                {imageUrl && !isImageError ? (
                  <div className="relative group rounded-xl border border-border overflow-hidden bg-background w-36 h-36">
                    <img
                      src={imageUrl}
                      alt="Product Preview"
                      onError={() => setIsImageError(true)}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-white hover:bg-black/80 transition-colors"
                      title="Remove Image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[144px] ${
                      isDragActive ? "border-[#10B981] bg-[#10B981]/5" : "border-border hover:border-[#10B981]"
                    }`}
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-[#10B981]" />
                        <p className="text-xs text-muted-foreground font-medium">Uploading media asset...</p>
                      </div>
                    ) : isImageError ? (
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-xs font-medium text-destructive">No Image Available</p>
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }} 
                          className="text-[11px] text-[#10B981] underline font-semibold"
                        >
                          Clear & Try Again
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                        <p className="text-xs font-medium text-foreground">Click to upload or drag & drop</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">JPG, JPEG, PNG, WEBP up to 5MB</p>
                      </>
                    )}
                  </div>
                )}
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
              Product Gallery
            </h3>
            {imageUrl && !isImageError ? (
              <div className="rounded-xl border border-border bg-muted overflow-hidden aspect-square mb-2">
                <img src={imageUrl} alt="Gallery Preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-[#10B981] transition-colors cursor-pointer group mb-3" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-6 h-6 text-muted-foreground group-hover:text-[#10B981] mx-auto mb-2 transition-colors" />
                <p className="text-xs font-medium text-foreground">Upload Image</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG up to 5MB</p>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
              <Info className="w-3 h-3" /> Permanent storage URL linked cleanly from Supabase catalog.
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
              <button 
                onClick={() => onNavigate("products")}
                className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
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