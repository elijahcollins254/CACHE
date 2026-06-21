"use client";

import { Suspense, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useAppDispatch, useAppSelector, selectAllMarkets, selectFilteredMarkets, selectMarketsLoading } from "@/lib/redux/hooks";
import { fetchMarkets, loadSavedMarketsFromStorage } from "@/lib/redux/slices/marketsSlice";
import SearchFilterBar from "@/components/SearchFilterBar";
import MarketCard from "@/components/MarketCard";
import ParentMarketCard from "@/components/ParentMarketCard";

const categoryLabels = ["Trending", "New", "Politics", "Sports", "Economy", "Crypto", "Technology", "Geopolitics", "Environment", "Closing Soon", "Saved", "Resolved"];
const specialCategorySlugs = new Set(["trending", "new", "closing-soon", "saved", "resolved"]);

const toSlug = (value: string) => value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const categoryBySlug = new Map(categoryLabels.map((category) => [toSlug(category), category]));

const formatSlug = (slug: string) => slug.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

type MarketBrowseProps = {
  categorySlug?: string;
  subcategorySlug?: string;
};

export default function MarketBrowse({ categorySlug, subcategorySlug }: MarketBrowseProps) {
  const dispatch = useAppDispatch();
  const allMarkets = useAppSelector(selectAllMarkets);
  const filteredMarkets = useAppSelector(selectFilteredMarkets);
  const loading = useAppSelector(selectMarketsLoading);

  const routeCategory = categorySlug ? categoryBySlug.get(categorySlug) || formatSlug(categorySlug) : null;
  const isSpecialCategory = categorySlug ? specialCategorySlugs.has(categorySlug) : false;

  const subcategoryOptions = useMemo(() => {
    if (!routeCategory || isSpecialCategory) return [];

    const counts = new Map<string, number>();
    allMarkets.forEach((market) => {
      if (toSlug(market.category || "") !== categorySlug || !market.subcategory || market.status === "RESOLVED") return;
      counts.set(market.subcategory, (counts.get(market.subcategory) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count, slug: toSlug(label) }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [allMarkets, categorySlug, isSpecialCategory, routeCategory]);

  const activeSubcategory = subcategorySlug
    ? subcategoryOptions.find((item) => item.slug === subcategorySlug)?.label || formatSlug(subcategorySlug)
    : null;

  const routeMarkets = useMemo(() => {
    let markets = filteredMarkets;

    if (routeCategory && !isSpecialCategory) {
      markets = markets.filter((market) => toSlug(market.category || "") === categorySlug);
    }

    if (subcategorySlug) {
      markets = markets.filter((market) => toSlug(market.subcategory || "") === subcategorySlug);
    }

    return markets;
  }, [categorySlug, filteredMarkets, isSpecialCategory, routeCategory, subcategorySlug]);

  const organizedMarkets = useMemo(() => {
    const parentMarketIds = new Set<number>();
    const childMarketIds = new Set<number>();
    const grouped: { [key: string]: any[] } = {};

    routeMarkets.forEach((market) => {
      if (market.children && Array.isArray(market.children) && market.children.length > 0) {
        parentMarketIds.add(market.id);
        grouped[market.id] = subcategorySlug
          ? market.children.filter((child: any) => toSlug(child.subcategory || "") === subcategorySlug)
          : market.children;
        grouped[market.id].forEach((child: any) => {
          childMarketIds.add(child.id);
        });
      }
    });

    return {
      displayMarkets: routeMarkets.filter((market) => parentMarketIds.has(market.id) || !childMarketIds.has(market.id)),
      parentGroups: grouped,
      parentMarketIds,
    };
  }, [routeMarkets, subcategorySlug]);

  useEffect(() => {
    const savedMarketIds = localStorage.getItem("poly_saved_markets");
    if (savedMarketIds) {
      try {
        dispatch(loadSavedMarketsFromStorage(JSON.parse(savedMarketIds)));
      } catch (e) {
        console.error("Failed to load saved markets", e);
      }
    }
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchMarkets());
  }, [dispatch]);

  const heading = activeSubcategory
    ? `${activeSubcategory} Markets`
    : routeCategory
      ? routeCategory === "Trending" ? "Browse Markets" : `${routeCategory} Markets`
      : "Browse Markets";

  return (
    <div className="min-h-screen bg-background font-sans antialiased text-foreground">
      <Suspense fallback={<div className="h-16 bg-muted animate-pulse" />}>
        <SearchFilterBar />
      </Suspense>

      <main className="mx-auto max-w-7xl px-5 sm:px-6 pt-32 sm:pt-28 md:pt-40 pb-24 sm:pb-8 page-enter-slide-up">
        <div className="mb-5 flex flex-col gap-3 sm:mb-6">
          <nav className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-3.5 w-3.5 flex-none" />
            <Link href="/category" className="hover:text-foreground">Category</Link>
            {routeCategory && routeCategory !== "Trending" && (
              <>
                <ChevronRight className="h-3.5 w-3.5 flex-none" />
                <Link href={`/category/${categorySlug}`} className="truncate hover:text-foreground">{routeCategory}</Link>
              </>
            )}
            {activeSubcategory && (
              <>
                <ChevronRight className="h-3.5 w-3.5 flex-none" />
                <span className="truncate text-foreground">{activeSubcategory}</span>
              </>
            )}
          </nav>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-2xl font-bold tracking-normal text-foreground sm:text-3xl">{heading}</h1>
            {!loading && (
              <p className="text-sm text-muted-foreground">{organizedMarkets.displayMarkets.length} markets</p>
            )}
          </div>

          {routeCategory && !isSpecialCategory && subcategoryOptions.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
              <Link
                href={`/category/${categorySlug}`}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  !subcategorySlug ? "bg-gray-900 text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                All {routeCategory}
              </Link>
              {subcategoryOptions.map((item) => (
                <Link
                  key={item.slug}
                  href={`/category/${categorySlug}/${item.slug}`}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    subcategorySlug === item.slug ? "bg-gray-900 text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 transition-opacity duration-300 auto-rows-max md:grid-cols-2 lg:grid-cols-3">
              {organizedMarkets.displayMarkets.length > 0 ? (
                organizedMarkets.displayMarkets.map((market, index) => {
                  const isParent = organizedMarkets.parentMarketIds.has(market.id);
                  const childMarkets = organizedMarkets.parentGroups[market.id] || [];

                  return (
                    <div key={market.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
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
