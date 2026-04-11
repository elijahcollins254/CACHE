"use client";

import { TrendingUp, Bookmark } from "lucide-react";
import Link from "next/link";
import { useAppDispatch, useAppSelector, selectSavedMarketIds } from "@/lib/redux/hooks";
import { toggleSaveMarket } from "@/lib/redux/slices/marketsSlice";
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
      href={`/markets/${market.id}`}
      className="group block overflow-hidden rounded-3xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/[0.04] p-4 shadow-sm dark:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-400 dark:hover:border-white/15 hover:bg-gray-50 dark:hover:bg-white/[0.06] hover:shadow-md dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.22)] active:scale-[0.99] md:p-5"
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5 px-2.5 py-1 text-[11px] font-medium tracking-wide text-gray-600 dark:text-white/70">
                {market.category}
              </span>

              {market.is_live && (
                <span className="rounded-full border border-emerald-300 dark:border-emerald-400/20 bg-emerald-50 dark:bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium tracking-wide text-emerald-700 dark:text-emerald-300">
                  Live
                </span>
              )}
            </div>

            <h3 className="text-[15px] font-semibold leading-snug text-black dark:text-white/92 line-clamp-3 transition-colors duration-300 group-hover:text-gray-900 dark:group-hover:text-white md:text-[16px]">
              {market.question}
            </h3>
          </div>

          <button
            onClick={handleSaveToggle}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
              isSaved
                ? "border-amber-400/40 dark:border-amber-400/25 bg-amber-100 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 shadow-sm dark:shadow-[0_0_0_1px_rgba(251,191,36,0.08)_inset]"
                : "border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/[0.04] text-gray-500 dark:text-white/55 hover:border-gray-400 dark:hover:border-white/15 hover:bg-gray-200 dark:hover:bg-white/[0.07] hover:text-gray-700 dark:hover:text-white/85"
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
          <div className="rounded-2xl border border-emerald-300 dark:border-emerald-400/10 bg-emerald-50 dark:bg-emerald-400/[0.06] p-3 transition-all duration-300 group-hover:border-emerald-400 dark:group-hover:border-emerald-400/15 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-400/[0.08]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-200/80">Yes</span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-200/60">{yesOdds}x</span>
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-emerald-900 dark:text-emerald-100">
              {yesProbability}%
            </div>
          </div>

          <div className="rounded-2xl border border-rose-300 dark:border-rose-400/10 bg-rose-50 dark:bg-rose-400/[0.06] p-3 transition-all duration-300 group-hover:border-rose-400 dark:group-hover:border-rose-400/15 group-hover:bg-rose-100 dark:group-hover:bg-rose-400/[0.08]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-700 dark:text-rose-200/80">No</span>
              <span className="text-xs font-medium text-rose-600 dark:text-rose-200/60">{noOdds}x</span>
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-rose-900 dark:text-rose-100">
              {noProbability}%
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-gray-300 dark:border-white/8 pt-3 text-xs text-gray-600 dark:text-white/50">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-gray-500 dark:text-white/40" />
            <span className="font-medium text-gray-700 dark:text-white/60">
              {market.volume || "KES 0"}
            </span>
          </div>

          <span className="font-medium text-gray-600 dark:text-white/55">{formatDate(market.end_date)}</span>
        </div>
      </div>
    </Link>
  );
}