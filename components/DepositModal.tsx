"use client";

import { X, Wallet, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    balance: string;
}

const PRESET_AMOUNTS = [500, 1000, 2000, 5000];

export default function DepositModal({ isOpen, onClose, balance }: DepositModalProps) {
    const [amount, setAmount] = useState("");
    const [step, setStep] = useState<"input" | "processing" | "success">("input");
    const [error, setError] = useState("");
    const [transactionId, setTransactionId] = useState<number | null>(null);

    // Close on escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "auto";
        };
    }, [isOpen, onClose]);

    // Reset state when opening/closing
    useEffect(() => {
        if (!isOpen) {
            setAmount("");
            setStep("input");
            setError("");
            setTransactionId(null);
        }
    }, [isOpen]);

    // Poll transaction status while processing
    useEffect(() => {
        if (step !== "processing" || !transactionId) return;

        const pollStatus = async () => {
            try {
                const response = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/payments/transaction/${transactionId}/status/`,
                    { method: "GET" }
                );

                const data = await response.json();

                if (data.status === "COMPLETED") {
                    setStep("success");
                } else if (data.status === "FAILED") {
                    setStep("input");
                    // Show M-Pesa specific error message or fallback to generic
                    setError(data.error_message || "Payment failed. Please try again.");
                    setTransactionId(null);
                }
                // If PENDING, keep polling
            } catch (err) {
                // Continue polling on error
                console.error("Status check error:", err);
            }
        };

        // Poll every 2 seconds, max 5 minutes (150 checks)
        let checkCount = 0;
        const interval = setInterval(() => {
            checkCount++;
            if (checkCount > 150) {
                // Timeout after 5 minutes
                clearInterval(interval);
                setStep("input");
                setError("Payment processing timeout. Please check your M-Pesa balance.");
                setTransactionId(null);
                return;
            }
            pollStatus();
        }, 2000);

        return () => clearInterval(interval);
    }, [step, transactionId]);

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
                setTransactionId(data.transaction_id);
                // Don't set step to success here - let polling handle it
            } else {
                setStep("input");
                setError(data.customer_message || data.error || "Failed to initiate STK Push");
                setTransactionId(null);
            }
        } catch (err) {
            setStep("input");
            setError("Connection error. Is the backend running?");
            setTransactionId(null);
        }
    };

    if (!isOpen) return null;

    // Processing state
    if (step === "processing") {
        return (
            <>
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
                {/* Modal */}
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-0 pointer-events-none">
                    <div className="bg-background dark:bg-slate-950 border border-border rounded-xl shadow-2xl max-w-sm w-full pointer-events-auto flex flex-col items-center justify-center py-8 px-4">
                        <Wallet className="h-10 w-10 text-foreground animate-bounce mb-3" />
                        <p className="font-bold text-foreground text-base">Processing...</p>
                        <p className="text-muted-foreground text-xs mt-1">Check your phone for M-Pesa prompt</p>
                    </div>
                </div>
            </>
        );
    }

    // Success state
    if (step === "success") {
        return (
            <>
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
                {/* Modal */}
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-0 pointer-events-none">
                    <div className="bg-background dark:bg-slate-950 border border-border rounded-xl shadow-2xl max-w-sm w-full pointer-events-auto p-4 text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                        <h2 className="text-lg font-bold text-foreground mb-1">Deposit Successful!</h2>
                        <p className="text-muted-foreground text-xs mb-4">KES {parseFloat(amount).toLocaleString()} added</p>
                        <button
                            onClick={onClose}
                            className="w-full bg-black text-white py-2 rounded-lg font-semibold text-sm hover:opacity-90"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </>
        );
    }

    // Input state
    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-0 pointer-events-none">
                <div
                    className="bg-background dark:bg-slate-950 border border-border rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border bg-background dark:bg-slate-950">
                        <div>
                            <h2 className="text-base font-bold text-foreground">Deposit</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Balance: KES {balance}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Form Content */}
                    <form onSubmit={handleDeposit} className="p-4 space-y-3">
                        {/* Amount Input */}
                        <div className="bg-muted rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">Amount (KES)</p>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                className="text-2xl font-bold w-full border-none focus:outline-none bg-transparent"
                                min="1"
                                required
                            />
                        </div>

                        {/* Preset Amounts */}
                        <div>
                            <label className="block text-xs font-semibold mb-2">Quick Select</label>
                            <div className="grid grid-cols-2 gap-2">
                                {PRESET_AMOUNTS.map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setAmount(((parseFloat(amount) || 0) + preset).toString())}
                                        className="py-2 px-2 rounded-lg border border-border bg-background text-foreground hover:border-black hover:bg-muted font-semibold text-xs transition-all dark:bg-muted dark:hover:border-white"
                                    >
                                        +KES {preset}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* M-Pesa Method */}
                        <div>
                            <label className="block text-xs font-semibold mb-2">Method</label>
                            <div className="p-3 rounded-lg border-2 border-black bg-black/5 dark:border-white/10 dark:bg-white/5">
                                <p className="font-semibold text-sm">M-Pesa</p>
                                <p className="text-xs text-muted-foreground">Instant STK Push</p>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && <p className="text-red-600 text-xs md:text-sm">{error}</p>}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={!amount || parseFloat(amount) < 1}
                            className="w-full bg-black text-white py-2 rounded-lg font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Deposit KES {amount || "0"}
                        </button>

                        {/* Info Text */}
                        <p className="text-[11px] text-center text-muted-foreground">
                            Minimum: KES 1
                        </p>
                    </form>
                </div>
            </div>
        </>
    );
}
