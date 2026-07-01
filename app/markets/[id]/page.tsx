"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useParams } from "next/navigation";
import MarketChart, { ChartDataPoint } from "@/components/MarketChart";
import { extractMarketId } from "@/lib/slugify";
import { USD_TO_KES, convertUSDVolumeToKES, formatKES, polymarketProbabilityToKES } from "@/lib/currency";
import SearchFilterBar from "@/components/SearchFilterBar";
import LoadingSpinner from "@/components/LoadingSpinner";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { ArrowLeft, Bookmark } from "lucide-react";
import Link from "next/link";
import ShareButton from "@/components/ShareButton";

export const dynamic = 'force-dynamic';

const TRADING_FEE_PERCENT = 2.0;

/**
 * Transform historical price data into Recharts-compatible format
 */
function transformHistoryToChartData(
    yesValues: number[],
    noValues: number[],
    startTime: number = Date.now() / 1000
): ChartDataPoint[] {
    if (!Array.isArray(yesValues) || yesValues.length === 0) {
        return [];
    }

    const points: ChartDataPoint[] = [];
    const totalPoints = Math.min(yesValues.length, noValues.length);
    const intervalSeconds = totalPoints > 1 ? 300 : 0;
    
    const now = Date.now() / 1000;
    const validStartTime = startTime < 1000000000 ? now : startTime;

    for (let i = 0; i < totalPoints; i++) {
        points.push({
            timestamp: validStartTime - ((totalPoints - 1 - i) * intervalSeconds),
            yes: yesValues[i],
            no: noValues[i],
        });
    }

    return points;
}

function getPolymarketTokenId(market: any, outcome: "Yes" | "No" = "Yes"): string | null {
    const tokenIds = market?.clobTokenIds;
    let parsedTokenIds: string[] = [];

    if (Array.isArray(tokenIds)) {
        parsedTokenIds = tokenIds;
    } else if (typeof tokenIds === "string") {
        try {
            const parsed = JSON.parse(tokenIds);
            parsedTokenIds = Array.isArray(parsed) ? parsed : [];
        } catch {
            parsedTokenIds = [];
        }
    }

    const tokenId = parsedTokenIds[outcome === "Yes" ? 0 : 1];
    return tokenId ? String(tokenId) : null;
}

export default function MarketDetail() {
    const { id: paramId } = useParams();
    const marketId = extractMarketId(paramId);
    
    const [market, setMarket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [betAmount, setBetAmount] = useState("");
    const [selectedOutcome, setSelectedOutcome] = useState<"Yes" | "No">("Yes");
    const [placingBet, setPlacingBet] = useState(false);
    const [message, setMessage] = useState("");
    const [isSaved, setIsSaved] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastBet, setLastBet] = useState<any>(null);
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [loadingChart, setLoadingChart] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Auto-close receipt modal after 3 seconds
    useEffect(() => {
        if (showReceipt) {
            const timer = setTimeout(() => setShowReceipt(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showReceipt]);

    const fetchBrokerageMarket = useCallback(async () => {
        if (!marketId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
            const response = await fetch(`${baseUrl}/api/brokerage/markets/?ts=${Date.now()}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch brokerage market");
            }

            const brokerageData = await response.json();
            const brokerageMarkets = Array.isArray(brokerageData)
                ? brokerageData
                : brokerageData.results || [];

            const foundMarket = brokerageMarkets.find((item: any) => {
                const itemId = String(item?.id ?? "");
                const externalId = String(item?.external_id ?? "");
                return itemId === String(marketId) || externalId === String(marketId);
            });

            if (foundMarket) {
                setMarket(foundMarket);
                const savedMarketIds = JSON.parse(localStorage.getItem("poly_saved_markets") || "[]");
                setIsSaved(Array.isArray(savedMarketIds) && savedMarketIds.includes(String(marketId)));
            } else {
                setMarket(null);
            }
        } catch (err) {
            console.error("Error fetching brokerage market:", err);
            setMarket(null);
        } finally {
            setLoading(false);
        }
    }, [marketId]);

    useEffect(() => {
        fetchBrokerageMarket();
    }, [fetchBrokerageMarket]);

    const fetchPriceHistory = useCallback(async () => {
        if (!market?.id) return;
        
        setLoadingChart(true);

        try {
            if (market.source === 'polymarket') {
                try {
                    const polyId = market.external_id || market.id;
                    const tokenId = getPolymarketTokenId(market, "Yes");
                    
                    const queryParams = new URLSearchParams({
                        outcome: "Yes",
                    });
                    if (tokenId) {
                        queryParams.set("token_id", tokenId);
                    }

                    const response = await fetchWithAuth(
                        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/brokerage/markets/${polyId}/price-history/?${queryParams}`,
                        {
                            method: "GET",
                            headers: { "Content-Type": "application/json" },
                        }
                    );
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (Array.isArray(data?.history) && data.history.length > 0) {
                            const yesHistory = data.history.map((p: any) => 
                                ((typeof p.p === 'string' ? parseFloat(p.p) : p.p) || 0.5) * 100
                            );
                            const noHistory = yesHistory.map((y: number) => 100 - y);
                            const normalized = transformHistoryToChartData(yesHistory, noHistory, data.history[0]?.t);
                            setChartData(normalized);
                        } else {
                            setChartData([{
                                timestamp: Date.now() / 1000,
                                yes: market.yes_probability || 50,
                                no: 100 - (market.yes_probability || 50),
                            }]);
                        }
                    } else {
                        setChartData([{
                            timestamp: Date.now() / 1000,
                            yes: market.yes_probability || 50,
                            no: 100 - (market.yes_probability || 50),
                        }]);
                    }
                } catch (err) {
                    console.warn("Error fetching price history:", err);
                    setChartData([{
                        timestamp: Date.now() / 1000,
                        yes: market.yes_probability || 50,
                        no: 100 - (market.yes_probability || 50),
                    }]);
                }
            } else {
                setChartData([{
                    timestamp: Date.now() / 1000,
                    yes: market?.yes_probability || 50,
                    no: 100 - (market?.yes_probability || 50),
                }]);
            }
        } catch (err) {
            console.error("Error fetching price history:", err);
            setChartData([{
                timestamp: Date.now() / 1000,
                yes: market?.yes_probability || 50,
                no: 100 - (market?.yes_probability || 50),
            }]);
        } finally {
            setLoadingChart(false);
        }
    }, [market]);

    useEffect(() => {
        if (market?.id) {
            fetchPriceHistory();
        }
    }, [market?.id, fetchPriceHistory]);

    // Auto-refresh Polymarket prices every 5 seconds
    useEffect(() => {
        if (!market || market.source !== 'polymarket') {
            return;
        }

        const pollInterval = setInterval(async () => {
            try {
                const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
                const timestamp = Date.now();
                
                const response = await fetch(
                    `${baseUrl}/api/brokerage/markets/?ts=${timestamp}`,
                    {
                        method: 'GET',
                        headers: { 
                            'Content-Type': 'application/json',
                        }
                    }
                );
                
                if (response.ok) {
                    const brokerageData = await response.json();
                    const brokerageMarkets = Array.isArray(brokerageData) ? brokerageData : brokerageData.results || [];
                    
                    const freshMarket = brokerageMarkets.find((m: any) => {
                        const freshId = parseInt(m.id);
                        return freshId === market.id || m.external_id === market.external_id;
                    });
                    
                    if (freshMarket) {
                        setMarket((prev: any) => ({
                            ...prev,
                            yes_probability: freshMarket.bestBid ? Math.round(freshMarket.bestBid * 100) : freshMarket.yes_probability,
                            volume: convertUSDVolumeToKES(freshMarket.volume || freshMarket.volumeNum || 0),
                        }));
                    }
                }
            } catch (err) {
                console.warn("Error polling market updates:", err);
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [market]);

    const handleBet = async (outcome: "Yes" | "No") => {
        const user = localStorage.getItem("poly_user");
        if (!user) {
            setMessage("Please log in to enter a position");
            return;
        }

        if (!betAmount || isNaN(Number(betAmount))) {
            setMessage("Please enter a valid amount");
            return;
        }

        setPlacingBet(true);
        setMessage("");

        try {
            const isPolymarket = market.source === 'polymarket';
            
            if (!isPolymarket) {
                setMessage("Only Polymarket trading is supported");
                setPlacingBet(false);
                return;
            }

            const side = outcome === "Yes" ? "BUY" : "SELL";
            let tokenId: string;
            
            try {
                let clobTokenIds = market.clobTokenIds;
                
                if (Array.isArray(clobTokenIds)) {
                    tokenId = outcome === "Yes" ? clobTokenIds[0] : clobTokenIds[1];
                } else if (typeof clobTokenIds === 'string') {
                    clobTokenIds = JSON.parse(clobTokenIds);
                    tokenId = outcome === "Yes" ? clobTokenIds[0] : clobTokenIds[1];
                } else {
                    throw new Error("clobTokenIds not found");
                }
            } catch (e) {
                setMessage(`Invalid market configuration: ${e instanceof Error ? e.message : 'missing token IDs'}`);
                setPlacingBet(false);
                return;
            }
            
            if (!tokenId) {
                setMessage("Invalid market configuration (missing token ID)");
                setPlacingBet(false);
                return;
            }

            const kesAmount = Number(betAmount);
            const usdAmount = kesAmount / USD_TO_KES;
            const size = Math.round(usdAmount * 100000000) / 100000000;
            const price = market.yes_probability / 100;
            
            const polyPayload = {
                market_id: market.external_id,
                token_id: tokenId,
                side: side,
                size: size,
                price: price,
                order_type: "market",
            };
            
            console.log("Placing Polymarket order:", polyPayload);
            
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/brokerage/orders/place/`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(polyPayload),
                }
            );

            const data = await response.json();
            if (response.ok) {
                const userStr = localStorage.getItem("poly_user");
                const userData = userStr ? JSON.parse(userStr) : {};
                
                setLastBet({
                    id: Math.random().toString(36).substr(2, 9),
                    market: market.question,
                    outcome,
                    phoneNumber: userData.phone_number,
                    timestamp: new Date(),
                    amount: betAmount,
                    probability: outcome === "Yes" ? market.yes_probability : 100 - market.yes_probability,
                });
                
                setShowReceipt(true);
                setBetAmount("");
                setMessage("");
                
                window.dispatchEvent(new Event("poly_balance_updated"));
                await fetchBrokerageMarket();
                await fetchPriceHistory();
            } else {
                setMessage(data.error || "Failed to submit position. Try logging in.");
            }
        } catch (err) {
            console.error("Error placing bet:", err);
            setMessage("Connection error. Please try again.");
        } finally {
            setPlacingBet(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    if (!market) {
        return (
            <div className="min-h-screen bg-background pb-20 md:pb-8 font-sans">
                <Suspense fallback={<div className="h-16 bg-muted animate-pulse" />}>
                    <SearchFilterBar />
                </Suspense>
                <main className="mx-auto pt-32 md:pt-40 max-w-7xl px-4 md:px-6">
                    <div className="flex items-center justify-center min-h-96">
                        <LoadingSpinner />
                    </div>
                </main>
            </div>
        );
    }

    const noProbability = 100 - market.yes_probability;
    const calculateTradingFee = (amount: number): { fee: number; totalCost: number } => {
        const fee = amount * (TRADING_FEE_PERCENT / 100);
        return {
            fee: Math.round(fee * 100) / 100,
            totalCost: Math.round((amount + fee) * 100) / 100,
        };
    };

    const handleSaveToggle = () => {
        if (!marketId) return;
        
        const savedIds = JSON.parse(localStorage.getItem("poly_saved_markets") || "[]");
        const nextSavedIds = Array.isArray(savedIds) ? [...savedIds] : [];
        const idValue = String(marketId);

        if (isSaved) {
            const index = nextSavedIds.indexOf(idValue);
            if (index > -1) nextSavedIds.splice(index, 1);
        } else {
            nextSavedIds.push(idValue);
        }

        localStorage.setItem("poly_saved_markets", JSON.stringify(nextSavedIds));
        setIsSaved(!isSaved);
    };

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-8 font-sans">
            <Suspense fallback={<div className="h-16 bg-muted animate-pulse" />}>
                <SearchFilterBar />
            </Suspense>

            <main className="mx-auto pt-32 md:pt-40 max-w-7xl px-4 md:px-6 page-enter-slide-up">
                <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-3 transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Link>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column - Market Info */}
                    <div className="md:col-span-2 space-y-4">
                        {/* Market Header */}
                        <div>
                            <h1 className="text-2xl font-bold mb-3">{market.question}</h1>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                <ShareButton 
                                    marketTitle={market.question}
                                    marketId={market.id}
                                    imageUrl={market.image_url}
                                    size="md"
                                    variant="full"
                                />
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="bg-muted rounded-2xl p-4">
                            <MarketChart
                                data={chartData}
                                loading={loadingChart}
                                isMobile={isMobile}
                            />
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-muted rounded-lg p-4">
                                <div className="text-xs font-bold text-muted-foreground uppercase">Volume</div>
                                <div className="text-lg font-bold text-foreground">{formatKES(market.volume || 0)}</div>
                            </div>
                            <div className="bg-muted rounded-lg p-4">
                                <div className="text-xs font-bold text-muted-foreground uppercase">End Date</div>
                                <div className="text-lg font-bold text-foreground">{new Date(market.end_date).toLocaleDateString()}</div>
                            </div>
                            <div className="bg-muted rounded-lg p-4">
                                <div className="text-xs font-bold text-muted-foreground uppercase">Status</div>
                                <div className="text-lg font-bold text-foreground">{market.status}</div>
                            </div>
                        </div>

                        {/* Description */}
                        {market.description && (
                            <div className="bg-muted rounded-2xl p-4 border border-border">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Description</h3>
                                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{market.description}</div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Trading */}
                    <div className="order-2 md:order-none bg-muted border border-border rounded-2xl p-4 md:sticky md:top-32 md:h-fit">
                        {/* Position Display */}
                        <div className="space-y-3 mb-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Position</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedOutcome("Yes")}
                                    className={`flex-1 py-3 font-bold rounded-lg transition ${
                                        selectedOutcome === "Yes"
                                            ? "bg-green-500 text-white"
                                            : "bg-muted text-muted-foreground border border-border"
                                    }`}
                                >
                                    Yes {market.yes_probability}%
                                </button>
                                <button
                                    onClick={() => setSelectedOutcome("No")}
                                    className={`flex-1 py-3 font-bold rounded-lg transition ${
                                        selectedOutcome === "No"
                                            ? "bg-red-500 text-white"
                                            : "bg-muted text-muted-foreground border border-border"
                                    }`}
                                >
                                    No {100 - market.yes_probability}%
                                </button>
                            </div>
                        </div>

                        {/* Bet Amount */}
                        <div className="mb-3">
                            <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Amount</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={betAmount}
                                onChange={(e) => setBetAmount(e.target.value)}
                                className="w-full text-3xl font-bold text-right p-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground"
                            />
                        </div>

                        {/* Quick Buttons */}
                        <div className="mb-3">
                            <div className="grid grid-cols-5 gap-2">
                                {[100, 500, 1000, 5000, 10000].map((amount) => (
                                    <button
                                        key={amount}
                                        onClick={() => setBetAmount(((parseFloat(betAmount) || 0) + amount).toString())}
                                        className="text-xs font-bold border border-border rounded-md p-2 bg-background hover:bg-muted transition-colors"
                                    >
                                        +{amount > 999 ? `${amount / 1000}K` : amount}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Estimated Return */}
                        {betAmount && !isNaN(Number(betAmount)) && Number(betAmount) > 0 && (
                            <>
                                <div className="bg-gradient-to-r from-green-950/40 to-blue-950/40 rounded-lg p-4 mb-4 border border-green-900/40">
                                    <span className="text-xs font-bold text-muted-foreground uppercase block mb-2">If correct: you get</span>
                                    <div className="text-3xl font-bold text-green-400">
                                        KES {(Number(betAmount) * 2).toFixed(0)}
                                    </div>
                                </div>

                                {(() => {
                                    const feeInfo = calculateTradingFee(Number(betAmount));
                                    return (
                                        <div className="bg-amber-950/30 rounded-lg p-3 mb-4 border border-amber-900/40">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs text-muted-foreground">Bet Amount</span>
                                                <span className="text-sm font-semibold">KES {(feeInfo.totalCost - feeInfo.fee).toFixed(0)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pb-2 border-b border-amber-900/40 mb-2">
                                                <span className="text-xs text-muted-foreground">Fee ({TRADING_FEE_PERCENT}%)</span>
                                                <span className="text-sm font-semibold text-amber-300">+ KES {feeInfo.fee.toFixed(0)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold">Total</span>
                                                <span className="text-lg font-bold">KES {feeInfo.totalCost.toFixed(0)}</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </>
                        )}

                        {/* Buy Button */}
                        <button
                            onClick={() => handleBet(selectedOutcome)}
                            disabled={placingBet || market.status === 'CLOSED'}
                            className={`w-full text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 ${
                                selectedOutcome === "Yes"
                                    ? "bg-green-500 hover:opacity-90"
                                    : "bg-red-500 hover:opacity-90"
                            }`}
                        >
                            {placingBet ? "Placing..." : `Buy ${selectedOutcome}`}
                        </button>

                        {/* Status */}
                        {market.status === 'CLOSED' && (
                            <div className="mt-3 p-3 rounded-lg bg-yellow-950/40 text-yellow-500 text-sm font-medium text-center">
                                Market closed for trading
                            </div>
                        )}

                        {/* Message */}
                        {message && (
                            <div className={`mt-4 p-3 rounded-lg text-sm font-bold text-center ${
                                message.includes('Success')
                                    ? 'bg-green-950/40 text-green-400'
                                    : 'bg-red-950/40 text-red-400'
                            }`}>
                                {message}
                            </div>
                        )}

                        {/* Terms */}
                        <p className="text-xs text-muted-foreground text-center mt-4">
                            By trading, you agree to the{" "}
                            <Link href="/terms-of-use" className="underline hover:text-foreground">Terms of Use</Link>.
                        </p>
                    </div>
                </div>
            </main>

            {/* Receipt Modal */}
            {showReceipt && lastBet && (
                <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowReceipt(false)}></div>
                    <div className="relative bg-foreground text-background rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-bold">Position Confirmed</h2>
                        </div>

                        <div className="space-y-2 mb-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-background/75">Outcome</span>
                                <span className={`font-bold ${lastBet.outcome === 'Yes' ? 'text-green-400' : 'text-red-400'}`}>{lastBet.outcome}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-background/75">Amount</span>
                                <span className="font-bold">KES {lastBet.amount}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowReceipt(false)}
                            className="w-full bg-blue-500 hover:opacity-90 text-white font-bold py-2 rounded-lg transition"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
