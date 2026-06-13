"use client";

import { useEffect, Suspense, useMemo } from "react";
import Image from "next/image";
import { useAppDispatch, useAppSelector, selectAllMarkets, selectFilteredMarkets, selectMarketsLoading } from "@/lib/redux/hooks";
import { fetchMarkets, loadSavedMarketsFromStorage } from "@/lib/redux/slices/marketsSlice";
import SearchFilterBar from "@/components/SearchFilterBar";
import MarketCard from "@/components/MarketCard";
import ParentMarketCard from "@/components/ParentMarketCard";
import BitcoinCard from "@/components/BitcoinCard";

const categories = ["Trending", "Breaking", "New", "Politics", "Sports", "Mentions", "Saved", "Resolved"];

export default function Home() {
  const dispatch = useAppDispatch();
  
  // Redux state
  const allMarkets = useAppSelector(selectAllMarkets);
  const filteredMarkets = useAppSelector(selectFilteredMarkets);
  const loading = useAppSelector(selectMarketsLoading);

  // Organize markets into parent/child structure
  const organizedMarkets = useMemo(() => {
    const marketMap = new Map();
    const parentMarketIds = new Set();
    const childMarketIds = new Set();

    // First pass: identify parent markets and group children
    const grouped: { [key: string]: any[] } = {};
    
    filteredMarkets.forEach((market) => {
      // Check if market has children (based on your API structure)
      if (market.children && Array.isArray(market.children) && market.children.length > 0) {
        parentMarketIds.add(market.id);
        grouped[market.id] = market.children;
        market.children.forEach((child: any) => {
          childMarketIds.add(child.id);
        });
      }
    });

    // Return organized structure: display only parents and standalone markets
    return {
      displayMarkets: filteredMarkets.filter((market) => {
        // Show if it's a parent market OR if it's not a child market
        return parentMarketIds.has(market.id) || !childMarketIds.has(market.id);
      }),
      parentGroups: grouped,
      parentMarketIds,
      childMarketIds,
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