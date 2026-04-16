"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector, selectBalance, selectTransactions } from "@/lib/redux/hooks";
import { fetchTransactionHistory } from "@/lib/redux/slices/portfolioSlice";
import Navbar from "@/components/Navbar";
import DepositModal from "@/components/DepositModal";
import WithdrawModal from "@/components/WithdrawModal";
import { useAuth } from "@/lib/useAuth";
import { ArrowLeft, Wallet, CreditCard, TrendingUp } from "lucide-react";

export default function DepositsWithdrawalsPage() {
    const { user: authUser, loading: authLoading } = useAuth("/dashboard/deposits-withdrawals");
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
            setFilteredTransactions(transactions.filter(t => t.type === "DEPOSIT"));
        } else {
            setFilteredTransactions(transactions.filter(t => t.type === "WITHDRAWAL"));
        }
    }, [transactions, filter]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
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
                <Navbar />
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
        .filter(t => t.type === "DEPOSIT" && t.status === "COMPLETED")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalWithdrawn = transactions
        .filter(t => t.type === "WITHDRAWAL" && t.status === "COMPLETED")
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return (
        <div className="min-h-screen bg-background pb-20">
            <Navbar />

            <main className="mx-auto pt-24 max-w-[1200px] px-4 md:px-6">
                {/* Header */}
                <div className="mb-8 flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-muted rounded-lg transition">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Wallet className="h-8 w-8" />
                            Deposits & Withdrawals
                        </h1>
                        <p className="text-muted-foreground text-sm">Manage your account balance</p>
                    </div>
                </div>

                {/* Balance & Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Current Balance */}
                    <div className="bg-background rounded-2xl p-6 border border-border">
                        <p className="text-muted-foreground text-sm font-medium mb-2">Available Balance</p>
                        <h2 className="text-3xl font-bold mb-4">KES {parseFloat(balance).toLocaleString()}</h2>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsDepositModalOpen(true)}
                                className="flex-1 px-4 py-3 bg-apple-green text-white rounded-lg font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 text-sm"
                            >
                                <CreditCard className="h-4 w-4" />
                                Deposit
                            </button>
                            <button
                                onClick={() => setIsWithdrawModalOpen(true)}
                                className="flex-1 px-4 py-3 bg-apple-blue text-white rounded-lg font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 text-sm"
                            >
                                <TrendingUp className="h-4 w-4" />
                                Withdraw
                            </button>
                        </div>
                    </div>

                    {/* Total Deposited */}
                    <div className="bg-background rounded-2xl p-6 border border-border border-l-4 border-l-apple-green">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-muted-foreground text-sm font-medium">Total Deposited</p>
                            <CreditCard className="h-5 w-5 text-apple-green" />
                        </div>
                        <h2 className="text-3xl font-bold text-apple-green">KES {totalDeposited.toLocaleString()}</h2>
                        <p className="text-xs text-muted-foreground mt-2">All completed deposits</p>
                    </div>

                    {/* Total Withdrawn */}
                    <div className="bg-background rounded-2xl p-6 border border-border border-l-4 border-l-apple-red">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-muted-foreground text-sm font-medium">Total Withdrawn</p>
                            <Wallet className="h-5 w-5 text-apple-red" />
                        </div>
                        <h2 className="text-3xl font-bold text-apple-red">KES {totalWithdrawn.toLocaleString()}</h2>
                        <p className="text-xs text-muted-foreground mt-2">All completed withdrawals</p>
                    </div>
                </div>

                {/* Transaction History */}
                <div className="bg-background rounded-2xl border border-border">
                    {/* Filter Tabs */}
                    <div className="border-b border-border p-6">
                        <div className="flex gap-6">
                            {["all", "deposits", "withdrawals"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setFilter(tab as any)}
                                    className={`pb-2 font-semibold text-sm transition-colors border-b-2 ${
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

                    {/* Transaction Table */}
                    <div className="overflow-x-auto">
                        {filteredTransactions.length > 0 ? (
                            <table className="w-full min-w-[700px]">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-4 px-6 font-semibold text-muted-foreground text-sm">Type</th>
                                        <th className="text-left py-4 px-6 font-semibold text-muted-foreground text-sm">Description</th>
                                        <th className="text-right py-4 px-6 font-semibold text-muted-foreground text-sm">Amount</th>
                                        <th className="text-center py-4 px-6 font-semibold text-muted-foreground text-sm">Status</th>
                                        <th className="text-right py-4 px-6 font-semibold text-muted-foreground text-sm">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTransactions.map((txn) => (
                                        <tr key={txn.id} className="border-b border-border hover:bg-muted/50 transition">
                                            <td className="py-4 px-6">
                                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                                                    txn.type === "DEPOSIT"
                                                        ? "bg-apple-green/10 text-apple-green"
                                                        : "bg-apple-red/10 text-apple-red"
                                                }`}>
                                                    {txn.type === "DEPOSIT" ? "DEPOSIT" : "WITHDRAWAL"}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-foreground max-w-xs truncate">{txn.description}</td>
                                            <td className="py-4 px-6 text-right text-sm font-bold">
                                                <span className={txn.type === "DEPOSIT" ? "text-apple-green" : "text-apple-red"}>
                                                    {txn.type === "DEPOSIT" ? "+" : "-"} KES {parseFloat(txn.amount).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                                    txn.status === "COMPLETED"
                                                        ? "bg-apple-green/10 text-apple-green"
                                                        : txn.status === "PENDING"
                                                        ? "bg-yellow-500/10 text-yellow-600"
                                                        : "bg-apple-red/10 text-apple-red"
                                                }`}>
                                                    {txn.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right text-sm text-muted-foreground">
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
                                <p className="text-muted-foreground mb-4">No {filter === "all" ? "transactions" : filter} yet</p>
                                <button
                                    onClick={() => setIsDepositModalOpen(true)}
                                    className="text-apple-blue hover:underline font-bold"
                                >
                                    Make your first deposit
                                </button>
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
