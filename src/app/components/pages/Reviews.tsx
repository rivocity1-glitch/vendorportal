import React, { useState, useEffect } from "react";
import { Star, MessageSquare, ThumbsUp, Filter, MessageCircleHeart } from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface ReviewItem {
  id: string;
  customer_name: string;
  avatar_initials: string;
  rating: number;
  review_text: string;
  created_at: string;
  ordered_product: string;
  helpful_count: number;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? "text-[#F59E0B] fill-[#F59E0B]" : "text-muted-foreground/20"}`} />
      ))}
    </div>
  );
}

export function Reviews() {
  const [filter, setFilter] = useState<number | "all">("all");
  const [helpfulMap, setHelpfulMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Live Database Repositories
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [ratingDist, setRatingDist] = useState([
    { stars: 5, count: 0, pct: 0 },
    { stars: 4, count: 0, pct: 0 },
    { stars: 3, count: 0, pct: 0 },
    { stars: 2, count: 0, pct: 0 },
    { stars: 1, count: 0, pct: 0 },
  ]);

  const [metrics, setMetrics] = useState({
    fiveStarCount: 0,
    fourStarCount: 0,
    responseRate: "0%",
    repeatCustomersPct: "0%"
  });

  useEffect(() => {
    const fetchReviewsAndSummary = async () => {
      try {
        setLoading(true);
        const { data: authResult } = await supabase.auth.getUser();
        if (!authResult?.user) return;

        const vendorId = authResult.user.id;

        // 1. Fire asynchronous parallel requests to grab rows and analytics summaries at once
        const [reviewsResponse, summaryResponse] = await Promise.all([
          supabase
            .from("reviews")
            .select("*")
            .eq("vendor_id", vendorId)
            .order("created_at", { ascending: false }),
          supabase
            .rpc("get_vendor_reviews_summary", { target_vendor_id: vendorId })
        ]);

        if (reviewsResponse.error) throw reviewsResponse.error;
        if (summaryResponse.error) throw summaryResponse.error;

        // 2. Map data feeds straight into live components
        if (reviewsResponse.data) {
          setReviews(reviewsResponse.data);
        }

        if (summaryResponse.data) {
          setMetrics(summaryResponse.data.metrics);
          if (summaryResponse.data.distribution) {
            setRatingDist(summaryResponse.data.distribution);
          }
        }

      } catch (err) {
        console.error("Failed to compile database feedback records:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviewsAndSummary();
  }, []);

  const filtered = filter === "all" ? reviews : reviews.filter(r => r.rating === filter);
  
  const totalReviewsCount = reviews.length;
  const avgRating = totalReviewsCount > 0 
    ? (reviews.reduce((s, r) => s + r.rating, 0) / totalReviewsCount).toFixed(1) 
    : "0.0";

  const markHelpful = async (id: string, currentCount: number) => {
    if (helpfulMap[id]) return;
    
    // Optimistic UI change update immediately for smoothness
    setHelpfulMap(prev => ({ ...prev, [id]: true }));

    try {
      await supabase
        .from("reviews")
        .update({ helpful_count: currentCount + 1 })
        .eq("id", id);
    } catch (err) {
      console.error("Could not register helpful increment step:", err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-xs font-semibold tracking-widest text-muted-foreground animate-pulse uppercase">
        Syncing live customer evaluation metrics...
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      
      {/* Overview Aggregations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Cumulative Rating Summary Card */}
        <div className="bg-card rounded-xl border border-border p-6 flex flex-col items-center justify-center">
          <p className="text-6xl font-black text-foreground tracking-tight">{avgRating}</p>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className={`w-5 h-5 ${s <= Math.round(parseFloat(avgRating)) ? "text-[#F59E0B] fill-[#F59E0B]" : "text-muted-foreground/20"}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Based on {totalReviewsCount.toLocaleString()} real-time reviews</p>
        </div>

        {/* Interactive Rating Distribution Bar Graph */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-foreground mb-4 text-sm">Rating Distribution</h3>
          <div className="space-y-2.5">
            {ratingDist.map(r => (
              <div key={r.stars} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFilter(filter === r.stars ? "all" : r.stars)}
                  className={`flex items-center gap-1 text-xs font-bold w-12 shrink-0 transition-colors ${filter === r.stars ? "text-[#10B981]" : "text-muted-foreground hover:text-foreground"}`}
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
                <span className="text-xs font-mono text-muted-foreground w-8 text-right">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Structured Metric Performance Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "5★ Reviews", value: metrics.fiveStarCount.toString(), icon: Star, color: "text-[#F59E0B]", bg: "bg-[#FEF3C7]" },
          { label: "4★ Reviews", value: metrics.fourStarCount.toString(), icon: Star, color: "text-[#10B981]", bg: "bg-[#ECFDF5]" },
          { label: "Response Rate", value: metrics.responseRate, icon: MessageCircleHeart, color: "text-[#3B82F6]", bg: "bg-[#EFF6FF]" },
          { label: "Repeat Customers", value: metrics.repeatCustomersPct, icon: ThumbsUp, color: "text-[#8B5CF6]", bg: "bg-[#EDE9FE]" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground tracking-tight">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filterable Live Review Feed List Container */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground text-sm">
            Customer Reviews {filter !== "all" && <span className="text-[#10B981]">· {filter}★ only</span>}
          </h3>
          <button 
            type="button"
            onClick={() => setFilter("all")} 
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 bg-card px-2.5 py-1 rounded-lg border border-border transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            {filter !== "all" ? "Clear Filter" : "Filter Options"}
          </button>
        </div>

        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#10B981] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {r.avatar_initials || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground">{r.customer_name}</p>
                    <StarRow rating={r.rating} />
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2">Ordered: {r.ordered_product}</p>
                  <p className="text-sm text-foreground leading-relaxed font-normal">{r.review_text}</p>
                  
                  <div className="flex items-center gap-4 mt-3">
                    <button
                      type="button"
                      onClick={() => markHelpful(r.id, r.helpful_count)}
                      className={`flex items-center gap-1 text-xs font-medium transition-colors ${helpfulMap[r.id] ? "text-[#10B981]" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      Helpful ({r.helpful_count + (helpfulMap[r.id] ? 1 : 0)})
                    </button>
                    <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-[#10B981] transition-colors font-medium">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Reply
                    </button>
                    
                    {r.rating <= 2 && (
                      <span className="ml-auto text-[10px] uppercase tracking-wide bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-md font-bold">
                        Needs Response
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
              No product experience testimonials logged for this rating metric filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}