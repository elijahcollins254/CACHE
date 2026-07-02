"use client";

import { TrendingUp, Bookmark, Share2, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useAppDispatch, useAppSelector, selectSavedMarketIds } from "@/lib/redux/hooks";
import { toggleSaveMarket } from "@/lib/redux/slices/marketsSlice";
import { generateMarketSlug } from "@/lib/slugify";
import { formatKES, polymarketProbabilityToKES } from "@/lib/currency";
import ShareButton from "./ShareButton";
import { formatVolume } from "@/lib/volume";
import MarketCard from "./MarketCard";
import { useEffect, useState } from "react";

// LMSR Configuration
const LMSR_B = 100.0;
const PAYOUT_PER_SHARE = 100;

function lmsrCost(q_yes: number, q_no: number, b: number = LMSR_B): number {
  try {
    if (!Number.isFinite(q_yes) || !Number.isFinite(q_no) || !Number.isFinite(b)) {
      return 0;
    }
    const exp_yes = Math.exp(q_yes / b);
    const exp_no = Math.exp(q_no / b);
    const result = b * Math.log(exp_yes + exp_no);
    return Number.isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

function calculateLMSRBuyCost(
  q_yes_before: number,
  q_no_before: number,
  outcome: string,
  b: number = LMSR_B
): number {
  const q_yes_after = outcome.toUpperCase() === 'YES' ? q_yes_before + 1 : q_yes_before;
  const q_no_after = outcome.toUpperCase() === 'YES' ? q_no_before : q_no_before + 1;

  const cost_before = lmsrCost(q_yes_before, q_no_before, b);
  const cost_after = lmsrCost(q_yes_after, q_no_after, b);

  const result = (cost_after - cost_before) * PAYOUT_PER_SHARE;
  return Number.isFinite(result) && result >= 0 ? result : 0;
}

function deriveQValuesFromProbability(
  yes_probability: number,
  b: number = LMSR_B
): { q_yes: number; q_no: number } {
  const yes_prob = yes_probability / 100;
  const clampedProb = Math.max(0.01, Math.min(0.99, yes_prob));
  const p_ratio = clampedProb / (1 - clampedProb);
  const q_yes = b * Math.log(p_ratio);
  const q_no = 0;
  return { q_yes, q_no };
}

function getCurrentSharePrice(
  yes_probability: number,
  outcome: string,
  b: number = LMSR_B
): number {
  const { q_yes, q_no } = deriveQValuesFromProbability(yes_probability, b);
  const price = calculateLMSRBuyCost(q_yes, q_no, outcome, b);
  return price;
}

interface ParentMarketCardProps {
  parentMarket: {
    id: number;
    question: string;
    category: string;
    image_url?: string;
    yes_probability: number;
    volume: string;
    end_date: string;
    is_live?: boolean;
    saved?: boolean;
    source?: "polymarket" | "local";
    market_type?: string;
    options?: Array<{
      id: number;
      label: string;
      yes_probability: number;
      no_probability?: number;
    }>;
  };
  childMarkets: any[];
}

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const daysUntil = Math.ceil(
      (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const formatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: daysUntil > 365 ? "numeric" : undefined,
    });

    const formatted = formatter.format(date);

    if (daysUntil < 0) return `Ended ${formatted}`;
    if (daysUntil === 0) return "Today";
    if (daysUntil === 1) return "Tomorrow";
    if (daysUntil <= 7) return `${daysUntil}d`;
    return formatted;
  } catch {
    return dateString;
  }
};

export default function ParentMarketCard({ parentMarket, childMarkets }: ParentMarketCardProps) {
  const dispatch = useAppDispatch();
  const savedMarketIds = useAppSelector(selectSavedMarketIds);
  const [isSaved, setIsSaved] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsSaved(savedMarketIds.includes(parentMarket.id));
  }, [savedMarketIds, parentMarket.id]);

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dispatch(toggleSaveMarket(parentMarket.id));

    const savedIds = [...savedMarketIds];
    if (isSaved) {
      const index = savedIds.indexOf(parentMarket.id);
      if (index > -1) savedIds.splice(index, 1);
    } else {
      savedIds.push(parentMarket.id);
    }

    localStorage.setItem("poly_saved_markets", JSON.stringify(savedIds));
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const yesProbability = parentMarket.yes_probability;
  const noProbability = 100 - yesProbability;
  const isPolymarket = parentMarket.source === "polymarket";
  const yesPriceKes = isPolymarket
    ? polymarketProbabilityToKES(yesProbability)
    : getCurrentSharePrice(yesProbability, "Yes");
  const noPriceKes = isPolymarket
    ? polymarketProbabilityToKES(noProbability)
    : getCurrentSharePrice(yesProbability, "No");

  const isOptionMarket = parentMarket.market_type === "OPTION_LIST" && parentMarket.options && parentMarket.options.length > 0;

  const renderProbabilities = () => {
    if (isOptionMarket) {
      return (
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 md:-mx-4 md:px-4 flex-1 flex items-center min-h-0">
          <div className="flex gap-1.5 min-w-min pb-0.5">
            {parentMarket.options?.map((option) => {
              const optionYesProb = option.yes_probability;
              const optionPriceKes = isPolymarket
                ? polymarketProbabilityToKES(optionYesProb)
                : getCurrentSharePrice(optionYesProb, "Yes");
              return (
                <div
                  key={option.id}
                  className="shrink-0 rounded-lg border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 transition-all duration-300 group-hover:border-blue-400 dark:group-hover:border-blue-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 min-w-[110px] h-[80px] flex flex-col justify-between"
                >
                  <div className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 line-clamp-1">
                    {option.label}
                  </div>
                  <div>
                    <div className="text-lg font-semibold tracking-tight text-blue-900 dark:text-blue-100">
                      {optionYesProb}%
                    </div>
                    <div className="text-[10px] font-medium text-blue-600 dark:text-blue-300 mt-0.5">
                      {formatKES(optionPriceKes)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
        <div className="rounded-lg border border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 p-2 transition-all duration-300 group-hover:border-emerald-400 dark:group-hover:border-emerald-500 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 h-[80px] flex flex-col">
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 mb-auto">Yes</span>
          <div>
            <div className="text-xl font-semibold tracking-tight text-emerald-900 dark:text-emerald-100">
              {yesProbability}%
            </div>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-300">{formatKES(yesPriceKes)}</span>
          </div>
        </div>

        <div className="rounded-lg border border-rose-300 dark:border-rose-600 bg-rose-50 dark:bg-rose-900/20 p-2 transition-all duration-300 group-hover:border-rose-400 dark:group-hover:border-rose-500 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30 h-[80px] flex flex-col">
          <span className="text-[11px] font-medium text-rose-700 dark:text-rose-300 mb-auto">No</span>
          <div>
            <div className="text-xl font-semibold tracking-tight text-rose-900 dark:text-rose-100">
              {noProbability}%
            </div>
            <span className="text-[10px] font-medium text-rose-600 dark:text-rose-300">{formatKES(noPriceKes)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Parent Market Card */}
      <div className="group block overflow-hidden rounded-3xl border border-border bg-muted shadow-sm dark:shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-border/80 hover:bg-muted/80 hover:shadow-md dark:hover:shadow-xl active:scale-[0.99] min-h-[225px] flex flex-col cursor-pointer"
        onClick={handleExpandToggle}>
        {/* Content Section */}
        <div className="flex h-full flex-col gap-2 p-3 md:p-4">
          {/* Header with Image and Title */}
          <div className="flex items-start justify-between gap-3 flex-1">
            {/* Image and Title */}
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {/* Small Square Image */}
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted/50">
                {parentMarket.image_url ? (
                  <img 
                    src={parentMarket.image_url} 
                    alt={parentMarket.question}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                    <div className="text-muted-foreground text-xs opacity-50">No image</div>
                  </div>
                )}
              </div>

              {/* Title and Category */}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
                    {parentMarket.category}
                  </span>

                  {parentMarket.is_live && (
                    <span className="rounded-full border border-emerald-300 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-medium tracking-wide text-emerald-700 dark:text-emerald-300">
                      Live
                    </span>
                  )}
                  
                  {/* Children count badge */}
                  <span className="rounded-full border border-purple-300 dark:border-purple-500 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 text-[10px] font-medium tracking-wide text-purple-700 dark:text-purple-300">
                    {childMarkets.length} markets
                  </span>
                </div>

                <h3 className="text-[13px] md:text-[14px] font-semibold leading-snug text-foreground line-clamp-3 transition-colors duration-300">
                  {parentMarket.question}
                </h3>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-1 shrink-0">
              <button
                onClick={handleSaveToggle}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                  isSaved
                    ? "border-amber-400/40 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 shadow-sm dark:shadow-md"
                    : "border-border bg-muted text-muted-foreground hover:border-border/80 hover:bg-muted/80"
                }`}
                aria-label="Save market"
              >
                <Bookmark
                  className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-105"
                  fill={isSaved ? "currentColor" : "none"}
                />
              </button>

              <button
                onClick={handleExpandToggle}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground hover:border-border/80 hover:bg-muted/80 transition-all duration-300"
                aria-label="Toggle child markets"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
          </div>

          {renderProbabilities()}

          <div className="mt-auto flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium text-foreground text-[11px]">
                {formatVolume(parentMarket.volume)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium text-muted-foreground text-[11px]">{formatDate(parentMarket.end_date)}</span>
              <ShareButton 
                marketTitle={parentMarket.question}
                marketId={parentMarket.id}
                imageUrl={parentMarket.image_url}
                size="sm"
                variant="compact"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Child Markets - Collapsible Section */}
      {isExpanded && (
        <div className="mt-2 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {childMarkets.map((childMarket, index) => (
            <div key={childMarket.id} className="ml-2 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{animationDelay: `${index * 50}ms`}}>
              <MarketCard market={childMarket} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
