"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, Activity } from "lucide-react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Navbar from "@/components/Navbar";

interface PriceData {
  time: string;
  price: number;
}

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

export default function BitcoinPage() {
  const [market, setMarket] = useState<BitcoinMarket | null>(null);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBitcoinData = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/bitcoin/`
        );
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setMarket(data);
        setCurrentPrice(data.current_bitcoin_price);

        // Add to price history
        setPriceData((prev) => {
          const newData = [
            ...prev,
            {
              time: new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              price: data.current_bitcoin_price,
            },
          ].slice(-20); // Keep last 20 data points

          // Calculate price change
          if (newData.length > 1) {
            const firstPrice = newData[0].price;
            const lastPrice = newData[newData.length - 1].price;
            const change = ((lastPrice - firstPrice) / firstPrice) * 100;
            setPriceChange(change);
          }

          return newData;
        });
      } catch (err) {
        console.error("Error fetching Bitcoin data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBitcoinData();
    const interval = setInterval(fetchBitcoinData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading || !market) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded w-1/3" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const priceDirection = priceChange ? (priceChange > 0 ? "up" : "down") : null;
  const isUp = market.yes_probability > 50;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-4xl">₿</span>
              Bitcoin Live Market
            </h1>
            <p className="text-gray-600">5-minute price prediction</p>
          </div>
        </div>

        {/* Price Ticker */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Current Price */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600 font-medium">Current Price</span>
              <Activity className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-4xl font-bold text-gray-900">
              ${currentPrice?.toLocaleString("en-US", { maximumFractionDigits: 2 }) || "—"}
            </div>
            {priceDirection && (
              <div
                className={`text-lg font-semibold mt-2 flex items-center gap-2 ${
                  priceDirection === "up" ? "text-green-600" : "text-red-600"
                }`}
              >
                {priceDirection === "up" ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
                {Math.abs(priceChange!).toFixed(2)}% in last {priceData.length > 1 ? priceData.length * 5 : 5}s
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>

          {/* Market Odds - YES */}
          <div className={`rounded-lg border p-6 ${
            isUp
              ? "bg-green-50 border-green-300 shadow-sm"
              : "bg-gray-50 border-gray-200"
          }`}>
            <div className="text-sm text-gray-600 font-medium mb-2">
              Price UP (YES)
            </div>
            <div className="text-5xl font-bold text-green-600 mb-1">
              {market.yes_probability}%
            </div>
            <div className="text-sm text-gray-600">
              Multiplier: <span className="font-bold text-green-600">{market.yes_multiplier}x</span>
            </div>
          </div>

          {/* Market Odds - NO */}
          <div className={`rounded-lg border p-6 ${
            !isUp
              ? "bg-red-50 border-red-300 shadow-sm"
              : "bg-gray-50 border-gray-200"
          }`}>
            <div className="text-sm text-gray-600 font-medium mb-2">
              Price DOWN (NO)
            </div>
            <div className="text-5xl font-bold text-red-600 mb-1">
              {market.no_probability}%
            </div>
            <div className="text-sm text-gray-600">
              Multiplier: <span className="font-bold text-red-600">{market.no_multiplier}x</span>
            </div>
          </div>
        </div>

        {/* Price Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Price Chart (Last 20 Updates)</h2>
            <p className="text-sm text-gray-500">Updates every 5 seconds</p>
          </div>

          {priceData.length > 1 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={priceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="time"
                  stroke="#999"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="#999"
                  style={{ fontSize: "12px" }}
                  domain={["dataMin - 100", "dataMax + 100"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number | undefined) =>
                    value
                      ? `$${value.toLocaleString("en-US", {
                          maximumFractionDigits: 2,
                        })}`
                      : "—"
                  }
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={{ fill: "#f97316", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
              <p className="text-gray-500">Chart will populate as prices update...</p>
            </div>
          )}
        </div>

        {/* Market Info */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Market Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Volume</p>
              <p className="text-lg font-bold text-gray-900">{market.volume}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-lg font-bold text-green-600">
                {market.status === "OPEN" ? "🔴 LIVE" : market.status}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Market ID</p>
              <p className="text-lg font-bold text-gray-900">#{market.id}</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-6 text-center">
          <h3 className="text-xl font-bold mb-2">Ready to trade?</h3>
          <p className="mb-4">Place your prediction on Bitcoin price movement now</p>
          <Link href={`/markets/${market.id}`}>
            <button className="bg-white text-orange-600 font-bold py-2 px-6 rounded-lg hover:bg-gray-100 transition">
              Start Trading
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
