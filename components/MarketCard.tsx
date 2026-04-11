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

    // Probability Bar Component
    const ProbabilityBar = ({ probability, label, color }: { probability: number; label: string; color: 'green' | 'red' }) => {
        const isDark = color === 'green';
        const bgColor = isDark ? 'bg-green-950/40' : 'bg-red-950/40';
        const fillColor = isDark ? 'bg-green-500' : 'bg-red-500';
        const textColor = isDark ? 'text-green-400' : 'text-red-400';
        const hoverColor = isDark ? 'hover:bg-green-950/60' : 'hover:bg-red-950/60';
        const borderColor = isDark ? 'border-green-900/40 group-hover:border-green-700/50' : 'border-red-900/40 group-hover:border-red-700/50';

        return (
            <div className={`flex flex-col items-center gap-2 flex-1`}>
                {/* Bar Container */}
                <div className={`w-full h-32 md:h-40 ${bgColor} border ${borderColor} rounded-lg overflow-hidden transition-all duration-300 flex flex-col justify-end ${hoverColor}`}>
                    {/* Animated Fill */}
                    <div
                        className={`bar-fill w-full ${fillColor} transition-all duration-300 ease-out`}
                        style={{
                            height: `${probability}%`,
                            animation: `fillBarBottom 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                        }}
                    />
                </div>
                
                {/* Percentage Text */}
                <div className="text-center">
                    <div className={`text-lg md:text-xl font-bold ${textColor} prob-animate`}>
                        {Math.round(probability)}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                    <div className={`text-xs ${textColor} font-semibold mt-1`}>
                        ({(100 / probability).toFixed(2)}x)
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Mobile List View */}
            <Link
                href={`/markets/${market.id}`}
                className="block md:hidden border-b border-border bg-muted p-4 hover:bg-muted/80 active:bg-muted/60 transition-all duration-300 market-card-enter group"
            >
                <div className="space-y-3">
                    {/* Header */}
                    <div className="flex gap-3 items-start justify-between">
                        <div className="flex gap-3 items-start flex-1">
                            <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-muted/50 overflow-hidden ring-1 ring-border group-hover:ring-purple-500/50 transition-all duration-300">
                                {market.image_url && <img src={market.image_url} alt="" className="h-full w-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-purple-300 transition-colors duration-300">
                                    {market.question}
                                </h3>
                            </div>
                        </div>
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

                    {/* Outcomes - Yes/No Row */}
                    <div className="flex gap-2 items-end justify-center">
                        <ProbabilityBar probability={market.yes_probability} label="Yes" color="green" />
                        <ProbabilityBar probability={noProbability} label="No" color="red" />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors duration-300">
                        <div className="flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5 transition-transform duration-300 group-hover:text-purple-400" />
                            <span>{market.volume || 'KES 0'}</span>
                        </div>
                        <span>{formatDate(market.end_date)}</span>
                    </div>
                </div>
            </Link>

            {/* Desktop Card View */}
            <Link
                href={`/markets/${market.id}`}
                className="hidden md:block overflow-hidden rounded-[20px] border border-border bg-muted backdrop-blur-sm p-5 md:p-6 cursor-pointer transition-all duration-500 ease-in-out hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] market-card-enter card-hover-glow group"
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="market-card-image h-12 w-12 md:h-14 md:w-14 shrink-0 overflow-hidden rounded-[12px] md:rounded-[14px] bg-muted/50 ring-1 ring-border group-hover:ring-purple-500/50 transition-all duration-300">
                        {market.image_url && <img src={market.image_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <button
                        onClick={handleSaveToggle}
                        className={`market-card-button p-2 rounded-lg transition-all duration-300 ${
                            isSaved
                                ? 'bg-yellow-600/30 text-yellow-400 hover:bg-yellow-600/50 save-button-pulse saved'
                                : 'bg-muted/50 text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                        }`}
                        aria-label="Save market"
                    >
                        <Bookmark className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" fill={isSaved ? "currentColor" : "none"} />
                    </button>
                </div>

                <div className="mb-4">
                    <h3 className="market-card-title text-sm md:text-base font-semibold leading-snug text-foreground mb-3 group-hover:text-purple-300 transition-colors duration-300">
                        {market.question}
                    </h3>

                    {/* Outcomes - Yes/No Row */}
                    <div className="market-card-outcomes flex gap-2 items-end justify-center">
                        <ProbabilityBar probability={market.yes_probability} label="Yes" color="green" />
                        <ProbabilityBar probability={noProbability} label="No" color="red" />
                    </div>
                </div>

                <div className="market-card-footer flex items-center justify-between pt-3 border-t border-border group-hover:border-purple-500/30 transition-colors duration-300">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors duration-300">
                        <div className="flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-y-0.5 group-hover:text-purple-400" />
                            <span>{market.volume || 'KES 0'}</span>
                        </div>
                        <span>{formatDate(market.end_date)}</span>
                    </div>
                </div>
            </Link>
        </>
    );
}
