"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { generateMarketSlug } from "@/lib/slugify";

interface BitcoinMarket {
  id: number;
  question: string;
  yes_probability: number;
  no_probability: number;
  current_bitcoin_price: number | null;
  current_bitcoin_price_formatted: string;
  volume: string;
  yes_multiplier: number;
  no_multiplier: number;
  status: string;
  trading_end_time: string | null;
  market_type: string;
}

export default function BitcoinCard() {
  const [market, setMarket] = useState<BitcoinMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [priceChange, setPriceChange] = useState<number>(0);

  const fetchBitcoinMarket = useCallback(async () => {
    try {
      const response = await fetch("/api/markets/bitcoin/");
      if (!response.ok) throw new Error("Failed to fetch Bitcoin market");
      const data: BitcoinMarket = await response.json();
      
      // Track price movement
      if (data.current_bitcoin_price) {
        setPriceHistory((prev) => {
          const newHistory = [...prev, data.current_bitcoin_price!];
          // Keep only last 2 prices for comparison
          return newHistory.slice(-2);
        });

        // Calculate price change percentage
        if (priceHistory.length > 0) {
          const change =
            ((data.current_bitcoin_price - priceHistory[0]) /
              priceHistory[0]) *
            100;
          setPriceChange(change);
        }
      }

      setMarket(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading Bitcoin market");
      console.error("Bitcoin market error:", err);
    } finally {
      setLoading(false);
    }
  }, [priceHistory]);

  // Initial fetch
  useEffect(() => {
    fetchBitcoinMarket();
  }, []);

  // Refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchBitcoinMarket, 30000);
    return () => clearInterval(interval);
  }, [fetchBitcoinMarket]);

  if (loading) {
    return (
      <div className="h-48 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 animate-pulse" />
    );
  }

  if (error || !market) {
    return null;
  }

  const priceDirection = priceChange > 0 ? "up" : priceChange < 0 ? "down" : null;
  const slug = generateMarketSlug(market.question);
  const marketLink = `/market/${market.id}/${slug}`;

  return (
    <Link href={marketLink}>
      <div className="group cursor-pointer rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5 hover:border-orange-400 hover:shadow-xl hover:shadow-orange-100/50 transition-all duration-300 transform hover:scale-105">
        {/* Header with Icon & Title */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-white">₿</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg group-hover:text-orange-600 transition-colors">
                Bitcoin
              </h3>
              <p className="text-sm text-gray-500">Live 5-minute market</p>
            </div>
          </div>

          {/* Current Price */}
          <div className="text-right">
            {market.current_bitcoin_price && (
              <div>
                <p className="font-bold text-xl text-gray-900">
                  {market.current_bitcoin_price_formatted}
                </p>
                {priceDirection && (
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 px-2 py-1 rounded-lg font-semibold text-sm ${
                      priceDirection === "up"
                        ? "text-green-600 bg-green-50"
                        : "text-red-600 bg-red-50"
                    }`}
                  >
                    {priceDirection === "up" ? (
                      <>
                        <TrendingUp className="w-4 h-4" />
                        <span>Up {Math.abs(priceChange).toFixed(2)}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4" />
                        <span>Down {Math.abs(priceChange).toFixed(2)}%</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Odds Display */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* YES Odds */}
          <div
            className={`rounded-xl p-3 transition-all duration-300 ${
              market.yes_probability > 50
                ? "bg-gradient-to-br from-green-100 to-green-50 border-2 border-green-400 shadow-md"
                : "bg-gray-50 border border-gray-200"
            }`}
          >
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Up / Yes
            </div>
            <div className="text-3xl font-bold text-green-600 mt-1">
              {market.yes_probability}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              @{market.yes_multiplier.toFixed(2)}x
            </div>
          </div>

          {/* NO Odds */}
          <div
            className={`rounded-xl p-3 transition-all duration-300 ${
              market.no_probability > 50
                ? "bg-gradient-to-br from-red-100 to-red-50 border-2 border-red-400 shadow-md"
                : "bg-gray-50 border border-gray-200"
            }`}
          >
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Down / No
            </div>
            <div className="text-3xl font-bold text-red-600 mt-1">
              {market.no_probability}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              @{market.no_multiplier.toFixed(2)}x
            </div>
          </div>
        </div>

        {/* Volume Footer */}
        <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
          <span className="text-gray-600 font-medium">Total Volume</span>
          <span className="font-bold text-gray-900">{market.volume}</span>
        </div>

        {/* Status Badge */}
        <div className="mt-3 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-gray-600">
            {market.status === "OPEN" ? "Live & Active" : market.status}
          </span>
        </div>
      </div>
    </Link>
  );
}
