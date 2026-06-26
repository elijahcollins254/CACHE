"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock3, TrendingUp, Wallet, DollarSign } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import MarketChart from "@/components/MarketChart";

export const dynamic = "force-dynamic";

type BrokerageMarket = {
  id: string | number;
  question?: string;
  description?: string;
  category?: string;
  image?: string;
  icon?: string;
  volume?: string | number;
  liquidity?: string | number;
  endDate?: string;
  endDateIso?: string;
  active?: boolean;
  closed?: boolean;
  outcomes?: string;
  outcomePrices?: string;
  clobTokenIds?: string | string[];
  bestBid?: number;
  bestAsk?: number;
  source?: string;
  [key: string]: any;
};

type ChartPoint = {
  timestamp: number;
  yes: number;
  no: number;
};

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [value];
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
}

function parseNumberArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "number" ? item : Number(item))).filter(Number.isFinite);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map((item) => (typeof item === "number" ? item : Number(item))).filter(Number.isFinite)
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function parseProbability(value: unknown, fallback = 0.5): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed <= 1 ? parsed * 100 : parsed;
}

function formatCurrency(value: unknown): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: unknown): string {
  if (!value) return "—";
  try {
    return new Date(String(value)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function toChartPoints(rawHistory: any[], currentProbability: number): ChartPoint[] {
  if (!Array.isArray(rawHistory) || rawHistory.length === 0) {
    return [
      {
        timestamp: Math.floor(Date.now() / 1000),
        yes: currentProbability,
        no: 100 - currentProbability,
      },
    ];
  }

  return rawHistory.map((point) => {
    const rawPrice = point?.p ?? point?.price ?? point?.value ?? 0.5;
    const price = typeof rawPrice === "string" ? Number(rawPrice) : rawPrice;
    const yes = price <= 1 ? price * 100 : price;
    const timestamp = Number(point?.t ?? point?.timestamp ?? Date.now() / 1000);

    return {
      timestamp: Number.isFinite(timestamp) ? timestamp : Math.floor(Date.now() / 1000),
      yes: Math.max(0, Math.min(100, yes)),
      no: 100 - Math.max(0, Math.min(100, yes)),
    };
  });
}

export default function BrokerageMarketDetailPage() {
  const params = useParams();
  const marketIdParam = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [market, setMarket] = useState<BrokerageMarket | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<"Yes" | "No">("Yes");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [orderAmount, setOrderAmount] = useState("100");
  const [limitPrice, setLimitPrice] = useState("50");
  const [limitShares, setLimitShares] = useState("1");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!marketIdParam) return;

    let active = true;

    const loadMarket = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/brokerage/markets/`);
        if (!response.ok) throw new Error("Unable to load brokerage markets");

        const data = await response.json();
        const markets = Array.isArray(data) ? data : data.results || [];
        
        console.log('[Market Load] Searching for market:', { marketIdParam, totalMarketsInFeed: markets.length });
        
        let found = markets.find((item: BrokerageMarket) => {
          const id = String(item.id);
          return id === String(marketIdParam) || id === String(item.external_id || "");
        });

        // If not found in the feed, try fetching directly by ID
        if (!found) {
          console.log('[Market Load] Market not found in feed, trying direct fetch');
          try {
            const directResponse = await fetchWithAuth(
              `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/brokerage/markets/${marketIdParam}/`
            );
            if (directResponse.ok) {
              const directData = await directResponse.json();
              if (directData && (directData.id || directData.external_id)) {
                found = directData;
                console.log('[Market Load] Found market via direct fetch');
              }
            }
          } catch (err) {
            console.log('[Market Load] Direct fetch failed:', err);
          }
        }

        if (!found) {
          throw new Error("This market was not found in the brokerage feed.");
        }

        if (!active) return;
        setMarket(found);

        const probability = parseProbability(found?.outcomePrices ? parseNumberArray(found.outcomePrices)[0] : found?.bestBid, 50);
        try {
          const historyResponse = await fetchWithAuth(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/brokerage/markets/${found.id}/price-history/?period=ALL`
          );
          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            const rawHistory = Array.isArray(historyData?.history)
              ? historyData.history
              : Array.isArray(historyData?.data)
                ? historyData.data
                : [];
            if (!active) return;
            setChartData(toChartPoints(rawHistory, probability));
          } else {
            if (!active) return;
            setChartData([
              {
                timestamp: Math.floor(Date.now() / 1000),
                yes: probability,
                no: 100 - probability,
              },
            ]);
          }
        } catch {
          if (!active) return;
          setChartData([
            {
              timestamp: Math.floor(Date.now() / 1000),
              yes: probability,
              no: 100 - probability,
            },
          ]);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load this market");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadMarket();
    return () => {
      active = false;
    };
  }, [marketIdParam]);

  const outcomes = useMemo(() => parseStringArray(market?.outcomes), [market]);
  const outcomePrices = useMemo(() => parseNumberArray(market?.outcomePrices), [market]);
  const yesProbability = useMemo(() => parseProbability(outcomePrices[0], market?.bestBid ? market.bestBid * 100 : 50), [outcomePrices, market]);
  const noProbability = 100 - yesProbability;

  const orderPreview = useMemo(() => {
    const amount = Number(orderAmount);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const payout = amount * ((selectedOutcome === "Yes" ? yesProbability : noProbability) / 100);
    const slippage = Math.max(0.25, Math.min(5, Math.abs(yesProbability - 50) / 10));

    return {
      payout: payout.toFixed(2),
      slippage: slippage.toFixed(2),
      impliedPrice: (selectedOutcome === "Yes" ? yesProbability : noProbability).toFixed(1),
    };
  }, [noProbability, orderAmount, selectedOutcome, yesProbability]);

  const handlePlaceOrder = async () => {
    if (!market) return;

    const parsedAmount = Number(orderAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setOrderMessage("Enter a valid amount in USD.");
      return;
    }

    if (orderType === "limit") {
      const parsedLimitPrice = Number(limitPrice);
      const parsedShares = Number(limitShares);
      if (!Number.isFinite(parsedLimitPrice) || parsedLimitPrice <= 0 || parsedLimitPrice > 100) {
        setOrderMessage("Enter a valid limit price between 1 and 100.");
        return;
      }
      if (!Number.isFinite(parsedShares) || parsedShares <= 0) {
        setOrderMessage("Enter a valid share quantity.");
        return;
      }
    }

    const storedUser = localStorage.getItem("poly_user");
    if (!storedUser) {
      setOrderMessage("Please log in to place an order.");
      return;
    }

    setPlacingOrder(true);
    setOrderMessage(null);

    try {
      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/brokerage/orders/place/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market_id: market.id,
          side: selectedOutcome === "Yes" ? "BUY" : "SELL",
          size: orderType === "limit" ? Number(limitShares) : parsedAmount / 100,
          price: orderType === "limit"
            ? Math.max(0.001, Math.min(0.999, Number(limitPrice) / 100))
            : Math.max(0.001, Math.min(0.999, yesProbability / 100)),
          order_type: orderType,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || payload?.detail || "Order placement failed.");
      }

      setOrderMessage(`Order submitted for ${selectedOutcome} (${orderType}).`);
      setOrderAmount("100");
      setLimitPrice("50");
      setLimitShares("1");
    } catch (err) {
      setOrderMessage(err instanceof Error ? err.message : "Order placement failed.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 text-foreground">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 text-foreground">
        <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-card p-6 shadow-sm">
          <Link href="/markets" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to markets
          </Link>
          <h1 className="text-2xl font-semibold">Market unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error || "This brokerage market could not be loaded."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Link href="/markets" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to markets
        </Link>

        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-6 sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center rounded-full border border-emerald-600/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">
                  Brokerage market
                </div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{market.question || "Untitled market"}</h1>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                  {market.description || "No additional description provided."}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background/70 p-4 sm:min-w-[240px]">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Current probability</div>
                <div className="mt-2 text-4xl font-semibold text-foreground">{yesProbability.toFixed(1)}%</div>
                <div className="mt-2 text-sm text-muted-foreground">No: {noProbability.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Volume
              </div>
              <div className="mt-3 text-xl font-semibold">{formatCurrency(market.volume || market.volumeNum)}</div>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <Wallet className="h-4 w-4" />
                Liquidity
              </div>
              <div className="mt-3 text-xl font-semibold">{formatCurrency(market.liquidity || market.liquidityNum)}</div>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <Clock3 className="h-4 w-4" />
                End date
              </div>
              <div className="mt-3 text-xl font-semibold">{formatDate(market.endDate || market.endDateIso)}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Price history</h2>
              <span className="text-sm text-muted-foreground">Brokerage feed only</span>
            </div>
            <MarketChart data={chartData} loading={loading} isMobile={false} />
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Outcomes</h2>
              <div className="mt-4 space-y-3">
                {(outcomes.length > 0 ? outcomes : ["Yes", "No"]).map((label, index) => {
                  const probability = index === 0 ? yesProbability : noProbability;
                  return (
                    <div key={`${label}-${index}`} className="flex items-center justify-between rounded-2xl border border-border bg-background/70 px-4 py-3">
                      <div>
                        <div className="font-medium">{label}</div>
                        <div className="text-sm text-muted-foreground">{index === 0 ? "Yes" : "No"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">{probability.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">{formatCurrency(market.volume ? Number(market.volume) * (probability / 100) : 0)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Trade</h2>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {(["Yes", "No"] as const).map((outcome) => (
                    <button
                      key={outcome}
                      type="button"
                      onClick={() => setSelectedOutcome(outcome)}
                      className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${selectedOutcome === outcome ? "border-foreground bg-foreground text-background" : "border-border bg-background/70 text-foreground hover:bg-muted"}`}
                    >
                      {outcome}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(["market", "limit"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setOrderType(type)}
                      className={`rounded-2xl border px-3 py-2 text-sm font-semibold capitalize transition ${orderType === type ? "border-foreground bg-foreground text-background" : "border-border bg-background/70 text-foreground hover:bg-muted"}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {orderType === "market" ? (
                  <label className="block text-sm font-medium text-muted-foreground">
                    Amount (USD)
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={orderAmount}
                      onChange={(event) => setOrderAmount(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-border bg-background/70 px-3 py-3 text-base font-semibold text-foreground outline-none ring-0"
                    />
                  </label>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-muted-foreground">
                      Limit price (%)
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        value={limitPrice}
                        onChange={(event) => setLimitPrice(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-border bg-background/70 px-3 py-3 text-base font-semibold text-foreground outline-none ring-0"
                      />
                    </label>
                    <label className="block text-sm font-medium text-muted-foreground">
                      Shares
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={limitShares}
                        onChange={(event) => setLimitShares(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-border bg-background/70 px-3 py-3 text-base font-semibold text-foreground outline-none ring-0"
                      />
                    </label>
                  </div>
                )}

                {orderPreview ? (
                  <div className="rounded-2xl border border-border bg-background/70 p-3 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Estimated payout</span>
                      <span className="font-semibold text-foreground">USD {orderPreview.payout}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span>Estimated slippage</span>
                      <span className="font-semibold text-foreground">{orderPreview.slippage}%</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span>Implied price</span>
                      <span className="font-semibold text-foreground">{orderPreview.impliedPrice}%</span>
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={placingOrder}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <DollarSign className="h-4 w-4" />
                  {placingOrder ? "Placing order..." : `Place ${orderType === "market" ? "market" : "limit"} ${selectedOutcome}`}
                </button>

                {orderMessage ? (
                  <p className="rounded-2xl border border-border bg-background/70 px-3 py-2 text-sm text-muted-foreground">
                    {orderMessage}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Market details</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Category</dt>
                  <dd className="font-medium">{market.category || "General"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium">{market.closed ? "Closed" : market.active ? "Open" : "Inactive"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Best bid</dt>
                  <dd className="font-medium">{market.bestBid ? `${(market.bestBid * 100).toFixed(1)}%` : "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Best ask</dt>
                  <dd className="font-medium">{market.bestAsk ? `${(market.bestAsk * 100).toFixed(1)}%` : "—"}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
