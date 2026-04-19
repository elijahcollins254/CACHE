"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Navbar from "@/components/Navbar";

interface ChartDataPoint {
  time: string;
  price?: number;
  yes_probability?: number;
  no_probability?: number;
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
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"price" | "odds">("price"); // Toggle between price and odds

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

        // Add to chart data (both price and odds)
        setChartData((prev) => {
          const newData = [
            ...prev,
            {
              time: new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              price: data.current_bitcoin_price,
              yes_probability: data.yes_probability,
              no_probability: data.no_probability,
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
              <Activity className="w-5 h-5 text-orange-600 animate-pulse" />
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
                {Math.abs(priceChange!).toFixed(2)}% in last {chartData.length > 1 ? chartData.length * 5 : 5}s
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Updated: {new Date().toLocaleTimeString()}
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
              @<span className="font-bold text-green-600">{market.yes_multiplier}x</span>
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
              @<span className="font-bold text-red-600">{market.no_multiplier}x</span>
            </div>
          </div>
        </div>

        {/* Chart Section with Toggle */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          {/* Header with Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {viewMode === "price" ? "Bitcoin Price Chart" : "Prediction Odds Chart"}
              </h2>
              <p className="text-sm text-gray-500">Updates every 5 seconds (Last 20 updates)</p>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("price")}
                className={`px-4 py-2 rounded transition font-medium text-sm flex items-center gap-2 ${
                  viewMode === "price"
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Price
              </button>
              <button
                onClick={() => setViewMode("odds")}
                className={`px-4 py-2 rounded transition font-medium text-sm ${
                  viewMode === "odds"
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Odds %
              </button>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="time"
                  stroke="#999"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="#999"
                  style={{ fontSize: "12px" }}
                  domain={
                    viewMode === "price"
                      ? ["dataMin - 100", "dataMax + 100"]
                      : [0, 100]
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                  }}
                  formatter={(value: any) => {
                    if (typeof value === "number") {
                      return viewMode === "price"
                        ? `$${value.toLocaleString("en-US", {
                            maximumFractionDigits: 2,
                          })}`
                        : `${value}%`;
                    }
                    return "—";
                  }}
                />

                {/* Price Chart */}
                {viewMode === "price" ? (
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ fill: "#f97316", r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Bitcoin Price"
                  />
                ) : (
                  <>
                    {/* YES Odds Line */}
                    <Line
                      type="monotone"
                      dataKey="yes_probability"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: "#22c55e", r: 3 }}
                      activeDot={{ r: 5 }}
                      name="YES %"
                    />
                    {/* NO Odds Line */}
                    <Line
                      type="monotone"
                      dataKey="no_probability"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: "#ef4444", r: 3 }}
                      activeDot={{ r: 5 }}
                      name="NO %"
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
              <p className="text-gray-500">Chart will populate as prices update...</p>
            </div>
          )}
        </div>

        {/* Market Info */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Market Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <div>
              <p className="text-sm text-gray-600">Type</p>
              <p className="text-lg font-bold text-gray-900">Binary</p>
            </div>
          </div>
        </div>

        {/* CTA to Trading Page */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-6 text-center">
          <h3 className="text-xl font-bold mb-2">Ready to trade?</h3>
          <p className="mb-4">Predict Bitcoin price movement and earn rewards</p>
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
