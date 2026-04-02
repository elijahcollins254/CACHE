"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAppDispatch, useAppSelector, selectAllMarkets, selectMarketsLoading, selectSavedMarketIds } from "@/lib/redux/hooks";
import { fetchMarkets, toggleSaveMarket } from "@/lib/redux/slices/marketsSlice";
import Navbar from "@/components/Navbar";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { TrendingUp, Clock, ShieldCheck, Wallet, ArrowLeft, Share2, Bookmark } from "lucide-react";
import Link from "next/link";

export default function MarketDetail() {
    const { id } = useParams();
    const dispatch = useAppDispatch();
    
    // Redux state
    const allMarkets = useAppSelector(selectAllMarkets);
    const loading = useAppSelector(selectMarketsLoading);
    const savedMarketIds = useAppSelector(selectSavedMarketIds);
    
    const [market, setMarket] = useState<any>(null);
    const [betAmount, setBetAmount] = useState("");
    const [selectedOutcome, setSelectedOutcome] = useState<"Yes" | "No">("Yes");
    const [placingBet, setPlacingBet] = useState(false);
    const [message, setMessage] = useState("");
    const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
    const [isSaved, setIsSaved] = useState(false);
    const [shareMessage, setShareMessage] = useState("");
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastBet, setLastBet] = useState<any>(null);

    // Fetch markets if not already loaded
    useEffect(() => {
        if (allMarkets.length === 0) {
            dispatch(fetchMarkets());
        }
    }, [dispatch, allMarkets.length]);

    // Set market from Redux data and update saved status
    useEffect(() => {
        if (allMarkets.length > 0) {
            const found = allMarkets.find((m: any) => m.id.toString() === id);
            setMarket(found);
            setIsSaved(savedMarketIds.includes(Number(id)));
        }
    }, [allMarkets, id, savedMarketIds]);

    const handleBet = async (outcome: "Yes" | "No") => {
        if (!betAmount || isNaN(Number(betAmount))) {
            setMessage("Please enter a valid amount");
            return;
        }

        // Check if user is logged in first
        const user = localStorage.getItem("poly_user");
        if (!user) {
            setMessage("Please log in to enter a position");
            return;
        }

        setPlacingBet(true);
        setMessage("");

        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/bet/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    market_id: id,
                    outcome,
                    amount: betAmount,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                // Store bet details for receipt
                const userStr = localStorage.getItem("poly_user");
                const userData = userStr ? JSON.parse(userStr) : {};
                
                setLastBet({
                    id: Math.random().toString(36).substr(2, 9),
                    market: market.question,
                    outcome,
                    amount: betAmount,
                    probability: selectedOutcome === "Yes" ? market.yes_probability : 100 - market.yes_probability,
                    potentialWinnings: (Number(betAmount) * (selectedOutcome === "Yes" ? market.yes_probability : 100 - market.yes_probability)) / 100,
                    phoneNumber: userData.phone_number,
                    timestamp: new Date(),
                });
                
                setShowReceipt(true);
                setBetAmount("");
                setMessage("");
                
                // Dispatch Redux events to refresh data
                dispatch(fetchMarkets());
                window.dispatchEvent(new Event("poly_balance_updated"));
            } else {
                setMessage(data.error || "Failed to submit position. Try logging in.");
            }
        } catch (err) {
            setMessage("Connection error.");
        } finally {
            setPlacingBet(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-white"><Navbar /></div>;
    if (!market) return <div className="min-h-screen bg-white flex items-center justify-center font-bold">Market not found</div>;

    const noProbability = 100 - market.yes_probability;

    // Calculate estimated winnings
    const calculateEstimatedWinnings = () => {
        if (!betAmount || isNaN(Number(betAmount))) return 0;
        const amount = Number(betAmount);
        const probability = selectedOutcome === "Yes" ? market.yes_probability : noProbability;
        // Estimated winnings = amount * (probability/100)
        // This represents the payout if they win
        return (amount * probability) / 100;
    };

    const estimatedWinnings = calculateEstimatedWinnings();

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }).format(date);
        } catch {
            return dateString;
        }
    };

    const handleSaveToggle = () => {
        dispatch(toggleSaveMarket(Number(id)));
        
        // Update localStorage
        const savedIds = [...savedMarketIds];
        if (isSaved) {
            const index = savedIds.indexOf(Number(id));
            if (index > -1) savedIds.splice(index, 1);
        } else {
            savedIds.push(Number(id));
        }
        localStorage.setItem("poly_saved_markets", JSON.stringify(savedIds));
    };

    const handleShare = async () => {
        const shareUrl = window.location.href;
        const shareTitle = market.question;
        const shareText = `Check out this market: ${market.question}`;

        try {
            // Try native Web Share API first
            if (navigator.share) {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: shareUrl,
                });
            } else {
                // Fallback: Copy to clipboard
                await navigator.clipboard.writeText(shareUrl);
                setShareMessage("Link copied to clipboard!");
                setTimeout(() => setShareMessage(""), 2000);
            }
        } catch (err) {
            // User cancelled or error occurred
            if ((err as any).name !== "AbortError") {
                console.error("Share error:", err);
            }
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-8 font-sans">
            <Navbar />

            <main className="mx-auto pt-20 md:pt-24 max-w-7xl px-4 md:px-6">
                {/* Back Button */}
                <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-8 transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Link>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column - Market Info */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Market Header */}
                        <div>
                            <div className="flex items-start gap-4 mb-4">
                                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                                    {market.image_url && <img src={market.image_url} alt="" className="h-full w-full object-cover" />}
                                </div>
                                <div className="flex-1">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{market.category}</span>
                                    <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1">{market.question}</h1>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <button 
                                    onClick={handleShare}
                                    className="flex items-center gap-2 hover:text-foreground transition"
                                >
                                    <Share2 className="h-4 w-4" />
                                    {shareMessage || "Share"}
                                </button>
                                <button
                                    onClick={handleSaveToggle}
                                    className={`flex items-center gap-2 transition ${
                                        isSaved ? 'text-yellow-400' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <Bookmark className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} />
                                    {isSaved ? 'Saved' : 'Save'}
                                </button>
                            </div>
                        </div>

                        {/* Probability Display */}
                        <div className="bg-muted rounded-2xl p-6">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Options</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-muted border border-border rounded-lg">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                        <span className="font-semibold text-foreground">{market.question.split('?')[0].includes('Will') ? 'Yes' : 'True'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-green-400" style={{width: `${market.yes_probability}%`}}></div>
                                        </div>
                                        <span className="font-bold text-lg text-foreground">{market.yes_probability}%</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                        <span className="font-semibold text-foreground">No</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-red-400" style={{width: `${noProbability}%`}}></div>
                                        </div>
                                        <span className="font-bold text-lg text-foreground">{noProbability}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-muted rounded-lg p-4">
                                <span className="text-xs font-bold text-muted-foreground uppercase">Volume</span>
                                <div className="text-xl font-bold text-foreground mt-1">{market.volume}</div>
                            </div>
                            <div className="bg-muted rounded-lg p-4">
                                <span className="text-xs font-bold text-muted-foreground uppercase">Closes</span>
                                <div className="text-sm font-bold text-foreground mt-1">{formatDate(market.end_date)}</div>
                            </div>
                            <div className="bg-muted rounded-lg p-4">
                                <span className="text-xs font-bold text-muted-foreground uppercase">Status</span>
                                <div className="text-sm font-bold text-green-600 mt-1">Open</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Position Interface */}
                    <div className="bg-muted border border-border rounded-2xl p-6 h-fit sticky top-24">
                        {/* Outcome Selector */}
                        <div className="space-y-3 mb-6">
                            <button
                                onClick={() => setSelectedOutcome("Yes")}
                                className={`w-full p-4 rounded-xl font-bold transition-all ${
                                    selectedOutcome === "Yes"
                                        ? "bg-green-500 text-white"
                                        : "bg-muted/50 text-foreground hover:bg-muted/80"
                                }`}
                            >
                                Yes {market.yes_probability}%
                            </button>
                            <button
                                onClick={() => setSelectedOutcome("No")}
                                className={`w-full p-4 rounded-xl font-bold transition-all ${
                                    selectedOutcome === "No"
                                        ? "bg-red-500 text-white"
                                        : "bg-muted/50 text-foreground hover:bg-muted/80"
                                }`}
                            >
                                No {noProbability}%
                            </button>
                        </div>

                        {/* Buy/Sell Tabs */}
                        <div className="flex gap-2 mb-6 border-b border-border">
                            <button
                                onClick={() => setActiveTab("buy")}
                                className={`flex-1 py-3 font-bold text-sm transition-colors ${
                                    activeTab === "buy"
                                        ? "text-foreground border-b-2 border-foreground -mb-[2px]"
                                        : "text-muted-foreground"
                                }`}
                            >
                                Buy
                            </button>
                            <button
                                onClick={() => setActiveTab("sell")}
                                className={`flex-1 py-3 font-bold text-sm transition-colors ${
                                    activeTab === "sell"
                                        ? "text-foreground border-b-2 border-foreground -mb-[2px]"
                                        : "text-muted-foreground"
                                }`}
                            >
                                Sell
                            </button>
                        </div>

                        {/* Amount Input */}
                        <div className="mb-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Amount</label>
                            <div className="relative mb-3">
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={betAmount}
                                    onChange={(e) => setBetAmount(e.target.value)}
                                    className="w-full text-3xl font-bold text-right p-3 border border-border rounded-lg bg-muted/50 text-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
                                />
                            </div>
                            <span className="text-xs text-muted-foreground">KSh. {betAmount ? parseFloat(betAmount).toFixed(2) : '0.00'}</span>
                        </div>

                        {/* Quick Select Buttons */}
                        <div className="mb-6">
                            <div className="text-xs font-bold text-muted-foreground uppercase mb-2">Quick Add</div>
                            <div className="grid grid-cols-5 gap-2">
                                <button onClick={() => setBetAmount(((parseFloat(betAmount) || 0) + 100).toString())} className="text-xs font-bold bg-muted hover:bg-muted p-2 rounded">+100</button>
                                <button onClick={() => setBetAmount(((parseFloat(betAmount) || 0) + 500).toString())} className="text-xs font-bold bg-muted hover:bg-muted p-2 rounded">+500</button>
                                <button onClick={() => setBetAmount(((parseFloat(betAmount) || 0) + 1000).toString())} className="text-xs font-bold bg-muted hover:bg-muted p-2 rounded">+1K</button>
                                <button onClick={() => setBetAmount(((parseFloat(betAmount) || 0) + 5000).toString())} className="text-xs font-bold bg-muted hover:bg-muted p-2 rounded">+5K</button>
                                <button onClick={() => setBetAmount(((parseFloat(betAmount) || 0) + 10000).toString())} className="text-xs font-bold bg-muted hover:bg-muted p-2 rounded">+10K</button>
                            </div>
                        </div>

                        {/* Estimated Winnings */}
                        {betAmount && !isNaN(Number(betAmount)) && Number(betAmount) > 0 && (
                            <div className="bg-gradient-to-r from-green-950/40 to-blue-950/40 rounded-lg p-4 mb-6 border border-green-900/40">
                                <span className="text-xs font-bold text-muted-foreground uppercase block mb-2">To Win</span>
                                <div className="text-3xl font-bold text-green-400">
                                    KSh {estimatedWinnings.toFixed(2)}
                                </div>
                                <span className="text-xs text-muted-foreground mt-1 block">
                                    Probability {selectedOutcome === "Yes" ? market.yes_probability : noProbability}%
                                </span>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={() => handleBet(selectedOutcome)}
                                disabled={placingBet}
                                className="w-full bg-apple-blue hover:opacity-90 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50"
                            >
                                {activeTab === "buy" ? "Buy " : "Sell "} {selectedOutcome}
                            </button>
                            <button className="w-full bg-muted hover:opacity-80 text-foreground font-bold py-3 rounded-lg transition-all">
                                Deposit
                            </button>
                        </div>

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

            {/* Position Receipt Modal */}
            {showReceipt && lastBet && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
                    <div className="bg-muted rounded-2xl p-8 max-w-md w-full shadow-xl">
                        {/* Header */}
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-green-950/40 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-foreground">Position Confirmed!</h2>
                            <p className="text-sm text-muted-foreground mt-1">Your position has been accepted</p>
                        </div>

                        {/* Details */}
                        <div className="bg-muted/50 rounded-lg p-4 mb-6 space-y-3">
                            <div className="flex justify-between items-start">
                                <span className="text-sm text-muted-foreground font-medium">Market</span>
                                <span className="text-sm font-bold text-foreground text-right max-w-[200px]">{lastBet.market}</span>
                            </div>
                            <div className="border-t border-border pt-3 flex justify-between items-center">
                                <span className="text-sm text-muted-foreground font-medium">Outcome</span>
                                <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                                    lastBet.outcome === 'Yes' 
                                        ? 'bg-green-950/40 text-green-400' 
                                        : 'bg-red-950/40 text-red-400'
                                }`}>
                                    {lastBet.outcome}
                                </span>
                            </div>
                            <div className="border-t border-border pt-3 flex justify-between items-center">
                                <span className="text-sm text-muted-foreground font-medium">Probability</span>
                                <span className="text-sm font-bold text-foreground">{lastBet.probability}%</span>
                            </div>
                        </div>

                        {/* Amount & Potential Win */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <p className="text-xs text-muted-foreground font-medium mb-1 uppercase">Stake Amount</p>
                                <p className="text-2xl font-bold text-foreground">KSh {Number(lastBet.amount).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium mb-1 uppercase">Potential Payout</p>
                                <p className="text-2xl font-bold text-green-400">KSh {lastBet.potentialWinnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            </div>
                        </div>

                        {/* Contract Reference */}
                        <div className="bg-blue-950/40 border border-blue-900/40 rounded-lg p-3 text-center mb-6">
                            <p className="text-xs text-blue-400 font-medium">CONTRACT ID</p>
                            <p className="text-sm font-bold text-blue-300 font-mono">{lastBet.id}</p>
                        </div>

                        {/* Time */}
                        <p className="text-xs text-muted-foreground text-center mb-6">
                            {lastBet.timestamp.toLocaleTimeString()} on {lastBet.timestamp.toLocaleDateString()}
                        </p>

                        {/* Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={() => setShowReceipt(false)}
                                className="w-full bg-apple-blue hover:opacity-90 text-white font-bold py-3 rounded-lg transition-all"
                            >
                                Continue Trading
                            </button>
                            <Link
                                href="/dashboard"
                                className="w-full bg-muted hover:opacity-80 text-foreground font-bold py-3 rounded-lg transition-all text-center"
                            >
                                View All Positions
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
