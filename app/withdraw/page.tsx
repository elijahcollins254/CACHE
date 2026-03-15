"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/useAuth";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { ArrowLeft } from "lucide-react";

export default function Withdraw() {
    const { user: authUser, loading: authLoading } = useAuth("/withdraw");
    const [amount, setAmount] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#fbfbfd]">
                <Navbar />
                <main className="mx-auto pt-24 max-w-[600px] px-4">
                    <div className="h-96 bg-muted rounded-lg animate-pulse" />
                </main>
            </div>
        );
    }

    if (!authUser) {
        return (
            <div className="min-h-screen bg-[#fbfbfd]">
                <Navbar />
                <main className="mx-auto pt-24 max-w-[600px] px-4 text-center">
                    <p className="text-red-500 mb-4">Authentication required</p>
                    <Link href="/login" className="text-apple-blue hover:underline">
                        Return to login
                    </Link>
                </main>
            </div>
        );
    }

    const user = authUser;

    const handleWithdraw = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setError("Please enter a valid amount");
            return;
        }

        if (parseFloat(amount) > parseFloat(user.balance)) {
            setError("Insufficient balance");
            return;
        }

        setSubmitting(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/withdraw/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: parseFloat(amount) }),
            });

            if (response.ok) {
                const data = await response.json();
                setSuccess(`Withdrawal initiated! Request ID: ${data.transaction_id}`);
                setAmount("");
                setTimeout(() => {
                    window.location.href = "/dashboard";
                }, 2000);
            } else {
                const data = await response.json();
                setError(data.error || "Withdrawal failed");
            }
        } catch (err) {
            setError("Connection error");
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background pb-12">
            <Navbar />
            <div className="pt-24 px-4">
                <div className="max-w-[400px] mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <Link
                            href="/dashboard"
                            className="p-2 hover:bg-muted rounded-full transition-all"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Withdraw</h1>
                            <p className="text-muted-foreground">Cash out your balance</p>
                        </div>
                    </div>

                    {/* Balance Display */}
                    <div className="apple-card p-6 mb-6">
                        <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Available Balance</p>
                        <p className="text-4xl font-bold text-foreground">KSH {parseFloat(user.balance).toFixed(2)}</p>
                    </div>

                    {/* Withdrawal Form */}
                    <div className="apple-card p-6">
                        <h2 className="text-xl font-bold text-foreground mb-6">Withdrawal Details</h2>

                        {error && (
                            <div className="bg-apple-red/10 border border-apple-red/30 rounded-lg p-4 mb-4">
                                <p className="text-sm text-apple-red font-bold">{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="bg-apple-green/10 border border-apple-green/30 rounded-lg p-4 mb-4">
                                <p className="text-sm text-apple-green font-bold">{success}</p>
                                <p className="text-xs text-apple-green/70 mt-1">Redirecting to dashboard...</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2">Withdrawal Amount</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3 text-muted-foreground font-bold">KSH</span>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        disabled={submitting}
                                        className="w-full pl-14 pr-4 py-3 border border-border rounded-lg text-foreground bg-background font-bold focus:outline-none focus:ring-2 focus:ring-foreground disabled:opacity-50"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">Max: KSH {parseFloat(user.balance).toFixed(2)}</p>
                            </div>

                            <button
                                onClick={() => setAmount(user.balance)}
                                className="text-sm text-blue-500 font-bold hover:underline"
                            >
                                Use Maximum
                            </button>

                            {/* Quick amounts */}
                            <div className="grid grid-cols-3 gap-2">
                                {[100, 500, 1000].map((amt) => (
                                    <button
                                        key={amt}
                                        onClick={() => setAmount(amt.toString())}
                                        disabled={submitting || amt > parseFloat(user.balance)}
                                        className="px-3 py-2 border border-border rounded-lg text-sm font-bold hover:bg-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        KSH {amt}
                                    </button>
                                ))}
                            </div>

                            <div className="border-t border-border pt-4">
                                <p className="text-xs text-muted-foreground mb-1">Note: Withdrawals are processed to your M-Pesa number</p>
                                <p className="text-xs text-muted-foreground">Processing time: 1-5 minutes</p>
                            </div>

                            <button
                                onClick={handleWithdraw}
                                disabled={submitting || !amount}
                                className="w-full h-12 bg-foreground text-background rounded-full font-bold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {submitting ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Processing...
                                    </>
                                ) : (
                                    "Withdraw"
                                )}
                            </button>

                            <Link
                                href="/dashboard"
                                className="w-full h-12 bg-muted text-black rounded-full flex items-center justify-center font-bold transition-all hover:bg-[#e8e8ed]"
                            >foreground rounded-full flex items-center justify-center font-bold transition-all hover:bg-muted/80
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
