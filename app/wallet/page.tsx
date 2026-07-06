"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector, selectBalance, selectTransactions } from "@/lib/redux/hooks";
import { fetchTransactionHistory } from "@/lib/redux/slices/portfolioSlice";

import DepositModal from "@/components/DepositModal";
import WithdrawModal from "@/components/WithdrawModal";
import { useAuth } from "@/lib/useAuth";
import { ArrowLeft, Wallet, CreditCard, TrendingUp, History, Sparkles } from "lucide-react";

export default function WalletPage() {
    const { user: authUser, loading: authLoading } = useAuth("/wallet");
    const dispatch = useAppDispatch();
    const fetchAttemptedRef = useRef(false);

    const balance = useAppSelector(selectBalance);
    const transactions = useAppSelector(selectTransactions);

    const [error, setError] = useState("");
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
    const [filter, setFilter] = useState<"all" | "deposits" | "withdrawals">("all");

    useEffect(() => {
        if (authLoading) return;

        if (!authUser) {
            setError("Please log in");
            return;
        }

        if (fetchAttemptedRef.current) return;
        fetchAttemptedRef.current = true;

        dispatch(fetchTransactionHistory());
    }, [authUser?.phone_number, authLoading, dispatch]);

    useEffect(() => {
        if (filter === "all") {
            setFilteredTransactions(transactions);
        } else if (filter === "deposits") {
            setFilteredTransactions(transactions.filter((t) => t.type === "DEPOSIT"));
        } else {
            setFilteredTransactions(transactions.filter((t) => t.type === "WITHDRAWAL"));
        }
    }, [transactions, filter]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-background">
                <main className="mx-auto pt-24 max-w-[1200px] px-4">
                    <div className="text-center py-12">
                        <div className="h-8 w-8 border-4 border-foreground border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !authUser) {
        return (
            <div className="min-h-screen bg-background">
                <main className="mx-auto pt-24 max-w-[1200px] px-4 text-center">
                    <p className="text-red-500 mb-4">{error || "Failed to load page"}</p>
                    <Link href="/dashboard" className="text-apple-blue hover:underline">
                        Back to Dashboard
                    </Link>
                </main>
            </div>
        );
    }

    const totalDeposited = transactions
        .filter((t) => t.type === "DEPOSIT" && t.status === "COMPLETED")
        .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);

    const totalWithdrawn = transactions
        .filter((t) => t.type === "WITHDRAWAL" && t.status === "COMPLETED")
        .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);

    const summaryCards = [
        {
            title: "Available Balance",
            value: `KES ${parseFloat(balance || "0").toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            description: "Ready to use",
            icon: Wallet,
            color: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40",
            iconColor: "text-amber-700 dark:text-amber-400",
            accent: "text-foreground",
        },
        {
            title: "Total Deposited",
            value: `KES ${totalDeposited.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            description: "Completed deposits",
            icon: CreditCard,
            color: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40",
            iconColor: "text-emerald-700 dark:text-emerald-400",
            accent: "text-emerald-600",
        },
        {
            title: "Total Withdrawn",
            value: `KES ${totalWithdrawn.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            description: "Completed withdrawals",
            icon: TrendingUp,
            color: "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40",
            iconColor: "text-rose-700 dark:text-rose-400",
            accent: "text-rose-600",
        },
    ];

    return (
        <div className="min-h-screen bg-background pb-12">
            <main className="mx-auto pt-24 max-w-[1200px] px-4 md:px-6">
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard" className="p-2 hover:bg-muted rounded-lg transition">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                            <div>
                                <h1 className="text-4xl font-bold">Wallet</h1>
                                <p className="text-muted-foreground text-sm">Manage your funds and transaction activity</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] mb-6">
                    <div className="rounded-2xl border border-apple-blue/20 bg-gradient-to-br from-apple-blue/10 via-background to-amber-50/70 p-6 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold text-apple-blue">Wallet Overview</p>
                                <h2 className="text-3xl font-bold mt-2 text-foreground dark:text-white">KES {parseFloat(balance || "0").toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
                                <p className="text-sm text-muted-foreground mt-2">Your available balance is ready for deposits, withdrawals, and bets.</p>
                            </div>
                            <div className="rounded-2xl border border-apple-blue/20 bg-white/80 p-3 dark:bg-background/80">
                                <Sparkles className="h-6 w-6 text-apple-blue" />
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                onClick={() => setIsDepositModalOpen(true)}
                                className="flex items-center gap-2 rounded-lg bg-apple-green px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                            >
                                <CreditCard className="h-4 w-4" />
                                Deposit
                            </button>
                            <button
                                onClick={() => setIsWithdrawModalOpen(true)}
                                className="flex items-center gap-2 rounded-lg bg-apple-blue px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                            >
                                <TrendingUp className="h-4 w-4" />
                                Withdraw
                            </button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <History className="h-5 w-5 text-apple-blue" />
                            <h3 className="font-semibold text-foreground">Recent activity</h3>
                        </div>
                        <div className="space-y-3">
                            {transactions.slice(0, 3).map((txn) => (
                                <div key={txn.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-3">
                                    <div>
                                        <p className="text-sm font-semibold">{txn.description || (txn.type === "DEPOSIT" ? "Deposit" : "Withdrawal")}</p>
                                        <p className="text-xs text-muted-foreground">{txn.status}</p>
                                    </div>
                                    <div className={`text-sm font-semibold ${txn.type === "DEPOSIT" ? "text-apple-green" : "text-apple-red"}`}>
                                        {txn.type === "DEPOSIT" ? "+" : "-"} KES {parseFloat(txn.amount || "0").toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3 mb-6">
                    {summaryCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <div key={card.title} className={`aspect-square rounded-2xl border p-5 shadow-sm ${card.color}`}>
                                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-background/70 ${card.iconColor}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                                <p className={`mt-3 text-xl font-bold ${card.accent} dark:text-white`}>{card.value}</p>
                                <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
                            </div>
                        );
                    })}
                </div>

                <div className="rounded-2xl border border-border bg-background shadow-sm">
                    <div className="border-b border-border p-6">
                        <div className="flex flex-wrap gap-6">
                            {['all', 'deposits', 'withdrawals'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setFilter(tab as any)}
                                    className={`border-b-2 pb-2 text-sm font-semibold transition-colors ${
                                        filter === tab
                                            ? "border-black text-black dark:border-white dark:text-white"
                                            : "border-transparent text-muted-foreground hover:text-black dark:hover:text-white"
                                    }`}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        {filteredTransactions.length > 0 ? (
                            <table className="w-full min-w-[700px]">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Type</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Description</th>
                                        <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">Amount</th>
                                        <th className="px-6 py-4 text-center text-sm font-semibold text-muted-foreground">Status</th>
                                        <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTransactions.map((txn) => (
                                        <tr key={txn.id} className="border-b border-border transition hover:bg-muted/50">
                                            <td className="px-6 py-4">
                                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                                                    txn.type === "DEPOSIT"
                                                        ? "bg-apple-green/10 text-apple-green"
                                                        : "bg-apple-red/10 text-apple-red"
                                                }`}>
                                                    {txn.type === "DEPOSIT" ? "DEPOSIT" : "WITHDRAWAL"}
                                                </span>
                                            </td>
                                            <td className="max-w-xs truncate px-6 py-4 text-sm text-foreground">{txn.description}</td>
                                            <td className="px-6 py-4 text-right text-sm font-bold">
                                                <span className={txn.type === "DEPOSIT" ? "text-apple-green" : "text-apple-red"}>
                                                    {txn.type === "DEPOSIT" ? "+" : "-"} KES {parseFloat(txn.amount || "0").toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                                                    txn.status === "COMPLETED"
                                                        ? "bg-apple-green/10 text-apple-green"
                                                        : txn.status === "PENDING"
                                                        ? "bg-yellow-500/10 text-yellow-600"
                                                        : "bg-apple-red/10 text-apple-red"
                                                }`}>
                                                    {txn.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm text-muted-foreground">
                                                {new Date(txn.created_at).toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-12 text-center">
                                <p className="mb-4 text-muted-foreground">No {filter === "all" ? "transactions" : filter} yet</p>
                                <button onClick={() => setIsDepositModalOpen(true)} className="font-bold text-apple-blue hover:underline">
                                    Make your first deposit
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <DepositModal
                isOpen={isDepositModalOpen}
                onClose={() => setIsDepositModalOpen(false)}
                balance={authUser?.balance || "0.00"}
            />

            <WithdrawModal
                isOpen={isWithdrawModalOpen}
                onClose={() => setIsWithdrawModalOpen(false)}
                balance={balance}
                phoneNumber={authUser?.phone_number || ""}
            />
        </div>
    );
}
