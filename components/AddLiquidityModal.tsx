"use client";

import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

interface AddLiquidityModalProps {
    isOpen: boolean;
    onClose: () => void;
    marketId: number;
    marketQuestion: string;
    onSuccess?: () => void;
}

export default function AddLiquidityModal({
    isOpen,
    onClose,
    marketId,
    marketQuestion,
    onSuccess,
}: AddLiquidityModalProps) {
    const [amount, setAmount] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [estimatedShares, setEstimatedShares] = useState<number | null>(null);
    const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

    if (!isOpen) return null;

    const handleAmountChange = (value: string) => {
        setAmount(value);
        setError("");
        
        // Estimate shares based on amount
        if (value && !isNaN(Number(value)) && Number(value) > 0) {
            const estimated = Number(value) * 0.5; // Rough estimate - adjust based on your LMSR
            setEstimatedShares(estimated);
        } else {
            setEstimatedShares(null);
        }
    };

    const handleQuickAmount = (preset: number) => {
        handleAmountChange(preset.toString());
    };

    const handleAddLiquidity = async () => {
        // Validation
        if (!amount || isNaN(Number(amount))) {
            setError("Please enter a valid amount");
            return;
        }

        const amountValue = Number(amount);
        if (amountValue <= 0) {
            setError("Amount must be greater than 0");
            return;
        }

        if (amountValue > 100000) {
            setError("Amount is too large");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/${marketId}/add-liquidity/`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        amount_kes: amountValue,
                    }),
                }
            );

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                setAmount("");
                setEstimatedShares(null);

                // Auto-close after 2 seconds
                setTimeout(() => {
                    onClose();
                    onSuccess?.();
                }, 2000);
            } else {
                setError(data.error || "Failed to add liquidity. Please try again.");
            }
        } catch (err) {
            console.error("Error adding liquidity:", err);
            setError("Connection error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="bg-background rounded-2xl border border-border p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-foreground">Add Liquidity</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Market Info */}
                <div className="mb-6 p-4 bg-muted rounded-lg border border-border">
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Market</p>
                    <p className="text-sm font-semibold text-foreground line-clamp-2">
                        {marketQuestion}
                    </p>
                </div>

                {success ? (
                    // Success State
                    <div className="space-y-4">
                        <div className="flex items-center justify-center">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/40">
                                <svg
                                    className="w-8 h-8 text-green-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                        </div>
                        <p className="text-center text-sm text-foreground font-semibold">
                            Liquidity added successfully!
                        </p>
                        <p className="text-center text-xs text-muted-foreground">
                            Your liquidity position has been created. You will earn fees from trades on this market.
                        </p>
                    </div>
                ) : (
                    // Form State
                    <div className="space-y-4">
                        {/* Amount Input */}
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">
                                Amount
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-4 text-muted-foreground font-semibold">
                                    KES
                                </span>
                                <input
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    step="10"
                                    value={amount}
                                    onChange={(e) => handleAmountChange(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full text-3xl font-bold text-right pl-14 pr-4 py-4 border border-border rounded-lg bg-muted/50 text-foreground focus:outline-none focus:ring-2 focus:ring-foreground disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {/* Quick Select Buttons */}
                        <div className="grid grid-cols-4 gap-2">
                            {[100, 500, 1000, 5000].map((preset) => (
                                <button
                                    key={preset}
                                    onClick={() => handleQuickAmount(preset)}
                                    disabled={isLoading}
                                    className="p-2 text-xs font-bold bg-border hover:bg-foreground/10 text-foreground rounded-lg transition disabled:opacity-50"
                                >
                                    {preset < 1000 ? preset : `${preset / 1000}k`}
                                </button>
                            ))}
                        </div>

                        {/* Estimated Shares */}
                        {estimatedShares !== null && (
                            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <p className="text-xs text-muted-foreground mb-1">Estimated Pool Share</p>
                                <p className="text-sm font-bold text-foreground">
                                    ~{estimatedShares.toFixed(2)} LP tokens
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    You'll earn a portion of trading fees
                                </p>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                <p className="text-sm text-red-600 font-medium">{error}</p>
                            </div>
                        )}

                        {/* Info Box - Dropdown */}
                        <button
                            onClick={() => setIsHowItWorksOpen(!isHowItWorksOpen)}
                            className="w-full p-3 bg-amber-500/10 hover:bg-amber-500/15 rounded-lg border border-amber-500/20 transition flex items-center justify-between"
                        >
                            <p className="text-xs text-amber-700 font-semibold">How it works</p>
                            <ChevronDown 
                                size={16} 
                                className={`text-amber-700 transition-transform ${isHowItWorksOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {isHowItWorksOpen && (
                            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 -mt-2">
                                <ul className="text-xs text-amber-600 space-y-1">
                                    <li>• Your funds are locked in the market's liquidity pool</li>
                                    <li>• You earn a share of all trading fees</li>
                                    <li>• Fees compound as more trades happen</li>
                                </ul>
                            </div>
                        )}

                        {/* Action Button - Centered */}
                        <button
                            onClick={handleAddLiquidity}
                            disabled={isLoading || !amount || Number(amount) <= 0}
                            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50 mt-2"
                        >
                            {isLoading ? "Processing..." : "Add Liquidity"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
