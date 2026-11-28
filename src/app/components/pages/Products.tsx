import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Upload,
  Edit2,
  Trash2,
  MoreVertical,
  Loader2,
  Calendar,
  FileText,
  ShoppingBasket,
  Pill,
  Milk,
  CupSoda,
  Croissant,
  Apple,
  Beef,
  Fish,
  Laptop,
  NotebookPen,
  Package,
  Sparkles
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface StoreCategory {
  id: string;
  name: string;
}

function getProductImageUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && /^https?:\/\//i.test(item.trim())).map(item => item.trim());
  }
  if (typeof value !== "string" || !value.trim()) return [];
  const raw = value.trim();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && /^https?:\/\//i.test(item.trim())).map(item => item.trim());
    }
    if (typeof parsed === "string" && /^https?:\/\//i.test(parsed.trim())) return [parsed.trim()];
  } catch {
    // A normal URL is stored as a plain string.
  }
  return /^https?:\/\//i.test(raw) ? [raw] : [];
}

function getPrimaryProductImage(value: unknown): string | null {
  return getProductImageUrls(value)[0] || null;
}

const statusStyles: Record<string, string> = {
  Active: "bg-[#D1FAE5] text-[#065F46]",
  "Low Stock": "bg-[#FEF3C7] text-[#92400E]",
  "Out of Stock": "bg-[#FEE2E2] text-[#991B1B]",
  Draft: "bg-muted text-muted-foreground",
};

export function Products({
  onNavigate,
}: {
  onNavigate: (page: string, params?: any) => void;
}) {
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState("All");
  const [productList, setProductList] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const [openMenu, setOpenMenu] = useState<any | null>(null);

  const [showImportOptionsModal, setShowImportOptionsModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<StoreCategory[]>([]);

  /*
   * IMPORTANT:
   * Categories are NOT hard-coded here.
   *
   * product_categories is the single source of truth.
   *
   * products.category_id -> product_categories.id
   */

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case "Grocery":
        return (
          <ShoppingBasket className="w-4 h-4 text-muted-foreground" />
        );

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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  };

  /*
   * Fetch categories and products from Supabase.
   *
   * Categories come directly from product_categories.
   * No hard-coded category IDs or names are used for data storage.
   */
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
        console.error("Vendor lookup failed:", vendorErr);
        setLoading(false);
        return;
      }

      /*
       * Canonical category source.
       *
       * display_order is used so every section of the portal
       * receives categories in the same database-defined order.
       */
      const { data: catsData, error: catErr } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("status", "active")
        .order("display_order", { ascending: true });

      if (catErr) {
        console.error("Failed to load product categories:", catErr);
      } else if (catsData) {
        setCategories(
          catsData.map((category) => ({
            id: category.id,
            name: category.name.trim(),
          }))
        );
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        // The vendor listing owns its own image. If it has no image, fall back
        // to the linked shared catalogue gallery, then universal_products.image_url.
        const rows = data as any[];
        const missingImageRows = rows.filter(row => getProductImageUrls(row.image_url).length === 0);
        const universalIds = Array.from(new Set(
          missingImageRows
            .map(row => row.universal_product_id)
            .filter((id): id is string => typeof id === "string" && !!id)
        ));
        const sharedImagesByMaster = new Map<string, string[]>();
        const canonicalImagesByMaster = new Map<string, string[]>();

        if (universalIds.length > 0) {
          const [galleryResult, masterResult] = await Promise.all([
            supabase
              .from("universal_product_images")
              .select("universal_product_id, image_url, is_primary, created_at")
              .in("universal_product_id", universalIds)
              .order("is_primary", { ascending: false })
              .order("created_at", { ascending: true }),
            supabase
              .from("universal_products")
              .select("id, image_url")
              .in("id", universalIds)
          ]);

          if (galleryResult.error) {
            console.warn("Shared catalogue product images could not be loaded:", galleryResult.error.message);
          } else {
            (galleryResult.data || []).forEach((imageRow: any) => {
              const current = sharedImagesByMaster.get(imageRow.universal_product_id) || [];
              getProductImageUrls(imageRow.image_url).forEach(url => {
                if (!current.includes(url) && current.length < 5) current.push(url);
              });
              sharedImagesByMaster.set(imageRow.universal_product_id, current);
            });
          }

          if (masterResult.error) {
            console.warn("Canonical product images could not be loaded:", masterResult.error.message);
          } else {
            (masterResult.data || []).forEach((master: any) => {
              canonicalImagesByMaster.set(master.id, getProductImageUrls(master.image_url));
            });
          }
        }

        const mapped = rows.map((p: any) => {
          const vendorImages = getProductImageUrls(p.image_url);
          const sharedImages = p.universal_product_id
            ? sharedImagesByMaster.get(p.universal_product_id) || []
            : [];
          const canonicalImages = p.universal_product_id
            ? canonicalImagesByMaster.get(p.universal_product_id) || []
            : [];
          const resolvedImageUrls = vendorImages.length
            ? vendorImages
            : sharedImages.length
              ? sharedImages
              : canonicalImages;
          const resolvedImageUrl = resolvedImageUrls.length ? JSON.stringify(resolvedImageUrls.slice(0, 5)) : p.image_url;
          const currentStock = Number(p.stock ?? 0);

          let evaluatedStatus = "Active";

          if (currentStock === 0) {
            evaluatedStatus = "Out of Stock";
          } else if (
            currentStock <= Number(p.low_stock_threshold ?? 5)
          ) {
            evaluatedStatus = "Low Stock";
          }

          const itemGst = parseFloat(p.gst_slab) || 0;
          const itemPrice = parseFloat(p.price) || 0;

          const calculatedRate =
            itemPrice / (1 + itemGst / 100);

          return {
            id: p.id,
            name: p.name || "Unnamed Product",
            brand: p.brand || "",
            manufacturer: p.manufacturer || "",
            variant: p.variant || p.pack_size || p.packaging || "",
            universal_product_id: p.universal_product_id || null,

            /*
             * Keep the actual database category UUID.
             */
            category_id: p.category_id || "",

            mrp: Number(p.mrp || 0),
            price: Number(p.price || 0),
            rate: calculatedRate,

            stock: currentStock,

            status: p.status || evaluatedStatus,

            expiry_date: p.expiry_date || null,

            img: (p.name || "PR")
              .slice(0, 2)
              .toUpperCase(),

            image_url: resolvedImageUrl,

            cost_price: p.cost_price,
            gst_slab: p.gst_slab,
            batch_number: p.batch_number,
            weight: p.weight,
            is_exclusive: p.is_exclusive === true,
            allow_loose_quantity: p.allow_loose_quantity === true,
            loose_min_quantity: p.loose_min_quantity,
            loose_max_quantity: p.loose_max_quantity,
            loose_step_quantity: p.loose_step_quantity,
            loose_unit: p.loose_unit,
            description: p.description,

            low_stock_threshold:
              p.low_stock_threshold ?? 5,

            sku: p.sku || "",
            barcode: p.barcode || "",
          };
        });

        setProductList(mapped);
      setSelectedIds((current) => current.filter((id) => mapped.some((p) => p.id === id)));
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

  /*
   * Normalize a CSV category name for matching only.
   *
   * IMPORTANT:
   * This does NOT convert one category into another.
   *
   * Example:
   * "Beverages" -> "beverages"
   * " beverages " -> "beverages"
   *
   * It will NOT do:
   * "beverages" -> "Grocery"
   */
  const normalizeCategoryName = (value: string) => {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  };

  /*
   * Find the canonical category from product_categories.
   */
  const findCategoryIdByName = (categoryName: string) => {
    const normalizedName = normalizeCategoryName(categoryName);

    if (!normalizedName) {
      return undefined;
    }

    const matchedCategory = categories.find(
      (category) =>
        normalizeCategoryName(category.name) === normalizedName
    );

    return matchedCategory?.id;
  };

  const handleDelete = async (id: string) => {
    const confirmation = window.confirm(
      "Are you sure you want to permanently delete this product listing?"
    );
    if (!confirmation) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      setOpenMenu(null);
      setSelectedIds((current) => current.filter((selectedId) => selectedId !== id));
      await fetchLiveProducts();
    } catch (err) {
      console.error("Delete sequence failed:", err);
      window.alert(err instanceof Error ? err.message : "Could not delete product.");
    }
  };

  const handleBulkDelete = async () => {
    const ids = selectedIds.filter((id) => productList.some((product) => product.id === id));
    if (ids.length === 0 || isBulkDeleting) return;
    const confirmation = window.confirm(
      `Permanently delete ${ids.length} selected product listing(s)? This cannot be undone.`
    );
    if (!confirmation) return;
    setIsBulkDeleting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Your vendor session could not be verified.");
      const { data: vendor, error: vendorError } = await supabase
        .from("vendors").select("id").eq("auth_user_id", authData.user.id).single();
      if (vendorError || !vendor) throw new Error("Vendor profile could not be verified.");
      // Chunk requests to stay comfortably below PostgREST URL/filter limits.
      for (let offset = 0; offset < ids.length; offset += 100) {
        const chunk = ids.slice(offset, offset + 100);
        const { error } = await supabase.from("products").delete()
          .in("id", chunk).eq("vendor_id", vendor.id);
        if (error) throw error;
      }
      setSelectedIds([]);
      await fetchLiveProducts();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      window.alert(err instanceof Error ? err.message : "Could not delete selected products.");
      await fetchLiveProducts();
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const filtered = productList.filter((p) => {
    const query = search.trim().toLowerCase();
    const matchSearch = !query || [
      p.name || "",
      p.brand || "",
      p.manufacturer || "",
      p.sku || "",
      p.barcode || "",
      p.variant || ""
    ].some((value) => String(value).toLowerCase().includes(query));

    const matchCat =
      activeCategoryId === "All" ||
      p.category_id === activeCategoryId;

    return matchSearch && matchCat;
  });

  if (
    loading &&
    productList.length === 0
  ) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-xs text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#10B981]" />
        <span>
          Syncing catalog metrics...
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 bg-background text-foreground min-h-screen">
      {/* SEARCH + ACTIONS */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/10"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              if (isSelectingAll) return;
              setIsSelectingAll(true);
              try {
                const { data: authData, error: authError } = await supabase.auth.getUser();
                if (authError || !authData.user) throw new Error("Your vendor session could not be verified.");
                const { data: vendor, error: vendorError } = await supabase
                  .from("vendors").select("id").eq("auth_user_id", authData.user.id).single();
                if (vendorError || !vendor) throw new Error("Vendor profile could not be verified.");
                let allIds: string[] = [];
                let from = 0;
                const pageSize = 1000;
                while (true) {
                  const { data, error } = await supabase.from("products").select("id")
                    .eq("vendor_id", vendor.id).order("created_at", { ascending: false })
                    .range(from, from + pageSize - 1);
                  if (error) throw error;
                  const batch = (data || []).map((row) => row.id);
                  allIds = allIds.concat(batch);
                  if (batch.length < pageSize) break;
                  from += pageSize;
                }
                setSelectedIds(allIds);
              } catch (err) {
                window.alert(err instanceof Error ? err.message : "Could not select all vendor products.");
              } finally {
                setIsSelectingAll(false);
              }
            }}
            disabled={isSelectingAll || productList.length === 0}
            className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {isSelectingAll ? "Selecting…" : "Select All"}
          </button>
          <button
            type="button"
            onClick={() =>
              setShowImportOptionsModal(true)
            }
            className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>

          <button
            type="button"
            onClick={() =>
              onNavigate("add-product")
            }
            className="h-9 px-3 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* CATEGORY FILTERS */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button
          type="button"
          onClick={() =>
            setActiveCategoryId("All")
          }
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
            activeCategoryId === "All"
              ? "bg-[#10B981] text-white"
              : "bg-card border border-border text-muted-foreground"
          }`}
        >
          All
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() =>
              setActiveCategoryId(cat.id)
            }
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              activeCategoryId === cat.id
                ? "bg-[#10B981] text-white"
                : "bg-card border border-border text-muted-foreground"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* BULK SELECTION ACTIONS */}
      {selectedIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="text-sm font-semibold text-emerald-900">{selectedIds.length} product(s) selected</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSelectedIds([])} className="h-8 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-semibold text-emerald-800">Clear selection</button>
            <button type="button" onClick={handleBulkDelete} disabled={isBulkDeleting} className="h-8 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white disabled:opacity-50">
              {isBulkDeleting ? "Deleting…" : `Delete selected (${selectedIds.length})`}
            </button>
          </div>
        </div>
      )}

      {/* PRODUCT TABLE */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-3 w-10">
                  <input type="checkbox" aria-label="Select all filtered products"
                    checked={filtered.length > 0 && filtered.every((p) => selectedIds.includes(p.id))}
                    onChange={(event) => setSelectedIds(event.target.checked ? filtered.map((p) => p.id) : [])}
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Product
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Brand
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Variant / Pack
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  SKU
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Barcode
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Manufacturer
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Rate (Excl. Tax)
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  MRP
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Stock
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Expiry Date
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Status
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const categoryLabel =
                  categories.find(
                    (c) =>
                      c.id ===
                      p.category_id
                  )?.name || "Other";

                const productImageUrl = getPrimaryProductImage(p.image_url);

                const expiryLabel =
                  p.expiry_date
                    ? new Date(
                        p.expiry_date
                      ).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }
                      )
                    : "—";

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-muted/20 transition-colors group"
                  >
                    <td className="px-3 py-3">
                      <input type="checkbox" aria-label={`Select ${p.name}`}
                        checked={selectedIds.includes(p.id)}
                        onChange={(event) => setSelectedIds((current) => event.target.checked
                          ? [...current, p.id]
                          : current.filter((id) => id !== p.id))}
                      />
                    </td>
                    {/* PRODUCT */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {productImageUrl ? (
                          <img
                            src={productImageUrl || undefined}
                            alt={p.name}
                            className="w-9 h-9 rounded-lg object-cover border border-border"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display =
                                "none";

                              const next =
                                e.currentTarget
                                  .nextElementSibling as HTMLElement;

                              if (next) {
                                next.style.display =
                                  "flex";
                              }
                            }}
                          />
                        ) : null}

                        <div
                          className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0"
                          style={{
                            display: productImageUrl
                              ? "none"
                              : "flex",
                          }}
                        >
                          {getCategoryIcon(
                            categoryLabel
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{p.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {p.is_exclusive && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#0D0D0D] text-[#A8E63A] font-bold">RIVO EXCLUSIVE</span>}
                            {p.allow_loose_quantity && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">LOOSE {p.loose_unit || ""}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* BRAND */}
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {p.brand || "—"}
                    </td>

                    {/* CATEGORY */}
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#EFF6FF] text-[#1D4ED8]">
                        {categoryLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.variant || "—"}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{p.sku || "—"}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{p.barcode || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.manufacturer || "—"}</td>

                    {/* RATE */}
                    <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                      ₹{p.rate.toFixed(2)}
                    </td>

                    {/* MRP */}
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      ₹
                      {p.mrp.toLocaleString(
                        "en-IN"
                      )}
                    </td>

                    {/* STOCK */}
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {p.stock}
                    </td>

                    {/* EXPIRY */}
                    <td className="px-4 py-3 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1">
                        {p.expiry_date && (
                          <Calendar className="w-3 h-3 text-red-400" />
                        )}

                        {expiryLabel}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          statusStyles[
                            p.status
                          ] ||
                          "bg-muted text-foreground"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            onNavigate("add-product", {
                              product: p,
                              navigationProducts: filtered,
                              productIndex: filtered.findIndex((item) => item.id === p.id)
                            })
                          }
                          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-[#10B981] hover:bg-[#ECFDF5]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {categoryLabel.trim().toLowerCase() === "fashion" && (
                          <button type="button" onClick={() => onNavigate("product-variants", { product: p })} title="Manage fashion sizes, colours and variants" aria-label={`Manage fashion variants for ${p.name}`} className="h-7 px-2 rounded-md text-[10px] font-semibold border border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                            Variants
                          </button>
                        )}

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenu(
                                openMenu ===
                                  p.id
                                  ? null
                                  : p.id
                              )
                            }
                            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {openMenu ===
                            p.id && (
                            <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-lg shadow-lg z-10 py-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    p.id
                                  )
                                }
                                className="w-full text-left px-3 py-1.5 text-sm text-[#EF4444] hover:bg-[#FEF2F2] font-semibold flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
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
                  <td
                    colSpan={14}
                    className="px-4 py-12 text-center text-muted-foreground text-sm"
                  >
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* IMPORT OPTIONS MODAL */}
      {showImportOptionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() =>
              setShowImportOptionsModal(
                false
              )
            }
          />

          <div className="relative bg-card rounded-2xl border border-border w-full max-w-md p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Import Products
              </h2>

              <p className="text-xs text-muted-foreground mt-1">
                Choose how you want to import
                products into your inventory.
              </p>
            </div>

            <div className="space-y-4">
              {/* SMART IMPORT */}
              <div className="border border-border rounded-xl p-4 bg-[#ECFDF5]/30 border-[#A7F3D0] hover:bg-[#ECFDF5]/50 transition-colors flex flex-col justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center text-[#10B981] shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      Smart Import

                      <span className="text-[10px] bg-[#10B981] text-white px-1.5 py-0.5 rounded-full font-medium">
                        Recommended
                      </span>
                    </h3>

                    <p className="text-xs text-muted-foreground mt-1">
                      Upload purchase invoices,
                      bills, or receipts. The
                      system will extract products
                      automatically using OCR.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowImportOptionsModal(
                      false
                    );

                    onNavigate(
                      "smart-import"
                    );
                  }}
                  className="mt-4 w-full h-9 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold transition-colors"
                >
                  Continue with Smart Import
                </button>
              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowImportOptionsModal(
                  false
                )
              }
              className="w-full h-9 rounded-lg border border-border text-sm text-muted-foreground font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}