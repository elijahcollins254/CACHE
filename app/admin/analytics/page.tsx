"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Users, Zap, DollarSign, BarChart3, AlertTriangle, Grid } from "lucide-react";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

export default function AnalyticsPage() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [authError, setAuthError] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [analytics, setAnalytics] = useState<any>(null);

    // Verify admin access with backend
    const verifyAdminAccess = async () => {
        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/admin/users/`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                setIsAdmin(true);
                await loadAnalytics();
            } else if (response.status === 403) {
                setAuthError("You do not have admin privileges");
            } else if (response.status === 401) {
                router.push("/login");
            } else {
                setAuthError("Failed to verify admin access");
            }
        } catch (err) {
            setAuthError("Connection error - unable to verify admin status");
            console.error(err);
        } finally {
            setCheckingAuth(false);
        }
    };

    useEffect(() => {
        verifyAdminAccess();
    }, []);

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

    if (checkingAuth) {
        return (
            <div className="min-h-screen bg-background flex flex-col">                <div className="flex-1 flex items-center justify-center px-4">
                    <div className="text-center">
                        <div className="h-12 w-12 border-4 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Verifying admin access...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-background flex flex-col">                <div className="flex-1 flex items-center justify-center px-4">
                    <div className="w-full max-w-sm">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </button>
                        
                        <div className="apple-card p-8 text-center">
                            <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
                            <p className="text-apple-red font-bold mb-2">{authError}</p>
                            <p className="text-muted-foreground text-sm">You need superuser privileges to access this page.</p>
                            
                            <button
                                onClick={() => router.back()}
                                className="w-full mt-6 py-3 bg-foreground text-background rounded-lg font-bold transition-all hover:opacity-90"
                            >
                                Go Back
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-12">            <div className="pt-24 px-4">
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

                    {/* Navigation to Other Admin Pages */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-8">
                        <Link href="/admin" className="apple-card p-4 border border-border hover:border-black transition-all text-center">
                            <Grid className="h-5 w-5 mx-auto mb-2" />
                            <p className="text-sm font-bold text-foreground">Markets</p>
                        </Link>
                        <Link href="/admin/users" className="apple-card p-4 border border-border hover:border-black transition-all text-center">
                            <Users className="h-5 w-5 mx-auto mb-2" />
                            <p className="text-sm font-bold text-foreground">Users</p>
                        </Link>
                        <Link href="/admin/financials" className="apple-card p-4 border-2 border-black transition-all text-center bg-muted/50">
                            <TrendingUp className="h-5 w-5 mx-auto mb-2" />
                            <p className="text-sm font-bold text-foreground">Financials</p>
                        </Link>
                        <Link href="/admin/risk" className="apple-card p-4 border border-border hover:border-black transition-all text-center">
                            <AlertTriangle className="h-5 w-5 mx-auto mb-2" />
                            <p className="text-sm font-bold text-foreground">Risk</p>
                        </Link>
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
