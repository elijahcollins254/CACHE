"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAppSelector, selectAllMarkets } from "@/lib/redux/hooks";
import { formatVolume } from "@/lib/volume";
import { generateMarketSlug } from "@/lib/slugify";
import { Search, TrendingUp } from "lucide-react";

export default function GlobalSearch() {
    const allMarkets = useAppSelector(selectAllMarkets);
    const [searchQuery, setSearchQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [filteredMarkets, setFilteredMarkets] = useState<any[]>([]);
    const searchBoxRef = useRef<HTMLDivElement>(null);

    // Filter markets based on search query
    useEffect(() => {
        if (searchQuery.trim().length > 0) {
            const query = searchQuery.toLowerCase();
            const results = allMarkets.filter(market => 
                market.question.toLowerCase().includes(query) ||
                market.category.toLowerCase().includes(query)
            ).slice(0, 8);
            
            setFilteredMarkets(results);
            setIsOpen(true);
        } else {
            setFilteredMarkets([]);
            setIsOpen(false);
        }
    }, [searchQuery, allMarkets]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearchSelect = () => {
        setSearchQuery("");
        setIsOpen(false);
    };

    return (
        <div className="hidden md:flex flex-1 max-w-2xl mx-8" ref={searchBoxRef}>
            <div className="relative w-full">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search markets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchQuery && setIsOpen(true)}
                        className="w-full h-9 rounded-lg bg-muted pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/50 focus:bg-muted/80 transition-all"
                    />
                </div>

                {/* Dropdown Results */}
                {isOpen && searchQuery.trim().length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {filteredMarkets.length > 0 ? (
                            <div className="max-h-96 overflow-y-auto">
                                {filteredMarkets.map((market) => (
                                    <Link
                                        key={market.id}
                                        href={`/markets/${market.id}-${generateMarketSlug(market.question)}`}
                                        onClick={handleSearchSelect}
                                        className="flex items-start gap-3 px-4 py-3 hover:bg-muted border-b border-border last:border-b-0 transition-colors group"
                                    >
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <p className="text-sm font-semibold text-foreground group-hover:text-apple-blue transition-colors truncate">
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
                                                {formatVolume(market.volume)}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="px-4 py-8 text-center">
                                <p className="text-sm text-muted-foreground">No markets found for "{searchQuery}"</p>
                                <p className="text-xs text-muted-foreground mt-2">Try searching by market name or category</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
