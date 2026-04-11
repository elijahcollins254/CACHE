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
    const yesOdds = (100 / market.yes_probability).toFixed(2);
    const noOdds = (100 / noProbability).toFixed(2);

    return (
        <>
            {/* Mobile List View */}
            <Link
                href={`/markets/${market.id}`}
                className="block md:hidden border border-border bg-muted p-4 rounded-lg hover:bg-muted/80 active:bg-muted/60 transition-all duration-300 market-card-enter group first:mt-4 m-3"
            >
                <div className="space-y-3">
                    {/* Question + Save Button */}
                    <div className="flex gap-3 items-start justify-between">
                        <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-purple-300 transition-colors duration-300 flex-1">
                            {market.question}
                        </h3>
                        <button
                            onClick={handleSaveToggle}
                            className={`p-1.5 rounded-lg flex-shrink-0 transition-all duration-300 ${
                                isSaved
                                    ? 'bg-yellow-600/30 text-yellow-400 hover:bg-yellow-600/50 hover:scale-110'
                                    : 'bg-muted/50 text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:scale-110'
                            }`}
                            aria-label="Save market"
                        >
                            <Bookmark className="h-4 w-4 transition-transform" fill={isSaved ? "currentColor" : "none"} />
                        </button>
                    </div>

                    {/* Yes/No Outcomes */}
                    <div className="flex gap-3">
                        <div className="flex-1 px-3 py-2 bg-green-950/50 border border-green-900/60 rounded-lg transition-all duration-300 group-hover:border-green-700/50">
                            <div className="flex items-baseline justify-between gap-2">
                                <span className="text-xs font-medium text-green-200">Yes</span>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-green-100 prob-animate">{market.yes_probability}%</div>
                                    <div className="text-[10px] text-green-300 font-semibold">{yesOdds}x</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 px-3 py-2 bg-red-950/50 border border-red-900/60 rounded-lg transition-all duration-300 group-hover:border-red-700/50">
                            <div className="flex items-baseline justify-between gap-2">
                                <span className="text-xs font-medium text-red-200">No</span>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-red-100 prob-animate">{noProbability}%</div>
                                    <div className="text-[10px] text-red-300 font-semibold">{noOdds}x</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer - Date & Volume */}
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors duration-300 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5 transition-transform duration-300 group-hover:text-purple-400" />
                            <span>{market.volume || 'KES 0'}</span>
                        </div>
                        <span className="font-medium">{formatDate(market.end_date)}</span>
                    </div>
                </div>
            </Link>

            {/* Desktop Card View - Clean Rectangle */}
            <Link
                href={`/markets/${market.id}`}
                className="hidden md:flex overflow-hidden rounded-xl border border-border bg-muted/40 p-4 cursor-pointer transition-all duration-300 hover:bg-muted/60 hover:border-border/80 hover:shadow-lg active:scale-[0.98] market-card-enter card-hover-glow group flex-col justify-between min-h-[220px]"
            >
                {/* Top Section - Question */}
                <div>
                    <h3 className="market-card-title text-base font-semibold leading-snug text-foreground mb-4 group-hover:text-purple-300 transition-colors duration-300 line-clamp-3">
                        {market.question}
                    </h3>
                </div>

                {/* Middle Section - Yes/No Outcomes */}
                <div className="market-card-outcomes flex gap-3 mb-4">
                    {/* Yes Box */}
                    <div className="flex-1 px-3 py-3 bg-green-950/50 border border-green-900/60 rounded-lg transition-all duration-300 hover:border-green-700/60 group-hover:border-green-700/50">
                        <div className="flex flex-col items-center gap-1.5">
                            <span className="text-xs font-medium text-green-200">Yes</span>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-100 prob-animate">{market.yes_probability}%</div>
                                <div className="text-xs text-green-300 font-semibold mt-0.5">{yesOdds}x</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* No Box */}
                    <div className="flex-1 px-3 py-3 bg-red-950/50 border border-red-900/60 rounded-lg transition-all duration-300 hover:border-red-700/60 group-hover:border-red-700/50">
                        <div className="flex flex-col items-center gap-1.5">
                            <span className="text-xs font-medium text-red-200">No</span>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-100 prob-animate">{noProbability}%</div>
                                <div className="text-xs text-red-300 font-semibold mt-0.5">{noOdds}x</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Section - Footer */}
                <div className="market-card-footer flex items-center justify-between pt-3 border-t border-border/50 group-hover:border-purple-500/30 transition-colors duration-300">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors duration-300">
                        <div className="flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 transition-transform duration-300 group-hover:text-purple-400" />
                            <span className="font-medium">{market.volume || 'KES 0'}</span>
                        </div>
                        <span>{formatDate(market.end_date)}</span>
                    </div>
                    
                    {/* Save Button */}
                    <button
                        onClick={handleSaveToggle}
                        className={`market-card-button p-1.5 rounded-lg transition-all duration-300 ${
                            isSaved
                                ? 'bg-yellow-600/30 text-yellow-400 hover:bg-yellow-600/50 save-button-pulse saved'
                                : 'bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        }`}
                        aria-label="Save market"
                    >
                        <Bookmark className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" fill={isSaved ? "currentColor" : "none"} />
                    </button>
                </div>
            </Link>
        </>
    );
}
