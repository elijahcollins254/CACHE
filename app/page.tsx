"use client";

import { useEffect, Suspense, useMemo } from "react";
import Image from "next/image";
import { useAppDispatch, useAppSelector, selectAllMarkets, selectFilteredMarkets, selectMarketsLoading } from "@/lib/redux/hooks";
import { fetchMarkets, loadSavedMarketsFromStorage } from "@/lib/redux/slices/marketsSlice";
import SearchFilterBar from "@/components/SearchFilterBar";
import GroupedMarketCard from "@/components/GroupedMarketCard";
import MarketCard from "@/components/MarketCard";
import BitcoinCard from "@/components/BitcoinCard";
import type { Market } from "@/lib/redux/slices/marketsSlice";

const categories = ["Trending", "Breaking", "New", "Politics", "Sports", "Mentions", "Saved", "Resolved"];

export default function Home() {
  const dispatch = useAppDispatch();
  
  // Redux state
  const allMarkets = useAppSelector(selectAllMarkets);
  const filteredMarkets = useAppSelector(selectFilteredMarkets);
  const loading = useAppSelector(selectMarketsLoading);

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

  // Group markets by parent event
  const { groupedMarkets, ungroupedMarkets } = useMemo(() => {
    const groups = new Map<string, { markets: Market[]; parentTitle: string; imageUrl?: string }>();
    const ungrouped: Market[] = [];

    filteredMarkets.forEach((market) => {
      if (market.parentEventId && market.parentEventTitle) {
        const key = market.parentEventId;
        if (!groups.has(key)) {
          groups.set(key, {
            markets: [],
            parentTitle: market.parentEventTitle,
            imageUrl: market.image_url,
          });
        }
        groups.get(key)!.markets.push(market);
      } else {
        ungrouped.push(market);
      }
    });

    return {
      groupedMarkets: Array.from(groups.entries()).map(([eventId, data]) => ({
        eventId,
        ...data,
      })),
      ungroupedMarkets: ungrouped,
    };
  }, [filteredMarkets]);

  return (
    <div className="min-h-screen bg-background font-sans antialiased text-foreground">
      <Suspense fallback={<div className="h-16 bg-muted animate-pulse" />}>
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

        {/* Markets Grid - Now with grouped and ungrouped markets */}
        <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : filteredMarkets.length === 0 ? (
            <div className="col-span-full py-20 text-center animate-in fade-in duration-300">
              <p className="text-muted-foreground text-lg">No markets found in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 transition-opacity duration-300">
              {/* Grouped Markets */}
              {groupedMarkets.map((group, index) => (
                <div
                  key={group.eventId}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <GroupedMarketCard
                    parentTitle={group.parentTitle}
                    parentEventId={group.eventId}
                    markets={group.markets}
                    firstMarketId={group.markets[0]?.id || 0}
                    imageUrl={group.imageUrl}
                    category={group.markets[0]?.category || "Other"}
                  />
                </div>
              ))}

              {/* Ungrouped Markets */}
              {ungroupedMarkets.map((market, index) => (
                <div
                  key={market.id}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${(groupedMarkets.length + index) * 50}ms` }}
                >
                  <MarketCard market={market} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
