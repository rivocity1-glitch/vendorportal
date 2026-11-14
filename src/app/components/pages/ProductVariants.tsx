import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Loader2, Plus, RefreshCw, Trash2, Wand2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type Product = { id: string; name: string; category_id: string | null; price: number; mrp: number | null; stock: number; sku: string | null };
type GroupDraft = { key: string; name: string; displayType: "text" | "color" | "image" | "button" | "dropdown"; values: string };
type VariantDraft = { key: string; name: string; signature: string; optionIds: string[]; price: string; mrp: string; costPrice: string; stock: string; sku: string; barcode: string; enabled: boolean };

const uid = () => `draft-${Math.random().toString(36).slice(2, 10)}`;
const money = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

export function ProductVariants({ onNavigate, initialProduct }: { onNavigate: (page: string, params?: any) => void; initialProduct?: Product }) {
  const [vendorId, setVendorId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState(initialProduct?.id || "");
  const [groups, setGroups] = useState<GroupDraft[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{type:"info"|"error"|"success"; text:string}|null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const selectedProduct = products.find(p => p.id === productId) || initialProduct || null;

  const load = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Your vendor session could not be found.");
      const { data: vendor, error: vendorError } = await supabase.from("vendors").select("id").eq("auth_user_id", auth.user.id).maybeSingle();
      if (vendorError) throw vendorError;
      if (!vendor?.id) throw new Error("Vendor profile was not found.");
      setVendorId(vendor.id);
      const { data, error } = await supabase.from("products")
        .select("id,name,category_id,price,mrp,stock,sku")
        .eq("vendor_id", vendor.id).order("name");
      if (error) throw error;
      setProducts((data || []) as Product[]);
      if (!productId && data?.length) setProductId(initialProduct?.id || data[0].id);
    } catch (error: any) {
      setNotice({type:"error", text:error?.message || "Could not load your products."});
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const setGroup = (key: string, patch: Partial<GroupDraft>) => setGroups(current => current.map(g => g.key === key ? {...g, ...patch} : g));
  const addGroup = () => setGroups(current => [...current, {key:uid(), name:"", displayType:"button", values:""}]);
  const removeGroup = (key: string) => setGroups(current => current.filter(g => g.key !== key));

  const parsedGroups = useMemo(() => groups.map(group => ({
    ...group,
    valuesList: Array.from(new Set(group.values.split(",").map(v => v.trim()).filter(Boolean)))
  })), [groups]);

  const generateVariants = () => {
    setNotice(null);
    if (!productId) { setNotice({type:"error",text:"Select a product first."}); return; }
    if (parsedGroups.length === 0 || parsedGroups.some(g => !g.name.trim() || !g.valuesList.length)) {
      setNotice({type:"error",text:"Add at least one variation group, and give each group a name and comma-separated values."}); return;
    }
    const normalizedNames = parsedGroups.map(g => g.name.trim().toLowerCase());
    if (new Set(normalizedNames).size !== normalizedNames.length) {
      setNotice({type:"error",text:"Variation group names must be unique."}); return;
    }

    const optionSets = parsedGroups.map(g => g.valuesList.map(value => ({groupKey:g.key, groupName:g.name.trim(), value})));
    const combinations = optionSets.reduce<Array<Array<{groupKey:string;groupName:string;value:string}>>>(
      (acc, set) => acc.flatMap(prefix => set.map(option => [...prefix, option])),
      [[]]
    );
    const maxCombinations = 250;
    if (combinations.length > maxCombinations) {
      setNotice({type:"error",text:`This creates ${combinations.length} combinations. Reduce the options to ${maxCombinations} or fewer before generating.`}); return;
    }
    const selected = products.find(p => p.id === productId) || initialProduct;
    const drafts = combinations.map(combo => ({
      key: uid(),
      name: combo.map(option => option.value).join(" / "),
      signature: combo.map(option => `${option.groupKey}:${option.value.toLowerCase()}`).sort().join("|"),
      optionIds: combo.map(option => `${option.groupKey}=${option.value}`),
      price: String(money(selected?.price)),
      mrp: selected?.mrp == null ? "" : String(selected.mrp),
      costPrice: "",
      stock: "0",
      sku: "",
      barcode: "",
      enabled: true
    }));
    setVariants(drafts);
    setSavedCount(0);
  };

  const updateVariant = (key: string, patch: Partial<VariantDraft>) => setVariants(current => current.map(v => v.key === key ? {...v, ...patch} : v));

  const save = async () => {
    if (!productId || !vendorId || variants.length === 0) return;
    const enabled = variants.filter(v => v.enabled);
    if (!enabled.length) { setNotice({type:"error",text:"Enable at least one variant."}); return; }
    for (const variant of enabled) {
      const price = Number(variant.price), stock = Number(variant.stock);
      if (!variant.name.trim() || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
        setNotice({type:"error",text:"Check variant names, prices and stock. Stock must be a non-negative whole number."}); return;
      }
      if (variant.mrp && (!Number.isFinite(Number(variant.mrp)) || Number(variant.mrp) < 0)) {
        setNotice({type:"error",text:`Invalid MRP for ${variant.name}.`}); return;
      }
      if (variant.sku.trim() && enabled.filter(v => v.sku.trim().toLowerCase() === variant.sku.trim().toLowerCase()).length > 1) {
        setNotice({type:"error",text:`Duplicate SKU in the generated variants: ${variant.sku}.`}); return;
      }
      if (variant.barcode.trim() && enabled.filter(v => v.barcode.trim() === variant.barcode.trim()).length > 1) {
        setNotice({type:"error",text:`Duplicate barcode in the generated variants: ${variant.barcode}.`}); return;
      }
    }

    setSaving(true);
    setNotice(null);
    try {
      // Persist variation groups and options first, then their variant combinations.
      const groupRows = parsedGroups.map((g, index) => ({
        product_id: productId, name: g.name.trim(), display_name: g.name.trim(),
        display_type: g.displayType, is_required: true, is_active: true, display_order: index
      }));
      const { data: insertedGroups, error: groupError } = await supabase
        .from("product_variation_groups").insert(groupRows).select("id,name");
      if (groupError) throw groupError;
      if (!insertedGroups || insertedGroups.length !== parsedGroups.length) throw new Error("Variation groups were not all returned. Stop and refresh before retrying.");

      const groupIdByKey = new Map<string,string>();
      parsedGroups.forEach(g => {
        const saved = insertedGroups.find(row => row.name === g.name.trim());
        if (saved) groupIdByKey.set(g.key, saved.id);
      });

      const optionRows = parsedGroups.flatMap(g => g.valuesList.map((value, index) => ({
        variation_group_id: groupIdByKey.get(g.key), value, display_value:value, display_order:index
      })));
      const { data: insertedOptions, error: optionError } = await supabase
        .from("product_variation_options").insert(optionRows).select("id,variation_group_id,value");
      if (optionError) throw optionError;
      if (!insertedOptions || insertedOptions.length !== optionRows.length) throw new Error("Variation options were not all returned. Refresh before retrying.");

      const optionIdByKey = new Map<string,string>();
      for (const option of insertedOptions) optionIdByKey.set(`${option.variation_group_id}=${option.value}`, option.id);
      const chosen = enabled.map(v => ({
        draft:v,
        ids:v.optionIds.map(value => {
          const [groupKey, optionValue] = value.split("=");
          const groupId = groupIdByKey.get(groupKey);
          return groupId ? optionIdByKey.get(`${groupId}=${optionValue}`) : undefined;
        })
      }));
      if (chosen.some(item => item.ids.some(id => !id))) throw new Error("Could not resolve all variant options. No variants were saved.");

      const variantRows = chosen.map(({draft,ids}) => ({
        product_id:productId, name:draft.name, sku:draft.sku.trim() || null,
        barcode:draft.barcode.trim() || null, price:Number(draft.price),
        mrp:draft.mrp.trim() ? Number(draft.mrp) : null,
        cost_price:draft.costPrice.trim() ? Number(draft.costPrice) : null,
        stock:Number(draft.stock), status:Number(draft.stock) > 0 ? "active" : "out_of_stock",
        option_signature:ids.slice().sort().join("|")
      }));
      const { data: insertedVariants, error: variantError } = await supabase
        .from("product_variants").insert(variantRows).select("id,product_id,option_signature");
      if (variantError) throw variantError;
      if (!insertedVariants || insertedVariants.length !== chosen.length) throw new Error("Not all variants were saved.");

      const optionLinks = insertedVariants.flatMap(variant => {
        const source = chosen.find(item => item.ids.slice().sort().join("|") === variant.option_signature);
        return (source?.ids || []).map(optionId => {
          const option = insertedOptions.find(item => item.id === optionId);
          const group = parsedGroups.find(g => groupIdByKey.get(g.key) === option?.variation_group_id);
          return {
            variant_id:variant.id, product_id:productId,
            variation_group_id:option?.variation_group_id, option_id:optionId
          };
        });
      });
      const { error: linksError } = await supabase.from("product_variant_options").insert(optionLinks);
      if (linksError) throw linksError;

      setSavedCount(insertedVariants.length);
      setNotice({type:"success",text:`${insertedVariants.length} variants saved for this product.`});
    } catch (error: any) {
      setNotice({type:"error",text:error?.message || "Could not save variants. Check database access and try again."});
    } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2"/>Loading products…</div>;

  return <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-5">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onNavigate("products")} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted" aria-label="Back to products"><ArrowLeft className="w-4 h-4"/></button>
        <div><h1 className="text-xl font-bold text-foreground">Product variants</h1><p className="text-xs text-muted-foreground">Configure options, combinations, individual prices and stock.</p></div>
      </div>
      <button type="button" onClick={() => void load()} className="h-9 px-3 rounded-lg border border-border text-xs flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5"/>Refresh</button>
    </div>

    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Select existing product</label>
      <select value={productId} onChange={e => {setProductId(e.target.value);setGroups([]);setVariants([]);setSavedCount(0);setNotice(null);}} className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm">
        {products.length === 0 && <option value="">No products found</option>}
        {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
      </select>
      {selectedProduct && <p className="text-xs text-muted-foreground">Parent product price: ₹{money(selectedProduct.price).toFixed(2)} · Current parent stock: {money(selectedProduct.stock)}</p>}
      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">Variant setup is separate from your existing simple-product stock. Creating variants does not change the parent product's price or stock. Do not publish variant purchases until checkout and stock deduction are connected.</p>
    </div>

    <section className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="font-semibold text-sm">Variation groups</h2><p className="text-xs text-muted-foreground mt-1">Examples: Size = S, M, L; Colour = Black, White.</p></div><button type="button" onClick={addGroup} className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2"><Plus className="w-4 h-4"/>Add group</button></div>
      {groups.length === 0 && <div className="border border-dashed border-border rounded-lg p-6 text-center text-xs text-muted-foreground">No variation groups yet. Add Size, Colour, Material or another option.</div>}
      {groups.map((group,index) => <div key={group.key} className="grid grid-cols-1 md:grid-cols-[1fr_150px_2fr_auto] gap-2 items-end border border-border rounded-lg p-3">
        <label className="text-xs font-medium">Group name<input value={group.name} onChange={e=>setGroup(group.key,{name:e.target.value})} placeholder="e.g. Size" className="mt-1 w-full h-9 px-2 border border-border rounded-md bg-background"/></label>
        <label className="text-xs font-medium">Display type<select value={group.displayType} onChange={e=>setGroup(group.key,{displayType:e.target.value as GroupDraft["displayType"]})} className="mt-1 w-full h-9 px-2 border border-border rounded-md bg-background"><option value="button">Buttons</option><option value="text">Text</option><option value="color">Colour swatches</option><option value="image">Images</option><option value="dropdown">Dropdown</option></select></label>
        <label className="text-xs font-medium">Values (comma separated)<input value={group.values} onChange={e=>setGroup(group.key,{values:e.target.value})} placeholder="S, M, L, XL" className="mt-1 w-full h-9 px-2 border border-border rounded-md bg-background"/></label>
        <button type="button" onClick={()=>removeGroup(group.key)} className="h-9 w-9 rounded-md border border-border text-red-600 flex items-center justify-center" aria-label={`Remove group ${index+1}`}><Trash2 className="w-4 h-4"/></button>
      </div>)}
      <button type="button" onClick={generateVariants} disabled={!productId || !groups.length} className="h-10 px-4 rounded-lg border border-emerald-600 text-emerald-700 text-sm font-semibold flex items-center gap-2 disabled:opacity-40"><Wand2 className="w-4 h-4"/>Generate combinations</button>
    </section>

    {variants.length > 0 && <section className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold text-sm">Variant combinations ({variants.length})</h2><p className="text-xs text-muted-foreground">Adjust each combination independently. Disable options you do not sell.</p></div><button type="button" onClick={()=>setVariants(current=>current.map(v=>({...v,enabled:false})))} className="text-xs text-muted-foreground underline">Disable all</button></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead><tr className="border-b border-border text-muted-foreground"><th className="p-2">Sell</th><th className="p-2">Variant</th><th className="p-2">Price ₹</th><th className="p-2">MRP ₹</th><th className="p-2">Cost ₹</th><th className="p-2">Stock</th><th className="p-2">SKU</th><th className="p-2">Barcode</th></tr></thead><tbody>{variants.map(v=><tr key={v.key} className="border-b border-border/70"><td className="p-2"><input type="checkbox" checked={v.enabled} onChange={e=>updateVariant(v.key,{enabled:e.target.checked})}/></td><td className="p-2 font-medium">{v.name}</td>{(["price","mrp","costPrice","stock","sku","barcode"] as const).map(field=><td className="p-2" key={field}><input aria-label={`${field} for ${v.name}`} type={field==="sku"||field==="barcode"?"text":"number"} min={field==="stock"||field==="price"||field==="mrp"||field==="costPrice"?"0":undefined} step={field==="stock"?"1":"0.01"} value={v[field]} onChange={e=>updateVariant(v.key,{[field]:e.target.value})} className="w-24 h-8 px-2 rounded border border-border bg-background"/></td>)}</tr>)}</tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[11px] text-muted-foreground">{variants.filter(v=>v.enabled).length} enabled · {variants.length-variants.filter(v=>v.enabled).length} disabled</p><button type="button" onClick={()=>void save()} disabled={saving || !variants.some(v=>v.enabled) || savedCount>0} className="h-10 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50">{saving?<><Loader2 className="w-4 h-4 animate-spin"/>Saving…</>:<><Check className="w-4 h-4"/>Save variants</>}</button></div>
    </section>}

    {notice && <div role="status" className={`rounded-lg p-3 text-sm border ${notice.type==="error"?"border-red-200 bg-red-50 text-red-700":notice.type==="success"?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-slate-200 bg-slate-50 text-slate-700"}`}>{notice.text}</div>}
    <div className="text-[11px] text-muted-foreground">This first vendor-side increment creates variant definitions and per-variant price/stock records. Editing existing saved variants, bundles and atomic inventory/order processing will be added in subsequent integration work.</div>
  </div>;
}
