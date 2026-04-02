"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector, selectAllMarkets, selectFilteredMarkets, selectMarketsLoading, selectSavedMarkets } from "@/lib/redux/hooks";
import { fetchMarkets, setFilteredMarkets, toggleSaveMarket, loadSavedMarketsFromStorage } from "@/lib/redux/slices/marketsSlice";
import Navbar from "@/components/Navbar";
import MarketCard from "@/components/MarketCard";
import { Search, Sliders, Bookmark } from "lucide-react";

const categories = ["Trending", "Breaking", "New", "Politics", "Sports", "Crypto", "Saved", "Resolved"];

const browseCategories = ["New", "Trending", "Popular", "Liquid", "Ending Soon"];
const topics = ["Live Crypto", "Middle East", "Sports", "Tech", "Politics", "Crypto", "Pop Culture", "AI"];

export default function Home() {
  const dispatch = useAppDispatch();
  
  // Redux state
  const allMarkets = useAppSelector(selectAllMarkets);
  const filteredMarkets = useAppSelector(selectFilteredMarkets);
  const loading = useAppSelector(selectMarketsLoading);
  const savedMarkets = useAppSelector(selectSavedMarkets);
  
  const [activeCategory, setActiveCategory] = useState("Trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [minProbability, setMinProbability] = useState(0);
  const [maxProbability, setMaxProbability] = useState(100);
  const [sortBy, setSortBy] = useState("volume");
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const filterBoxRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      if (searchBoxRef.current && !searchBoxRef.current.contains(target)) {
        setIsSearchOpen(false);
      }
      if (filterBoxRef.current && !filterBoxRef.current.contains(target)) {
        setIsFilterOpen(false);
      }
    };

    if (isSearchOpen || isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isSearchOpen, isFilterOpen]);

  // Update filtered markets when filters change
  useEffect(() => {
    let marketsToFilter = allMarkets;
    
    // Filter by saved if "Saved" category is selected
    if (activeCategory === "Saved") {
      marketsToFilter = allMarkets.filter(m => m.saved && m.status !== "RESOLVED");
    } else if (activeCategory === "Resolved") {
      marketsToFilter = allMarkets.filter(m => m.status === "RESOLVED");
    } else {
      marketsToFilter = allMarkets.filter(m => {
        const matchCategory = activeCategory === "Trending" || m.category === activeCategory;
        return matchCategory && m.status !== "RESOLVED";
      });
    }
    
    // Apply search and probability filters
    const filtered = marketsToFilter.filter(m => {
      const matchSearch = m.question.toLowerCase().includes(searchQuery.toLowerCase());
      const matchProbability = m.yes_probability >= minProbability && m.yes_probability <= maxProbability;
      return matchSearch && matchProbability;
    }).sort((a, b) => {
      if (sortBy === "volume") {
        const aVol = parseInt(a.volume.replace(/\D/g, '')) || 0;
        const bVol = parseInt(b.volume.replace(/\D/g, '')) || 0;
        return bVol - aVol;
      } else if (sortBy === "probability") {
        return b.yes_probability - a.yes_probability;
      }
      return 0;
    });
    
    dispatch(setFilteredMarkets(filtered));
  }, [allMarkets, activeCategory, searchQuery, minProbability, maxProbability, sortBy, dispatch]);

  return (
    <div className="min-h-screen bg-background font-sans antialiased text-foreground">
      <Navbar />

      {/* Sticky Search & Category Section */}
      <div className="sticky top-16 sm:top-14 md:top-12 z-30 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
        {/* Search Bar */}
        <div className="px-4 sm:px-6 py-3 border-b border-border">
          <div className="relative flex items-center gap-1.5 max-w-3xl mx-auto" ref={searchBoxRef}>
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              className="flex-1 h-9 rounded-lg bg-muted pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground focus:bg-muted/80 transition-all"
            />
            <div className="relative" ref={filterBoxRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="p-2 rounded-lg bg-muted hover:opacity-80 transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Filters"
              >
                <Sliders className="h-4 w-4" />
              </button>

              {/* Filter Dropdown */}
              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-muted border border-border rounded-lg shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-sm text-foreground">Filters</h3>
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Sort By */}
                    <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                      <label className="block text-xs font-bold text-muted-foreground mb-2">Sort By</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all duration-200"
                      >
                        <option value="volume">Highest Volume</option>
                        <option value="probability">Highest Probability</option>
                      </select>
                    </div>

                    {/* Probability Range */}
                    <div className="animate-in fade-in slide-in-from-left-2 duration-300 delay-100">
                      <label className="block text-xs font-bold text-muted-foreground mb-2 transition-colors duration-300">
                        <span className="inline-block">Yes Probability:</span>
                        <span className="text-apple-green font-black ml-1 animate-pulse">{minProbability}% - {maxProbability}%</span>
                      </label>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground">Min: {minProbability}%</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={minProbability}
                            onChange={(e) => setMinProbability(parseInt(e.target.value))}
                            className="w-full h-2 bg-gradient-to-r from-red-400 to-yellow-400 rounded-lg appearance-none cursor-pointer accent-apple-green transition-all duration-200 hover:shadow-md"
                            style={{
                              background: `linear-gradient(to right, #f87171 0%, #fbbf24 ${minProbability}%, #e5e7eb ${minProbability}%, #e5e7eb 100%)`
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground">Max: {maxProbability}%</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={maxProbability}
                            onChange={(e) => setMaxProbability(parseInt(e.target.value))}
                            className="w-full h-2 bg-gradient-to-r from-yellow-400 to-green-400 rounded-lg appearance-none cursor-pointer accent-apple-green transition-all duration-200 hover:shadow-md"
                            style={{
                              background: `linear-gradient(to right, #fbbf24 0%, #10b981 ${maxProbability}%, #e5e7eb ${maxProbability}%, #e5e7eb 100%)`
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Reset Filters */}
                    <button
                      onClick={() => {
                        setMinProbability(0);
                        setMaxProbability(100);
                        setSortBy("volume");
                        setIsFilterOpen(false);
                      }}
                      className="w-full px-3 py-2 text-xs font-semibold text-foreground border border-border rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Search Dropdown */}
            {isSearchOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-muted border border-border rounded-lg shadow-lg z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Browse Section */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Browse</h3>
                  <div className="flex flex-wrap gap-2">
                    {browseCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setActiveCategory(cat);
                          setIsSearchOpen(false);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-foreground bg-muted hover:opacity-80 rounded-lg transition-colors"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Topics Section */}
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Topics</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {topics.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => {
                          setSearchQuery(topic);
                          setIsSearchOpen(false);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-foreground bg-muted hover:opacity-80 rounded-lg transition-colors text-left"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 px-4 sm:px-6 py-2.5 overflow-x-auto no-scrollbar max-w-3xl mx-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 text-xs md:text-sm font-medium whitespace-nowrap rounded-lg transition-all ${
                activeCategory === cat
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-5 sm:px-6 pt-16 sm:pt-20 pb-24 sm:pb-8">
        {/* Markets Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 transition-opacity duration-300">
            {filteredMarkets.length > 0 ? (
              filteredMarkets.map((market, index) => (
                <div key={market.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{animationDelay: `${index * 50}ms`}}>
                  <MarketCard market={market} />
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center animate-in fade-in duration-300">
                <p className="text-muted-foreground text-lg">No markets found in this category.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}