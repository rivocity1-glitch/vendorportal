import React, { useState, useEffect } from "react";
import { Search, Plus, Upload, Edit2, Trash2, MoreVertical, Filter, ArrowLeft, Save, Percent, Sparkles, Loader2, Calendar } from "lucide-react";
import { supabase } from "../../../lib/supabase"; 

interface StoreCategory {
  id: string;
  name: string;
}

const statusStyles: Record<string, string> = {
  Active: "bg-[#D1FAE5] text-[#065F46]",
  "Low Stock": "bg-[#FEF3C7] text-[#92400E]",
  "Out of Stock": "bg-[#FEE2E2] text-[#991B1B]",
  Draft: "bg-muted text-muted-foreground",
};

export function Products({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [view, setView] = useState<"list" | "add">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState("All"); 
  const [productList, setProductList] = useState<any[]>([]);
  const [openMenu, setOpenMenu] = useState<any | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<StoreCategory[]>([]);

  // Form States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(""); 
  const [price, setPrice] = useState("");          
  const [wholesaleRate, setWholesaleRate] = useState(""); 
  const [mrp, setMrp] = useState("");
  const [gstRate, setGstRate] = useState("5");     
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [weightValue, setWeightValue] = useState("");
  const [weightUnit, setWeightUnit] = useState("Gm");
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState("");

  const gstOptions = [0, 5, 12, 18, 28];
  const unitOptions = ["Gm", "Kg", "Ltr", "Ml", "Pcs", "Pack"];

  // Category explicit rule mapping definitions
  const csvCategoryMap: Record<string, string> = {
    "beverages": "Grocery",
    "staples": "Grocery",
    "packaged foods": "Grocery",
    "personal care": "Grocery",
    "household": "Home & Kitchen",
    "dairy": "Dairy"
  };

  // Profit Margin Computations
  const sellPriceNum = parseFloat(price) || 0;
  const costPriceNum = parseFloat(wholesaleRate) || 0;
  const gstPercent = parseFloat(gstRate) || 0;

  const taxableSellingPrice = sellPriceNum / (1 + gstPercent / 100);
  const netProfit = costPriceNum > 0 && sellPriceNum > 0 ? taxableSellingPrice - costPriceNum : 0;
  const profitPercentage = costPriceNum > 0 ? (netProfit / costPriceNum) * 100 : 0;

  const fetchLiveProducts = async () => {
    try {
      setLoading(true);
      
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        setLoading(false);
        return;
      }

      const { data: vendor, error: vendorErr } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (vendorErr || !vendor) {
        setLoading(false);
        return;
      }

      const { data: catsData, error: catErr } = await supabase
        .from("product_categories")
        .select("id, name");
      
      if (!catErr && catsData) {
        setCategories(catsData);
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const mapped = data.map((p: any) => {
          const currentStock = Number(p.stock ?? 0);
          let evaluatedStatus = "Active";

          if (currentStock === 0) {
            evaluatedStatus = "Out of Stock";
          } else if (currentStock <= (p.low_stock_threshold ?? 5)) {
            evaluatedStatus = "Low Stock";
          }

          const itemGst = parseFloat(p.gst_slab) || 0;
          const itemPrice = parseFloat(p.price) || 0;
          const calculatedRate = itemPrice / (1 + itemGst / 100);

          return {
            id: p.id,
            name: p.name || "Unnamed Product",
            category_id: p.category_id || "", 
            mrp: Number(p.mrp || 0),
            price: Number(p.price || 0),
            rate: calculatedRate, 
            stock: currentStock,
            status: p.status || evaluatedStatus,
            expiry_date: p.expiry_date || null,
            img: (p.name || "PR").slice(0, 2).toUpperCase(),
            cost_price: p.cost_price,
            gst_slab: p.gst_slab,
            batch_number: p.batch_number,
            weight: p.weight,
            description: p.description
          };
        });

        setProductList(mapped);
      }
    } catch (err) {
      console.error("Failed to query records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveProducts();
  }, []);

  const handleDelete = async (id: any) => {
    const confirmation = window.confirm("Are you sure you want to permanently delete this product listing?");
    if (!confirmation) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setOpenMenu(null);
      setProductList(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Delete sequence failed:", err);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !categoryId || !price || !wholesaleRate || !mrp || !stock) {
      alert("Please fill in all required fields.");
      return;
    }

    const selectedCategoryName = categories.find(c => c.id === categoryId)?.name;
    if (selectedCategoryName === "Medical") {
      if (!batchNumber.trim() || !expiryDate.trim()) {
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

      if (!editingId) {
        const { data: existingProd, error: checkErr } = await supabase
          .from("products")
          .select("id")
          .eq("vendor_id", vendor.id)
          .ilike("name", name.trim())
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
          .ilike("name", name.trim())
          .neq("id", editingId)
          .maybeSingle();

        if (checkErr) throw checkErr;

        if (conflictingProd) {
          alert("Product already exists. Please edit the existing product.");
          setIsSubmitting(false);
          return;
        }
      }

      const finalWeightString = weightValue.trim() ? `${weightValue.trim()} ${weightUnit}` : null;

      const productPayload = {
        name: name.trim(),
        category_id: categoryId, 
        price: parseFloat(price),
        cost_price: parseFloat(wholesaleRate), 
        mrp: parseFloat(mrp),
        gst_slab: gstPercent, 
        batch_number: batchNumber || null,
        expiry_date: expiryDate || null,
        weight: finalWeightString,
        description: description || null,
        stock: parseInt(stock) || 0, 
        vendor_id: vendor.id
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

      setName(""); setCategoryId(""); setPrice(""); setWholesaleRate(""); setMrp("");
      setBatchNumber(""); setExpiryDate(""); setWeightValue(""); setWeightUnit("Gm"); setDescription(""); setStock("");
      setEditingId(null);
      
      setView("list");
      await fetchLiveProducts();
    } catch (err: any) {
      console.error("Product preservation exception:", err);
      alert(`Operation failed: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportCSV = async () => {
    if (!importFile) {
      alert("Please select a valid CSV file to import.");
      return;
    }

    try {
      setIsImporting(true);

      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) throw new Error("Authentication context invalid.");

      const { data: vendor, error: vendorErr } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (vendorErr || !vendor) throw new Error("Vendor system mismatch.");

      const { data: currentDbProducts, error: dbProdErr } = await supabase
        .from("products")
        .select("name")
        .eq("vendor_id", vendor.id);

      if (dbProdErr) throw dbProdErr;

      const localUniqueProductSet = new Set(
        (currentDbProducts || []).map(p => p.name.trim().toLowerCase())
      );

      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        if (!text) {
          setIsImporting(false);
          return;
        }

        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length < 2) {
          alert("The uploaded file does not contain any entries.");
          setIsImporting(false);
          return;
        }

        const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));
        const productsToInsert: any[] = [];
        let duplicateCount = 0;
        let skippedCategoryCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const currentLine = lines[i].split(",").map(cell => cell.trim().replace(/['"]+/g, ''));
          if (currentLine.length !== headers.length) continue;

          const rowData: Record<string, string> = {};
          headers.forEach((header, index) => {
            rowData[header] = currentLine[index];
          });

          const rawName = rowData["name"] || rowData["product name"];
          if (!rawName) continue;
          
          const cleanedName = rawName.trim();
          const lowerCasedName = cleanedName.toLowerCase();

          // Deduplicate rows based on database key profile specifications
          if (localUniqueProductSet.has(lowerCasedName)) {
            duplicateCount++;
            continue;
          }

          // Handle category validation and strict mapping translations
          let pCatId: string | undefined = rowData["category_id"] || undefined;
          const rawCsvCatName = (rowData["category"] || rowData["category_name"] || "").trim().toLowerCase();

          if (!pCatId && rawCsvCatName) {
            // Check mapping table for translation
            const targetCatName = csvCategoryMap[rawCsvCatName] || rowData["category"] || rowData["category_name"];
            const matchedCat = categories.find(c => c.name.toLowerCase() === targetCatName.toLowerCase());
            
            if (matchedCat) {
              pCatId = matchedCat.id;
            }
          } else if (pCatId) {
            // Confirm the provided category_id exists inside database context
            const exists = categories.some(c => c.id === pCatId);
            if (!exists) pCatId = undefined;
          }

          // Strict check requirement: Skip row if category doesn't exist (Do not create new ones)
          if (!pCatId) {
            skippedCategoryCount++;
            continue;
          }

          const pPrice = parseFloat(rowData["price"] || rowData["selling price"]) || 0;
          const pCost = parseFloat(rowData["cost_price"] || rowData["wholesale rate"] || rowData["cost"]) || 0;
          const pMrp = parseFloat(rowData["mrp"]) || pPrice;
          const pStock = parseInt(rowData["stock"] || rowData["stock quantity"]) || 0;
          const pGst = parseFloat(rowData["gst_slab"] || rowData["gst"]) || 0;

          localUniqueProductSet.add(lowerCasedName);

          productsToInsert.push({
            name: cleanedName,
            category_id: pCatId,
            price: pPrice,
            cost_price: pCost,
            mrp: pMrp,
            stock: pStock,
            gst_slab: pGst,
            batch_number: rowData["batch_number"] || rowData["batch number"] || null,
            expiry_date: rowData["expiry_date"] || rowData["expiry date"] || null,
            weight: rowData["weight"] || rowData["volume"] || null,
            description: rowData["description"] || null,
            vendor_id: vendor.id
          });
        }

        if (productsToInsert.length === 0) {
          alert(`Imported 0 products\nSkipped ${duplicateCount} duplicates\nSkipped ${skippedCategoryCount} missing categories`);
          setIsImporting(false);
          setShowImportModal(false);
          setImportFile(null);
          return;
        }

        const { error: insertErr } = await supabase.from("products").insert(productsToInsert);
        
        if (insertErr) {
          if (insertErr.code === "23505") {
            alert("A uniqueness error occurred while processing bulk ingestion records. Please verify row items are not unique duplicates.");
            setIsImporting(false);
            return;
          }
          throw insertErr;
        }

        alert(`Imported ${productsToInsert.length} products\nSkipped ${duplicateCount} duplicates\nSkipped ${skippedCategoryCount} missing categories`);
        setImportFile(null);
        setShowImportModal(false);
        await fetchLiveProducts();
      };

      reader.readAsText(importFile);
    } catch (err: any) {
      console.error("CSV Ingestion Pipeline Dropped:", err);
      alert(`Import failed: ${err.message || err}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCancelForm = () => {
    setName(""); setCategoryId(""); setPrice(""); setWholesaleRate(""); setMrp("");
    setBatchNumber(""); setExpiryDate(""); setWeightValue(""); setWeightUnit("Gm"); setDescription(""); setStock("");
    setEditingId(null);
    setView("list");
  };

  const filtered = productList.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategoryId === "All" || p.category_id === activeCategoryId; 
    return matchSearch && matchCat;
  });

  if (view === "add") {
    return (
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={handleCancelForm}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground">{editingId ? "Edit Product" : "Add New Product"}</h2>
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
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Category *</label>
                <select
                  required
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
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
                    value={wholesaleRate}
                    onChange={e => setWholesaleRate(e.target.value)}
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
                    value={price}
                    onChange={e => setPrice(e.target.value)}
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
                    value={mrp}
                    onChange={e => setMrp(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">GST Slab *</label>
                <select
                  value={gstRate}
                  onChange={e => setGstRate(e.target.value)}
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
                    Batch Number {categories.find(c => c.id === categoryId)?.name === "Medical" && "*"}
                  </label>
                  <input 
                    type="text"
                    placeholder={categories.find(c => c.id === categoryId)?.name === "Medical" ? "Required batch code" : "Optional batch code"}
                    value={batchNumber}
                    onChange={e => setBatchNumber(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Expiry Date {categories.find(c => c.id === categoryId)?.name === "Medical" && "*"}
                  </label>
                  <input 
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
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
                      value={weightValue}
                      onChange={e => setWeightValue(e.target.value)}
                      className="flex-1 h-9 px-3 text-xs border border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                    />
                    <select
                      value={weightUnit}
                      onChange={e => setWeightUnit(e.target.value)}
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
                    value={stock}
                    onChange={e => setStock(e.target.value)}
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
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full p-3 text-xs border border-border rounded-lg bg-background resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
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
                {isSubmitting ? "Publishing..." : editingId ? "Update Product" : "Publish Product"}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-xs text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#10B981]" />
        <span>Syncing catalog metrics...</span>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 bg-background text-foreground min-h-screen">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/10"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4" /> Import
          </button>
          <button
            type="button"
            onClick={() => setView("add")}
            className="h-9 px-3 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button
          type="button"
          onClick={() => setActiveCategoryId("All")}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
            activeCategoryId === "All" ? "bg-[#10B981] text-white" : "bg-card border border-border text-muted-foreground"
          }`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategoryId(cat.id)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              activeCategoryId === cat.id ? "bg-[#10B981] text-white" : "bg-card border border-border text-muted-foreground"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Rate (Excl. Tax)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">MRP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Stock</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Expiry Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(p => {
                const categoryLabel = categories.find(c => c.id === p.category_id)?.name || "Other";
                const expiryLabel = p.expiry_date ? new Date(p.expiry_date).toLocaleDateString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric"
                }) : "—";

                return (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                          {p.img}
                        </div>
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#EFF6FF] text-[#1D4ED8]">
                        {categoryLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-muted-foreground">₹{p.rate.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">₹{p.mrp.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{p.stock}</td>
                    
                    <td className="px-4 py-3 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1">
                        {p.expiry_date && <Calendar className="w-3 h-3 text-red-400" />}
                        {expiryLabel}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[p.status] || "bg-muted text-foreground"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(p.id);
                            setName(p.name);
                            setCategoryId(p.category_id);
                            setPrice(p.price.toString());
                            setWholesaleRate((p.cost_price ?? "").toString());
                            setMrp(p.mrp.toString());
                            setGstRate((p.gst_slab ?? "5").toString());
                            setBatchNumber(p.batch_number || "");
                            setExpiryDate(p.expiry_date || "");
                            setDescription(p.description || "");
                            setStock(p.stock.toString());

                            if (p.weight) {
                              const weightStr = p.weight.toString().trim();
                              const numericMatch = weightStr.match(/^[\d.]+/);
                              if (numericMatch) {
                                const numVal = numericMatch[0];
                                setWeightValue(numVal);
                                const parsedUnit = weightStr.replace(numVal, "").trim();
                                if (unitOptions.includes(parsedUnit)) {
                                  setWeightUnit(parsedUnit);
                                } else {
                                  setWeightUnit("Gm");
                                }
                              } else {
                                setWeightValue(weightStr);
                                setWeightUnit("Gm");
                              }
                            } else {
                              setWeightValue("");
                              setWeightUnit("Gm");
                            }

                            setView("add");
                          }}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-[#10B981] hover:bg-[#ECFDF5]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                          {openMenu === p.id && (
                            <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-lg shadow-lg z-10 py-1">
                              <button 
                                type="button" 
                                onClick={() => handleDelete(p.id)} 
                                className="w-full text-left px-3 py-1.5 text-sm text-[#EF4444] hover:bg-[#FEF2F2] font-semibold flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Functional Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { if(!isImporting){ setShowImportModal(false); setImportFile(null); } }} />
          <div className="relative bg-card rounded-2xl border border-border w-full max-w-md p-6 shadow-xl">
            <h2 className="font-semibold text-foreground mb-4">Import Products</h2>
            <div className="space-y-3">
              <div 
                onClick={() => document.getElementById("csv-file-picker")?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-[#10B981] cursor-pointer group"
              >
                <input 
                  id="csv-file-picker"
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (file) setImportFile(file);
                  }}
                />
                <Upload className="w-8 h-8 text-muted-foreground group-hover:text-[#10B981] mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">
                  {importFile ? importFile.name : "Drop your CSV file here"}
                </p>
                <button type="button" className="mt-3 px-4 py-1.5 rounded-lg bg-[#10B981] text-white text-xs font-medium">
                  Choose File
                </button>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button 
                type="button" 
                disabled={isImporting}
                onClick={() => { setShowImportModal(false); setImportFile(null); }} 
                className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="button" 
                disabled={isImporting || !importFile}
                onClick={handleImportCSV}
                className="flex-1 h-9 rounded-lg bg-[#10B981] text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isImporting ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}