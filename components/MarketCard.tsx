"use client";

import { TrendingUp, Bookmark } from "lucide-react";
import Link from "next/link";
import { useAppDispatch, useAppSelector, selectSavedMarketIds } from "@/lib/redux/hooks";
import { toggleSaveMarket } from "@/lib/redux/slices/marketsSlice";
import { useState, useEffect } from "react";

interface MarketCardProps {
    market: {
        id: number;
        question: string;
        category: string;
        image_url?: string;
        yes_probability: number;
        volume: string;
        end_date: string;
        is_live?: boolean;
        saved?: boolean;
    };
}

const formatDate = (dateString: string): string => {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        const formatter = new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: daysUntil > 365 ? 'numeric' : undefined
        });
        
        const formatted = formatter.format(date);
        
        if (daysUntil < 0) {
            return `Ended ${formatted}`;
        } else if (daysUntil === 0) {
            return `Today`;
        } else if (daysUntil === 1) {
            return `Tomorrow`;
        } else if (daysUntil <= 7) {
            return `${daysUntil}d · ${formatted}`;
        } else {
            return formatted;
        }
    } catch {
        return dateString;
    }
};

export default function MarketCard({ market }: MarketCardProps) {
    const dispatch = useAppDispatch();
    const savedMarketIds = useAppSelector(selectSavedMarketIds);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        setIsSaved(savedMarketIds.includes(market.id));
    }, [savedMarketIds, market.id]);

    const handleSaveToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        dispatch(toggleSaveMarket(market.id));
        
        // Update localStorage
        const savedIds = [...savedMarketIds];
        if (isSaved) {
            const index = savedIds.indexOf(market.id);
            if (index > -1) savedIds.splice(index, 1);
        } else {
            savedIds.push(market.id);
        }
        localStorage.setItem("poly_saved_markets", JSON.stringify(savedIds));
    };

    const noProbability = 100 - market.yes_probability;

    return (
        <>
            {/* Mobile List View */}
            <Link
                href={`/markets/${market.id}`}
                className="block md:hidden border-b border-border bg-muted p-4 hover:opacity-80 transition-all active:bg-muted/80"
            >
                <div className="space-y-3">
                    {/* Header */}
                    <div className="flex gap-3 items-start justify-between">
                        <div className="flex gap-3 items-start flex-1">
                            <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-muted/50 overflow-hidden ring-1 ring-border">
                                {market.image_url && <img src={market.image_url} alt="" className="h-full w-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-foreground leading-snug">
                                    {market.question}
                                </h3>
                            </div>
                        </div>
                        <button
                            onClick={handleSaveToggle}
                            className={`p-1.5 rounded-lg flex-shrink-0 transition-all duration-200 ${
                                isSaved
                                    ? 'bg-yellow-600/30 text-yellow-400'
                                    : 'bg-muted/50 text-muted-foreground'
                            }`}
                            aria-label="Save market"
                        >
                            <Bookmark className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} />
                        </button>
                    </div>

                    {/* Outcomes - Yes/No Row */}
                    <div className="flex gap-2 items-center">
                        <div className="flex-1 flex items-center justify-between gap-2 px-3 py-2 bg-green-950/30 border border-green-900/30 rounded-lg">
                            <span className="text-xs font-medium text-green-400">Yes</span>
                            <span className="text-sm font-bold text-green-300">{market.yes_probability}%</span>
                        </div>
                        <button className="px-2 py-1.5 text-xs font-bold text-green-400 hover:bg-green-950/40 rounded transition-colors">
                            Yes
                        </button>
                        <div className="flex-1 flex items-center justify-between gap-2 px-3 py-2 bg-red-950/30 border border-red-900/30 rounded-lg">
                            <span className="text-xs font-medium text-red-400">No</span>
                            <span className="text-sm font-bold text-red-300">{noProbability}%</span>
                        </div>
                        <button className="px-2 py-1.5 text-xs font-bold text-red-400 hover:bg-red-950/40 rounded transition-colors">
                            No
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span>{market.volume || 'KES 0'}</span>
                        </div>
                        <span>Monthly</span>
                    </div>
                </div>
            </Link>

            {/* Desktop Card View */}
            <Link
                href={`/markets/${market.id}`}
                className="hidden md:block overflow-hidden rounded-[20px] border border-border bg-muted backdrop-blur-sm p-5 md:p-6 cursor-pointer transition-all duration-300 hover:opacity-90 hover:shadow-lg active:scale-[0.98]"
            >
                <div className="flex items-start justify-between mb-5 md:mb-6">
                    <div className="h-12 w-12 md:h-14 md:w-14 shrink-0 overflow-hidden rounded-[12px] md:rounded-[14px] bg-muted/50 ring-1 ring-border">
                        {market.image_url && <img src={market.image_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex items-center gap-2">
                        {market.is_live && (
                            <div className="flex items-center gap-1.5 rounded-full bg-red-950/30 px-2.5 md:px-3 py-1 md:py-1.5 ring-1 ring-red-900/30">
                                <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-red-400">Live</span>
                            </div>
                        )}
                        <button
                            onClick={handleSaveToggle}
                            className={`p-2 rounded-lg transition-all duration-200 ${
                                isSaved
                                    ? 'bg-yellow-600/30 text-yellow-400 hover:bg-yellow-600/50'
                                    : 'bg-muted/50 text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                            }`}
                            aria-label="Save market"
                        >
                            <Bookmark className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} />
                        </button>
                    </div>
                </div>

                <div className="grow mb-6">
                    <h3 className="text-base md:text-lg font-semibold leading-snug tracking-tight text-foreground hover:text-apple-blue transition-colors duration-200 mb-4">
                        {market.question}
                    </h3>

                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs md:text-sm font-medium text-muted-foreground">Yes Probability</span>
                            <span className="text-sm md:text-base font-semibold text-foreground">{market.yes_probability}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden ring-1 ring-border">
                            <div
                                className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-1000"
                                style={{ width: `${market.yes_probability}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-4 md:gap-5">
                        <div className="flex items-center gap-1.5 text-xs md:text-sm font-medium text-muted-foreground">
                            <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                            <span>{market.volume || 'KES 0'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs md:text-sm font-medium text-muted-foreground">
                            <span>{formatDate(market.end_date)}</span>
                        </div>
                    </div>
                </div>
            </Link>
        </>
    );
}
