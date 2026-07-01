"use client";

import { useEffect, Suspense, useMemo } from "react";
import Image from "next/image";
import { useAppDispatch, useAppSelector, selectAllMarkets, selectFilteredMarkets, selectMarketsLoading } from "@/lib/redux/hooks";
import { fetchMarkets, loadSavedMarketsFromStorage } from "@/lib/redux/slices/marketsSlice";
import SearchFilterBar from "@/components/SearchFilterBar";
import MarketCard from "@/components/MarketCard";
import ParentMarketCard from "@/components/ParentMarketCard";
import BitcoinCard from "@/components/BitcoinCard";
import CategorySection from "./components/CategorySection";

const categories = ["Trending", "Breaking", "New", "Politics", "Sports", "Mentions", "Saved", "Resolved"];

export default function Home() {
  const dispatch = useAppDispatch();
  
  // Redux state
  const allMarkets = useAppSelector(selectAllMarkets);
  const filteredMarkets = useAppSelector(selectFilteredMarkets);
  const loading = useAppSelector(selectMarketsLoading);

  // Organize markets into parent/child structure and compute categories
  const organizedMarkets = useMemo(() => {
    const parentMarketIds = new Set();
    const childMarketIds = new Set();
    const grouped: { [key: string]: any[] } = {};

    filteredMarkets.forEach((market) => {
      if (market.children && Array.isArray(market.children) && market.children.length > 0) {
        parentMarketIds.add(market.id);
        grouped[market.id] = market.children;
        market.children.forEach((child: any) => childMarketIds.add(child.id));
      }
    });

    // Only show top-level markets (parents or standalone)
    const topLevel = filteredMarkets.filter((market) => parentMarketIds.has(market.id) || !childMarketIds.has(market.id));

    // Compute markets by category (using `categories` array as keys)
    const byCategory: { [key: string]: any[] } = {};
    categories.forEach((c) => (byCategory[c] = []));

    topLevel.forEach((m) => {
      const mCats = m.categories || (m.tag ? [m.tag] : []);
      if (mCats && mCats.length > 0) {
        mCats.forEach((c: string) => {
          if (!byCategory[c]) byCategory[c] = [];
          byCategory[c].push(m);
        });
      } else {
        byCategory["Trending"].push(m);
      }
    });

    // Sort each category by volume (descending)
    Object.keys(byCategory).forEach((k) => {
      byCategory[k].sort((a, b) => (b.volume || 0) - (a.volume || 0));
    });

    return {
      displayMarkets: topLevel,
      parentGroups: grouped,
      parentMarketIds,
      childMarketIds,
      byCategory,
    };
  }, [filteredMarkets]);

  // Load saved markets from localStorage on mount
  useEffect(() => {
    const savedMarketIds = localStorage.getItem("poly_saved_markets");
    if (savedMarketIds) {
      try {
        const ids = JSON.parse(savedMarketIds);
        dispatch(loadSavedMarketsFromStorage(ids));
      } catch (e) {
        console.error("Failed to load saved markets", e);
      }
    }
  }, [dispatch]);

  // Fetch markets on mount
  useEffect(() => {
    dispatch(fetchMarkets());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-background font-sans antialiased text-foreground">
      <Suspense fallback={<div className="h-16 bg-muted animate-pulse" />}>
        <SearchFilterBar />
      </Suspense>

      <main className="mx-auto max-w-7xl px-5 sm:px-6 pt-32 sm:pt-28 md:pt-40 pb-24 sm:pb-8 page-enter-slide-up">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="transition-opacity duration-300">
            {categories.map((cat) => (
              <CategorySection
                key={cat}
                title={cat}
                markets={organizedMarkets.byCategory[cat] || []}
                parentMarketIds={organizedMarkets.parentMarketIds}
                parentGroups={organizedMarkets.parentGroups}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}