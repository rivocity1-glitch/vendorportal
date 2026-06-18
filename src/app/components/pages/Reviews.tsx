import React, { useState } from "react";
import { Star, MessageSquare, ThumbsUp, Filter } from "lucide-react";

const reviews = [
  { id: 1, customer: "Priya Sharma", avatar: "PS", rating: 5, review: "Excellent quality products! The delivery was super fast, within 20 minutes. Packaging was neat and everything was fresh. Will definitely order again.", date: "Dec 16, 2024", product: "Amul Milk 1L", helpful: 12 },
  { id: 2, customer: "Rahul Mehta", avatar: "RM", rating: 5, review: "Amazing service! The store is well-stocked and the app is easy to use. Delivery boy was very polite too.", date: "Dec 15, 2024", product: "Maggi Noodles", helpful: 8 },
  { id: 3, customer: "Ananya Singh", avatar: "AS", rating: 4, review: "Good experience overall. Products were fresh and delivery was timely. One item was slightly different from the image but still fine.", date: "Dec 14, 2024", product: "Mixed Order", helpful: 5 },
  { id: 4, customer: "Vikram Nair", avatar: "VN", rating: 4, review: "Very reliable store. Never had any issues with quality. Price is slightly higher than market but the convenience is worth it.", date: "Dec 13, 2024", product: "Grocery Bundle", helpful: 3 },
  { id: 5, customer: "Deepika Patel", avatar: "DP", rating: 5, review: "Best hyperlocal store in Koramangala! Fast, reliable, and great quality. Highly recommend.", date: "Dec 12, 2024", product: "Dairy Products", helpful: 18 },
  { id: 6, customer: "Arjun Kumar", avatar: "AK", rating: 3, review: "Decent service but the delivery took longer than expected today. Products were good quality though.", date: "Dec 11, 2024", product: "Bread & Eggs", helpful: 2 },
  { id: 7, customer: "Sneha Iyer", avatar: "SI", rating: 5, review: "Absolutely love this store! Fresh produce every time. The price is reasonable and delivery is lightning fast.", date: "Dec 10, 2024", product: "Fruits & Veggies", helpful: 14 },
  { id: 8, customer: "Karthik Raj", avatar: "KR", rating: 2, review: "One item was out of stock but wasn't updated in the app. Had to wait for a refund which took 2 days. Please update stock in real-time.", date: "Dec 9, 2024", product: "Tropicana 1L", helpful: 1 },
];

const ratingDist = [
  { stars: 5, count: 642, pct: 65 },
  { stars: 4, count: 248, pct: 25 },
  { stars: 3, count: 89, pct: 9 },
  { stars: 2, count: 15, pct: 1 },
  { stars: 1, count: 5, pct: 0.5 },
];

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? "text-[#F59E0B] fill-[#F59E0B]" : "text-muted"}`} />
      ))}
    </div>
  );
}

export function Reviews() {
  const [filter, setFilter] = useState<number | "all">("all");
  const [helpfulMap, setHelpfulMap] = useState<Record<number, boolean>>({});

  const filtered = filter === "all" ? reviews : reviews.filter(r => r.rating === filter);
  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  const markHelpful = (id: number, count: number) => {
    if (helpfulMap[id]) return;
    setHelpfulMap(prev => ({ ...prev, [id]: true }));
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rating summary */}
        <div className="bg-card rounded-xl border border-border p-6 flex flex-col items-center justify-center">
          <p className="text-6xl font-bold text-foreground">{avgRating}</p>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className={`w-5 h-5 ${s <= Math.round(+avgRating) ? "text-[#F59E0B] fill-[#F59E0B]" : "text-muted"}`} />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">Based on {reviews.length.toLocaleString()} reviews</p>
        </div>

        {/* Rating distribution */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-foreground mb-4">Rating Distribution</h3>
          <div className="space-y-2.5">
            {ratingDist.map(r => (
              <div key={r.stars} className="flex items-center gap-3">
                <button
                  onClick={() => setFilter(filter === r.stars ? "all" : r.stars)}
                  className={`flex items-center gap-1 text-xs font-medium w-12 shrink-0 transition-colors ${filter === r.stars ? "text-[#10B981]" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Star className={`w-3 h-3 ${filter === r.stars ? "fill-[#10B981] text-[#10B981]" : "fill-[#F59E0B] text-[#F59E0B]"}`} />
                  {r.stars}
                </button>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#F59E0B] transition-all"
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "5★ Reviews", value: "642", icon: Star, color: "text-[#F59E0B]", bg: "bg-[#FEF3C7]" },
          { label: "4★ Reviews", value: "248", icon: Star, color: "text-[#10B981]", bg: "bg-[#ECFDF5]" },
          { label: "Response Rate", value: "94%", icon: MessageSquare, color: "text-[#3B82F6]", bg: "bg-[#EFF6FF]" },
          { label: "Repeat Customers", value: "68%", icon: ThumbsUp, color: "text-[#8B5CF6]", bg: "bg-[#EDE9FE]" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reviews list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">
            Customer Reviews {filter !== "all" && <span className="text-[#10B981]">· {filter}★ only</span>}
          </h3>
          <button onClick={() => setFilter("all")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            {filter !== "all" ? "Clear filter" : "Filter"}
          </button>
        </div>
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#10B981] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {r.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground">{r.customer}</p>
                    <StarRow rating={r.rating} />
                    <span className="text-xs text-muted-foreground ml-auto">{r.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Ordered: {r.product}</p>
                  <p className="text-sm text-foreground leading-relaxed">{r.review}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => markHelpful(r.id, r.helpful)}
                      className={`flex items-center gap-1.5 text-xs transition-colors ${helpfulMap[r.id] ? "text-[#10B981]" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      Helpful ({r.helpful + (helpfulMap[r.id] ? 1 : 0)})
                    </button>
                    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#10B981] transition-colors">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Reply
                    </button>
                    {r.rating <= 2 && (
                      <span className="ml-auto text-xs bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-full font-medium">Needs Response</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
