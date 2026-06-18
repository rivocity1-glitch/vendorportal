import React, { useState } from "react";
import { Search, Plus, Upload, Edit2, Trash2, MoreVertical, Filter } from "lucide-react";

const categories = ["All", "Dairy", "Bakery", "Snacks", "Beverages", "Personal Care", "Grains & Staples", "Instant Food", "Fruits & Vegetables", "Household"];

const products = [
  { id: 1, name: "Amul Full Cream Milk 1L", category: "Dairy", mrp: "₹68", price: "₹64", stock: 48, status: "Active", img: "AM" },
  { id: 2, name: "Britannia Bread 400g", category: "Bakery", mrp: "₹40", price: "₹35", stock: 22, status: "Active", img: "BR" },
  { id: 3, name: "Lay's Classic Salted 100g", category: "Snacks", mrp: "₹30", price: "₹28", stock: 5, status: "Low Stock", img: "LA" },
  { id: 4, name: "Colgate MaxFresh 150g", category: "Personal Care", mrp: "₹120", price: "₹105", stock: 34, status: "Active", img: "CO" },
  { id: 5, name: "Maggi Noodles 12-Pack", category: "Instant Food", mrp: "₹96", price: "₹88", stock: 19, status: "Active", img: "MA" },
  { id: 6, name: "Fortune Basmati Rice 5kg", category: "Grains & Staples", mrp: "₹510", price: "₹480", stock: 12, status: "Active", img: "FO" },
  { id: 7, name: "Coca-Cola 2L", category: "Beverages", mrp: "₹95", price: "₹88", stock: 2, status: "Low Stock", img: "CC" },
  { id: 8, name: "Amul Butter 500g", category: "Dairy", mrp: "₹265", price: "₹250", stock: 3, status: "Low Stock", img: "AB" },
  { id: 9, name: "Parle-G Biscuits 800g", category: "Snacks", mrp: "₹40", price: "₹36", stock: 67, status: "Active", img: "PA" },
  { id: 10, name: "Dettol Soap 75g", category: "Personal Care", mrp: "₹45", price: "₹40", stock: 4, status: "Low Stock", img: "DE" },
  { id: 11, name: "Tropicana Orange 1L", category: "Beverages", mrp: "₹165", price: "₹150", stock: 0, status: "Out of Stock", img: "TR" },
  { id: 12, name: "Toor Dal 1kg", category: "Grains & Staples", mrp: "₹165", price: "₹155", stock: 28, status: "Active", img: "TD" },
  { id: 13, name: "Kissan Mixed Fruit Jam 500g", category: "Snacks", mrp: "₹155", price: "₹140", stock: 16, status: "Active", img: "KI" },
  { id: 14, name: "Haldiram's Aloo Bhujia 400g", category: "Snacks", mrp: "₹120", price: "₹108", stock: 0, status: "Out of Stock", img: "HA" },
  { id: 15, name: "Dove Shampoo 180ml", category: "Personal Care", mrp: "₹175", price: "₹156", stock: 21, status: "Active", img: "DO" },
];

const statusStyles: Record<string, string> = {
  Active: "bg-[#D1FAE5] text-[#065F46]",
  "Low Stock": "bg-[#FEF3C7] text-[#92400E]",
  "Out of Stock": "bg-[#FEE2E2] text-[#991B1B]",
  Draft: "bg-muted text-muted-foreground",
};

const categoryColors: Record<string, string> = {
  Dairy: "bg-[#EFF6FF] text-[#1D4ED8]",
  Bakery: "bg-[#FEF3C7] text-[#92400E]",
  Snacks: "bg-[#EDE9FE] text-[#5B21B6]",
  Beverages: "bg-[#CFFAFE] text-[#164E63]",
  "Personal Care": "bg-[#FCE7F3] text-[#9D174D]",
  "Grains & Staples": "bg-[#FEF3C7] text-[#78350F]",
  "Instant Food": "bg-[#FEE2E2] text-[#991B1B]",
  "Fruits & Vegetables": "bg-[#D1FAE5] text-[#065F46]",
  Household: "bg-[#F3F4F6] text-[#374151]",
};

export function Products({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [productList, setProductList] = useState(products);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const filtered = productList.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "All" || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  const handleDelete = (id: number) => {
    setProductList(prev => prev.filter(p => p.id !== id));
    setOpenMenu(null);
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4" /> Import
          </button>
          <button
            onClick={() => onNavigate("add-product")}
            className="h-9 px-3 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium flex items-center gap-2 transition-colors shadow-sm shadow-[#10B981]/20"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 mb-4">
        <div className="bg-card border border-border rounded-lg px-3 py-2 text-center">
          <p className="text-lg font-bold text-foreground">{products.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-card border border-border rounded-lg px-3 py-2 text-center">
          <p className="text-lg font-bold text-[#10B981]">{products.filter(p => p.status === "Active").length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="bg-card border border-border rounded-lg px-3 py-2 text-center">
          <p className="text-lg font-bold text-[#F59E0B]">{products.filter(p => p.status === "Low Stock").length}</p>
          <p className="text-xs text-muted-foreground">Low Stock</p>
        </div>
        <div className="bg-card border border-border rounded-lg px-3 py-2 text-center">
          <p className="text-lg font-bold text-[#EF4444]">{products.filter(p => p.status === "Out of Stock").length}</p>
          <p className="text-xs text-muted-foreground">Out of Stock</p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              activeCategory === cat
                ? "bg-[#10B981] text-white"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">MRP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Stock</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(p => (
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
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[p.category] || "bg-muted text-muted-foreground"}`}>
                      {p.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground line-through">{p.mrp}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-foreground">{p.price}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${p.stock === 0 ? "text-[#EF4444]" : p.stock <= 5 ? "text-[#F59E0B]" : "text-foreground"}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[p.status]}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onNavigate("add-product")}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-[#10B981] hover:bg-[#ECFDF5] transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        {openMenu === p.id && (
                          <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-lg shadow-lg z-10 py-1">
                            <button className="w-full text-left px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                              View Details
                            </button>
                            <button className="w-full text-left px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                              Duplicate
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="w-full text-left px-3 py-1.5 text-sm text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowImportModal(false)} />
          <div className="relative bg-card rounded-2xl border border-border w-full max-w-md p-6 shadow-xl">
            <h2 className="font-semibold text-foreground mb-4">Import Products</h2>
            <div className="space-y-3">
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-[#10B981] transition-colors cursor-pointer group">
                <Upload className="w-8 h-8 text-muted-foreground group-hover:text-[#10B981] mx-auto mb-2 transition-colors" />
                <p className="text-sm font-medium text-foreground">Drop your CSV or Excel file here</p>
                <p className="text-xs text-muted-foreground mt-1">Supports .csv, .xlsx, .xls</p>
                <button className="mt-3 px-4 py-1.5 rounded-lg bg-[#10B981] text-white text-xs font-medium hover:bg-[#059669] transition-colors">
                  Choose File
                </button>
              </div>
              <a href="#" className="block text-xs text-[#10B981] text-center hover:underline">
                Download sample template
              </a>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowImportModal(false)} className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
              <button className="flex-1 h-9 rounded-lg bg-[#10B981] text-white text-sm font-medium hover:bg-[#059669] transition-colors">
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
