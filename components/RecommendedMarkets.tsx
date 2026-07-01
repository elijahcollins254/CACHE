import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatKES } from "@/lib/currency";

interface RecommendedMarketsProps {
  markets: any[];
  currentMarketId?: string | number | null;
  title?: string;
}

function truncateText(text: string, maxLength = 80) {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

export default function RecommendedMarkets({
  markets,
  currentMarketId,
  title = "Recommended Markets",
}: RecommendedMarketsProps) {
  if (!Array.isArray(markets) || markets.length === 0) {
    return null;
  }

  const visibleMarkets = markets.filter((market) => {
    const marketId = String(market?.id ?? "");
    const externalId = String(market?.external_id ?? "");
    const currentId = currentMarketId == null ? "" : String(currentMarketId);
    return marketId !== currentId && externalId !== currentId;
  });

  if (visibleMarkets.length === 0) {
    return null;
  }

  return (
    <section className="bg-muted rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </h3>
      </div>

      <div className="space-y-3">
        {visibleMarkets.slice(0, 4).map((market) => {
          const probability = Number(market?.yes_probability ?? 50);
          const yesProbability = Number.isFinite(probability) ? Math.max(0, Math.min(100, probability)) : 50;
          const noProbability = 100 - yesProbability;

          return (
            <Link
              key={market?.id ?? market?.external_id ?? market?.question}
              href={`/markets/${market?.id ?? market?.external_id}`}
              className="group flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/70 p-3 transition hover:border-foreground/20 hover:bg-background"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground line-clamp-2">
                  {truncateText(market?.question || "Untitled market", 85)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-green-600 dark:text-green-400">
                    Yes {yesProbability}%
                  </span>
                  <span className="rounded-full bg-red-500/10 px-2 py-1 text-red-600 dark:text-red-400">
                    No {noProbability}%
                  </span>
                  <span>{formatKES(market?.volume || 0)}</span>
                </div>
              </div>

              <div className="flex-shrink-0 text-muted-foreground transition group-hover:text-foreground">
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
