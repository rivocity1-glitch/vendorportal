import React, { useState, useRef, useMemo, useEffect } from "react";
import { ArrowLeft, Upload, Loader2, Save } from "lucide-react";
import { runImportPipeline } from "../../../smart-imports/pipeline";
import { ReviewItem, ImportSummary } from "../../../smart-imports/types";
import { supabase } from "../../../lib/supabase";

interface SmartImportProps {
  onNavigate: (page: string) => void;
}

interface DatabaseCategory {
  id: string;
  name: string;
}

const normalizeText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
};

const normalizeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const sameValue = (a: unknown, b: unknown): boolean => {
  const aNumber = normalizeNumber(a);
  const bNumber = normalizeNumber(b);

  if (aNumber !== null || bNumber !== null) {
    return aNumber === bNumber;
  }

  return normalizeText(a) === normalizeText(b);
};

const sameDate = (a: unknown, b: unknown): boolean => {
  const left = normalizeText(a);
  const right = normalizeText(b);

  if (!left || !right) return left === right;

  return left.slice(0, 10) === right.slice(0, 10);
};

export default function SmartImport({ onNavigate }: SmartImportProps) {
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [categories, setCategories] = useState<DatabaseCategory[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  const handleTopScroll = () => {
    if (bottomScrollRef.current && topScrollRef.current) {
      bottomScrollRef.current.scrollLeft =
        topScrollRef.current.scrollLeft;
    }
  };

  const handleBottomScroll = () => {
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft =
        bottomScrollRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data, error: sbError } = await supabase
          .from("product_categories")
          .select("id, name")
          .order("name");

        if (sbError) throw sbError;

        if (data) setCategories(data);
      } catch (err: any) {
        console.error(
          "Failed to load inventory product categories:",
          err?.message
        );
      }
    }

    fetchCategories();
  }, []);

  const validateSelectedFile = (selectedFile: File) => {
    const fileName = selectedFile.name.toLowerCase();

    const supported = [
      ".pdf",
      ".csv",
      ".jpg",
      ".jpeg",
      ".png",
      ".webp"
    ].some(ext => fileName.endsWith(ext));

    if (!supported) {
      setError(
        "Unsupported file format. Please upload a PDF, CSV, JPG, JPEG, PNG or WEBP invoice."
      );
      return false;
    }

    setError(null);
    return true;
  };

  const handleFileSubmit = async (file: File) => {
    if (!validateSelectedFile(file)) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await runImportPipeline(file);

      setItems(result.items);
      setSummary(result.summary);
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to process the invoice document."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      e.type === "dragenter" ||
      e.type === "dragover"
    ) {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      handleFileSubmit(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files?.[0]) {
      handleFileSubmit(e.target.files[0]);
    }
  };

  const updateItemField = (
    id: string,
    field: keyof ReviewItem,
    value: any
  ) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    setItems(prev =>
      prev.map(item => ({
        ...item,
        selected: checked
      }))
    );
  };

  const handleCancel = () => {
    setItems([]);
    setSummary(null);
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /*
   * ---------------------------------------------------------
   * BUILD THE VENDOR PRODUCT PAYLOAD
   * ---------------------------------------------------------
   *
   * This is deliberately vendor-specific.
   *
   * Re-importing the same supplier CSV must NEVER create a
   * duplicate when the product already exists for this vendor.
   */
  const buildProductPayload = (
    item: ReviewItem,
    vendorId: string
  ) => {
    const price =
      item.sellingPrice != null &&
      Number(item.sellingPrice) > 0
        ? Number(item.sellingPrice)
        : item.mrp != null &&
            Number(item.mrp) > 0
          ? Number(item.mrp)
          : item.costPrice != null &&
              Number(item.costPrice) > 0
            ? Number(item.costPrice)
            : null;

    return {
      vendor_id: vendorId,

      name: item.name?.trim() || "",

      description: "",

      category_id: item.category || null,

      subcategory:
        item.subcategory ?? null,

      price,

      cost_price:
        item.costPrice ?? null,

      mrp:
        item.mrp ?? null,

      stock:
        item.stock ?? 0,

      low_stock_threshold:
        item.lowStockThreshold ?? 5,

      status: "active",

      barcode:
        item.barcode ?? null,

      sku:
        item.sku ?? null,

      manufacturer:
        item.manufacturer ?? null,

      batch_number:
        item.batch ?? null,

      expiry_date:
        item.expiry ?? null,

      manufacturing_date:
        item.manufacturingDate ??
        item.mfgDate ??
        null,

      weight:
        item.weight ?? null,

      unit:
        item.unit ?? null,

      purchase_rate:
        item.purchaseRate ??
        item.costPrice ??
        null,

      selling_rate:
        item.sellingPrice ??
        null,

      ptr:
        item.ptr ?? null,

      pts:
        item.pts ?? null,

      scheme:
        item.scheme ?? null,

      scheme_discount:
        item.schemeDiscount ??
        null,

      net_rate:
        item.netRate ??
        null,

      hsn_code:
        item.hsn ??
        item.hsnCode ??
        null,

      gst_rate:
        item.gst ??
        item.gstRate ??
        item.gstPercent ??
        null,

      gst_slab:
        item.gstSlab ??
        null,

      cgst:
        item.cgst ??
        null,

      sgst:
        item.sgst ??
        null,

      igst:
        item.igst ??
        null,

      invoice_raw:
        item.rawText ??
        item.invoiceRaw ??
        null
    };
  };

  /*
   * ---------------------------------------------------------
   * FIND EXISTING PRODUCT
   * ---------------------------------------------------------
   *
   * Priority:
   * 1. Exact vendor + barcode
   * 2. Exact vendor + SKU
   * 3. Exact vendor + normalized name
   *
   * This means a changed quantity/price/etc. updates the
   * existing vendor product instead of inserting a duplicate.
   */
  const findExistingProduct = async (
    vendorId: string,
    item: ReviewItem
  ) => {
    const name = item.name?.trim() || "";
    const barcode = item.barcode?.trim() || "";
    const sku = item.sku?.trim() || "";

    if (barcode) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("vendor_id", vendorId)
        .eq("barcode", barcode)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) return data;
    }

    if (sku) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("vendor_id", vendorId)
        .eq("sku", sku)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) return data;
    }

    if (name) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("vendor_id", vendorId)
        .ilike("name", name)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) return data;
    }

    return null;
  };

  /*
   * ---------------------------------------------------------
   * DETECT ACTUAL CHANGES
   * ---------------------------------------------------------
   *
   * If the CSV contains exactly the same values already stored
   * for this vendor product, nothing is written.
   *
   * If ANY tracked value changed, the existing row is updated.
   *
   * Example:
   *
   * CSV #1: Tata Tea / stock 45 / price 285
   * CSV #2: Tata Tea / stock 50 / price 285
   *
   * Result:
   *   existing product is UPDATED to stock 50.
   *
   * CSV #3 is identical to #2:
   *   SKIPPED.
   */
  const getChangedFields = (
    existingProduct: any,
    nextProduct: any
  ) => {
    const changes: Record<string, any> = {};

    const numericFields = [
      "price",
      "cost_price",
      "mrp",
      "stock",
      "low_stock_threshold",
      "purchase_rate",
      "selling_rate",
      "ptr",
      "pts",
      "scheme_discount",
      "net_rate",
      "gst_rate",
      "cgst",
      "sgst",
      "igst"
    ];

    const textFields = [
      "name",
      "description",
      "category_id",
      "subcategory",
      "status",
      "barcode",
      "sku",
      "manufacturer",
      "batch_number",
      "weight",
      "unit",
      "hsn_code",
      "gst_slab",
      "invoice_raw"
    ];

    const dateFields = [
      "expiry_date",
      "manufacturing_date"
    ];

    for (const field of numericFields) {
      if (
        !sameValue(
          existingProduct?.[field],
          nextProduct?.[field]
        )
      ) {
        changes[field] = nextProduct[field];
      }
    }

    for (const field of textFields) {
      if (
        !sameValue(
          existingProduct?.[field],
          nextProduct?.[field]
        )
      ) {
        changes[field] = nextProduct[field];
      }
    }

    for (const field of dateFields) {
      if (
        !sameDate(
          existingProduct?.[field],
          nextProduct?.[field]
        )
      ) {
        changes[field] = nextProduct[field];
      }
    }

    return changes;
  };

  const handleImportSelected = async () => {
    const selectedItems =
      items.filter(item => item.selected);

    if (selectedItems.length === 0) {
      return;
    }

    setIsLoading(true);
    setError(null);

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    try {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          "Authentication failed: No active profile session detected."
        );
      }

      const {
        data: vendor,
        error: vendorError
      } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (vendorError || !vendor) {
        throw new Error(
          "Failed to map inventory profile: Vendor catalog entry not found."
        );
      }

      for (const item of selectedItems) {
        if (!item.name?.trim()) {
          failedCount++;
          continue;
        }

        try {
          const existingProduct =
            await findExistingProduct(
              vendor.id,
              item
            );

          const nextProduct =
            buildProductPayload(
              item,
              vendor.id
            );

          /*
           * -----------------------------------------------------
           * NEW PRODUCT
           * -----------------------------------------------------
           */
          if (!existingProduct) {
            const {
              data: insertedProduct,
              error: insertError
            } = await supabase
              .from("products")
              .insert(nextProduct)
              .select("id")
              .single();

            if (insertError) {
              throw insertError;
            }

            if (!insertedProduct?.id) {
              throw new Error(
                `Product "${item.name}" was inserted but its ID was not returned.`
              );
            }

            addedCount++;
            continue;
          }

          /*
           * -----------------------------------------------------
           * EXISTING PRODUCT
           * -----------------------------------------------------
           *
           * Compare the incoming CSV values with the actual
           * vendor product.
           */
          const changes =
            getChangedFields(
              existingProduct,
              nextProduct
            );

          if (
            Object.keys(changes).length === 0
          ) {
            skippedCount++;
            continue;
          }

          /*
           * Never overwrite vendor_id.
           * Never overwrite universal_product_id.
           *
           * Universal matching belongs to the existing product
           * architecture and is intentionally untouched here.
           */
          delete changes.vendor_id;

          const {
            error: updateError
          } = await supabase
            .from("products")
            .update({
              ...changes,
              updated_at:
                new Date().toISOString()
            })
            .eq(
              "id",
              existingProduct.id
            )
            .eq(
              "vendor_id",
              vendor.id
            );

          if (updateError) {
            throw updateError;
          }

          updatedCount++;
        } catch (itemErr) {
          failedCount++;

          console.error(
            "Failed to synchronize product:",
            item.name,
            itemErr
          );
        }
      }

      alert(
        `Import complete:\n` +
        `- Added ${addedCount} new products\n` +
        `- Updated ${updatedCount} existing products\n` +
        `- Skipped ${skippedCount} unchanged products\n` +
        `- Failed ${failedCount} products`
      );

      handleCancel();
      onNavigate("products");
    } catch (err: any) {
      setError(
        err?.message ||
          "An error occurred while importing products."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const liveSummary = useMemo(
    () => ({
      total: items.length,

      newProducts:
        items.filter(
          i => i.status === "New"
        ).length,

      existingProducts:
        items.filter(
          i => i.status === "Match Found"
        ).length,

      needsReview:
        items.filter(
          i => i.status === "Needs Review"
        ).length
    }),
    [items]
  );

  const statusStyles: Record<string, string> = {
    "Match Found":
      "bg-[#D1FAE5] text-[#065F46]",

    New:
      "bg-[#EFF6FF] text-[#1D4ED8]",

    "Needs Review":
      "bg-[#FEE2E2] text-[#991B1B]"
  };

  const inputClass =
    "w-32 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]";

  const categoryName = (id: string | null) =>
    categories.find(
      category => category.id === id
    )?.name || id || "";

  return (
    <div className="w-full px-[24px] py-6 bg-background text-foreground min-h-screen space-y-6">

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() =>
            onNavigate("products")
          }
          className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div>
          <h2 className="text-xl font-bold text-foreground">
            Smart Product Import
          </h2>

          <p className="text-xs text-muted-foreground">
            Upload supplier invoices or CSVs to automatically add products.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#FEE2E2] text-[#991B1B] rounded-xl text-sm font-medium border border-[#FEE2E2]">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center p-12 bg-card border border-border rounded-xl shadow-sm text-xs text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#10B981]" />
          <span>
            Synchronizing catalog changes...
          </span>
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="max-w-xl mx-auto">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() =>
              fileInputRef.current?.click()
            }
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 min-h-[260px] ${
              dragActive
                ? "border-[#10B981] bg-[#10B981]/5"
                : "border-border hover:border-[#10B981] bg-card shadow-sm"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,.csv,text/csv,application/csv,application/vnd.ms-excel"
              onChange={handleFileChange}
              className="hidden"
            />

            <Upload className="w-8 h-8 text-muted-foreground" />

            <div>
              <p className="text-sm font-medium text-foreground">
                Drag and drop your invoice or CSV here, or click to browse
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                Supports PDF, CSV, JPG, JPEG, PNG, WEBP
              </p>
            </div>

            <button
              type="button"
              className="mt-2 h-9 px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold transition-colors"
            >
              Choose File
            </button>
          </div>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="space-y-6 w-full">

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Products Found
              </div>

              <div className="text-2xl font-bold text-foreground mt-1">
                {liveSummary.total}
              </div>
            </div>

            <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-[#1D4ED8]">
                New Products
              </div>

              <div className="text-2xl font-bold text-[#1D4ED8] mt-1">
                {liveSummary.newProducts}
              </div>
            </div>

            <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-[#065F46]">
                Existing Products
              </div>

              <div className="text-2xl font-bold text-[#065F46] mt-1">
                {liveSummary.existingProducts}
              </div>
            </div>

            <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-[#991B1B]">
                Needs Review
              </div>

              <div className="text-2xl font-bold text-[#991B1B] mt-1">
                {liveSummary.needsReview}
              </div>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">

            <p className="text-xs text-muted-foreground">
              Verify values extracted from the document layout before completing your catalog synchronization.
            </p>

            <div className="flex gap-2">

              <button
                type="button"
                onClick={handleCancel}
                className="h-9 px-4 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground font-medium"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleImportSelected}
                disabled={
                  items.filter(
                    i => i.selected
                  ).length === 0
                }
                className="h-9 px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Import Selected (
                {items.filter(
                  i => i.selected
                ).length}
                )
              </button>

            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm w-full">

            <div
              ref={topScrollRef}
              onScroll={handleTopScroll}
              className="overflow-x-auto overflow-y-hidden border-b border-border bg-muted/20"
              style={{
                height: "14px"
              }}
            >
              <div
                style={{
                  width: "3100px",
                  height: "1px"
                }}
              />
            </div>

            <div
              ref={bottomScrollRef}
              onScroll={handleBottomScroll}
              className="overflow-x-auto w-full relative"
            >
              <table className="w-full whitespace-nowrap border-collapse">

                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">

                    <th className="px-4 py-3 text-left w-12 sticky left-0 z-30 bg-card border-r border-border">
                      <input
                        type="checkbox"
                        checked={
                          items.length > 0 &&
                          items.every(
                            i => i.selected
                          )
                        }
                        onChange={e =>
                          toggleSelectAll(
                            e.target.checked
                          )
                        }
                        className="rounded border-border text-[#10B981]"
                      />
                    </th>

                    <th className="px-4 py-3 text-left sticky left-[48px] z-30 bg-card border-r border-border min-w-[200px]">
                      Product
                    </th>

                    <th className="px-4 py-3 text-left sticky left-[248px] z-30 bg-card border-r-2 border-border/80 min-w-[170px]">
                      Category
                    </th>

                    {[
                      ["Stock", "stock"],
                      ["Packing", "packSize"],
                      ["HSN Code", "hsnCode"],
                      ["GST %", "gstPercent"],
                      ["GST Slab", "gstSlab"],
                      ["CGST", "cgst"],
                      ["SGST", "sgst"],
                      ["IGST", "igst"],
                      ["Batch No", "batch"],
                      ["Expiry Date", "expiry"],
                      ["Manufacturing Date", "manufacturingDate"],
                      ["Manufacturer", "manufacturer"],
                      ["Barcode", "barcode"],
                      ["SKU", "sku"],
                      ["Weight", "weight"],
                      ["Subcategory", "subcategory"],
                      ["Purchase Rate", "purchaseRate"],
                      ["Selling Price", "sellingPrice"],
                      ["MRP", "mrp"]
                    ].map(([label]) => (
                      <th
                        key={label}
                        className="px-4 py-3 text-left min-w-[120px]"
                      >
                        {label}
                      </th>
                    ))}

                    <th className="px-4 py-3 text-left min-w-[120px]">
                      Status
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {items.map(item => (
                    <tr
                      key={item.id}
                      className="border-b border-border last:border-b-0 hover:bg-muted/20"
                    >

                      <td className="px-4 py-2 sticky left-0 z-20 bg-card border-r border-border">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={e =>
                            updateItemField(
                              item.id,
                              "selected",
                              e.target.checked
                            )
                          }
                          className="rounded border-border text-[#10B981]"
                        />
                      </td>

                      <td className="px-4 py-2 sticky left-[48px] z-20 bg-card border-r border-border">
                        <input
                          value={item.name || ""}
                          onChange={e =>
                            updateItemField(
                              item.id,
                              "name",
                              e.target.value
                            )
                          }
                          className={`w-48 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]`}
                        />
                      </td>

                      <td className="px-4 py-2 sticky left-[248px] z-20 bg-card border-r-2 border-border/80">
                        <select
                          value={item.category || ""}
                          onChange={e =>
                            updateItemField(
                              item.id,
                              "category",
                              e.target.value
                            )
                          }
                          className="w-40 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        >
                          <option value="">
                            Select
                          </option>

                          {categories.map(
                            category => (
                              <option
                                key={category.id}
                                value={category.id}
                              >
                                {category.name}
                              </option>
                            )
                          )}
                        </select>
                      </td>

                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.stock ?? ""}
                          onChange={e =>
                            updateItemField(
                              item.id,
                              "stock",
                              e.target.value === ""
                                ? null
                                : Number(
                                    e.target.value
                                  )
                            )
                          }
                          className={inputClass}
                        />
                      </td>

                      <td className="px-4 py-2">
                        <input
                          value={item.packSize || ""}
                          onChange={e =>
                            updateItemField(
                              item.id,
                              "packSize",
                              e.target.value
                            )
                          }
                          className={inputClass}
                        />
                      </td>

                      <td className="px-4 py-2">
                        <input
                          value={
                            item.hsnCode ||
                            item.hsn ||
                            ""
                          }
                          onChange={e =>
                            updateItemField(
                              item.id,
                              "hsnCode",
                              e.target.value
                            )
                          }
                          className={inputClass}
                        />
                      </td>

                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={
                            item.gstPercent ??
                            item.gst ??
                            ""
                          }
                          onChange={e =>
                            updateItemField(
                              item.id,
                              "gstPercent",
                              e.target.value === ""
                                ? null
                                : Number(
                                    e.target.value
                                  )
                            )
                          }
                          className={inputClass}
                        />
                      </td>

                      {[
                        ["gstSlab", item.gstSlab],
                        ["cgst", item.cgst],
                        ["sgst", item.sgst],
                        ["igst", item.igst],
                        ["batch", item.batch],
                        ["expiry", item.expiry],
                        [
                          "manufacturingDate",
                          item.manufacturingDate
                        ],
                        [
                          "manufacturer",
                          item.manufacturer
                        ],
                        ["barcode", item.barcode],
                        ["sku", item.sku],
                        ["weight", item.weight],
                        ["subcategory", item.subcategory],
                        ["purchaseRate", item.purchaseRate],
                        ["sellingPrice", item.sellingPrice],
                        ["mrp", item.mrp]
                      ].map(([field, value]) => (
                        <td
                          key={field}
                          className="px-4 py-2"
                        >
                          <input
                            type={
                              [
                                "cgst",
                                "sgst",
                                "igst",
                                "purchaseRate",
                                "sellingPrice",
                                "mrp"
                              ].includes(field)
                                ? "number"
                                : "text"
                            }
                            value={
                              value ??
                              ""
                            }
                            onChange={e =>
                              updateItemField(
                                item.id,
                                field as keyof ReviewItem,
                                [
                                  "cgst",
                                  "sgst",
                                  "igst",
                                  "purchaseRate",
                                  "sellingPrice",
                                  "mrp"
                                ].includes(field)
                                  ? e.target.value === ""
                                    ? null
                                    : Number(
                                        e.target.value
                                      )
                                  : e.target.value
                              )
                            }
                            className={inputClass}
                          />
                        </td>
                      ))}

                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            statusStyles[
                              item.status
                            ] ||
                            "bg-muted text-muted-foreground"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
