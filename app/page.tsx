"use client";

import { useEffect, Suspense, useMemo } from "react";
import Image from "next/image";
import { useAppDispatch, useAppSelector, selectAllMarkets, selectFilteredMarkets, selectMarketsLoading } from "@/lib/redux/hooks";
import { fetchMarkets, loadSavedMarketsFromStorage } from "@/lib/redux/slices/marketsSlice";
import SearchFilterBar from "@/components/SearchFilterBar";
import MarketCard from "@/components/MarketCard";
import ParentMarketCard from "@/components/ParentMarketCard";
import BitcoinCard from "@/components/BitcoinCard";
import CategorySection from "@/components/CategorySection";

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

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
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
        <SearchFilterBar />
      </Suspense>

      <main className="mx-auto max-w-7xl px-5 sm:px-6 pt-32 sm:pt-28 md:pt-40 pb-24 sm:pb-8 page-enter-slide-up">

        {/* Bitcoin Live Market - Featured Section */}
        {/* <div className="mb-8 lg:mb-12">
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-xl sm:text-xl font-bold text-gray-900">Live</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <Suspense fallback={<div className="h-52 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 animate-pulse" />}>
              <BitcoinCard />
            </Suspense>
          </div>
        </div> */}

        {/* All Markets Section */}
        {/* <div className="mb-6">
          <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">All Markets</h4>
        </div> */}
        

        {/* Markets Grid */}
        <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 transition-opacity duration-300 auto-rows-max">
            {organizedMarkets.displayMarkets.length > 0 ? (
              organizedMarkets.displayMarkets.map((market, index) => {
                const isParent = organizedMarkets.parentMarketIds.has(market.id);
                const childMarkets = organizedMarkets.parentGroups[market.id] || [];

                return (
                  <div key={market.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{animationDelay: `${index * 50}ms`}}>
                    {isParent ? (
                      <ParentMarketCard parentMarket={market} childMarkets={childMarkets} />
                    ) : (
                      <MarketCard market={market} />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-20 text-center animate-in fade-in duration-300">
                <p className="text-muted-foreground text-lg">No markets found in this category.</p>
              </div>
            )}
          </div>
        )}
        </div>
      </main>
    </div>
  );
}