"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAppDispatch, useAppSelector, selectAllMarkets, selectFilteredMarkets } from "@/lib/redux/hooks";
import { setFilteredMarkets } from "@/lib/redux/slices/marketsSlice";
import { generateMarketSlug } from "@/lib/slugify";
import { parseVolume } from "@/lib/volume";
import { Search, Sliders, TrendingUp } from "lucide-react";

const categories = ["Trending", "New", "Politics", "Sports", "Economy", "Crypto", "Technology", "Geopolitics", "Environment", "Closing Soon", "Saved", "Resolved"];

const categorySlug = (value: string) => value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const categoryBySlug = new Map(categories.map((category) => [categorySlug(category), category]));

const getCategoryFromPath = (pathname: string, fallback: string | null) => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] === "category") {
        const slug = segments[1];
        return slug ? categoryBySlug.get(slug) || "Trending" : "Trending";
    }

    return fallback || "Trending";
};

export default function SearchFilterBar() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const allMarkets = useAppSelector(selectAllMarkets);
    const isMarketPage = pathname.includes("/markets/");
    const [navbarHeight, setNavbarHeight] = useState(72); // Default mobile height
    const [isDesktop, setIsDesktop] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState(() => {
        return getCategoryFromPath(pathname, searchParams.get("category"));
    });
    const [searchTab, setSearchTab] = useState<"markets" | "profiles">("markets");
    const [minProbability, setMinProbability] = useState(0);
    const [maxProbability, setMaxProbability] = useState(100);
    const [sortBy, setSortBy] = useState("volume");
    const [probabilityFilter, setProbabilityFilter] = useState<"all" | "close" | "strong" | "custom">("all");
    const [filterMode, setFilterMode] = useState<"yes" | "no">("yes");
    const filterBoxRef = useRef<HTMLDivElement>(null);
    const searchBoxRef = useRef<HTMLDivElement>(null);

    // Detect navbar height and desktop status from window width for responsive sizing
    useEffect(() => {
        const updateNavbarHeight = () => {
            const width = window.innerWidth;
            setIsDesktop(width >= 768);
            if (width < 640) { // mobile
                setNavbarHeight(72); // h-18 = 4.5rem
            } else if (width < 768) { // sm
                setNavbarHeight(56); // h-14 = 3.5rem
            } else { // md and up
                setNavbarHeight(48); // h-12 = 3rem
            }
        };

        updateNavbarHeight();
        window.addEventListener("resize", updateNavbarHeight);
        return () => window.removeEventListener("resize", updateNavbarHeight);
    }, []);

    // Get search results - show markets even when search is empty
    const searchResults = allMarkets
        .filter(m => {
            // Never show resolved markets
            if (m.status === "RESOLVED") return false;
            
            if (searchQuery.trim().length === 0) return true; // Show all when empty
            return (
                m.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (m.subcategory || "").toLowerCase().includes(searchQuery.toLowerCase())
            );
        })
        .sort((a, b) => {
            const aVol = parseVolume(a.volume);
            const bVol = parseVolume(b.volume);
            return bVol - aVol;
        })
        .slice(0, 6);

    // Update activeCategory when URL params change
    useEffect(() => {
        const categoryParam = searchParams.get("category");
        setActiveCategory(getCategoryFromPath(pathname, categoryParam));
    }, [pathname, searchParams]);

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
        } else if (activeCategory === "Closing Soon") {
            // Filter markets closing within the next 7 days OR marked as closing_soon
            const now = new Date();
            const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            marketsToFilter = allMarkets.filter(m => {
                if (m.status === "RESOLVED") return false;
                
                // Check if explicitly marked as closing_soon
                if (m.closing_soon) return true;
                
                // Or check if end_date is within 7 days
                if (!m.end_date) return false;
                const closingDate = new Date(m.end_date);
                return closingDate >= now && closingDate <= sevenDaysFromNow;
            });
        } else if (activeCategory === "Trending") {
            // Show all non-resolved markets, ranked by volume
            marketsToFilter = allMarkets.filter(m => m.status !== "RESOLVED");
        } else if (activeCategory === "New") {
            // Show all non-resolved markets, ranked by newest (highest ID = newest)
            marketsToFilter = allMarkets.filter(m => m.status !== "RESOLVED");
        } else {
            // Other categories filter by category name
            marketsToFilter = allMarkets.filter(m => {
                const matchCategory = m.category === activeCategory;
                return matchCategory && m.status !== "RESOLVED";
            });
        }

        let filtered = marketsToFilter.filter(m => {
            const matchSearch = m.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (m.subcategory || "").toLowerCase().includes(searchQuery.toLowerCase());
            const probability = filterMode === "yes" ? m.yes_probability : (100 - m.yes_probability);
            const matchProbability = probability >= minProbability && probability <= maxProbability;
            return matchSearch && matchProbability;
        }).sort((a, b) => {
            // Determine sort order based on active category
            if (activeCategory === "Closing Soon") {
                // Sort by end_date ascending (closest deadline first)
                if (!a.end_date || !b.end_date) return 0;
                const dateA = new Date(a.end_date).getTime();
                const dateB = new Date(b.end_date).getTime();
                return dateA - dateB;
            } else if (activeCategory === "New") {
                // Sort by ID descending (newer markets have higher IDs)
                return b.id - a.id;
            } else if (activeCategory === "Trending" || sortBy === "volume") {
                // Sort by volume descending
                const aVol = parseVolume(a.volume);
                const bVol = parseVolume(b.volume);
                return bVol - aVol;
            } else if (sortBy === "probability") {
                return b.yes_probability - a.yes_probability;
            }
            return 0;
        });
        
        dispatch(setFilteredMarkets(filtered));
    }, [allMarkets, searchQuery, activeCategory, minProbability, maxProbability, filterMode, sortBy, dispatch]);

    const resetFilters = () => {
        setSearchQuery("");
        setMinProbability(0);
        setMaxProbability(100);
        setSortBy("volume");
        setFilterMode("yes");
        setActiveCategory("Trending");
        if (!isMarketPage) {
            router.push(pathname.startsWith("/category") ? "/category" : "/");
        }
    };

    return (
        <>
            {/* Desktop Search Bar - Visible only on md and above, positioned below navbar */}
            <div className="hidden md:block fixed left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b border-border"
                style={{ top: '48px' }}>
                <div className="px-4 sm:px-6 py-3">
                    <div className="relative flex items-center gap-1.5 max-w-3xl mx-auto" ref={searchBoxRef}>
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
                            <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 dropdown-enhanced"
                                style={{animation: 'slideDown 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' as any}}>
                                {/* Tab Navigation */}
                                <div className="flex items-center gap-4 px-4 py-3 border-b border-border sticky top-0 bg-background">
                                    <button
                                        onClick={() => setSearchTab("markets")}
                                        className={`text-sm font-semibold pb-2 border-b-2 transition-all search-tab-underline ${
                                            searchTab === "markets"
                                                ? "text-foreground border-foreground active"
                                                : "text-muted-foreground border-transparent hover:text-foreground"
                                        }`}
                                    >
                                        Markets
                                    </button>
                                    <button
                                        onClick={() => setSearchTab("profiles")}
                                        className={`text-sm font-semibold pb-2 border-b-2 transition-all search-tab-underline ${
                                            searchTab === "profiles"
                                                ? "text-foreground border-foreground active"
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
                                                            href={`/markets/${market.id}-${generateMarketSlug(market.question)}`}
                                                            onClick={() => {
                                                                setIsSearchOpen(false);
                                                                setSearchQuery("");
                                                            }}
                                                            className="search-result-item flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-all duration-200 hover:shadow-md group"
                                                        >
                                                            <div className="flex-1 min-w-0 pt-0.5">
                                                                <p className="text-sm font-semibold text-foreground group-hover:text-purple-300 transition-all duration-200 line-clamp-2">
                                                                    {market.question}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded group-hover:bg-muted/80 transition-all duration-200">
                                                                        {market.subcategory || market.category}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground group-hover:text-muted-foreground/70 transition-all duration-200">
                                                                        {market.yes_probability}% Yes
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 flex-shrink-0 transition-all duration-200 group-hover:text-purple-400">
                                                                <TrendingUp className="h-3.5 w-3.5" />
                                                                <span className="text-xs font-semibold whitespace-nowrap">
                                                                    {market.volume}
                                                                </span>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                                {allMarkets.filter(m => 
                                                    (m.status !== "RESOLVED") &&
                                                    (m.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                    m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                    (m.subcategory || "").toLowerCase().includes(searchQuery.toLowerCase()))
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
                            <div className="absolute right-0 top-full mt-2 w-72 max-h-96 bg-gradient-to-b from-background to-muted border border-border rounded-xl shadow-2xl z-50 p-4 sm:p-5 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto dropdown-enhanced"
                                style={{animation: 'slideDown 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' as any}}>
                                <div className="flex items-center justify-between mb-4 sm:mb-5 sticky top-0 bg-gradient-to-b from-background to-muted">
                                    <h3 className="font-bold text-sm sm:text-base text-foreground">Filters</h3>
                                    <button
                                        onClick={() => setIsFilterOpen(false)}
                                        className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted rounded text-lg"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="space-y-4 sm:space-y-5">
                                    {/* Sort By */}
                                    <div className="filter-item">
                                        <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Sort By</label>
                                        <div className="flex gap-2">
                                            {[
                                                { value: "volume", label: "Volume" },
                                                { value: "probability", label: "Probability" }
                                            ].map(option => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => setSortBy(option.value)}
                                                    className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                                                        sortBy === option.value
                                                            ? "bg-blue-500 text-white shadow-md scale-105"
                                                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                    }`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="h-px bg-border" />

                                    {/* Filter Mode Toggle - Yes/No */}
                                    <div className="filter-item">
                                        <label className="block text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Filter By</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setFilterMode("yes")}
                                                className={`flex-1 px-3 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                                                    filterMode === "yes"
                                                        ? "bg-green-500 text-white shadow-md scale-105"
                                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                }`}
                                            >
                                                Yes
                                            </button>
                                            <button
                                                onClick={() => setFilterMode("no")}
                                                className={`flex-1 px-3 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                                                    filterMode === "no"
                                                        ? "bg-red-500 text-white shadow-md scale-105"
                                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                }`}
                                            >
                                                No
                                            </button>
                                        </div>
                                    </div>

                                    {/* Probability Slider */}
                                    <div className="filter-item">
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="block text-xs font-semibold text-foreground uppercase tracking-wide">
                                                {filterMode === "yes" ? "Yes" : "No"} Probability
                                            </label>
                                            <span className={`text-sm font-bold ${filterMode === "yes" ? "text-green-500" : "text-red-500"}`}>
                                                {minProbability}% - {maxProbability}%
                                            </span>
                                        </div>
                                        <div className="space-y-2 bg-muted/50 p-3 rounded-lg">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] text-muted-foreground font-medium">Min: {minProbability}%</label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={minProbability}
                                                    onChange={(e) => setMinProbability(parseInt(e.target.value))}
                                                    className="w-full h-2.5 rounded-full appearance-none cursor-pointer transition-all accent-green-500"
                                                    style={{
                                                        background: filterMode === "yes"
                                                            ? `linear-gradient(to right, #22c55e 0%, #22c55e ${minProbability}%, #e5e7eb ${minProbability}%, #e5e7eb 100%)`
                                                            : `linear-gradient(to right, #ef4444 0%, #ef4444 ${minProbability}%, #e5e7eb ${minProbability}%, #e5e7eb 100%)`
                                                    }}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] text-muted-foreground font-medium">Max: {maxProbability}%</label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={maxProbability}
                                                    onChange={(e) => setMaxProbability(parseInt(e.target.value))}
                                                    className="w-full h-2.5 rounded-full appearance-none cursor-pointer transition-all accent-green-500"
                                                    style={{
                                                        background: filterMode === "yes"
                                                            ? `linear-gradient(to right, #22c55e 0%, #22c55e ${maxProbability}%, #e5e7eb ${maxProbability}%, #e5e7eb 100%)`
                                                            : `linear-gradient(to right, #ef4444 0%, #ef4444 ${maxProbability}%, #e5e7eb ${maxProbability}%, #e5e7eb 100%)`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="h-px bg-border" />

                                    {/* Reset Filters */}
                                    <button
                                        onClick={() => {
                                            resetFilters();
                                            setIsFilterOpen(false);
                                        }}
                                        className="w-full px-4 py-2.5 text-xs font-bold text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-all hover:text-foreground uppercase tracking-wide hover:scale-105 duration-200"
                                    >
                                        Reset All Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                </div>
            </div>

            {/* Category Tabs - Always visible on all screens, positioned below navbar (and search bar on desktop) */}
            <div className="fixed left-0 right-0 z-39 bg-background/95 backdrop-blur-md border-b border-border px-3 sm:px-6 py-2.5 sm:py-3"
                style={{ top: (navbarHeight + (isDesktop ? 60 : 0)) + 'px' }}>
                <div className="flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar max-w-full sm:max-w-3xl mx-auto">
                    {categories.map((cat, index) => (
                        <button
                            key={cat}
                            onClick={() => {
                                const href = cat === "Trending" ? "/category" : `/category/${categorySlug(cat)}`;

                                if (pathname === "/") {
                                    setActiveCategory(cat);
                                }

                                router.push(href);
                            }}
                            className={`category-tab-item px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs font-medium whitespace-nowrap rounded-lg transition-all duration-300 relative ${
                                activeCategory === cat
                                    ? "bg-gray-900 text-white shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                            style={{
                                animationDelay: `${index * 50}ms`
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}
