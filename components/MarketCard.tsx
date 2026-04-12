"use client";

import { TrendingUp, Bookmark } from "lucide-react";
import Link from "next/link";
import { useAppDispatch, useAppSelector, selectSavedMarketIds } from "@/lib/redux/hooks";
import { toggleSaveMarket } from "@/lib/redux/slices/marketsSlice";
import { generateMarketSlug } from "@/lib/slugify";
import { useEffect, useState } from "react";

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

    const savedIds = [...savedMarketIds];
    if (isSaved) {
      const index = savedIds.indexOf(market.id);
      if (index > -1) savedIds.splice(index, 1);
    } else {
      savedIds.push(market.id);
    }

    localStorage.setItem("poly_saved_markets", JSON.stringify(savedIds));
  };

  const yesProbability = market.yes_probability;
  const noProbability = 100 - yesProbability;
  const yesOdds = yesProbability > 0 ? (100 / yesProbability).toFixed(2) : "∞";
  const noOdds = noProbability > 0 ? (100 / noProbability).toFixed(2) : "∞";

  return (
    <Link
      href={`/markets/${market.id}-${generateMarketSlug(market.question)}`}
      className="group block overflow-hidden rounded-3xl border border-border bg-muted p-4 shadow-sm dark:shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-border/80 hover:bg-muted/80 hover:shadow-md dark:hover:shadow-xl active:scale-[0.99] md:p-5"
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium tracking-wide text-muted-foreground">
                {market.category}
              </span>

              {market.is_live && (
                <span className="rounded-full border border-emerald-300 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 text-[11px] font-medium tracking-wide text-emerald-700 dark:text-emerald-300">
                  Live
                </span>
              )}
            </div>

            <h3 className="text-[15px] font-semibold leading-snug text-foreground line-clamp-3 transition-colors duration-300 md:text-[16px]">
              {market.question}
            </h3>
          </div>

          <button
            onClick={handleSaveToggle}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
              isSaved
                ? "border-amber-400/40 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 shadow-sm dark:shadow-md"
                : "border-border bg-muted text-muted-foreground hover:border-border/80 hover:bg-muted/80"
            }`}
            aria-label="Save market"
          >
            <Bookmark
              className="h-4 w-4 transition-transform duration-300 group-hover:scale-105"
              fill={isSaved ? "currentColor" : "none"}
            />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 p-3 transition-all duration-300 group-hover:border-emerald-400 dark:group-hover:border-emerald-500 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Yes</span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-300">{yesOdds}x</span>
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-emerald-900 dark:text-emerald-100">
              {yesProbability}%
            </div>
          </div>

          <div className="rounded-2xl border border-rose-300 dark:border-rose-600 bg-rose-50 dark:bg-rose-900/20 p-3 transition-all duration-300 group-hover:border-rose-400 dark:group-hover:border-rose-500 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-700 dark:text-rose-300">No</span>
              <span className="text-xs font-medium text-rose-600 dark:text-rose-300">{noOdds}x</span>
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-rose-900 dark:text-rose-100">
              {noProbability}%
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium text-foreground">
              {market.volume || "KES 0"}
            </span>
          </div>

          <span className="font-medium text-muted-foreground">{formatDate(market.end_date)}</span>
        </div>
      </div>
    </Link>
  );
}