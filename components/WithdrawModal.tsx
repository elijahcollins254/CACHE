"use client";

import { X, Wallet, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    balance: string;
    phoneNumber: string;
}

const PRESET_AMOUNTS = [500, 1000, 5000];

export default function WithdrawModal({ isOpen, onClose, balance, phoneNumber }: WithdrawModalProps) {
    const [amount, setAmount] = useState("");
    const [step, setStep] = useState<"input" | "processing" | "success">("input");
    const [error, setError] = useState("");

    const balanceAmount = parseFloat(balance);
    
    // Get available preset amounts based on balance
    const availablePresets = PRESET_AMOUNTS.filter(preset => preset <= balanceAmount);

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
        }
    }, [isOpen]);

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate amount
        const withdrawAmount = parseFloat(amount);
        
        if (withdrawAmount > balanceAmount) {
            setError("You can only withdraw up to your current balance");
            return;
        }

        if (withdrawAmount < 10) {
            setError("Minimum withdrawal is KES 10");
            return;
        }

        setStep("processing");
        setError("");

        try {
            // Call withdrawal API endpoint
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/payments/withdraw/`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ amount: withdrawAmount }),
                }
            );

            const data = await response.json();

            if (response.ok) {
                // Store transaction ID to poll status
                const transactionId = data.transaction_id;
                
                // Poll for transaction completion (M-Pesa callback may take 10-30 seconds)
                let checkCount = 0;
                const pollInterval = setInterval(async () => {
                    checkCount++;
                    
                    // Timeout after 3 minutes (180 checks at 1-second intervals)
                    if (checkCount > 180) {
                        clearInterval(pollInterval);
                        setStep("input");
                        setError("Withdrawal processing timeout. Please check your M-Pesa account. If not received, contact support.");
                        return;
                    }

                    try {
                        const statusResponse = await fetchWithAuth(
                            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/payments/transaction/${transactionId}/status/`,
                            { method: "GET" }
                        );

                        const statusData = await statusResponse.json();

                        if (statusData.status === "COMPLETED") {
                            clearInterval(pollInterval);
                            setStep("success");
                        } else if (statusData.status === "FAILED") {
                            clearInterval(pollInterval);
                            setStep("input");
                            setError(statusData.error_message || "Payment failed. Please try again.");
                        }
                    } catch (err) {
                        // Continue polling on error
                        console.error("Status check error:", err);
                    }
                }, 1000); // Poll every 1 second
            } else {
                setStep("input");
                setError(data.error || data.customer_message || "Failed to process withdrawal");
            }
        } catch (err) {
            setStep("input");
            setError("Connection error. Please check your internet and try again.");
        }
    };

    const handlePresetClick = (preset: number) => {
        const newAmount = (parseFloat(amount) || 0) + preset;
        if (newAmount <= balanceAmount) {
            setAmount(newAmount.toString());
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
                    <div className="bg-muted rounded-xl shadow-2xl max-w-sm w-full pointer-events-auto flex flex-col items-center justify-center py-8 px-4">
                        <Wallet className="h-10 w-10 text-foreground animate-bounce mb-3" />
                        <p className="font-bold text-foreground text-base">Processing...</p>
                        <p className="text-muted-foreground text-xs mt-1">Waiting for M-Pesa confirmation</p>
                        <p className="text-muted-foreground text-xs mt-2 text-center">This may take up to 30 seconds</p>
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
                    <div className="bg-muted rounded-xl shadow-2xl max-w-sm w-full pointer-events-auto p-4 text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                        <h2 className="text-lg font-bold text-foreground mb-1">Withdrawal Successful!</h2>
                        <p className="text-muted-foreground text-xs mb-4">KES {parseFloat(amount).toLocaleString()} sent to {phoneNumber}</p>
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
                    className="bg-muted rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border bg-background">
                        <div>
                            <h2 className="text-base font-bold text-foreground">Withdraw</h2>
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
                    <form onSubmit={handleWithdraw} className="p-4 space-y-3">
                        {/* Amount Input */}
                        <div className="bg-muted rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">Amount (KES)</p>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                className="text-2xl font-bold w-full border-none focus:outline-none bg-transparent"
                                min="10"
                                max={parseFloat(balance)}
                                required
                            />
                        </div>

                        {/* Preset Amounts */}
                        <div>
                            <label className="block text-xs font-semibold mb-2">Quick Select</label>
                            <div className="grid grid-cols-2 gap-2">
                                {PRESET_AMOUNTS.map((preset) => {
                                    const newAmount = (parseFloat(amount) || 0) + preset;
                                    const isAvailable = newAmount <= balanceAmount;
                                    return (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => handlePresetClick(preset)}
                                            disabled={!isAvailable}
                                            className={`py-2 px-2 rounded-lg border font-semibold text-xs transition-all ${
                                                isAvailable
                                                    ? 'border-border hover:border-white hover:bg-muted cursor-pointer dark:hover:border-white'
                                                    : 'border-border text-muted-foreground cursor-not-allowed opacity-50'
                                            }`}
                                        >
                                            +KES {preset}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Balance Limit */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 dark:bg-blue-950/40 dark:border-blue-900/40 dark:text-blue-200">
                            <p className="text-xs text-blue-700 dark:text-blue-200">
                                <span className="font-semibold">Maximum Withdrawal:</span> KES {parseFloat(balance).toLocaleString()}
                            </p>
                        </div>

                        {/* M-Pesa Method */}
                        <div>
                            <label className="block text-xs font-semibold mb-2">Method</label>
                            <div className="p-3 rounded-lg border-2 border-black bg-black/5 dark:border-white/10 dark:bg-white/5">
                                <p className="font-semibold text-sm">M-Pesa</p>
                                <p className="text-xs text-muted-foreground">{phoneNumber}</p>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && <p className="text-red-600 text-xs md:text-sm">{error}</p>}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={!amount || parseFloat(amount) < 10 || parseFloat(amount) > parseFloat(balance)}
                            className="w-full bg-black text-white py-2 rounded-lg font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Withdraw KES {amount || "0"}
                        </button>

                        {/* Info Text */}
                        <p className="text-[11px] text-center text-muted-foreground">
                            Minimum: KES 10 | Limit: KES {parseFloat(balance).toLocaleString()}
                        </p>
                    </form>
                </div>
            </div>
        </>
    );
}
