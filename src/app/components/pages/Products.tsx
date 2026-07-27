import React, { useState, useEffect } from "react";
import { 
  Search, Plus, Upload, Edit2, Trash2, MoreVertical, Loader2, Calendar, FileText,
  ShoppingBasket, Pill, Milk, CupSoda, Croissant, Apple, Beef, Fish, Laptop, NotebookPen, Package, Sparkles
} from "lucide-react";
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

export function Products({ onNavigate }: { onNavigate: (page: string, params?: any) => void }) {
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState("All"); 
  const [productList, setProductList] = useState<any[]>([]);
  const [openMenu, setOpenMenu] = useState<any | null>(null);
  const [showImportOptionsModal, setShowImportOptionsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<StoreCategory[]>([]);

  const csvCategoryMap: Record<string, string> = {
    "beverages": "Grocery",
    "staples": "Grocery",
    "packaged foods": "Grocery",
    "personal care": "Grocery",
    "household": "Home & Kitchen",
    "dairy": "Dairy"
  };

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case "Grocery":
        return <ShoppingBasket className="w-4 h-4 text-muted-foreground" />;
      case "Medical":
        return <Pill className="w-4 h-4 text-muted-foreground" />;
      case "Dairy":
        return <Milk className="w-4 h-4 text-muted-foreground" />;
      case "Beverages":
        return <CupSoda className="w-4 h-4 text-muted-foreground" />;
      case "Bakery":
        return <Croissant className="w-4 h-4 text-muted-foreground" />;
      case "Fruits & Vegetables":
        return <Apple className="w-4 h-4 text-muted-foreground" />;
      case "Meat":
        return <Beef className="w-4 h-4 text-muted-foreground" />;
      case "Seafood":
        return <Fish className="w-4 h-4 text-muted-foreground" />;
      case "Personal Care":
        return <Sparkles className="w-4 h-4 text-muted-foreground" />;
      case "Home & Kitchen":
        return <HomeIcon className="w-4 h-4 text-muted-foreground" />;
      case "Electronics":
        return <Laptop className="w-4 h-4 text-muted-foreground" />;
      case "Stationery":
        return <NotebookPen className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Package className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const HomeIcon = ({ className }: { className?: string }) => {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    );
  };

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
            image_url: p.image_url,
            cost_price: p.cost_price,
            gst_slab: p.gst_slab,
            batch_number: p.batch_number,
            weight: p.weight,
            description: p.description,
            low_stock_threshold: p.low_stock_threshold ?? 5,
            sku: p.sku || "",
            barcode: p.barcode || ""
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
        .select("id, name, stock, low_stock_threshold")
        .eq("vendor_id", vendor.id);

      if (dbProdErr) throw dbProdErr;

      const existingProductMap = new Map<string, { id: string; stock: number; low_stock_threshold: number }>();
      (currentDbProducts || []).forEach(p => {
        existingProductMap.set(p.name.trim().toLowerCase(), {
          id: p.id,
          stock: Number(p.stock ?? 0),
          low_stock_threshold: Number(p.low_stock_threshold ?? 5)
        });
      });

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
        const productsToRestock: { id: string; stock: number }[] = [];

        let newProductsCount = 0;
        let refilledLowStockCount = 0;
        let skippedHealthyCount = 0;
        let skippedCategoryCount = 0;

        const localSeenInCsv = new Set<string>();

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

          if (localSeenInCsv.has(lowerCasedName)) {
            continue;
          }
          localSeenInCsv.add(lowerCasedName);

          const pStock = parseInt(rowData["stock"] || rowData["stock quantity"]) || 0;

          if (existingProductMap.has(lowerCasedName)) {
            const match = existingProductMap.get(lowerCasedName)!;
            
            if (match.stock === 0 || match.stock <= match.low_stock_threshold) {
              productsToRestock.push({ id: match.id, stock: pStock });
              refilledLowStockCount++;
            } else {
              skippedHealthyCount++;
            }
            continue;
          }

          let pCatId: string | undefined = rowData["category_id"] || undefined;
          const rawCsvCatName = (rowData["category"] || rowData["category_name"] || "").trim().toLowerCase();

          if (!pCatId && rawCsvCatName) {
            const targetCatName = csvCategoryMap[rawCsvCatName] || rowData["category"] || rowData["category_name"];
            const matchedCat = categories.find(c => c.name.toLowerCase() === targetCatName.toLowerCase());
            
            if (matchedCat) {
              pCatId = matchedCat.id;
            }
          } else if (pCatId) {
            const exists = categories.some(c => c.id === pCatId);
            if (!exists) pCatId = undefined;
          }

          if (!pCatId) {
            skippedCategoryCount++;
            continue;
          }

          const pPrice = parseFloat(rowData["price"] || rowData["selling price"]) || 0;
          const pCost = parseFloat(rowData["cost_price"] || rowData["wholesale rate"] || rowData["cost"]) || 0;
          const pMrp = parseFloat(rowData["mrp"]) || pPrice;
          const pGst = parseFloat(rowData["gst_slab"] || rowData["gst"]) || 0;

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
            image_url:
              rowData["image_url"] ||
              rowData["image"] ||
              rowData["image_link"] ||
              rowData["image link"] ||
              rowData["imageurl"] ||
              null,
            vendor_id: vendor.id
          });
          newProductsCount++;
        }

        if (productsToInsert.length > 0) {
          const { error: insertErr } = await supabase.from("products").insert(productsToInsert);
          if (insertErr) {
            if (insertErr.code === "23505") {
              alert("A uniqueness error occurred while processing bulk ingestion records.");
              setIsImporting(false);
              return;
            }
            throw insertErr;
          }
        }

        for (const item of productsToRestock) {
          const { error: updateErr } = await supabase
            .from("products")
            .update({ stock: item.stock })
            .eq("id", item.id);
          
          if (updateErr) {
            console.error(`Failed to update stock for product ID ${item.id}:`, updateErr);
          }
        }

        alert(
          `Import Summary:\n` +
          `• Imported New Products: ${newProductsCount}\n` +
          `• Refilled Low Stock Products: ${refilledLowStockCount}\n` +
          `• Skipped Healthy Products: ${skippedHealthyCount}\n` +
          (skippedCategoryCount > 0 ? `• Skipped Missing Categories: ${skippedCategoryCount}` : "")
        );

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
      await fetchLiveProducts();
    } catch (err) {
      console.error("Delete sequence failed:", err);
    }
  };

  const filtered = productList.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategoryId === "All" || p.category_id === activeCategoryId; 
    return matchSearch && matchCat;
  });

  if (loading && productList.length === 0) {
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
            onClick={() => setShowImportOptionsModal(true)}
            className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4" /> Import
          </button>
          <button
            type="button"
            onClick={() => onNavigate("add-product")}
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
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-9 h-9 rounded-lg object-cover border border-border"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const next = e.currentTarget.nextElementSibling as HTMLElement;
                              if (next) next.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div 
                          className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0"
                          style={{ display: p.image_url ? "none" : "flex" }}
                        >
                          {getCategoryIcon(categoryLabel)}
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
                          onClick={() => onNavigate("add-product", { product: p })}
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

      {showImportOptionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowImportOptionsModal(false)} />
          <div className="relative bg-card rounded-2xl border border-border w-full max-w-md p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">Import Products</h2>
              <p className="text-xs text-muted-foreground mt-1">Choose how you want to import products into your inventory.</p>
            </div>

            <div className="space-y-4">
              <div className="border border-border rounded-xl p-4 bg-[#ECFDF5]/30 border-[#A7F3D0] hover:bg-[#ECFDF5]/50 transition-colors flex flex-col justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center text-[#10B981] shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      Smart Import <span className="text-[10px] bg-[#10B981] text-white px-1.5 py-0.5 rounded-full font-medium">Recommended</span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload purchase invoices, bills, or receipts. The system will extract products automatically using OCR.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowImportOptionsModal(false);
                    onNavigate("smart-import");
                  }}
                  className="mt-4 w-full h-9 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold transition-colors"
                >
                  Continue with Smart Import
                </button>
              </div>

              <div className="border border-border rounded-xl p-4 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">CSV Import</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Import products using a standard CSV spreadsheet format.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowImportOptionsModal(false);
                    setShowImportModal(true);
                  }}
                  className="mt-4 w-full h-9 rounded-lg border border-border hover:bg-muted text-foreground text-xs font-semibold transition-colors"
                >
                  Continue with CSV Import
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowImportOptionsModal(false)}
              className="w-full h-9 rounded-lg border border-border text-sm text-muted-foreground font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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