"use client";

import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import {
    AlertCircle, AlertTriangle, TrendingUp, TrendingDown, Eye, EyeOff,
    CheckCircle, XCircle, Clock, DollarSign
} from "lucide-react";

interface MarketImbalance {
    market_id: number;
    question: string;
    yes_volume: number;
    no_volume: number;
    total_volume: number;
    imbalance_ratio: number;
    yes_probability: number;
    sentiment_deviation: number;
    risk_level: "LOW" | "MEDIUM" | "HIGH";
}

export default function MarketImbalanceMonitor() {
    const [imbalances, setImbalances] = useState<MarketImbalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        riskLevel: "HIGH" as "LOW" | "MEDIUM" | "HIGH",
        showLive: true,
    });

    useEffect(() => {
        loadImbalances();
        // Refresh every 30 seconds
        const interval = setInterval(loadImbalances, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadImbalances = async () => {
        try {
            // Enhanced analytics to detect imbalances
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                const data = await response.json();
                // Calculate imbalances
                const imbalanceData = (data.markets || [])
                    .map((market: any) => {
                        const yesVol = parseFloat(market.yes_volume || 0);
                        const noVol = parseFloat(market.no_volume || 0);
                        const total = yesVol + noVol;
                        const ratio = total > 0 ? Math.max(yesVol, noVol) / Math.min(yesVol, noVol) : 1;
                        const deviation = Math.abs(market.yes_probability - 50);

                        let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
                        if (ratio > 3 && deviation > 30) riskLevel = "HIGH";
                        else if (ratio > 2 && deviation > 20) riskLevel = "MEDIUM";

                        return {
                            market_id: market.id,
                            question: market.question,
                            yes_volume: yesVol,
                            no_volume: noVol,
                            total_volume: total,
                            imbalance_ratio: ratio,
                            yes_probability: market.yes_probability,
                            sentiment_deviation: deviation,
                            risk_level: riskLevel,
                        };
                    })
                    .filter((m: MarketImbalance) => m.total_volume > 0)
                    .sort((a: MarketImbalance, b: MarketImbalance) => b.imbalance_ratio - a.imbalance_ratio);

                setImbalances(imbalanceData);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (risk: string) => {
        switch (risk) {
            case "HIGH":
                return "bg-apple-red/10 text-apple-red border-apple-red/30";
            case "MEDIUM":
                return "bg-apple-yellow/10 text-apple-yellow border-apple-yellow/30";
            default:
                return "bg-apple-green/10 text-apple-green border-apple-green/30";
        }
    };

    const getRiskIcon = (risk: string) => {
        switch (risk) {
            case "HIGH":
                return <AlertTriangle className="h-4 w-4" />;
            case "MEDIUM":
                return <AlertCircle className="h-4 w-4" />;
            default:
                return <CheckCircle className="h-4 w-4" />;
        }
    };

    const filteredImbalances = imbalances.filter(
        (m) =>
            m.risk_level === filters.riskLevel ||
            (filters.riskLevel === "LOW" && Math.random() < 0.3)
    );

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="h-8 w-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Analyzing market imbalances...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {(["HIGH", "MEDIUM", "LOW"] as const).map((level) => (
                    <button
                        key={level}
                        onClick={() => setFilters({ ...filters, riskLevel: level })}
                        className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${
                            filters.riskLevel === level
                                ? "bg-black text-white"
                                : "border border-border hover:border-black"
                        }`}
                    >
                        {level === "HIGH" ? "🔴" : level === "MEDIUM" ? "🟠" : "🟢"} {level} Risk
                    </button>
                ))}
            </div>

            {/* Imbalances List */}
            {filteredImbalances.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-lg">
                    <CheckCircle className="h-8 w-8 text-apple-green mx-auto mb-2" />
                    <p className="text-muted-foreground">No {filters.riskLevel} risk imbalances detected</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredImbalances.map((market) => (
                        <div
                            key={market.market_id}
                            className={`border rounded-lg p-4 ${getRiskColor(market.risk_level)}`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-start gap-3 flex-1">
                                    {getRiskIcon(market.risk_level)}
                                    <div className="flex-1">
                                        <h4 className="font-bold text-black line-clamp-2">{market.question}</h4>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Imbalance Ratio: {market.imbalance_ratio.toFixed(2)}x (Normal: 1x)
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right ml-2">
                                    <div className="flex items-center gap-2 justify-end">
                                        {market.yes_volume > market.no_volume ? (
                                            <TrendingUp className="h-4 w-4 text-apple-green" />
                                        ) : (
                                            <TrendingDown className="h-4 w-4 text-apple-red" />
                                        )}
                                        <span className="font-bold text-sm">
                                            {market.yes_probability > 50 ? "YES" : "NO"} bias
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Volume Split */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Yes Volume</span>
                                    <span className="font-bold">
                                        KES {(market.yes_volume / 1000).toFixed(0)}k ({((market.yes_volume / market.total_volume) * 100).toFixed(0)}%)
                                    </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-apple-green h-full"
                                        style={{ width: `${(market.yes_volume / market.total_volume) * 100}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">No Volume</span>
                                    <span className="font-bold">
                                        KES {(market.no_volume / 1000).toFixed(0)}k ({((market.no_volume / market.total_volume) * 100).toFixed(0)}%)
                                    </span>
                                </div>
                            </div>

                            {/* Risk Analysis */}
                            <div className="mt-3 p-2 bg-black/5 rounded text-xs text-muted-foreground">
                                <p>
                                    <strong>Why flagged:</strong> Market shows{" "}
                                    {market.imbalance_ratio > 2 && "extreme side imbalance "}
                                    {market.sentiment_deviation > 30 && "high sentiment deviation "}
                                    which may indicate unusual betting patterns.
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
