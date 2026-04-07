"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAppDispatch, useAppSelector, selectAllMarkets, selectFilteredMarkets } from "@/lib/redux/hooks";
import { setFilteredMarkets } from "@/lib/redux/slices/marketsSlice";
import { Search, Sliders, TrendingUp } from "lucide-react";

const categories = ["Trending", "Breaking", "New", "Politics", "Sports", "Crypto", "Saved", "Resolved", "Mentions"];

export default function SearchFilterBar() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const allMarkets = useAppSelector(selectAllMarkets);
    const isMarketPage = pathname.includes("/markets/");
    
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState(() => {
        // Initialize from URL param if present, otherwise default to "Trending"
        return searchParams.get("category") || "Trending";
    });
    const [searchTab, setSearchTab] = useState<"markets" | "profiles">("markets");
    const [minProbability, setMinProbability] = useState(0);
    const [maxProbability, setMaxProbability] = useState(100);
    const [sortBy, setSortBy] = useState("volume");
    const filterBoxRef = useRef<HTMLDivElement>(null);
    const searchBoxRef = useRef<HTMLDivElement>(null);

    // Get search results - show markets even when search is empty
    const searchResults = allMarkets
        .filter(m => {
            if (searchQuery.trim().length === 0) return true; // Show all when empty
            return (
                m.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
        })
        .sort((a, b) => {
            const aVol = parseInt(a.volume.replace(/\D/g, '')) || 0;
            const bVol = parseInt(b.volume.replace(/\D/g, '')) || 0;
            return bVol - aVol;
        })
        .slice(0, 6);

    // Update activeCategory when URL params change
    useEffect(() => {
        const categoryParam = searchParams.get("category");
        if (categoryParam) {
            setActiveCategory(categoryParam);
        }
    }, [searchParams]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (filterBoxRef.current && !filterBoxRef.current.contains(target)) {
                setIsFilterOpen(false);
            }
            if (searchBoxRef.current && !searchBoxRef.current.contains(target)) {
                setIsSearchOpen(false);
            }
        };

        if (isFilterOpen || isSearchOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isFilterOpen, isSearchOpen]);

    // Apply filters to markets
    useEffect(() => {
        let marketsToFilter = allMarkets;
        
        // Filter by category
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

        let filtered = marketsToFilter.filter(m => {
            const matchSearch = m.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                m.category.toLowerCase().includes(searchQuery.toLowerCase());
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
    }, [allMarkets, searchQuery, activeCategory, minProbability, maxProbability, sortBy, dispatch]);

    const resetFilters = () => {
        setSearchQuery("");
        setMinProbability(0);
        setMaxProbability(100);
        setSortBy("volume");
        setActiveCategory("Trending");
        // Reset URL param if on home page
        if (!isMarketPage) {
            router.push("/");
        }
    };

    return (
        <div className="fixed top-18 sm:top-14 md:top-12 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
            <div className="px-4 sm:px-6 py-3 border-b border-border">
                {/* Search Bar - Centered */}
                <div className="relative flex items-center gap-1.5 max-w-3xl mx-auto mb-3" ref={searchBoxRef}>
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search markets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchOpen(true)}
                            className="w-full h-9 rounded-lg bg-muted pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground focus:bg-muted/80 transition-all"
                        />

                        {/* Search Results Dropdown */}
                        {isSearchOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                {/* Tab Navigation */}
                                <div className="flex items-center gap-4 px-4 py-3 border-b border-border sticky top-0 bg-background">
                                    <button
                                        onClick={() => setSearchTab("markets")}
                                        className={`text-sm font-semibold pb-2 border-b-2 transition-colors ${
                                            searchTab === "markets"
                                                ? "text-foreground border-foreground"
                                                : "text-muted-foreground border-transparent hover:text-foreground"
                                        }`}
                                    >
                                        Markets
                                    </button>
                                    <button
                                        onClick={() => setSearchTab("profiles")}
                                        className={`text-sm font-semibold pb-2 border-b-2 transition-colors ${
                                            searchTab === "profiles"
                                                ? "text-foreground border-foreground"
                                                : "text-muted-foreground border-transparent hover:text-foreground"
                                        }`}
                                    >
                                        Profiles
                                    </button>
                                </div>

                                {/* Markets Tab */}
                                {searchTab === "markets" && (
                                    <>
                                        {searchResults.length > 0 ? (
                                            <>
                                                <div className="space-y-1 p-2">
                                                    {searchResults.map((market) => (
                                                        <Link
                                                            key={market.id}
                                                            href={`/markets/${market.id}`}
                                                            onClick={() => {
                                                                setIsSearchOpen(false);
                                                                setSearchQuery("");
                                                            }}
                                                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
                                                        >
                                                            <div className="flex-1 min-w-0 pt-0.5">
                                                                <p className="text-sm font-semibold text-foreground group-hover:text-apple-blue transition-colors line-clamp-2">
                                                                    {market.question}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                                                        {market.category}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {market.yes_probability}% Yes
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                                                                <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                                                                    {market.volume}
                                                                </span>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                                {allMarkets.filter(m => 
                                                    m.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                    m.category.toLowerCase().includes(searchQuery.toLowerCase())
                                                ).length > 6 && (
                                                    <div className="border-t border-border p-3">
                                                        <button 
                                                            onClick={() => setIsSearchOpen(false)}
                                                            className="w-full text-sm font-semibold text-apple-blue hover:text-apple-blue/80 transition-colors text-center"
                                                        >
                                                            See all results →
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="px-4 py-8 text-center">
                                                <p className="text-sm text-muted-foreground">No markets found</p>
                                                <p className="text-xs text-muted-foreground mt-2">Try searching by market name or category</p>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Profiles Tab */}
                                {searchTab === "profiles" && (
                                    <div className="px-4 py-8 text-center">
                                        <p className="text-sm text-muted-foreground">Profile search coming soon</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Filter Button */}
                    <div className="relative" ref={filterBoxRef}>
                        <button
                            onClick={() => {
                                if (isMarketPage) {
                                    router.push("/");
                                } else {
                                    setIsFilterOpen(!isFilterOpen);
                                }
                            }}
                            className="p-2 rounded-lg bg-muted hover:opacity-80 transition-colors text-muted-foreground hover:text-foreground"
                            aria-label="Filters"
                        >
                            <Sliders className="h-4 w-4" />
                        </button>

                        {/* Filter Dropdown */}
                        {isFilterOpen && (
                            <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-lg shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
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
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground mb-2">Sort By</label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground/50 transition-all"
                                        >
                                            <option value="volume">Highest Volume</option>
                                            <option value="probability">Highest Probability</option>
                                        </select>
                                    </div>

                                    {/* Probability Range */}
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground mb-2 transition-colors">
                                            <span className="inline-block">Yes Probability:</span>
                                            <span className="text-apple-green font-black ml-1">{minProbability}% - {maxProbability}%</span>
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
                                                    className="w-full h-2 bg-gradient-to-r from-red-400 to-yellow-400 rounded-lg appearance-none cursor-pointer accent-apple-green transition-all"
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
                                                    className="w-full h-2 bg-gradient-to-r from-yellow-400 to-green-400 rounded-lg appearance-none cursor-pointer accent-apple-green transition-all"
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
                                            resetFilters();
                                            setIsFilterOpen(false);
                                        }}
                                        className="w-full mt-4 px-4 py-2 text-xs font-bold text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                                    >
                                        Reset Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Category Tabs - Centered */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-3xl mx-auto">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => {
                                if (isMarketPage) {
                                    // Navigate to home with category filter
                                    router.push(`/?category=${encodeURIComponent(cat)}`);
                                } else {
                                    // On home page, just update the category state
                                    setActiveCategory(cat);
                                }
                            }}
                            className={`px-3.5 py-1.5 text-xs md:text-sm font-medium whitespace-nowrap rounded-lg transition-all ${
                                activeCategory === cat
                                    ? "bg-gray-900 text-white shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                        >
                            {cat === "Mentions" ? "@" : cat}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
