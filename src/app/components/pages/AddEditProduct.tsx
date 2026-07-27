import React, { useState, useEffect, useRef } from "react";
import { Upload, X, ChevronLeft, Loader2, Sparkles, Percent, Save } from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface StoreCategory {
  id: string;
  name: string;
}

interface Props {
  onNavigate: (page: string) => void;
  product?: any;
}

const gstOptions = [0, 5, 12, 18, 28];
const unitOptions = ["Gm", "Kg", "Ltr", "Ml", "Pcs", "Pack"];

export function AddEditProduct({ onNavigate, product }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isImageError, setIsImageError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<StoreCategory[]>([]);

  const [form, setForm] = useState({
    name: "",
    category_id: "",
    price: "",
    cost_price: "",
    mrp: "",
    gst_slab: "5",
    batch_number: "",
    expiry_date: "",
    weightValue: "",
    weightUnit: "Gm",
    description: "",
    stock: "",
    sku: "",
    barcode: ""
  });

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("product_categories").select("id, name");
      if (!error && data) {
        setCategories(data);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (product) {
      let parsedWeightVal = "";
      let parsedWeightUnit = "Gm";

      if (product.weight) {
        const weightStr = product.weight.toString().trim();
        const numericMatch = weightStr.match(/^[\d.]+/);
        if (numericMatch) {
          parsedWeightVal = numericMatch[0];
          const unitMatch = weightStr.replace(parsedWeightVal, "").trim();
          if (unitOptions.includes(unitMatch)) {
            parsedWeightUnit = unitMatch;
          }
        } else {
          parsedWeightVal = weightStr;
        }
      }

      setForm({
        name: product.name || "",
        category_id: product.category_id || "",
        price: product.price !== undefined && product.price !== null ? String(product.price) : "",
        cost_price: product.cost_price !== undefined && product.cost_price !== null ? String(product.cost_price) : "",
        mrp: product.mrp !== undefined && product.mrp !== null ? String(product.mrp) : "",
        gst_slab: product.gst_slab !== undefined && product.gst_slab !== null ? String(product.gst_slab) : "5",
        batch_number: product.batch_number || "",
        expiry_date: product.expiry_date || "",
        weightValue: parsedWeightVal,
        weightUnit: parsedWeightUnit,
        description: product.description || "",
        stock: product.stock !== undefined && product.stock !== null ? String(product.stock) : "",
        sku: product.sku || "",
        barcode: product.barcode || ""
      });
      setImageUrl(product.image_url || "");
      setImageFile(null);
      setIsImageError(false);
    } else {
      setForm({
        name: "", category_id: "", price: "", cost_price: "", mrp: "", gst_slab: "5",
        batch_number: "", expiry_date: "", weightValue: "", weightUnit: "Gm",
        description: "", stock: "", sku: "", barcode: ""
      });
      setImageUrl("");
      setImageFile(null);
      setIsImageError(false);
    }
  }, [product]);

  const handleField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const validateAndSetImage = (file: File) => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Invalid format. Accepted formats are: JPG, JPEG, PNG, WEBP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Maximum file size exceeded. Max size limit is 5MB.");
      return;
    }
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setIsImageError(false);
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
      validateAndSetImage(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetImage(e.target.files[0]);
    }
  };

  const handleRemoveImage = async () => {
    if (!imageUrl) return;
    if (imageUrl.startsWith("http") && !imageFile) {
      try {
        const urlParts = imageUrl.split("/");
        const fileName = urlParts[urlParts.length - 1];
        if (fileName) {
          await supabase.storage.from("product-images").remove([fileName]);
        }
      } catch (err) {
        console.error("Failed to delete file from storage:", err);
      }
    }
    setImageUrl("");
    setImageFile(null);
    setIsImageError(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.category_id || !form.price || !form.cost_price || !form.mrp || !form.stock) {
      alert("Please fill in all required fields.");
      return;
    }

    const selectedCategoryName = categories.find(c => c.id === form.category_id)?.name;
    if (selectedCategoryName === "Medical") {
      if (!form.batch_number.trim() || !form.expiry_date.trim()) {
        alert("Batch Number and Expiry Date are strictly required for products under the Medical category.");
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) throw new Error("User session not found.");

      const { data: vendor, error: vendorErr } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (vendorErr || !vendor) throw new Error("Vendor profile missing.");

      const editingId = product?.id;

      if (!editingId) {
        const { data: existingProd, error: checkErr } = await supabase
          .from("products")
          .select("id")
          .eq("vendor_id", vendor.id)
          .ilike("name", form.name.trim())
          .maybeSingle();

        if (checkErr) throw checkErr;

        if (existingProd) {
          alert("Product already exists. Please edit the existing product.");
          setIsSubmitting(false);
          return;
        }
      } else {
        const { data: conflictingProd, error: checkErr } = await supabase
          .from("products")
          .select("id")
          .eq("vendor_id", vendor.id)
          .ilike("name", form.name.trim())
          .neq("id", editingId)
          .maybeSingle();

        if (checkErr) throw checkErr;

        if (conflictingProd) {
          alert("Product already exists. Please edit the existing product.");
          setIsSubmitting(false);
          return;
        }
      }

      let finalImageUrl = imageUrl;
      if (imageFile) {
        setIsUploading(true);
        const fileExt = imageFile.name.split('.').pop() || "jpg";
        const fileName = `${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        finalImageUrl = publicUrlData.publicUrl;
        setIsUploading(false);
      }

      const finalWeightString = form.weightValue.trim()
        ? `${form.weightValue.trim()} ${form.weightUnit}`
        : null;

      const productPayload = {
        name: form.name.trim(),
        category_id: form.category_id,
        price: parseFloat(form.price),
        cost_price: parseFloat(form.cost_price),
        mrp: parseFloat(form.mrp),
        gst_slab: parseFloat(form.gst_slab) || 0,
        batch_number: form.batch_number || null,
        expiry_date: form.expiry_date || null,
        weight: finalWeightString,
        description: form.description || null,
        stock: parseInt(form.stock) || 0,
        image_url: finalImageUrl || null,
        vendor_id: vendor.id,
        sku: form.sku || null,
        barcode: form.barcode || null
      };

      if (editingId) {
        const { error } = await supabase
          .from("products")
          .update(productPayload)
          .eq("id", editingId);

        if (error) {
          if (error.code === "23505") {
            alert("Product already exists. Please edit the existing product.");
            setIsSubmitting(false);
            return;
          }
          throw error;
        }
      } else {
        const { error } = await supabase.from("products").insert([productPayload]);

        if (error) {
          if (error.code === "23505") {
            alert("Product already exists. Please edit the existing product.");
            setIsSubmitting(false);
            return;
          }
          throw error;
        }
      }

      onNavigate("products");
    } catch (err: any) {
      console.error("Product preservation exception:", err);
      alert(`Operation failed: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sellPriceNum = parseFloat(form.price) || 0;
  const costPriceNum = parseFloat(form.cost_price) || 0;
  const gstPercent = parseFloat(form.gst_slab) || 0;

  const taxableSellingPrice = sellPriceNum / (1 + gstPercent / 100);
  const netProfit = costPriceNum > 0 && sellPriceNum > 0 ? taxableSellingPrice - costPriceNum : 0;
  const profitPercentage = costPriceNum > 0 ? (netProfit / costPriceNum) * 100 : 0;

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate("products")}
          className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{product ? "Edit Product" : "Add New Product"}</h1>
          <p className="text-xs text-muted-foreground">List a new item with dynamic margin evaluations</p>
        </div>
      </div>

      <form onSubmit={handleSaveProduct} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-sm">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Product Name *</label>
              <input
                type="text"
                required
                placeholder="e.g., Amul Full Cream Milk 1L"
                value={form.name}
                onChange={e => handleField("name", e.target.value)}
                className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Category *</label>
              <select
                required
                value={form.category_id}
                onChange={e => handleField("category_id", e.target.value)}
                className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
              >
                <option value="" disabled>Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Wholesale (Cost) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={form.cost_price}
                  onChange={e => handleField("cost_price", e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Selling Price *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={form.price}
                  onChange={e => handleField("price", e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">MRP *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={form.mrp}
                  onChange={e => handleField("mrp", e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">GST Slab *</label>
              <select
                value={form.gst_slab}
                onChange={e => handleField("gst_slab", e.target.value)}
                className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
              >
                {gstOptions.map(rate => (
                  <option key={rate} value={rate}>{rate}% GST slab</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">Logistics / Expiry Attributes</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Batch Number {categories.find(c => c.id === form.category_id)?.name === "Medical" && "*"}
                </label>
                <input
                  type="text"
                  placeholder={categories.find(c => c.id === form.category_id)?.name === "Medical" ? "Required batch code" : "Optional batch code"}
                  value={form.batch_number}
                  onChange={e => handleField("batch_number", e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Expiry Date {categories.find(c => c.id === form.category_id)?.name === "Medical" && "*"}
                </label>
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={e => handleField("expiry_date", e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Weight / Volume</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 500"
                    value={form.weightValue}
                    onChange={e => handleField("weightValue", e.target.value)}
                    className="flex-1 h-9 px-3 text-xs border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                  />
                  <select
                    value={form.weightUnit}
                    onChange={e => handleField("weightUnit", e.target.value)}
                    className="w-20 h-9 px-1 text-xs border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                  >
                    {unitOptions.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Stock Quantity *</label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={form.stock}
                  onChange={e => handleField("stock", e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe the product..."
                  value={form.description}
                  onChange={e => handleField("description", e.target.value)}
                  className="w-full p-3 text-xs border border-border rounded-lg bg-background resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#10B981]" /> Product Media
            </h3>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg, image/jpg, image/png, image/webp"
              className="hidden"
            />

            {imageUrl && !isImageError ? (
              <div className="relative group rounded-xl border border-border overflow-hidden bg-muted aspect-square w-full max-w-[240px] mx-auto">
                <img
                  src={imageUrl}
                  alt="Product Preview"
                  onError={() => setIsImageError(true)}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
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
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 ${
                  isDragActive ? "border-[#10B981] bg-[#10B981]/5" : "border-border hover:border-[#10B981]"
                }`}
              >
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[#10B981]" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-foreground">Click to upload or drag & drop</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">JPG, JPEG, PNG, WEBP up to 5MB</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#10B981]" /> Margin Insights
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Selling Price:</span>
                <span className="font-medium text-foreground">₹{sellPriceNum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">GST Output Tax ({gstPercent}%):</span>
                <span className="font-medium text-[#EF4444]">₹{(sellPriceNum - taxableSellingPrice).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Taxable Value (Rate):</span>
                <span className="font-medium text-foreground">₹{taxableSellingPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Wholesale Cost:</span>
                <span className="font-medium text-foreground">₹{costPriceNum.toFixed(2)}</span>
              </div>
            </div>

            <div className={`rounded-xl p-4 text-center border ${netProfit > 0 ? "bg-[#ECFDF5] border-[#A7F3D0]" : "bg-muted/40 border-border"}`}>
              <p className="text-xs font-medium text-muted-foreground">Net Profit Margin</p>
              <p className={`text-2xl font-bold mt-1 ${netProfit > 0 ? "text-[#065F46]" : "text-muted-foreground"}`}>
                ₹{netProfit.toFixed(2)}
              </p>
              {netProfit > 0 && (
                <div className="inline-flex items-center gap-1 bg-[#10B981]/10 text-[#10B981] font-semibold text-xs px-2 py-0.5 rounded-md mt-1.5">
                  <Percent className="w-3 h-3" /> {profitPercentage.toFixed(1)}% Profit
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-[#10B981] hover:bg-[#059669] text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? "Saving..." : product ? "Update Product" : "Publish Product"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}