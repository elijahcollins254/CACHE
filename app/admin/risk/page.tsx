"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, BarChart3, Shield } from "lucide-react";
import Navbar from "@/components/navbar";
import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/fetch-utils";

export default function RiskDashboardPage() {
    const router = useRouter();
    const [passwordAuthenticated, setPasswordAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [riskData, setRiskData] = useState<any>(null);
    const ADMIN_PASSWORD = "#collins12K";

    useEffect(() => {
        const auth = localStorage.getItem("admin_auth");
        if (auth === "true") {
            setPasswordAuthenticated(true);
            loadRiskData();
        }
    }, []);

    const handlePasswordSubmit = () => {
        if (passwordInput === ADMIN_PASSWORD) {
            setPasswordAuthenticated(true);
            localStorage.setItem("admin_auth", "true");
            setPasswordInput("");
            setPasswordError("");
            loadRiskData();
        } else {
            setPasswordError("Incorrect password");
            setPasswordInput("");
        }
    };

    const loadRiskData = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/admin/risk/`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                const data = await response.json();
                setRiskData(data);
            } else {
                setError("Failed to load risk data");
            }
        } catch (err) {
            setError("Connection error");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case "LOW":
                return "text-apple-green";
            case "MEDIUM":
                return "text-yellow-500";
            case "HIGH":
                return "text-apple-red";
            default:
                return "text-muted-foreground";
        }
    };

    const getRiskBgColor = (level: string) => {
        switch (level) {
            case "LOW":
                return "bg-apple-green/10 border border-apple-green/20";
            case "MEDIUM":
                return "bg-yellow-500/10 border border-yellow-500/20";
            case "HIGH":
                return "bg-apple-red/10 border border-apple-red/20";
            default:
                return "bg-muted border border-border";
        }
    };

    if (!passwordAuthenticated) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center px-4">
                    <div className="w-full max-w-sm">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </button>
                        
                        <div className="apple-card p-8 text-center">
                            <h1 className="text-2xl font-bold text-foreground mb-6">Authentication Required</h1>
                            
                            <div className="space-y-4">
                                <input
                                    type="password"
                                    placeholder="Enter admin password"
                                    value={passwordInput}
                                    onChange={(e) => {
                                        setPasswordInput(e.target.value);
                                        setPasswordError("");
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && passwordInput.length > 0) {
                                            handlePasswordSubmit();
                                        }
                                    }}
                                    className="w-full px-4 py-3 border border-border rounded-lg text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-foreground transition-all"
                                />
                                
                                {passwordError && (
                                    <p className="text-sm text-apple-red font-bold">{passwordError}</p>
                                )}
                                
                                <button
                                    onClick={handlePasswordSubmit}
                                    disabled={passwordInput.length === 0}
                                    className="w-full py-3 bg-foreground text-background rounded-lg font-bold transition-all hover:opacity-90 disabled:opacity-50"
                                >
                                    Unlock
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const portfolio = riskData?.portfolio_health || {};

    return (
        <div className="min-h-screen bg-background pb-12">
            <Navbar />
            <div className="pt-24 px-4">
                <div className="max-w-[1200px] mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
                                    <ArrowLeft className="h-5 w-5" />
                                </Link>
                                <h1 className="text-3xl font-bold text-foreground">Risk Dashboard</h1>
                            </div>
                            <p className="text-muted-foreground text-sm ml-8">Monitor market exposure and company health</p>
                        </div>
                        <button
                            onClick={loadRiskData}
                            className="px-4 py-2 bg-foreground text-background rounded-lg font-bold transition-all hover:opacity-90 text-sm"
                        >
                            Refresh
                        </button>
                    </div>

                    {error && (
                        <div className="bg-apple-red/10 border border-apple-red/30 rounded-lg p-4 mb-6">
                            <p className="text-sm text-apple-red font-bold">{error}</p>
                        </div>
                    )}

                    {loading ? (
                        <div className="apple-card p-12 flex items-center justify-center">
                            <div className="text-center">
                                <div className="h-8 w-8 border-4 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-muted-foreground">Loading risk data...</p>
                            </div>
                        </div>
                    ) : riskData ? (
                        <div className="space-y-6">
                            {/* Health Summary */}
                            <div className={`apple-card p-8 ${getRiskBgColor(portfolio.risk_level)}`}>
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="text-sm text-muted-foreground font-bold mb-2">Risk Level</p>
                                        <p className={`text-4xl font-bold ${getRiskColor(portfolio.risk_level)}`}>
                                            {portfolio.risk_level}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground font-bold mb-2">Health Score</p>
                                        <div className="flex items-baseline gap-2">
                                            <p className="text-4xl font-bold text-foreground">{portfolio.health_score}</p>
                                            <p className="text-muted-foreground">/100</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-2 bg-muted/30 rounded-full overflow-hidden mb-4">
                                    <div
                                        className={`h-full transition-all ${
                                            portfolio.risk_level === "LOW"
                                                ? "bg-apple-green"
                                                : portfolio.risk_level === "MEDIUM"
                                                ? "bg-yellow-500"
                                                : "bg-apple-red"
                                        }`}
                                        style={{ width: `${portfolio.health_score}%` }}
                                    />
                                </div>

                                <p className="text-sm font-semibold text-foreground italic">{portfolio.recommendation}</p>
                            </div>

                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="apple-card p-6 border-l-4 border-l-apple-red">
                                    <p className="text-sm text-muted-foreground font-bold mb-2">Total Exposure</p>
                                    <p className="text-2xl font-bold text-foreground">
                                        KES {(portfolio.total_potential_exposure || 0).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">Max potential loss</p>
                                </div>

                                <div className="apple-card p-6 border-l-4 border-l-apple-green">
                                    <p className="text-sm text-muted-foreground font-bold mb-2">Liquidity Reserve</p>
                                    <p className="text-2xl font-bold text-foreground">
                                        KES {(portfolio.liquidity_reserve || 0).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">Users' balance pool</p>
                                </div>

                                <div className="apple-card p-6 border-l-4 border-l-apple-blue">
                                    <p className="text-sm text-muted-foreground font-bold mb-2">Coverage Ratio</p>
                                    <p className="text-2xl font-bold text-foreground">{(portfolio.coverage_ratio || 0).toFixed(2)}x</p>
                                    <p className="text-xs text-muted-foreground mt-2">Reserve / Exposure</p>
                                </div>
                            </div>

                            {/* Market Exposure Table */}
                            <div className="apple-card p-6">
                                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    Top Risk Markets
                                </h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="text-left text-xs font-bold text-muted-foreground py-3 px-4">Market</th>
                                                <th className="text-right text-xs font-bold text-muted-foreground py-3 px-4">YES Vol</th>
                                                <th className="text-right text-xs font-bold text-muted-foreground py-3 px-4">NO Vol</th>
                                                <th className="text-right text-xs font-bold text-muted-foreground py-3 px-4">Min Exposure</th>
                                                <th className="text-right text-xs font-bold text-muted-foreground py-3 px-4">Max Exposure</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {riskData.market_exposure?.map((market: any, idx: number) => (
                                                <tr key={idx} className="border-b border-border hover:bg-muted/30 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <p className="font-semibold text-foreground text-sm truncate">{market.question}</p>
                                                        <p className="text-xs text-muted-foreground">{market.yes_probability}% YES</p>
                                                    </td>
                                                    <td className="text-right py-3 px-4">
                                                        <p className="text-sm font-bold text-foreground">
                                                            KES {market.yes_volume.toLocaleString()}
                                                        </p>
                                                    </td>
                                                    <td className="text-right py-3 px-4">
                                                        <p className="text-sm font-bold text-foreground">
                                                            KES {market.no_volume.toLocaleString()}
                                                        </p>
                                                    </td>
                                                    <td className="text-right py-3 px-4">
                                                        <p className="text-sm font-bold text-apple-green">
                                                            KES {market.potential_loss_if_no.toLocaleString()}
                                                        </p>
                                                    </td>
                                                    <td className="text-right py-3 px-4">
                                                        <p className="text-sm font-bold text-apple-red">
                                                            KES {market.max_exposure.toLocaleString()}
                                                        </p>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {!riskData.market_exposure || riskData.market_exposure.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">No open markets</p>
                                )}
                            </div>

                            {/* Risk Guidelines */}
                            <div className="apple-card p-6 bg-muted/50">
                                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                                    <Shield className="h-5 w-5" />
                                    Risk Guidelines
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-sm font-bold text-apple-green mb-2">LOW RISK (Score 67-100)</p>
                                        <p className="text-xs text-muted-foreground">
                                            Coverage ratio {'>'} 1.5x. Good position. Can handle most market resolutions.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-yellow-500 mb-2">MEDIUM RISK (Score 33-66)</p>
                                        <p className="text-xs text-muted-foreground">
                                            Coverage ratio 0.8x-1.5x. Moderate exposure. Monitor large markets closely.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-apple-red mb-2">HIGH RISK (Score 0-32)</p>
                                        <p className="text-xs text-muted-foreground">
                                            Coverage ratio {'<'} 0.8x. Reduce market sizes or pause new markets.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
