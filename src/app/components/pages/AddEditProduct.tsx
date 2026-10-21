import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  X,
  ChevronLeft,
  Loader2,
  Sparkles,
  Percent,
  Save,
  Search,
  ExternalLink
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface StoreCategory {
  id: string;
  name: string;
  status?: string;
  display_order?: number;
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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isImageError, setIsImageError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState("");
  const [imageSearchResults, setImageSearchResults] = useState<Array<{ name: string; brand: string; image: string; barcode: string; source?: string; sourceUrl?: string; license?: string }>>([]);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [imageSearchMessage, setImageSearchMessage] = useState("");
  const [manualImageUrl, setManualImageUrl] = useState("");

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
    let cancelled = false;
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("product_categories")
          .select("id, name, status, display_order")
          .eq("status", "active")
          .order("display_order", { ascending: true })
          .order("name", { ascending: true });
        if (error) {
          console.error("Failed to load product categories:", error);
          return;
        }
        if (!cancelled) setCategories(data || []);
      } catch (err) {
        console.error("Category loading exception:", err);
      }
    };
    fetchCategories();
    return () => { cancelled = true; };
  }, []);

  const parseImageUrls = (value: unknown): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && !!item);
    if (typeof value !== "string") return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string" && !!item);
    } catch {}
    return [value];
  };

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
          if (unitOptions.includes(unitMatch)) parsedWeightUnit = unitMatch;
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
        gst_slab: product.gst_slab !== undefined && product.gst_slab !== null ? String(product.gst_slab).replace("%", "").trim() : "5",
        batch_number: product.batch_number || "",
        expiry_date: product.expiry_date || "",
        weightValue: parsedWeightVal,
        weightUnit: parsedWeightUnit,
        description: product.description || "",
        stock: product.stock !== undefined && product.stock !== null ? String(product.stock) : "",
        sku: product.sku || "",
        barcode: product.barcode || ""
      });

      const urls = parseImageUrls(product.image_url);
      setExistingImageUrls(urls);
      setImageUrl(urls[0] || "");
      setImageFile(null);
      setImageFiles([]);
      setIsImageError(false);
    } else {
      setForm({
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
      setExistingImageUrls([]);
      setImageUrl("");
      setImageFile(null);
      setImageFiles([]);
      setIsImageError(false);
    }
  }, [product]);

  const searchProductImages = async () => {
    const query = (imageSearchQuery || form.name).trim();
    if (!query) {
      setImageSearchMessage("Enter a product name first.");
      return;
    }

    setIsSearchingImages(true);
    setImageSearchMessage("Searching product catalogs and open image collections…");
    setImageSearchResults([]);

    const catalogs = [
      { name: "Open Food Facts", base: "https://world.openfoodfacts.org" },
      { name: "Open Products Facts", base: "https://world.openproductsfacts.org" },
      { name: "Open Beauty Facts", base: "https://world.openbeautyfacts.org" },
      { name: "Open Pet Food Facts", base: "https://world.openpetfoodfacts.org" }
    ];
    const fields = "product_name,product_name_en,brands,code,image_front_url,image_url";

    const searchCatalog = async (catalog: { name: string; base: string }) => {
      const endpoints = [
        `${catalog.base}/api/v2/search?${new URLSearchParams({ search_terms: query, page_size: "12", fields }).toString()}`,
        `${catalog.base}/cgi/search.pl?${new URLSearchParams({ search_terms: query, search_simple: "1", action: "process", json: "1", page_size: "12", fields }).toString()}`
      ];
      for (const endpoint of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), 6000);
          let response: Response;
          try {
            response = await fetch(endpoint, { headers: { Accept: "application/json" }, signal: controller.signal });
          } finally {
            window.clearTimeout(timeoutId);
          }
          if (!response.ok) continue;
          const data = await response.json();
          const products = Array.isArray(data.products) ? data.products : [];
          const results = products.map((item: any) => ({
            name: String(item.product_name || item.product_name_en || "").trim(),
            brand: String(item.brands || "").trim(),
            image: String(item.image_front_url || item.image_url || "").trim(),
            barcode: String(item.code || "").trim(),
            source: catalog.name,
            sourceUrl: item.code ? `https://world.openfoodfacts.org/product/${encodeURIComponent(String(item.code))}` : catalog.base
          })).filter((item: any) => item.name && (item.image.startsWith("https://") || item.image.startsWith("http://")));
          if (results.length) return results;
        } catch {
          // Try the next endpoint/catalog rather than failing the entire search.
        }
      }
      return [];
    };

    const searchCommons = async () => {
      const params = new URLSearchParams({
        action: "query",
        generator: "search",
        gsrsearch: `${query} product packaging`,
        gsrnamespace: "6",
        gsrlimit: "20",
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiurlwidth: "500",
        format: "json",
        origin: "*"
      });
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal
        });
        if (!response.ok) return [];
        const data = await response.json();
        return Object.values(data.query?.pages || {}).map((page: any) => {
          const info = page.imageinfo?.[0];
          const meta = info?.extmetadata || {};
          const plain = (value: any) => String(value?.value || "").replace(/<[^>]*>/g, "").trim();
          return {
            name: String(page.title || "").replace(/^File:/, "").replace(/_/g, " "),
            brand: "",
            image: String(info?.thumburl || info?.url || ""),
            barcode: "",
            source: "Wikimedia Commons",
            sourceUrl: String(info?.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || "")}`),
            license: [plain(meta.LicenseShortName), plain(meta.Artist)].filter(Boolean).join(" · ")
          };
        }).filter((item: any) => item.name && (item.image.startsWith("https://") || item.image.startsWith("http://")));
      } catch {
        return [];
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    const searchOpenverse = async () => {
      const params = new URLSearchParams({
        q: query,
        page_size: "20",
        mature: "false",
        fields: "title,creator,creator_url,license,license_version,foreign_landing_url,thumbnail, url"
      });
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`https://api.openverse.org/v1/images/?${params.toString()}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal
        });
        if (!response.ok) return [];
        const data = await response.json();
        return (Array.isArray(data.results) ? data.results : []).map((item: any) => ({
          name: String(item.title || query).trim(),
          brand: String(item.creator || "").trim(),
          image: String(item.thumbnail || item.url || "").trim(),
          barcode: "",
          source: "Openverse",
          sourceUrl: String(item.foreign_landing_url || item.url || ""),
          license: [String(item.license || "").toUpperCase(), String(item.license_version || ""), item.creator ? `by ${item.creator}` : ""].filter(Boolean).join(" · ")
        })).filter((item: any) => item.name && (item.image.startsWith("https://") || item.image.startsWith("http://")));
      } catch {
        return [];
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    try {
      // Search catalogs and open-licensed image sources together; users can select an image in this form.
      const catalogPromise = Promise.all(catalogs.map(searchCatalog)).then(groups => groups.flat());
      const [catalogResults, commonsResults, openverseResults] = await Promise.all([
        catalogPromise,
        searchCommons(),
        searchOpenverse()
      ]);
      const seen = new Set<string>();
      const combined = [...catalogResults, ...commonsResults, ...openverseResults].filter((item: any) => {
        const key = item.image.split("?")[0];
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 24);

      setImageSearchResults(combined);
      setImageSearchMessage(
        combined.length
          ? `Found ${combined.length} image options. Select an image here to preview it, then save the product; check the source and license before use.`
          : "No images were returned by the available sources. Try a shorter query, paste a direct image URL, or upload a photo."
      );
    } catch (error) {
      console.error("Product image search failed:", error);
      setImageSearchMessage("Image search could not finish. Try again, search the web, paste a direct image URL, or upload a photo.");
    } finally {
      setIsSearchingImages(false);
    }
  };

  const selectCatalogImage = (result: { name: string; brand: string; image: string; barcode: string; source?: string }) => {
    setImageFiles([]);
    setImageFile(null);
    setExistingImageUrls([]);
    setImageUrl(result.image);
    setIsImageError(false);
    if (result.barcode && !form.barcode.trim()) handleField("barcode", result.barcode);
    setImageSearchMessage(`Selected image for ${result.name}${result.source ? ` · ${result.source}` : ""}. Save the product to keep it.`);
  };

  const handleField = (key: string, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const validateAndSetImages = (files: File[]) => {
    const selected = files.filter(Boolean).slice(0, 5);
    if (!selected.length) return;
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (selected.some(file => !validTypes.includes(file.type) || file.size > 5 * 1024 * 1024)) {
      alert("Each product image must be JPG, JPEG, PNG, or WEBP and under 5MB.");
      return;
    }
    setExistingImageUrls([]);
    setImageFiles(selected);
    setImageFile(selected[0]);
    setImageUrl(URL.createObjectURL(selected[0]));
    setIsImageError(false);
  };

  const handleRemoveSelectedImage = (index: number) => {
    const next = imageFiles.filter((_, i) => i !== index);
    setImageFiles(next);
    setImageFile(next[0] || null);
    setImageUrl(next[0] ? URL.createObjectURL(next[0]) : "");
    setIsImageError(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragActive(true);
    else if (e.type === "dragleave") setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length) validateAndSetImages(Array.from(e.dataTransfer.files));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length) validateAndSetImages(Array.from(e.target.files));
  };

  const handleRemoveImage = () => {
    setImageUrl("");
    setImageFile(null);
    setImageFiles([]);
    setExistingImageUrls([]);
    setIsImageError(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resolveUniversalProduct = async (productId: string) => {
    const { data: resolverData, error: resolverError } = await supabase.rpc("resolve_product_master", { p_product_id: productId });
    if (resolverError) {
      console.error("Universal product resolver failed:", resolverError);
      throw new Error(`Product saved, but universal product matching failed: ${resolverError.message || resolverError}`);
    }
    const resolverResult = Array.isArray(resolverData) ? resolverData[0] : resolverData;
    if (!resolverResult?.universal_product_id) return;

    const { data: universalProduct, error: universalError } = await supabase
      .from("universal_products")
      .select("id, image_url")
      .eq("id", resolverResult.universal_product_id)
      .maybeSingle();
    if (universalError) {
      console.warn("Could not load universal product image:", universalError);
      return;
    }

    if (universalProduct?.image_url && !imageFile && imageFiles.length === 0 && existingImageUrls.length === 0 && !imageUrl) {
      const { error: fallbackError } = await supabase
        .from("products")
        .update({ image_url: universalProduct.image_url, updated_at: new Date().toISOString() })
        .eq("id", productId);
      if (fallbackError) console.warn("Could not apply universal image fallback:", fallbackError);
      else {
        setImageUrl(universalProduct.image_url);
        setIsImageError(false);
      }
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category_id || !form.price || !form.cost_price || !form.mrp || !form.stock) {
      alert("Please fill in all required fields.");
      return;
    }

    const selectedCategory = categories.find(category => category.id === form.category_id);
    if (!selectedCategory) {
      alert("Selected category is no longer active. Please select a valid category.");
      return;
    }

    const selectedCategoryName = selectedCategory.name.trim();
    if (selectedCategoryName === "Medical" && (!form.batch_number.trim() || !form.expiry_date.trim())) {
      alert("Batch Number and Expiry Date are strictly required for products under the Medical category.");
      return;
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
          .from("products").select("id").eq("vendor_id", vendor.id).ilike("name", form.name.trim()).maybeSingle();
        if (checkErr) throw checkErr;
        if (existingProd) {
          alert("Product already exists. Please edit the existing product.");
          setIsSubmitting(false);
          return;
        }
      } else {
        const { data: conflictingProd, error: checkErr } = await supabase
          .from("products").select("id").eq("vendor_id", vendor.id).ilike("name", form.name.trim()).neq("id", editingId).maybeSingle();
        if (checkErr) throw checkErr;
        if (conflictingProd) {
          alert("Product already exists. Please edit the existing product.");
          setIsSubmitting(false);
          return;
        }
      }

      let finalImageUrl = imageUrl;
      if (imageFiles.length) {
        setIsUploading(true);
        const uploadedUrls: string[] = [];
        for (const file of imageFiles.slice(0, 5)) {
          const fileExt = file.name.split(".").pop() || "jpg";
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from("product-images").upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
          uploadedUrls.push(publicUrlData.publicUrl);
        }
        finalImageUrl = uploadedUrls.length > 1 ? JSON.stringify(uploadedUrls) : (uploadedUrls[0] || "");
        setIsUploading(false);
      } else if (existingImageUrls.length) {
        finalImageUrl = existingImageUrls.length > 1 ? JSON.stringify(existingImageUrls) : existingImageUrls[0];
      }

      const finalWeightString = form.weightValue.trim() ? `${form.weightValue.trim()} ${form.weightUnit}` : null;
      const numericGst = parseFloat(form.gst_slab) || 0;
      const productPayload = {
        name: form.name.trim(),
        category_id: selectedCategory.id,
        price: parseFloat(form.price),
        cost_price: parseFloat(form.cost_price),
        mrp: parseFloat(form.mrp),
        gst_slab: `${numericGst}%`,
        gst_rate: numericGst,
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

      let savedProductId: string;
      if (editingId) {
        const { error } = await supabase.from("products").update(productPayload).eq("id", editingId);
        if (error) {
          if (error.code === "23505") {
            alert("Product already exists. Please edit the existing product.");
            setIsSubmitting(false);
            return;
          }
          throw error;
        }
        savedProductId = editingId;
      } else {
        const { data: insertedProduct, error } = await supabase.from("products").insert([productPayload]).select("id").single();
        if (error) {
          if (error.code === "23505") {
            alert("Product already exists. Please edit the existing product.");
            setIsSubmitting(false);
            return;
          }
          throw error;
        }
        if (!insertedProduct?.id) throw new Error("Product was created but its ID could not be retrieved.");
        savedProductId = insertedProduct.id;
      }

      await resolveUniversalProduct(savedProductId);
      onNavigate("products");
    } catch (err: any) {
      console.error("Product preservation exception:", err);
      alert(`Operation failed: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const sellPriceNum = parseFloat(form.price) || 0;
  const costPriceNum = parseFloat(form.cost_price) || 0;
  const gstPercent = parseFloat(form.gst_slab) || 0;
  const taxableSellingPrice = sellPriceNum / (1 + gstPercent / 100);
  const netProfit = costPriceNum > 0 && sellPriceNum > 0 ? taxableSellingPrice - costPriceNum : 0;
  const profitPercentage = costPriceNum > 0 ? (netProfit / costPriceNum) * 100 : 0;
  const selectedCategoryName = categories.find(category => category.id === form.category_id)?.name || "";

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onNavigate("products")} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-all"><ChevronLeft className="w-4 h-4" /></button>
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
              <input type="text" required placeholder="e.g., Amul Full Cream Milk 1L" value={form.name} onChange={e => handleField("name", e.target.value)} className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/10" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Category *</label>
              <select required value={form.category_id} onChange={e => handleField("category_id", e.target.value)} className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]">
                <option value="" disabled>{categories.length === 0 ? "Loading categories..." : "Select category"}</option>
                {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Wholesale (Cost) *</label><input type="number" step="0.01" required placeholder="0.00" value={form.cost_price} onChange={e => handleField("cost_price", e.target.value)} className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]" /></div>
              <div><label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Selling Price *</label><input type="number" step="0.01" required placeholder="0.00" value={form.price} onChange={e => handleField("price", e.target.value)} className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]" /></div>
              <div><label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">MRP *</label><input type="number" step="0.01" required placeholder="0.00" value={form.mrp} onChange={e => handleField("mrp", e.target.value)} className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]" /></div>
            </div>
            <div><label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">GST Slab *</label><select value={form.gst_slab} onChange={e => handleField("gst_slab", e.target.value)} className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]">{gstOptions.map(rate => <option key={rate} value={rate}>{rate}% GST slab</option>)}</select></div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">Logistics / Expiry Attributes</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Batch Number {selectedCategoryName === "Medical" && "*"}</label><input type="text" placeholder={selectedCategoryName === "Medical" ? "Required batch code" : "Optional batch code"} value={form.batch_number} onChange={e => handleField("batch_number", e.target.value)} className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background" /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Expiry Date {selectedCategoryName === "Medical" && "*"}</label><input type="date" value={form.expiry_date} onChange={e => handleField("expiry_date", e.target.value)} className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Weight / Volume</label><div className="flex items-center gap-1"><input type="number" step="any" placeholder="e.g. 500" value={form.weightValue} onChange={e => handleField("weightValue", e.target.value)} className="flex-1 h-9 px-3 text-xs border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]" /><select value={form.weightUnit} onChange={e => handleField("weightUnit", e.target.value)} className="w-20 h-9 px-1 text-xs border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]">{unitOptions.map(unit => <option key={unit} value={unit}>{unit}</option>)}</select></div></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Stock Quantity *</label><input type="number" required placeholder="0" value={form.stock} onChange={e => handleField("stock", e.target.value)} className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background" /></div>
            </div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Description</label><textarea rows={2} placeholder="Describe the product..." value={form.description} onChange={e => handleField("description", e.target.value)} className="w-full p-3 text-xs border border-border rounded-lg bg-background resize-none" /></div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Upload className="w-4 h-4 text-[#10B981]" />Product Media</h3>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/jpeg, image/jpg, image/png, image/webp" className="hidden" />

            {imageUrl && !isImageError ? (
              <div className="space-y-3">
                <div className="relative group rounded-xl border border-border overflow-hidden bg-muted aspect-square w-full max-w-[240px] mx-auto">
                  <img src={imageUrl} alt="Product Preview" onError={() => setIsImageError(true)} className="w-full h-full object-contain" />
                  <button type="button" onClick={handleRemoveImage} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors" title="Remove Images"><X className="w-4 h-4" /></button>
                </div>

                {existingImageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {existingImageUrls.map((url, index) => (
                      <div key={`${url}-${index}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted">
                        <img src={url} alt={`Product image ${index + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center font-semibold">{index + 1}</span>
                      </div>
                    ))}
                  </div>
                )}

                {imageFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {imageFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted">
                        <img src={URL.createObjectURL(file)} alt={`Product image ${index + 1}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => handleRemoveSelectedImage(index)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center" aria-label={`Remove image ${index + 1}`}><X className="w-3 h-3" /></button>
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center font-semibold">{index + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground text-center">{existingImageUrls.length > 1 ? `${existingImageUrls.length} images saved` : imageFiles.length > 1 ? `${imageFiles.length} images selected` : "1 image"}. Maximum 5 images.</p>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-9 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Add / Replace Images</button>
              </div>
            ) : (
              <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 ${isDragActive ? "border-[#10B981] bg-[#10B981]/5" : "border-border hover:border-[#10B981]"}`}>
                {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-[#10B981]" /> : <><Upload className="w-6 h-6 text-muted-foreground" /><div><p className="text-xs font-medium text-foreground">Click to upload up to 5 images</p><p className="text-[10px] text-muted-foreground mt-0.5">JPG, JPEG, PNG, WEBP • Max 5MB each</p></div></>}
              </div>
            )}

            <div className="border-t border-border pt-3 space-y-2">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Find a packaged product image</label>
              <div className="flex gap-2">
                <input
                  type="search"
                  value={imageSearchQuery}
                  onChange={(e) => setImageSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void searchProductImages(); } }}
                  placeholder={form.name || "Search product name or brand"}
                  className="min-w-0 flex-1 h-9 px-3 text-xs border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                  aria-label="Search product image catalog"
                />
                <button type="button" onClick={() => void searchProductImages()} disabled={isSearchingImages} className="h-9 px-3 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">
                  {isSearchingImages ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Search
                </button>
              </div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">Searches product catalogs, Wikimedia Commons, and Openverse for broader categories. Catalog coverage varies; check the exact product and usage rights before saving an image.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(imageSearchQuery || form.name)}`, "_blank", "noopener,noreferrer")} className="h-8 px-3 rounded-lg border border-border text-[10px] font-semibold flex items-center gap-1.5 hover:bg-muted">
                  Google Images <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <div className="flex gap-2">
                <input type="url" value={manualImageUrl} onChange={(e) => setManualImageUrl(e.target.value)} placeholder="Paste direct image URL (https://…)" className="min-w-0 flex-1 h-8 px-2 text-[10px] border border-border rounded-lg bg-background" aria-label="Direct product image URL" />
                <button type="button" onClick={() => {
                  const url = manualImageUrl.trim();
                  if (!/^https?:\/\//i.test(url)) {
                    setImageSearchMessage("Paste a valid direct image URL beginning with https:// or http://.");
                    return;
                  }
                  setImageFiles([]);
                  setImageFile(null);
                  setExistingImageUrls([]);
                  setImageUrl(url);
                  setIsImageError(false);
                  setImageSearchMessage("Image URL selected. Check the preview, then save the product.");
                }} className="h-8 px-3 rounded-lg bg-slate-800 text-white text-[10px] font-semibold">Use URL</button>
              </div>
              {imageSearchMessage && <p role="status" className="text-[10px] leading-relaxed text-muted-foreground">{imageSearchMessage}</p>}
              {imageSearchResults.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {imageSearchResults.map((result, index) => (
                    <div key={`${result.source || "catalog"}-${result.barcode}-${result.image}-${index}`} className={`rounded-lg border p-2 transition-colors ${imageUrl === result.image ? "border-[#10B981] bg-[#10B981]/5" : "border-border"}`}>
                      <button type="button" onClick={() => selectCatalogImage(result)} className="w-full text-left">
                        <img src={result.image} alt={result.name} loading="lazy" className="w-full h-24 rounded-md object-contain bg-white" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                        <span className="mt-1 block text-[10px] font-semibold leading-snug text-foreground line-clamp-2">{result.name}</span>
                        {result.brand && <span className="mt-0.5 block text-[9px] text-muted-foreground line-clamp-1">{result.brand}</span>}
                        {result.source && <span className="mt-1 block text-[9px] text-muted-foreground line-clamp-1">{result.source}</span>}
                        {result.license && <span className="mt-0.5 block text-[8px] text-muted-foreground line-clamp-2">{result.license}</span>}
                        <span className="mt-2 flex items-center gap-1 text-[9px] font-semibold text-[#059669]">Use image</span>
                      </button>
                      {result.sourceUrl && <a href={result.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[9px] text-muted-foreground underline">Source <ExternalLink className="w-2.5 h-2.5" /></a>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-[#10B981]" />Margin Insights</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Selling Price</span><span className="font-semibold text-foreground">₹{sellPriceNum.toFixed(2)}</span></div>
              <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Cost Price</span><span className="font-semibold text-foreground">₹{costPriceNum.toFixed(2)}</span></div>
              <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">GST</span><span className="font-semibold text-foreground">{gstPercent}%</span></div>
              <div className="border-t border-border pt-3"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted-foreground">Estimated Net Profit</span><span className={`text-sm font-bold ${netProfit >= 0 ? "text-[#059669]" : "text-[#DC2626]"}`}>₹{netProfit.toFixed(2)}</span></div><div className="flex items-center justify-between mt-1"><span className="text-xs text-muted-foreground">Profit Margin</span><span className={`text-xs font-semibold ${profitPercentage >= 0 ? "text-[#059669]" : "text-[#DC2626]"}`}>{profitPercentage.toFixed(1)}%</span></div></div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/40 rounded-lg p-2"><Percent className="w-3.5 h-3.5 shrink-0" /><span>Profit is calculated after removing GST from the selling price.</span></div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
            <button type="submit" disabled={isSubmitting || isUploading} className="w-full h-10 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />{product ? "Updating Product..." : "Saving Product..."}</> : <><Save className="w-4 h-4" />{product ? "Update Product" : "Save Product"}</>}</button>
            <button type="button" onClick={() => onNavigate("products")} disabled={isSubmitting} className="w-full h-10 rounded-lg border border-border bg-background text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50">Cancel</button>
          </div>
        </div>
      </form>
    </div>
  );
}
