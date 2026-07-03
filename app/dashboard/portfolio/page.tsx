"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector, selectUser, selectPortfolioValue, selectStatistics, selectBets } from "@/lib/redux/hooks";
import { fetchDashboardData } from "@/lib/redux/slices/portfolioSlice";
import { generateMarketSlug } from "@/lib/slugify";

import { useAuth } from "@/lib/useAuth";
import { ArrowLeft, TrendingUp, Filter, Search } from "lucide-react";

export default function PortfolioPage() {
    const { user: authUser, loading: authLoading } = useAuth("/dashboard/portfolio");
    const dispatch = useAppDispatch();
    const fetchAttemptedRef = useRef(false);

    const user = useAppSelector(selectUser);
    const portfolioValue = useAppSelector(selectPortfolioValue);
    const statistics = useAppSelector(selectStatistics);
    const bets = useAppSelector(selectBets);

    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState<"active" | "positions" | "history">("active");
    const [searchQuery, setSearchQuery] = useState("");

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
                    <p className="text-red-500 mb-4">{error || "Failed to load portfolio"}</p>
                    <Link href="/dashboard" className="text-apple-blue hover:underline">
                        Back to Dashboard
                    </Link>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">            <main className="mx-auto pt-24 max-w-[1200px] px-4 md:px-6">
                {/* Header */}
                <div className="mb-8 flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-muted rounded-lg transition">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <TrendingUp className="h-8 w-8" />
                            Portfolio
                        </h1>
                        <p className="text-muted-foreground text-sm">View your positions and holdings</p>
                    </div>
                </div>

                {/* Portfolio Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Portfolio Value */}
                    <div className="bg-background rounded-2xl p-6 border border-border">
                        <p className="text-muted-foreground text-sm font-medium mb-2">Portfolio Value</p>
                        <h2 className="text-3xl font-bold mb-2">KES {parseFloat(portfolioValue).toLocaleString()}</h2>
                        <p className="text-xs text-muted-foreground">
                            {statistics?.total_wagered && statistics.total_wagered > 0
                                ? `+${parseFloat(String(statistics.total_wagered)).toLocaleString()}`
                                : "0.00"}{" "}
                            (0%) past day
                        </p>
                    </div>

                    {/* Total Positions */}
                    <div className="bg-background rounded-2xl p-6 border border-border">
                        <p className="text-muted-foreground text-sm font-medium mb-2">Active Positions</p>
                        <h2 className="text-3xl font-bold mb-2">
                            {(() => {
                                const netPositions: { [key: string]: any } = {};
                                bets.filter(b => b.result === 'PENDING').forEach((bet: any) => {
                                    const positionKey = `${bet.market_id}-${bet.outcome}`;
                                    if (!netPositions[positionKey]) {
                                        netPositions[positionKey] = { total_bought: 0, total_sold: 0 };
                                    }
                                    if (bet.action === 'BUY') netPositions[positionKey].total_bought += Number(bet.quantity || 1);
                                    else if (bet.action === 'SELL') netPositions[positionKey].total_sold += Number(bet.quantity || 1);
                                });
                                return Object.values(netPositions).filter((pos: any) => pos.total_bought > pos.total_sold).length;
                            })()}
                        </h2>
                        <p className="text-xs text-muted-foreground">Markets with active bets</p>
                    </div>
                </div>

                {/* Positions Table */}
                <div className="bg-background rounded-2xl border border-border">
                    {/* Tabs & Search */}
                    <div className="border-b border-border p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            {/* Tabs */}
                            <div className="flex gap-6">
                                {["active", "positions", "history"].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab as any)}
                                        className={`pb-2 font-semibold text-sm transition-colors border-b-2 ${
                                            activeTab === tab
                                                ? "border-black text-black dark:border-white dark:text-white"
                                                : "border-transparent text-muted-foreground hover:text-black dark:hover:text-white"
                                        }`}
                                    >
                                        {tab === "active" ? "Open Positions" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </button>
                                ))}
                            </div>

                            {/* Filter Button */}
                            <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition text-sm font-medium">
                                <Filter className="h-4 w-4" />
                                Current value
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search markets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full md:w-64 pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-blue-400 text-sm"
                            />
                        </div>
                    </div>

                    {/* Table Content */}
                    <div className="p-6">
                        {activeTab === "active" && (
                            <div>
                                {(() => {
                                    const netPositions: { [key: string]: any } = {};

                                    bets
                                        .filter(b => b.result === 'PENDING')
                                        .forEach((bet: any) => {
                                            const positionKey = `${bet.market_id}-${bet.outcome}`;

                                            if (!netPositions[positionKey]) {
                                                netPositions[positionKey] = {
                                                    market_id: bet.market_id,
                                                    market_question: bet.market_question,
                                                    outcome: bet.outcome,
                                                    current_yes_probability: bet.current_yes_probability,
                                                    current_price: bet.current_price,
                                                    total_bought: 0,
                                                    total_sold: 0,
                                                    total_cost: 0,
                                                };
                                            }

                                            if (bet.action === 'BUY') {
                                                netPositions[positionKey].total_bought += Number(bet.quantity || 1);
                                                netPositions[positionKey].total_cost += Number(bet.amount);
                                            } else if (bet.action === 'SELL') {
                                                netPositions[positionKey].total_sold += Number(bet.quantity || 1);
                                            }
                                        });

                                    const positions = Object.values(netPositions)
                                        .filter((pos: any) => pos.total_bought > pos.total_sold)
                                        .filter((pos: any) =>
                                            !searchQuery ||
                                            pos.market_question.toLowerCase().includes(searchQuery.toLowerCase())
                                        );

                                    return positions.length > 0 ? (
                                        <div className="space-y-4">
                                            {positions.map((position: any) => {
                                                const shares = position.total_bought - position.total_sold;
                                                if (shares <= 0) return null;

                                                const marketYesProbability = Number(position.current_yes_probability || 50) / 100;
                                                const currentPrice = Number(position.current_price || marketYesProbability);
                                                const maxPayout = 100;
                                                const currentValue = shares * maxPayout * currentPrice;

                                                return (
                                                    <div key={`${position.market_id}-${position.outcome}`} className="border border-border rounded-lg p-4 hover:border-white/10 transition-all">
                                                        <div className="flex items-start justify-between mb-4">
                                                            <div className="flex-1">
                                                                <h3 className="font-bold text-foreground text-lg">{position.market_question}</h3>
                                                                <p className="text-sm text-muted-foreground mt-1">
                                                                    Position on{" "}
                                                                    <span className={`font-semibold ${position.outcome === 'Yes' ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {position.outcome}
                                                                    </span>
                                                                </p>
                                                            </div>
                                                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                                                PENDING
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-4 gap-3 bg-muted p-3 rounded-lg">
                                                            <div>
                                                                <p className="text-xs text-muted-foreground mb-1 font-medium">Total Invested</p>
                                                                <p className="font-bold text-foreground">KES {Number(position.total_cost).toLocaleString()}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-muted-foreground mb-1 font-medium">Net Shares</p>
                                                                <p className="font-bold text-foreground">{shares.toFixed(2)}</p>
                                                                {position.total_sold > 0 && (
                                                                    <p className="text-xs text-muted-foreground mt-1">({position.total_bought.toFixed(2)} bought, {position.total_sold.toFixed(2)} sold)</p>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-muted-foreground mb-1 font-medium">Current Value</p>
                                                                <p className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    KES {currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-muted-foreground mb-1 font-medium">P&L</p>
                                                                <p className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {profit >= 0 ? '+' : ''} KES {profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <Link
                                                            href={`/markets/${position.market_id}-${generateMarketSlug(position.market_question)}`}
                                                            className="mt-3 w-full inline-block text-center py-2 border border-border rounded-lg text-sm font-bold hover:bg-muted transition-all"
                                                        >
                                                            View Market
                                                        </Link>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center">
                                            <p className="text-muted-foreground mb-4">No active positions yet</p>
                                            <Link href="/" className="text-apple-blue hover:underline font-bold">
                                                Start trading markets
                                            </Link>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                        {activeTab === "positions" && (
                            <div className="py-12 text-center">
                                <p className="text-muted-foreground">Position details coming soon</p>
                            </div>
                        )}
                        {activeTab === "history" && (
                            <div className="py-12 text-center">
                                <p className="text-muted-foreground">Transaction history - visit Deposits & Withdrawals</p>
                                <Link href="/wallet" className="text-apple-blue hover:underline mt-4 inline-block">
                                    View all transactions
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
