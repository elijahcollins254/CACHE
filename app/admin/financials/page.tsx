"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, CreditCard } from "lucide-react";
import Navbar from "@/components/navbar";
import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/fetch-utils";

export default function FinancialsPage() {
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
            } else {
                setError("Failed to load financial data");
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

    const financial = analytics?.financial || {};

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
                                <h1 className="text-3xl font-bold text-foreground">Financial Dashboard</h1>
                            </div>
                            <p className="text-muted-foreground text-sm ml-8">Revenue, payouts, and cash flow</p>
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
                                <p className="text-muted-foreground">Loading financial data...</p>
                            </div>
                        </div>
                    ) : analytics ? (
                        <div className="space-y-6">
                            {/* Key Financial Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Total Volume */}
                                <div className="apple-card p-6 border-l-4 border-l-apple-blue">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm text-muted-foreground font-bold">Total Volume Wagered</p>
                                        <DollarSign className="h-5 w-5 text-apple-blue" />
                                    </div>
                                    <p className="text-3xl font-bold text-foreground">
                                        KES {(financial.total_volume_wagered || 0).toLocaleString()}
                                    </p>
                                </div>

                                {/* Commission Earned */}
                                <div className="apple-card p-6 border-l-4 border-l-apple-green">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm text-muted-foreground font-bold">Commission Earned (2%)</p>
                                        <TrendingUp className="h-5 w-5 text-apple-green" />
                                    </div>
                                    <p className="text-3xl font-bold text-apple-green">
                                        KES {(financial.commission_earned || 0).toLocaleString()}
                                    </p>
                                </div>

                                {/* Total Payouts */}
                                <div className="apple-card p-6 border-l-4 border-l-apple-red">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm text-muted-foreground font-bold">Total Payouts Issued</p>
                                        <TrendingDown className="h-5 w-5 text-apple-red" />
                                    </div>
                                    <p className="text-3xl font-bold text-apple-red">
                                        KES {(financial.total_payouts || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Cash Flow */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Deposits */}
                                <div className="apple-card p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-apple-green/10 rounded-lg flex items-center justify-center">
                                            <CreditCard className="h-5 w-5 text-apple-green" />
                                        </div>
                                        <h3 className="text-lg font-bold text-foreground">User Deposits</h3>
                                    </div>
                                    <p className="text-3xl font-bold text-apple-green mb-2">
                                        KES {(financial.total_deposits || 0).toLocaleString()}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Cash flowing in from users</p>
                                </div>

                                {/* Withdrawals */}
                                <div className="apple-card p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-apple-red/10 rounded-lg flex items-center justify-center">
                                            <CreditCard className="h-5 w-5 text-apple-red" />
                                        </div>
                                        <h3 className="text-lg font-bold text-foreground">User Withdrawals</h3>
                                    </div>
                                    <p className="text-3xl font-bold text-apple-red mb-2">
                                        KES {(financial.total_withdrawals || 0).toLocaleString()}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Cash flowing out to users</p>
                                </div>
                            </div>

                            {/* Net Cash Flow */}
                            <div className="apple-card p-8 bg-gradient-to-br from-foreground/5 to-foreground/0 border-2 border-foreground/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground font-bold mb-2">Net Cash Flow (Deposits - Withdrawals)</p>
                                        <p className="text-4xl font-bold">
                                            <span className={financial.net_cash_flow >= 0 ? "text-apple-green" : "text-apple-red"}>
                                                {financial.net_cash_flow >= 0 ? "+" : ""} KES {(financial.net_cash_flow || 0).toLocaleString()}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground mb-2">Status</p>
                                        <p className={`text-lg font-bold ${financial.net_cash_flow >= 0 ? "text-apple-green" : "text-apple-red"}`}>
                                            {financial.net_cash_flow >= 0 ? "Positive Flow" : "Negative Flow"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="apple-card p-6">
                                    <h3 className="text-lg font-bold text-foreground mb-4">Financial Summary</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Profit Margin</span>
                                            <span className="font-bold text-foreground">
                                                {financial.total_volume_wagered > 0
                                                    ? ((financial.commission_earned / financial.total_volume_wagered) * 100).toFixed(2)
                                                    : 0}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between pb-3 border-b border-border">
                                            <span className="text-muted-foreground">Users' Winnings Paid</span>
                                            <span className="font-bold text-foreground">
                                                KES {(financial.total_payouts || 0).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground italic">
                                            Commission is earned on all trades. Payouts are distributed to winners when markets resolve.
                                        </p>
                                    </div>
                                </div>

                                <div className="apple-card p-6">
                                    <h3 className="text-lg font-bold text-foreground mb-4">Platform Health</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Total Volume</p>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-apple-blue transition-all"
                                                    style={{
                                                        width: Math.min(100, ((financial.total_volume_wagered || 0) / 1000000) * 100) + "%"
                                                    }}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">KES {(financial.total_volume_wagered || 0).toLocaleString()}</p>
                                        </div>

                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Commission/Volume</p>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-apple-green"
                                                    style={{
                                                        width: "100%"
                                                    }}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                KES {(financial.commission_earned || 0).toLocaleString()} earned
                                            </p>
                                        </div>
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
