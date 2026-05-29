"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector, selectBets } from "@/lib/redux/hooks";
import { fetchDashboardData } from "@/lib/redux/slices/portfolioSlice";

import { useAuth } from "@/lib/useAuth";
import { ArrowLeft, TrendingUp, TrendingDown, Award } from "lucide-react";

export default function ProfitsLossesPage() {
    const { user: authUser, loading: authLoading } = useAuth("/dashboard/profits-losses");
    const dispatch = useAppDispatch();
    const fetchAttemptedRef = useRef(false);

    const bets = useAppSelector(selectBets);

    const [error, setError] = useState("");
    const [periodFilter, setPeriodFilter] = useState<"all" | "month" | "week" | "day">("month");

    useEffect(() => {
        if (authLoading) return;

        if (!authUser) {
            setError("Please log in");
            return;
        }

        if (fetchAttemptedRef.current) return;
        fetchAttemptedRef.current = true;

        dispatch(fetchDashboardData());
    }, [authUser?.phone_number, authLoading, dispatch]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-background">                <main className="mx-auto pt-24 max-w-[1200px] px-4">
                    <div className="text-center py-12">
                        <div className="h-8 w-8 border-4 border-foreground border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !authUser) {
        return (
            <div className="min-h-screen bg-background">                <main className="mx-auto pt-24 max-w-[1200px] px-4 text-center">
                    <p className="text-red-500 mb-4">{error || "Failed to load page"}</p>
                    <Link href="/dashboard" className="text-apple-blue hover:underline">
                        Back to Dashboard
                    </Link>
                </main>
            </div>
        );
    }

    // Calculate P&L metrics
    const completedBets = bets.filter(b => b.result !== 'PENDING');
    const wins = completedBets.filter(b => b.result === 'WON');
    const losses = completedBets.filter(b => b.result === 'LOST');

    const totalWinnings = wins.reduce((sum, b) => sum + (parseFloat(b.payout || "0") - parseFloat(b.amount)), 0);
    const totalLosses = losses.reduce((sum, b) => sum + parseFloat(b.amount), 0);
    const winRate = completedBets.length > 0 ? (wins.length / completedBets.length) * 100 : 0;
    const avgWin = wins.length > 0 ? totalWinnings / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;

    return (
        <div className="min-h-screen bg-background pb-20">            <main className="mx-auto pt-24 max-w-[1200px] px-4 md:px-6">
                {/* Header */}
                <div className="mb-8 flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-muted rounded-lg transition">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Award className="h-8 w-8" />
                            Profits & Losses
                        </h1>
                        <p className="text-muted-foreground text-sm">Track your trading performance</p>
                    </div>
                </div>

                {/* Time Period Filters */}
                <div className="flex gap-3 mb-8">
                    {["day", "week", "month", "all"].map((period) => (
                        <button
                            key={period}
                            onClick={() => setPeriodFilter(period as any)}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                                periodFilter === period
                                    ? "bg-black text-white dark:bg-white dark:text-black"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                        >
                            {period.charAt(0).toUpperCase() + period.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Win Rate */}
                    <div className="bg-background rounded-2xl p-6 border border-border">
                        <p className="text-muted-foreground text-sm font-medium mb-2">Win Rate</p>
                        <h2 className="text-3xl font-bold mb-2">{winRate.toFixed(1)}%</h2>
                        <p className="text-xs text-muted-foreground">
                            {wins.length} wins / {completedBets.length} bets
                        </p>
                    </div>

                    {/* Total Winnings */}
                    <div className="bg-background rounded-2xl p-6 border border-border border-l-4 border-l-apple-green">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-muted-foreground text-sm font-medium">Total Winnings</p>
                            <TrendingUp className="h-5 w-5 text-apple-green" />
                        </div>
                        <h2 className="text-3xl font-bold text-apple-green">KES {totalWinnings.toLocaleString()}</h2>
                        <p className="text-xs text-muted-foreground mt-2">From {wins.length} winning positions</p>
                    </div>

                    {/* Total Losses */}
                    <div className="bg-background rounded-2xl p-6 border border-border border-l-4 border-l-apple-red">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-muted-foreground text-sm font-medium">Total Losses</p>
                            <TrendingDown className="h-5 w-5 text-apple-red" />
                        </div>
                        <h2 className="text-3xl font-bold text-apple-red">-KES {totalLosses.toLocaleString()}</h2>
                        <p className="text-xs text-muted-foreground mt-2">From {losses.length} losing positions</p>
                    </div>

                    {/* Net P&L */}
                    <div className={`bg-background rounded-2xl p-6 border border-border border-l-4 ${
                        totalWinnings - totalLosses >= 0
                            ? "border-l-apple-green"
                            : "border-l-apple-red"
                    }`}>
                        <p className="text-muted-foreground text-sm font-medium mb-2">Net P&L</p>
                        <h2 className={`text-3xl font-bold mb-2 ${
                            totalWinnings - totalLosses >= 0
                                ? "text-apple-green"
                                : "text-apple-red"
                        }`}>
                            {totalWinnings - totalLosses >= 0 ? "+" : ""} KES {(totalWinnings - totalLosses).toLocaleString()}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {totalWinnings - totalLosses >= 0 ? "Profit" : "Loss"} this period
                        </p>
                    </div>
                </div>

                {/* Average Trade Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-background rounded-2xl p-6 border border-border">
                        <p className="text-muted-foreground text-sm font-medium mb-2">Average Win</p>
                        <h2 className="text-2xl font-bold text-apple-green">KES {avgWin.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
                        <p className="text-xs text-muted-foreground mt-2">Per winning trade</p>
                    </div>

                    <div className="bg-background rounded-2xl p-6 border border-border">
                        <p className="text-muted-foreground text-sm font-medium mb-2">Average Loss</p>
                        <h2 className="text-2xl font-bold text-apple-red">KES {avgLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
                        <p className="text-xs text-muted-foreground mt-2">Per losing trade</p>
                    </div>

                    <div className="bg-background rounded-2xl p-6 border border-border">
                        <p className="text-muted-foreground text-sm font-medium mb-2">Risk/Reward Ratio</p>
                        <h2 className="text-2xl font-bold">
                            {avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : "N/A"}x
                        </h2>
                        <p className="text-xs text-muted-foreground mt-2">Win size vs loss size</p>
                    </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="bg-background rounded-2xl border border-border p-6">
                    <h3 className="text-lg font-bold mb-6">Performance Summary</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                            <span className="text-sm font-medium">Total Trades</span>
                            <span className="text-lg font-bold">{completedBets.length}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                            <span className="text-sm font-medium">Winning Trades</span>
                            <span className="text-lg font-bold text-apple-green">{wins.length}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                            <span className="text-sm font-medium">Losing Trades</span>
                            <span className="text-lg font-bold text-apple-red">{losses.length}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                            <span className="text-sm font-medium">Total Wagered</span>
                            <span className="text-lg font-bold">
                                KES {bets.reduce((sum, b) => sum + parseFloat(b.amount), 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
