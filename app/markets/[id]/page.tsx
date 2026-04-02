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
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [marketPositions, setMarketPositions] = useState<any[]>([]);
    const [topHolders, setTopHolders] = useState<{yes:any[]; no:any[]}>({yes: [], no: []});
    const [marketActivity, setMarketActivity] = useState<any[]>([]);
    const [marketTab, setMarketTab] = useState<"comments" | "topHolders" | "positions" | "activity">("comments");
    const [replyingToId, setReplyingToId] = useState<number | null>(null);
    const [replyingToName, setReplyingToName] = useState("");
    const [newChatMessage, setNewChatMessage] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const [sendingChat, setSendingChat] = useState(false);
    const [chatError, setChatError] = useState("");

    // Fetch markets if not already loaded
    useEffect(() => {
        if (allMarkets.length === 0) {
            dispatch(fetchMarkets());
        }
    }, [dispatch, allMarkets.length]);

    // Auto-close receipt modal after 3 seconds
    useEffect(() => {
        if (showReceipt) {
            const timer = setTimeout(() => setShowReceipt(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showReceipt]);

    // Set market from Redux data and update saved status
    useEffect(() => {
        if (allMarkets.length > 0) {
            const found = allMarkets.find((m: any) => m.id.toString() === id);
            setMarket(found);
            setIsSaved(savedMarketIds.includes(Number(id)));
        }
    }, [allMarkets, id, savedMarketIds]);

    useEffect(() => {
        if (market && market.id) {
            fetchMarketDetails();
        }
    }, [market]);

    const fetchMarketDetails = async () => {
        setChatLoading(true);
        setChatError("");

        try {
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/${id}/details/`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setChatMessages(data.comments || []);
                setMarketPositions(data.positions || []);
                setTopHolders(data.top_holders || { yes: [], no: [] });
                setMarketActivity(data.activity || []);
            } else {
                const data = await response.json();
                setChatError(data.error || "Unable to load market details");
            }
        } catch (err) {
            console.error(err);
            setChatError("Connection error while loading market details");
        } finally {
            setChatLoading(false);
        }
    };

    const handleSendChat = async () => {
        if (!newChatMessage.trim()) {
            setChatError("Please type a message before sending.");
            return;
        }

        setSendingChat(true);
        setChatError("");

        try {
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/${id}/chat/`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: newChatMessage.trim(),
                        reply_to: replyingToId,
                    }),
                }
            );

            const data = await response.json();
            if (response.ok) {
                setChatMessages((prev) => [...prev, data.message]);
                setNewChatMessage("");
            } else {
                setChatError(data.error || "Failed to send message");
            }
        } catch (err) {
            console.error(err);
            setChatError("Connection error while sending message");
        } finally {
            setSendingChat(false);
        }
    };

    const getRepliesForMessage = (messageId: number) => {
        return chatMessages.filter((msg) => msg.parent_id === messageId);
    };

    const handleStartReply = (messageId: number, userName: string) => {
        setReplyingToId(messageId);
        setReplyingToName(userName);
        setChatError("");
    };

    const cancelReply = () => {
        setReplyingToId(null);
        setReplyingToName("");
    };

    const formatChatTimestamp = (timestamp: string) => {
        try {
            return new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                day: 'numeric',
                month: 'short'
            }).format(new Date(timestamp));
        } catch {
            return timestamp;
        }
    };

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
                    action: activeTab,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                // Store bet details for receipt
                const userStr = localStorage.getItem("poly_user");
                const userData = userStr ? JSON.parse(userStr) : {};
                
                const amountValue = Number(betAmount);
                const probabilityValue = selectedOutcome === "Yes" ? market.yes_probability : 100 - market.yes_probability;
                const winningsValue = (amountValue * probabilityValue) / 100;
                setLastBet({
                    id: Math.random().toString(36).substr(2, 9),
                    market: market.question,
                    outcome,
                    amount: betAmount,
                    probability: probabilityValue,
                    potentialWinnings: amountValue + winningsValue,
                    phoneNumber: userData.phone_number,
                    timestamp: new Date(),
                });
                
                setShowReceipt(true);
                setBetAmount("");
                setMessage("");
                
                // Refresh market detail data and balance
                dispatch(fetchMarkets());
                window.dispatchEvent(new Event("poly_balance_updated"));
                await fetchMarketDetails();
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

    // Calculate estimated payout return
    const calculateEstimatedReturn = () => {
        if (!betAmount || isNaN(Number(betAmount))) return 0;
        const amount = Number(betAmount);
        const probability = selectedOutcome === "Yes" ? market.yes_probability : noProbability;
        const winnings = (amount * probability) / 100;
        // Total return = stake + winnings
        return amount + winnings;
    };

    const estimatedReturn = calculateEstimatedReturn();

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

    const topLevelChatMessages = chatMessages.filter((msg) => !msg.parent_id);

    const handleSaveToggle = () => {
        dispatch(toggleSaveMarket(Number(id)));
        setIsSaved(!isSaved);
        
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
                                <div className="text-xl font-bold text-foreground mt-1">{market.volume || 'KSh 0'}</div>
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
                    <div className="order-2 md:order-none bg-muted border border-border rounded-2xl p-6 h-fit md:sticky md:top-24 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto">
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
                                <span className="text-xs font-bold text-muted-foreground uppercase block mb-2">Total Return</span>
                                <div className="text-3xl font-bold text-green-400">
                                    KSh {estimatedReturn.toFixed(2)}
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

                        {/* Recommended Markets */}
                        <div className="mt-8 pt-6 border-t border-border">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Recommended Markets</h3>
                            <div className="space-y-2">
                                {allMarkets.slice(0, 3).map((rec_market: any) => (
                                    <Link 
                                        key={rec_market.id}
                                        href={`/markets/${rec_market.id}`}
                                        className="block p-3 rounded-lg bg-muted/50 hover:bg-muted border border-border/50 transition-colors"
                                    >
                                        <p className="text-xs font-semibold text-foreground truncate">{rec_market.question}</p>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs text-muted-foreground">{rec_market.yes_probability}%</span>
                                            <span className="text-xs font-semibold text-green-400">{rec_market.volume}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Market Chat */}
                    <div className="md:col-span-2 space-y-6 order-3 md:order-none">
                        <div className="bg-muted rounded-2xl p-6 mt-6 border border-border">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Market Chat</h3>
                                    <p className="text-sm text-muted-foreground">Talk about this market with others.</p>
                                </div>
                                {chatLoading && <span className="text-xs font-semibold text-foreground">Loading...</span>}
                            </div>

                                <div className="mb-6 border-b border-border pb-4">
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm font-semibold">
                                    <button
                                        onClick={() => setMarketTab("comments")}
                                        className={`rounded-full px-4 py-2 transition ${marketTab === "comments" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-border"}`}
                                    >
                                        Comments ({chatMessages.length})
                                    </button>
                                    <button
                                        onClick={() => setMarketTab("topHolders")}
                                        className={`rounded-full px-4 py-2 transition ${marketTab === "topHolders" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-border"}`}
                                    >
                                        Top Holders
                                    </button>
                                    <button
                                        onClick={() => setMarketTab("positions")}
                                        className={`rounded-full px-4 py-2 transition ${marketTab === "positions" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-border"}`}
                                    >
                                        Positions
                                    </button>
                                    <button
                                        onClick={() => setMarketTab("activity")}
                                        className={`rounded-full px-4 py-2 transition ${marketTab === "activity" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-border"}`}
                                    >
                                        Activity
                                    </button>
                                </div>
                                <p className="mt-3 text-sm text-muted-foreground">
                                    {marketTab === "comments" && "See the latest trader discussion and replies below."}
                                    {marketTab === "topHolders" && "Top holders are displayed here once market holdings data is available."}
                                    {marketTab === "positions" && "Your current and historical positions for this market will appear here."}
                                    {marketTab === "activity" && "Recent market activity and trade history will show here."}
                                </p>
                            </div>

                            {marketTab !== "comments" ? (
                                <div className="rounded-2xl border border-border bg-background/80 p-6 space-y-6">
                                    {marketTab === "topHolders" && (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="p-4 rounded-2xl bg-muted border border-border">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-foreground">Yes holders</h4>
                                                        <p className="text-xs text-muted-foreground">Largest positions supporting Yes</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    {topHolders.yes.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground">No Yes holders yet.</p>
                                                    ) : (
                                                        topHolders.yes.map((holder) => (
                                                            <div key={`${holder.user_id}-yes`} className="flex items-center justify-between gap-3">
                                                                <div>
                                                                    <p className="font-semibold text-foreground">{holder.user_name}</p>
                                                                    <p className="text-xs text-muted-foreground">Avg {holder.average_price}</p>
                                                                </div>
                                                                <span className="font-semibold text-green-400">{holder.shares.toLocaleString()}</span>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-muted border border-border">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-foreground">No holders</h4>
                                                        <p className="text-xs text-muted-foreground">Largest positions supporting No</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    {topHolders.no.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground">No No holders yet.</p>
                                                    ) : (
                                                        topHolders.no.map((holder) => (
                                                            <div key={`${holder.user_id}-no`} className="flex items-center justify-between gap-3">
                                                                <div>
                                                                    <p className="font-semibold text-foreground">{holder.user_name}</p>
                                                                    <p className="text-xs text-muted-foreground">Avg {holder.average_price}</p>
                                                                </div>
                                                                <span className="font-semibold text-red-400">{holder.shares.toLocaleString()}</span>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {marketTab === "positions" && (
                                        <div className="space-y-4">
                                            {marketPositions.length === 0 ? (
                                                <div className="rounded-2xl border border-border p-6 bg-muted">
                                                    <p className="text-sm text-muted-foreground">No public positions are available yet.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {marketPositions.map((position) => (
                                                        <div key={position.id} className="rounded-2xl border border-border bg-background p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                            <div>
                                                                <p className="font-semibold text-foreground">{position.user_name}</p>
                                                                <p className="text-xs text-muted-foreground">{position.outcome} · {position.order_type} · {position.result}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-semibold text-foreground">{position.quantity} shares</p>
                                                                <p className="text-xs text-muted-foreground">KSh {Number(position.amount).toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {marketTab === "activity" && (
                                        <div className="space-y-3">
                                            {marketActivity.length === 0 ? (
                                                <div className="rounded-2xl border border-border p-6 bg-muted">
                                                    <p className="text-sm text-muted-foreground">Activity will appear once positions are taken on this market.</p>
                                                </div>
                                            ) : (
                                                marketActivity.map((item) => (
                                                    <div key={item.id} className="rounded-2xl border border-border bg-background p-4 flex items-center justify-between gap-3">
                                                        <div>
                                                            <p className="font-semibold text-foreground">{item.user_name}</p>
                                                            <p className="text-xs text-muted-foreground">{item.action}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-muted-foreground">{formatChatTimestamp(item.timestamp)}</p>
                                                            <p className="text-sm font-semibold text-foreground">KSh {Number(item.amount).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {chatError ? (
                                        <div className="rounded-xl bg-red-950/30 border border-red-800 p-3 text-sm text-red-200 mb-4">
                                            {chatError}
                                        </div>
                                    ) : null}

                                    <div className="space-y-3 mb-4 max-h-80 overflow-y-auto pr-1">
                                {chatMessages.length === 0 ? (
                                    <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                                        No messages yet. Start the conversation.
                                    </div>
                                ) : (
                                    topLevelChatMessages.map((msg) => (
                                        <div key={msg.id} className="rounded-2xl border border-border bg-background/80 p-4 space-y-3">
                                            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                                <span className="font-semibold text-foreground">
                                                    {msg.user_name || 'Trader'}
                                                </span>
                                                <span>{formatChatTimestamp(msg.created_at)}</span>
                                            </div>
                                            <p className="text-sm text-foreground">{msg.message}</p>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <button
                                                    onClick={() => handleStartReply(msg.id, msg.user_name || 'Trader')}
                                                    className="font-semibold text-foreground hover:text-apple-blue"
                                                >
                                                    Reply
                                                </button>
                                                {getRepliesForMessage(msg.id).length > 0 && (
                                                    <span>{getRepliesForMessage(msg.id).length} repl{getRepliesForMessage(msg.id).length === 1 ? 'y' : 'ies'}</span>
                                                )}
                                            </div>

                                            {getRepliesForMessage(msg.id).map((reply) => (
                                                <div key={reply.id} className="ml-5 rounded-2xl border border-border bg-muted p-4">
                                                    <div className="flex items-center justify-between gap-3 mb-2 text-xs text-muted-foreground">
                                                        <span className="font-semibold text-foreground">
                                                            {reply.user_name || 'Trader'}
                                                        </span>
                                                        <span>{formatChatTimestamp(reply.created_at)}</span>
                                                    </div>
                                                    <p className="text-sm text-foreground">
                                                        <span className="font-semibold text-foreground">Reply to {reply.parent_user_name || 'them'}: </span>
                                                        {reply.message}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="space-y-3">
                                {replyingToId && (
                                    <div className="flex items-center justify-between rounded-2xl border border-apple-blue/30 bg-apple-blue/5 p-3 text-sm text-foreground">
                                        <span>Replying to {replyingToName}</span>
                                        <button
                                            type="button"
                                            onClick={cancelReply}
                                            className="text-xs font-bold text-apple-blue hover:underline"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                                <textarea
                                    value={newChatMessage}
                                    onChange={(e) => setNewChatMessage(e.target.value)}
                                    placeholder="Write a message..."
                                    className="w-full min-h-[100px] rounded-2xl border border-border bg-background/60 p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
                                />
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <button
                                        onClick={handleSendChat}
                                        disabled={sendingChat}
                                        className="w-full sm:w-auto bg-apple-blue hover:opacity-90 text-white font-bold py-3 px-6 rounded-2xl transition disabled:opacity-50"
                                    >
                                        {sendingChat ? 'Sending...' : 'Send Message'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNewChatMessage('');
                                            setChatError('');
                                        }}
                                        className="w-full sm:w-auto border border-border text-sm text-foreground rounded-2xl py-3 px-6 hover:bg-muted/80"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                    </div>
                </div>
            </div>
        </main>

            {/* Position Receipt Modal - Minimalist */}
            {showReceipt && lastBet && (
                <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setShowReceipt(false)}></div>
                    <div className="relative bg-foreground text-background rounded-xl p-6 max-w-sm w-full shadow-xl animate-in zoom-in-95">
                        <button
                            onClick={() => setShowReceipt(false)}
                            className="absolute top-4 right-4 text-background/60 hover:text-background transition"
                        >
                            ✕
                        </button>
                        
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-bold">Position Confirmed</h2>
                        </div>

                        <div className="space-y-3 mb-4">
                            <div className="flex justify-between">
                                <span className="text-background/75">Outcome</span>
                                <span className={`font-bold ${lastBet.outcome === 'Yes' ? 'text-green-400' : 'text-red-400'}`}>{lastBet.outcome}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-background/75">Amount</span>
                                <span className="font-bold">KSh {Number(lastBet.amount).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-background/75">Probability</span>
                                <span className="font-bold">{lastBet.probability}%</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowReceipt(false)}
                            className="w-full bg-apple-blue hover:opacity-90 text-white font-bold py-2 rounded-lg transition-all text-sm"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
