"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/useAuth";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { ArrowLeft, Wallet, Smartphone, CreditCard, ChevronRight, CheckCircle2 } from "lucide-react";

const PRESET_AMOUNTS = [500, 1000, 2000, 5000];

export default function DepositPage() {
    const { user: authUser, loading: authLoading } = useAuth("/deposit");
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState<"mpesa" | "card">("mpesa");
    const [step, setStep] = useState<"input" | "processing" | "success">("input");
    const [error, setError] = useState("");

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

    const handleDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStep("processing");
        setError("");

        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/payments/stk-push/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount }),
            });

            const data = await response.json();
            if (response.ok) {
                setTimeout(() => setStep("success"), 3000);
            } else {
                setStep("input");
                setError(data.error || "Failed to initiate STK Push");
            }
        } catch (err) {
            setStep("input");
            setError("Connection error. Is the backend running?");
        }
    };

    if (step === "processing") {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Wallet className="h-12 w-12 text-foreground animate-bounce mb-4" />
                    <p className="font-bold text-foreground text-lg">Processing...</p>
                    <p className="text-muted-foreground">Check your phone for M-Pesa prompt</p>
                </div>
            </div>
        );
    }

    if (step === "success") {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <CheckCircle2 className="h-20 w-20 text-green-600 mb-4" />
                    <h1 className="text-3xl font-bold text-foreground mb-2">Deposit Successful!</h1>
                    <p className="text-muted-foreground mb-6">KSh {parseFloat(amount).toLocaleString()} added</p>
                    <Link href="/dashboard" className="bg-foreground text-background px-6 py-3 rounded-lg font-semibold">
                        Go to Dashboard →
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-12">
            <Navbar />
            <main className="mx-auto pt-24 max-w-[600px] px-4 md:px-6">
                <div className="mb-8 flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-muted rounded-lg">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Deposit</h1>
                        <p className="text-muted-foreground">Add funds to your account</p>
                    </div>
                </div>

                <form onSubmit={handleDeposit} className="space-y-6">
                    <div className="bg-background rounded-2xl p-6 border border-border">
                        <p className="text-sm text-muted-foreground mb-2">Amount</p>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0"
                            className="text-4xl font-bold w-full border-none focus:outline-none bg-transparent"
                            min="100"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-3">Preset Amount</label>
                        <div className="grid grid-cols-2 gap-3">
                            {PRESET_AMOUNTS.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setAmount(preset.toString())}
                                    className="p-3 rounded-lg border border-border hover:border-foreground hover:bg-muted font-semibold"
                                >
                                    KSh {preset.toLocaleString()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-3">Method</label>
                        <button
                            type="button"
                            onClick={() => setMethod("mpesa")}
                            className={`w-full p-4 rounded-lg border-2 text-left transition ${
                                method === "mpesa"
                                    ? "border-foreground bg-foreground/5"
                                    : "border-border hover:border-muted-foreground"
                            }`}
                        >
                            <p className="font-semibold">M-Pesa</p>
                            <p className="text-xs text-muted-foreground">STK Push</p>
                        </button>
                    </div>

                    {error && <p className="text-red-600 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={!amount || parseFloat(amount) < 100}
                        className="w-full bg-foreground text-background py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Deposit KSh {amount || "0"}
                    </button>
                </form>
            </main>
        </div>
    );
}
