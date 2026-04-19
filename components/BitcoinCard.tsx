"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

interface BitcoinMarket {
  id: number;
  question: string;
  yes_probability: number;
  no_probability: number;
  current_bitcoin_price: number | null;
  volume: string;
  yes_multiplier: number;
  no_multiplier: number;
  status: string;
}

export default function BitcoinCard() {
  const [market, setMarket] = useState<BitcoinMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);

  const fetchBitcoinMarket = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/bitcoin/`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      
      setMarket(data);
      setPriceHistory((prev) => {
        const newHistory = [...prev, data.current_bitcoin_price].slice(-2);
        if (newHistory.length === 2) {
          const change = ((newHistory[1] - newHistory[0]) / newHistory[0]) * 100;
          setPriceChange(change);
        }
        return newHistory;
      });
    } catch (err) {
      console.error("Error fetching Bitcoin market:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBitcoinMarket();
    const interval = setInterval(fetchBitcoinMarket, 30000);
    return () => clearInterval(interval);
  }, [fetchBitcoinMarket]);

  if (loading) {
    return <div className="h-48 rounded-2xl bg-gray-100 animate-pulse" />;
  }

  if (!market) return null;

  const priceDirection = priceChange ? (priceChange > 0 ? "up" : "down") : null;

  return (
    <Link href="/market/bitcoin">
      <div className="group cursor-pointer rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-4 hover:border-orange-400 hover:shadow-lg transition-all duration-300">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold">
              ₿
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Bitcoin</h3>
              <p className="text-xs text-gray-500">5 min up/down</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-gray-900">
              ${market.current_bitcoin_price?.toLocaleString("en-US", { maximumFractionDigits: 0 }) || "—"}
            </p>
            {priceDirection && (
              <p className={`text-xs font-semibold flex items-center justify-end gap-1 ${
                priceDirection === "up" ? "text-green-600" : "text-red-600"
              }`}>
                {priceDirection === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(priceChange!).toFixed(2)}%
              </p>
            )}
          </div>
        </div>

        {/* Odds */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className={`rounded p-2 text-center ${
            market.yes_probability > 50 ? "bg-green-100 border border-green-300" : "bg-gray-100 border border-gray-200"
          }`}>
            <div className="text-xs text-gray-600 font-medium">Up</div>
            <div className="text-lg font-bold text-green-600">{market.yes_probability}%</div>
          </div>
          <div className={`rounded p-2 text-center ${
            market.no_probability > 50 ? "bg-red-100 border border-red-300" : "bg-gray-100 border border-gray-200"
          }`}>
            <div className="text-xs text-gray-600 font-medium">Down</div>
            <div className="text-lg font-bold text-red-600">{market.no_probability}%</div>
          </div>
        </div>

        {/* Volume & Status */}
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>📊 {market.volume}</span>
          {market.status === "OPEN" && <span className="text-green-600 font-semibold">🔴 LIVE</span>}
        </div>
      </div>
    </Link>
  );
}
