"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Users, Zap, DollarSign } from "lucide-react";
import Navbar from "@/components/navbar";
import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/fetch-utils";

export default function AnalyticsPage() {
    const router = useRouter();
    const [passwordAuthenticated, setPasswordAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [analytics, setAnalytics] = useState<any>(null);
    const ADMIN_PASSWORD = "#collins12K";

    useEffect(() => {
        const auth = localStorage.getItem("admin_auth");
        if (auth === "true") {
            setPasswordAuthenticated(true);
            loadAnalytics();
        }
    }, []);

    const handlePasswordSubmit = () => {
        if (passwordInput === ADMIN_PASSWORD) {
            setPasswordAuthenticated(true);
            localStorage.setItem("admin_auth", "true");
            setPasswordInput("");
            setPasswordError("");
            loadAnalytics();
        } else {
            setPasswordError("Incorrect password");
            setPasswordInput("");
        }
    };

    const loadAnalytics = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/admin/analytics/`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                const data = await response.json();
                setAnalytics(data);
            } else if (response.status === 403) {
                setError("Admin access required");
            } else {
                setError("Failed to load analytics");
            }
        } catch (err) {
            setError("Connection error");
            console.error(err);
        } finally {
            setLoading(false);
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
                                <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
                            </div>
                            <p className="text-muted-foreground text-sm ml-8">Market metrics and trading volume</p>
                        </div>
                        <button
                            onClick={loadAnalytics}
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
                                <p className="text-muted-foreground">Loading analytics...</p>
                            </div>
                        </div>
                    ) : analytics ? (
                        <div className="space-y-6">
                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                <div className="apple-card p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground font-bold mb-1">Total Users</p>
                                            <p className="text-2xl font-bold text-foreground">{analytics.metrics?.total_users || 0}</p>
                                        </div>
                                        <Users className="h-8 w-8 text-muted-foreground opacity-50" />
                                    </div>
                                </div>

                                <div className="apple-card p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground font-bold mb-1">Active 30D</p>
                                            <p className="text-2xl font-bold text-foreground">{analytics.metrics?.active_users_30d || 0}</p>
                                        </div>
                                        <Zap className="h-8 w-8 text-muted-foreground opacity-50" />
                                    </div>
                                </div>

                                <div className="apple-card p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground font-bold mb-1">Total Markets</p>
                                            <p className="text-2xl font-bold text-foreground">{analytics.metrics?.total_markets || 0}</p>
                                        </div>
                                        <TrendingUp className="h-8 w-8 text-muted-foreground opacity-50" />
                                    </div>
                                </div>

                                <div className="apple-card p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground font-bold mb-1">Open Markets</p>
                                            <p className="text-2xl font-bold text-foreground">{analytics.metrics?.open_markets || 0}</p>
                                        </div>
                                        <Zap className="h-8 w-8 text-apple-green opacity-50" />
                                    </div>
                                </div>

                                <div className="apple-card p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground font-bold mb-1">Resolved</p>
                                            <p className="text-2xl font-bold text-foreground">{analytics.metrics?.resolved_markets || 0}</p>
                                        </div>
                                        <Zap className="h-8 w-8 text-apple-blue opacity-50" />
                                    </div>
                                </div>
                            </div>

                            {/* Volume & Top Markets */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Total Volume */}
                                <div className="apple-card p-6">
                                    <h2 className="text-lg font-bold text-foreground mb-4">Total Volume</h2>
                                    <p className="text-3xl font-bold text-foreground mb-2">
                                        KES {(analytics.financial?.total_volume_wagered || 0).toLocaleString()}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Commission earned: KES {(analytics.financial?.commission_earned || 0).toLocaleString()}
                                    </p>
                                </div>

                                {/* Top Markets */}
                                <div className="apple-card p-6">
                                    <h2 className="text-lg font-bold text-foreground mb-4">Top Markets</h2>
                                    <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {analytics.top_markets?.slice(0, 5).map((market: any, idx: number) => (
                                            <div key={idx} className="pb-3 border-b border-border last:border-0">
                                                <p className="text-sm font-semibold text-foreground truncate">{market.question}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    KES {market.volume.toLocaleString()} • {market.yes_probability}% YES
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Category Breakdown */}
                            {analytics.by_category && Object.keys(analytics.by_category).length > 0 && (
                                <div className="apple-card p-6">
                                    <h2 className="text-lg font-bold text-foreground mb-4">Volume by Category</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {Object.entries(analytics.by_category).map(([cat, data]: any) => (
                                            <div key={cat} className="bg-muted p-4 rounded-lg">
                                                <p className="text-sm font-bold text-foreground mb-2">{cat}</p>
                                                <p className="text-xl font-bold text-foreground mb-1">
                                                    KES {data.volume.toLocaleString()}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {data.markets} markets • KES {data.commission.toLocaleString()} commission
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
