"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector, selectUser, selectBalance, selectPortfolioValue, selectStatistics, selectBets, selectTransactions, selectPortfolioLoading, selectPortfolioError } from "@/lib/redux/hooks";
import { fetchDashboardData, fetchTransactionHistory } from "@/lib/redux/slices/portfolioSlice";
import { fetchUserData } from "@/lib/redux/slices/authSlice";
import { generateMarketSlug } from "@/lib/slugify";
import Navbar from "@/components/Navbar";
import DepositModal from "@/components/DepositModal";
import WithdrawModal from "@/components/WithdrawModal";
import { useAuth } from "@/lib/useAuth";
import { ArrowLeft, Wallet, TrendingUp, Award, History, LogOut, Search, Filter } from "lucide-react";

export default function Dashboard() {
    const { user: authUser, loading: authLoading } = useAuth("/dashboard");
    const dispatch = useAppDispatch();
    const fetchAttemptedRef = useRef(false);
    
    // Redux state
    const user = useAppSelector(selectUser);
    const balance = useAppSelector(selectBalance);
    const portfolioValue = useAppSelector(selectPortfolioValue);
    const statistics = useAppSelector(selectStatistics);
    const bets = useAppSelector(selectBets);
    const transactions = useAppSelector(selectTransactions);
    const loading = useAppSelector(selectPortfolioLoading);
    const portfolioError = useAppSelector(selectPortfolioError);
    
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState<"active" | "positions" | "open-orders" | "history">("active");
    const [profitLossPeriod, setProfitLossPeriod] = useState<"1D" | "1W" | "1M" | "ALL">("1M");
    const [searchQuery, setSearchQuery] = useState("");
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

    useEffect(() => {
        if (authLoading) return;

        if (!authUser) {
            setError("Please log in");
            return;
        }

        // Only fetch once per user session
        if (fetchAttemptedRef.current) return;
        fetchAttemptedRef.current = true;

        // Fetch dashboard and transaction history from Redux (only once per user)
        dispatch(fetchDashboardData());
        dispatch(fetchTransactionHistory());
        dispatch(fetchUserData());
    }, [authUser?.phone_number, authLoading, dispatch]);

    const handleLogout = () => {
        localStorage.removeItem("poly_user");
        window.location.href = "/login";
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="mx-auto pt-24 max-w-[1200px] px-4">
                    <div className="space-y-4">
                        <div className="h-32 bg-muted rounded-lg animate-pulse" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="h-24 bg-muted rounded-lg animate-pulse" />
                            <div className="h-24 bg-muted rounded-lg animate-pulse" />
                            <div className="h-24 bg-muted rounded-lg animate-pulse" />
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !authUser) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="mx-auto pt-24 max-w-[1200px] px-4 text-center">
                    <p className="text-red-500 mb-4">{error || "Failed to load dashboard"}</p>
                    <Link href="/login" className="text-apple-blue hover:underline">
                        Return to login
                    </Link>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <Navbar />

            <main className="mx-auto pt-32 sm:pt-24 max-w-[1200px] px-4 md:px-6">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-muted rounded-lg transition">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">Welcome, {authUser?.full_name || "User"}</h1>
                            <p className="text-muted-foreground text-sm">{authUser?.phone_number}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>

                {/* Portfolio & Profit/Loss Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Cache Balance & Action Buttons */}
                    <div>
                        <div className="bg-background rounded-2xl p-6 border border-border">
                            <p className="text-muted-foreground text-sm font-medium mb-1">Cache Balance</p>
                            <h2 className="text-3xl font-bold mb-6">KES {parseFloat(balance).toLocaleString()}</h2>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsDepositModalOpen(true)}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm"
                                >
                                    <Wallet className="h-4 w-4" />
                                    Deposit
                                </button>
                                <button
                                    onClick={() => setIsWithdrawModalOpen(true)}
                                    className="flex-1 px-4 py-3 border border-border text-foreground rounded-lg font-semibold hover:bg-muted transition text-sm"
                                >
                                    Withdraw
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Portfolio Card */}
                    <div>
                        <div className="bg-background rounded-2xl p-6 border border-border">
                            <p className="text-muted-foreground text-sm font-medium mb-1">Portfolio Value</p>
                            <h2 className="text-3xl font-bold mb-1">KES {parseFloat(portfolioValue).toLocaleString()}</h2>
                            <p className="text-xs text-muted-foreground mb-6">{statistics?.total_wagered && statistics.total_wagered > 0 ? `+${parseFloat(String(statistics.total_wagered)).toLocaleString()}` : '0.00'} (0%) past day</p>
                        </div>
                    </div>

                    {/* Profit/Loss Card */}
<div className="bg-background rounded-2xl p-6 border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-muted-foreground text-sm font-medium">Profit/Loss</p>
                                <h2 className="text-3xl font-bold text-foreground">KES 0.00</h2>
                            </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-4">Past {profitLossPeriod.toLowerCase()}</p>
                        
                        {/* Time Period Filters */}
                        <div className="flex gap-2">
                            {["1D", "1W", "1M", "ALL"].map((period) => (
                                <button
                                    key={period}
                                    onClick={() => setProfitLossPeriod(period as any)}
                                    className={`px-3 py-1 rounded text-xs font-medium transition ${
                                        profitLossPeriod === period
                                        ? "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
                                            : "bg-muted text-muted-foreground hover:bg-muted/90"
                                    }`}
                                >
                                    {period}
                                </button>
                            ))}
                        </div>

                        {/* Placeholder Chart */}
                        <div className="mt-4 h-20 bg-gradient-to-r from-blue-50 to-transparent rounded-lg" />
                    </div>
                </div>

                {/* Positions Tabs & Table */}
                    <div className="bg-background rounded-2xl border border-border">
                    {/* Tabs & Search */}
                        <div className="border-b border-border p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            {/* Tabs */}
                            <div className="flex gap-6">
                                {["active", "positions", "open-orders", "history"].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab as any)}
                                        className={`pb-2 font-semibold text-sm transition-colors border-b-2 ${
                                            activeTab === tab
                                                ? "border-black text-black dark:border-white dark:text-white"
                                                : "border-transparent text-muted-foreground hover:text-black dark:hover:text-white"
                                        }`}
                                    >
                                        {tab === "active" ? "Open Positions" : tab.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
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
                                placeholder="Search"
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
                                {bets.filter(b => b.result === 'PENDING').length > 0 ? (
                                    <div className="space-y-4">
                                        {bets.filter(b => b.result === 'PENDING').map((bet) => {
                                            // Calculate current position value using entry probability
                                            // current_value = shares × current_price × 100
                                            const shares = Number(bet.quantity);
                                            const currentPrice = bet.entry_probability;
                                            const currentValue = shares * currentPrice;
                                            const profit = currentValue - Number(bet.amount);
                                            
                                            return (
                                                <div key={bet.id} className="border border-border rounded-lg p-4 hover:border-white/10 transition-all">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex-1">
                                                            <h3 className="font-bold text-foreground text-lg">{bet.market_question}</h3>
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                Position on <span className={`font-semibold ${bet.outcome === 'Yes' ? 'text-green-600' : 'text-red-600'}`}>{bet.outcome}</span>
                                                            </p>
                                                        </div>
                                                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                                            PENDING
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-4 gap-3 bg-muted p-3 rounded-lg">
                                                        <div>
                                                            <p className="text-xs text-muted-foreground mb-1 font-medium">Stake Amount</p>
                                                            <p className="font-bold text-foreground">KES {Number(bet.amount).toLocaleString()}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-muted-foreground mb-1 font-medium">Shares</p>
                                                            <p className="font-bold text-foreground">{shares.toFixed(2)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-muted-foreground mb-1 font-medium">Current Value</p>
                                                            <p className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                KES {currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-muted-foreground mb-1 font-medium">Placed</p>
                                                            <p className="font-bold text-foreground">{new Date(bet.timestamp).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>

                                                    <Link
                                                        href={`/markets/${bet.market_id}-${generateMarketSlug(bet.market_question)}`}
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
                                )}
                            </div>
                        )}
                        {activeTab === "positions" && (
                            <div>
                                {bets.filter(b => b.market_question?.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border">
                                                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">MARKET</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">AVG → NOW</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">STAKE</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">PAYOUT</th>
                                                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">VALUE</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {bets.filter(b => !searchQuery || b.market_question?.toLowerCase().includes(searchQuery.toLowerCase())).map((bet) => (
                                                    <tr key={bet.id} className="border-b border-border hover:bg-muted transition">
                                                        <td className="py-4 px-4">
                                                            <div>
                                                                <p className="font-medium text-sm truncate max-w-xs">{bet.market_question}</p>
                                                                <p className="text-xs text-muted-foreground mt-1">{bet.outcome}</p>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-4 text-sm">
                                                            <span className="text-muted-foreground">0% → 0%</span>
                                                        </td>
                                                        <td className="py-4 px-4 text-sm font-medium">
                                                            KES {parseFloat(bet.amount).toLocaleString()}
                                                        </td>
                                                        <td className="py-4 px-4 text-sm">
                                                            <span className="text-green-600 font-medium">
                                                                {bet.payout ? `KES ${parseFloat(bet.payout).toLocaleString()}` : "—"}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-4 text-right">
                                                            <div>
                                                                <p className="font-medium text-sm">
                                                                    {bet.payout ? `+KES ${(parseFloat(bet.payout) - parseFloat(bet.amount)).toLocaleString()}` : "—"}
                                                                </p>
                                                                <p className={`text-xs ${
                                                                    bet.result === 'WON'
                                                                        ? 'text-green-600'
                                                                        : bet.result === 'LOST'
                                                                        ? 'text-red-600'
                                                                        : 'text-muted-foreground'
                                                                }`}>
                                                                    {bet.result}
                                                                </p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center">
                                        <p className="text-muted-foreground">No positions found.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === "open-orders" && (
                            <div className="py-12 text-center">
                                <p className="text-muted-foreground">No open orders</p>
                            </div>
                        )}

                        {activeTab === "history" && (
                            <div>
                                {transactions.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-border bg-background">
                                        <table className="w-full min-w-[700px] table-auto text-sm">
                                            <thead>
                                            <tr className="border-b border-border">
                                                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground whitespace-nowrap">TYPE</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground whitespace-nowrap">DESCRIPTION</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground whitespace-nowrap">AMOUNT</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground whitespace-nowrap">STATUS</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground whitespace-nowrap">DATE</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {transactions.map((txn) => (
                                                    <tr key={txn.id} className="border-b border-border hover:bg-muted transition">
                                                        <td className="py-4 px-4 whitespace-nowrap">
                                                            <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                                                txn.type === 'DEPOSIT'
                                                                    ? 'bg-green-50 text-green-700'
                                                                    : 'bg-red-50 text-red-700'
                                                            }`}>
                                                                {txn.type}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-4 text-sm max-w-[220px] truncate">{txn.description}</td>
                                                        <td className="py-4 px-4 text-sm font-medium whitespace-nowrap">
                                                            <span className={txn.type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'}>
                                                                {txn.type === 'DEPOSIT' ? '+' : '-'} KES {parseFloat(txn.amount).toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-4 whitespace-nowrap">
                                                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                                                                txn.status === 'COMPLETED'
                                                                    ? 'bg-green-50 text-green-700'
                                                                    : txn.status === 'PENDING'
                                                                    ? 'bg-yellow-50 text-yellow-700'
                                                                    : 'bg-red-50 text-red-700'
                                                            }`}>
                                                                {txn.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-4 text-sm text-muted-foreground whitespace-nowrap">
                                                            {new Date(txn.created_at).toLocaleDateString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center">
                                        <p className="text-muted-foreground">No transaction history</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Deposit Modal */}
            <DepositModal
                isOpen={isDepositModalOpen}
                onClose={() => setIsDepositModalOpen(false)}
                balance={authUser?.balance || "0.00"}
            />

            {/* Withdraw Modal */}
            <WithdrawModal
                isOpen={isWithdrawModalOpen}
                onClose={() => setIsWithdrawModalOpen(false)}
                balance={balance}
                phoneNumber={authUser?.phone_number || ""}
            />
        </div>
    );
}
