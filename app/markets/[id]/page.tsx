"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useParams } from "next/navigation";
import { useAppDispatch, useAppSelector, selectAllMarkets, selectMarketsLoading, selectSavedMarketIds } from "@/lib/redux/hooks";
import { fetchMarkets, toggleSaveMarket } from "@/lib/redux/slices/marketsSlice";
import { useAMMPrice, type AMMPriceResult, getSlippageWarningLevel, formatPriceImpact } from "@/lib/useAMMPrice";
import Navbar from "@/components/Navbar";
import SearchFilterBar from "@/components/SearchFilterBar";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { TrendingUp, Clock, ShieldCheck, Wallet, ArrowLeft, Share2, Bookmark, Send, BarChart3, Percent, AlertCircle } from "lucide-react";
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
    const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
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
    const [probabilityViewMode, setProbabilityViewMode] = useState<"percentage" | "graph">("graph");
    const [timePeriod, setTimePeriod] = useState<"1H" | "6H" | "1D" | "1W" | "1M" | "ALL">("ALL");
    const [priceHistory, setPriceHistory] = useState<{[key: string]: {yes: number[]; no: number[]}}>({});
    const [loadingChart, setLoadingChart] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [limitPrice, setLimitPrice] = useState<number>(50); // Default to 50% probability
    const [shares, setShares] = useState<number>(100);
    const [orderType, setOrderType] = useState<"market" | "limit">("market");
    const chatInputRef = useRef<HTMLDivElement>(null);
    
    // AMM pricing state
    const { previewPrice } = useAMMPrice();
    const [ammPrice, setAmmPrice] = useState<AMMPriceResult | null>(null);
    const [ammLoading, setAmmLoading] = useState(false);

    // Scroll to chat input when replying
    useEffect(() => {
        if (replyingToId && chatInputRef.current) {
            setTimeout(() => {
                chatInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [replyingToId]);

    // Detect mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

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

    // Preview AMM price when bet amount changes
    useEffect(() => {
        if (market && betAmount && !isNaN(Number(betAmount)) && Number(betAmount) > 0) {
            setAmmLoading(true);
            previewPrice(market.id, selectedOutcome, betAmount, activeTab as 'buy' | 'sell').then((result) => {
                setAmmPrice(result);
                setAmmLoading(false);
            });
        } else {
            setAmmPrice(null);
        }
    }, [market, betAmount, selectedOutcome, activeTab, previewPrice]);

    useEffect(() => {
        if (market && market.id) {
            fetchMarketDetails();
            fetchPriceHistory();
        }
    }, [market]);

    const fetchPriceHistory = async () => {
        setLoadingChart(true);
        try {
            if (market.market_type === 'OPTION_LIST' && market.options) {
                const histories: {[key: string]: {yes: number[]; no: number[]}} = {};
                for (const option of market.options) {
                    const response = await fetchWithAuth(
                        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/${id}/price-history/?period=${timePeriod}&option_id=${option.id}`,
                        {
                            method: "GET",
                            headers: { "Content-Type": "application/json" },
                        }
                    );
                    if (response.ok) {
                        const data = await response.json();
                        if (data.data && data.data.length > 0) {
                            const yesProbs = data.data.map((d: any) => d.yes_probability);
                            const noProbs = data.data.map((d: any) => d.no_probability);
                            
                            if (yesProbs.length < 8) {
                                while (yesProbs.length < 8) {
                                    yesProbs.unshift(yesProbs[0]);
                                    noProbs.unshift(noProbs[0]);
                                }
                            } else if (yesProbs.length > 8) {
                                const step = Math.floor(yesProbs.length / 8);
                                const sampledYes = [];
                                const sampledNo = [];
                                for (let i = 0; i < 8; i++) {
                                    const index = i * step;
                                    sampledYes.push(yesProbs[index]);
                                    sampledNo.push(noProbs[index]);
                                }
                                yesProbs.splice(0, yesProbs.length, ...sampledYes);
                                noProbs.splice(0, noProbs.length, ...sampledNo);
                            }
                            
                            histories[`option_${option.id}`] = {
                                yes: yesProbs,
                                no: noProbs,
                            };
                        } else {
                            // No history, use current
                            const yesProb = option.yes_probability;
                            const noProb = option.no_probability;
                            histories[`option_${option.id}`] = {
                                yes: Array(8).fill(yesProb),
                                no: Array(8).fill(noProb),
                            };
                        }
                    } else {
                        // Fallback
                        const yesProb = option.yes_probability;
                        const noProb = option.no_probability;
                        histories[`option_${option.id}`] = {
                            yes: Array(8).fill(yesProb),
                            no: Array(8).fill(noProb),
                        };
                    }
                }
                setPriceHistory(histories);
            } else {
                // BINARY market
                const response = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/${id}/price-history/?period=${timePeriod}`,
                    {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                    }
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data.data && data.data.length > 0) {
                        const yesProbs = data.data.map((d: any) => d.yes_probability);
                        const noProbs = data.data.map((d: any) => d.no_probability);
                        
                        if (yesProbs.length < 8) {
                            while (yesProbs.length < 8) {
                                yesProbs.unshift(yesProbs[0]);
                                noProbs.unshift(noProbs[0]);
                            }
                        } else if (yesProbs.length > 8) {
                            const step = Math.floor(yesProbs.length / 8);
                            const sampledYes = [];
                            const sampledNo = [];
                            for (let i = 0; i < 8; i++) {
                                const index = i * step;
                                sampledYes.push(yesProbs[index]);
                                sampledNo.push(noProbs[index]);
                            }
                            yesProbs.splice(0, yesProbs.length, ...sampledYes);
                            noProbs.splice(0, noProbs.length, ...sampledNo);
                        }
                        
                        setPriceHistory({
                            market: {
                                yes: yesProbs,
                                no: noProbs,
                            }
                        });
                    } else {
                        const generated = generateHistoricalPrices();
                        setPriceHistory({
                            market: generated
                        });
                    }
                } else {
                    const generated = generateHistoricalPrices();
                    setPriceHistory({
                        market: generated
                    });
                }
            }
        } catch (err) {
            console.error("Error fetching price history:", err);
            if (market.market_type === 'OPTION_LIST' && market.options) {
                const histories: {[key: string]: {yes: number[]; no: number[]}} = {};
                for (const option of market.options) {
                    const yesProb = option.yes_probability;
                    const noProb = option.no_probability;
                    histories[`option_${option.id}`] = {
                        yes: Array(8).fill(yesProb),
                        no: Array(8).fill(noProb),
                    };
                }
                setPriceHistory(histories);
            } else {
                const generated = generateHistoricalPrices();
                setPriceHistory({
                    market: generated
                });
            }
        } finally {
            setLoadingChart(false);
        }
    };

    useEffect(() => {
        if (market && market.id) {
            fetchPriceHistory();
        }
    }, [timePeriod, market]);

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
                
                // Update market with description if provided
                if (data.description) {
                    setMarket((prev: any) => ({ ...prev, description: data.description }));
                }
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
        // Check if user is logged in first
        const user = localStorage.getItem("poly_user");
        if (!user) {
            setMessage("Please log in to enter a position");
            return;
        }

        // For option-list markets, require option selection
        if (market.market_type === 'OPTION_LIST' && !selectedOptionId) {
            setMessage("Please select an option");
            return;
        }

        // Validate inputs based on order type
        if (orderType === "market") {
            if (!betAmount || isNaN(Number(betAmount))) {
                setMessage("Please enter a valid amount");
                return;
            }
        } else {
            if (limitPrice <= 0 || shares <= 0) {
                setMessage("Please enter valid limit price and shares");
                return;
            }
        }

        setPlacingBet(true);
        setMessage("");

        try {
            const payload: any = {
                market_id: id,
                outcome,
                action: activeTab,
                order_type: orderType,
            };

            // Build payload based on order type
            if (orderType === "market") {
                payload.amount = betAmount;
            } else {
                payload.limit_price = limitPrice; // limitPrice is already in KES (1-100 scale)
                payload.shares = shares;
            }

            // Add option_id for option-list markets
            if (market.market_type === 'OPTION_LIST' && selectedOptionId) {
                payload.option_id = selectedOptionId;
            }

            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/bet/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (response.ok) {
                // Store bet details for receipt
                const userStr = localStorage.getItem("poly_user");
                const userData = userStr ? JSON.parse(userStr) : {};
                
                let lastBetData: any = {
                    id: Math.random().toString(36).substr(2, 9),
                    market: market.question,
                    outcome,
                    phoneNumber: userData.phone_number,
                    timestamp: new Date(),
                };

                if (orderType === "market") {
                    const amountValue = Number(betAmount);
                    let probabilityValue;
                    if (market.market_type === 'OPTION_LIST' && selectedOptionId) {
                        const option = market.options?.find((o: any) => o.id === selectedOptionId);
                        if (option) {
                            probabilityValue = selectedOutcome === "Yes" ? option.yes_probability : (100 - option.yes_probability);
                        } else {
                            probabilityValue = selectedOutcome === "Yes" ? market.yes_probability : 100 - market.yes_probability;
                        }
                    } else {
                        probabilityValue = selectedOutcome === "Yes" ? market.yes_probability : 100 - market.yes_probability;
                    }
                    const inverseProbability = 100 - probabilityValue;
                    const winningsValue = (amountValue * inverseProbability) / 100;
                    lastBetData = {
                        ...lastBetData,
                        amount: betAmount,
                        probability: probabilityValue,
                        potentialWinnings: amountValue + winningsValue,
                    };
                } else {
                    // Limit order
                    lastBetData = {
                        ...lastBetData,
                        limitPrice: limitPrice,
                        shares: shares,
                        totalCost: limitStats.totalCost,
                        toWin: limitStats.toWin,
                        orderType: "limit",
                    };
                }
                
                setLastBet(lastBetData);
                setShowReceipt(true);
                setBetAmount("");
                setMessage("");
                
                // Refresh market detail data and balance
                dispatch(fetchMarkets());
                window.dispatchEvent(new Event("poly_balance_updated"));
                await fetchMarketDetails();
                await fetchPriceHistory();
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

    // Trading fee constant
    const TRADING_FEE_PERCENT = 2; // 2% fee

    // Generate historical price data based on time period
    const generateHistoricalPrices = () => {
        const numPoints = 8;
        const yesProb = market.yes_probability;
        const noProb = noProbability;
        
        // Create slight variations for realistic historical data
        const variation = 0.15; // 15% variation from current price
        let yesHistory = [];
        let noHistory = [];
        
        for (let i = 0; i < numPoints; i++) {
            // Add random walk behavior
            const randomVariation = (Math.random() - 0.5) * 2 * variation;
            const yesValue = Math.max(5, Math.min(95, yesProb + (yesProb * randomVariation)));
            const noValue = 100 - yesValue;
            
            yesHistory.push(yesValue);
            noHistory.push(noValue);
        }
        
        // Ensure last value is current probability
        yesHistory[numPoints - 1] = yesProb;
        noHistory[numPoints - 1] = noProb;
        
        return { yes: yesHistory, no: noHistory };
    };

    // Use fetched price history or fallback to generated data
    const chartData = priceHistory;

    // Calculate estimated payout return
    const calculateEstimatedReturn = () => {
        if (!betAmount || isNaN(Number(betAmount))) return 0;
        const amount = Number(betAmount);
        
        let probability;
        if (market.market_type === 'OPTION_LIST' && selectedOptionId) {
            const option = market.options?.find((o: any) => o.id === selectedOptionId);
            if (option) {
                probability = selectedOutcome === "Yes" ? option.yes_probability : (100 - option.yes_probability);
            } else {
                probability = selectedOutcome === "Yes" ? market.yes_probability : noProbability;
            }
        } else {
            probability = selectedOutcome === "Yes" ? market.yes_probability : noProbability;
        }
        
        // Polymarket model: multiply by (100 / probability) if you win
        if (probability > 0) {
            const multiplier = 100 / probability;
            return amount * multiplier;
        }
        return 0;
    };

    const estimatedReturn = calculateEstimatedReturn();

    // Limit order calculations
    const calculateLimitOrderStats = () => {
        // limitPrice is in KES (0-100 scale representing 0-100% probability)
        // Each share costs limitPrice, wins 100 KES per share
        const totalCost = limitPrice * shares; // Cost to buy shares
        
        let probability;
        if (market.market_type === 'OPTION_LIST' && selectedOptionId) {
            const option = market.options?.find((o: any) => o.id === selectedOptionId);
            if (option) {
                probability = selectedOutcome === "Yes" ? option.yes_probability : (100 - option.yes_probability);
            } else {
                probability = selectedOutcome === "Yes" ? market.yes_probability : (100 - market.yes_probability);
            }
        } else {
            probability = selectedOutcome === "Yes" ? market.yes_probability : (100 - market.yes_probability);
        }
        
        // Polymarket: if win, get 100 KES per share minus 2% trading fee
        const winAmount = shares * 100 * (1 - TRADING_FEE_PERCENT / 100);
        const potentialProfit = winAmount - totalCost;
        
        return {
            totalCost: totalCost,
            toWin: (shares * 100) - totalCost,
            potentialProfit: potentialProfit,
            winPayout: winAmount,
        };
    };

    const limitStats = calculateLimitOrderStats();

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
            <Suspense fallback={<div className="h-16 bg-muted animate-pulse" />}>
              <SearchFilterBar />
            </Suspense>

            <main className="mx-auto pt-48 md:pt-56 max-w-7xl px-4 md:px-6 page-enter-slide-up">
                {/* Back Button */}
                <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-3 transition-colors link-animated">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Link>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column - Market Info */}
                    <div className="md:col-span-2 space-y-4">
                        {/* Market Header */}
                        <div>
                            <div className="flex items-start gap-4 mb-3">
                                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                                    {market.image_url && <img src={market.image_url} alt="" className="h-full w-full object-cover" />}
                                </div>
                                <div className="flex-1">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{market.category}</span>
                                    <h1 className="text-xl md:text-2xl font-bold text-foreground mt-1">{market.question}</h1>
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
                        <div className="bg-muted rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Options</h3>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setProbabilityViewMode("percentage")}
                                        className={`p-2 rounded transition ${
                                            probabilityViewMode === "percentage"
                                                ? "bg-foreground text-background"
                                                : "bg-border text-muted-foreground hover:bg-border/80 hover:text-foreground"
                                        }`}
                                        title="View as percentages"
                                    >
                                        <Percent className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setProbabilityViewMode("graph")}
                                        className={`p-2 rounded transition ${
                                            probabilityViewMode === "graph"
                                                ? "bg-foreground text-background"
                                                : "bg-border text-muted-foreground hover:bg-border/80 hover:text-foreground"
                                        }`}
                                        title="View as chart"
                                    >
                                        <BarChart3 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            
                            {probabilityViewMode === "percentage" ? (
                                <div className="space-y-3">
                                    <button onClick={() => setSelectedOutcome("Yes")} className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                        selectedOutcome === "Yes"
                                                ? "bg-green-500/20 border-green-500"
                                                : "bg-muted hover:bg-muted/80 border-border hover:border-green-500/50"
                                    }`}>
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                            <div>
                                                <span className="font-semibold text-foreground block">{market.question.split('?')[0].includes('Will') ? 'Yes' : 'True'}</span>
                                                <span className="text-xs text-muted-foreground">{market.yes_probability}% • {(100 / market.yes_probability).toFixed(2)}x</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                                <div className="h-full bg-green-400" style={{width: `${market.yes_probability}%`}}></div>
                                            </div>
                                        </div>
                                    </button>
                                    <button onClick={() => setSelectedOutcome("No")} className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                        selectedOutcome === "No"
                                                ? "bg-red-500/20 border-red-500"
                                                : "bg-muted hover:bg-muted/80 border-border hover:border-red-500/50"
                                    }`}>
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                            <div>
                                                <span className="font-semibold text-foreground block">No</span>
                                                <span className="text-xs text-muted-foreground">{noProbability}% • {(100 / noProbability).toFixed(2)}x</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                                <div className="h-full bg-red-400" style={{width: `${noProbability}%`}}></div>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Market Odds Chart - Polymarket Style */}
                                    <div className="bg-background rounded-2xl border border-border overflow-hidden">
                                        {/* Chart Header */}
                                        <div className={isMobile ? "px-4 py-3 border-b border-border" : "px-6 py-4 border-b border-border"}>
                                            <div className="flex items-center justify-between">
                                                <h3 className={isMobile ? "text-xs font-bold text-foreground" : "text-sm font-bold text-foreground"}>Market Odds</h3>
                                                <div className={isMobile ? "flex gap-0.5" : "flex gap-1"}>
                                                    {(["1H", "6H", "1D", "1W", "1M", "ALL"] as const).map((period) => (
                                                        <button
                                                            key={period}
                                                            onClick={() => setTimePeriod(period)}
                                                            className={`${isMobile ? "px-1.5 py-0.5 text-xs" : "px-3 py-1.5 text-xs"} font-bold rounded transition-all ${
                                                                timePeriod === period
                                                                    ? "bg-foreground text-background"
                                                                    : "hover:bg-border text-muted-foreground hover:text-foreground bg-muted/50"
                                                            }`}
                                                        >
                                                            {period}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* SVG Chart */}
                                        <div className={isMobile ? "px-3 py-4" : "px-6 py-4"}>
                                            <svg width="100%" height={isMobile ? "220" : "280"} viewBox="0 0 900 280" className="w-full" style={{minHeight: isMobile ? '220px' : '280px'}}>
                                                <defs>
                                                    {market.market_type === 'BINARY' ? (
                                                        <>
                                                            {/* Gradient for Yes */}
                                                            <linearGradient id="yesGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                                                                <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.2" />
                                                                <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
                                                            </linearGradient>
                                                            {/* Gradient for No */}
                                                            <linearGradient id="noGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                                                                <stop offset="0%" stopColor="rgb(249, 115, 22)" stopOpacity="0.2" />
                                                                <stop offset="100%" stopColor="rgb(249, 115, 22)" stopOpacity="0" />
                                                            </linearGradient>
                                                        </>
                                                    ) : (
                                                        market.options?.map((option: any, index: number) => {
                                                            const colors = [
                                                                "rgb(59, 130, 246)", // blue
                                                                "rgb(249, 115, 22)", // orange
                                                                "rgb(34, 197, 94)", // green
                                                                "rgb(239, 68, 68)", // red
                                                                "rgb(168, 85, 247)", // purple
                                                            ];
                                                            const color = colors[index % colors.length];
                                                            return (
                                                                <linearGradient key={`optionGradient${option.id}`} id={`optionGradient${option.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                                                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                                                                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                                                                </linearGradient>
                                                            );
                                                        })
                                                    )}
                                                </defs>

                                                {/* Horizontal Grid Lines & Labels */}
                                                {[240, 200, 160, 120, 80, 40].map((y, idx) => {
                                                    const percent = idx * 20;
                                                    return (
                                                        <g key={`h-grid-${y}`}>
                                                            <line x1="80" y1={y} x2="900" y2={y} stroke="currentColor" strokeWidth="0.5" className="text-border opacity-30" />
                                                            <text x="70" y={y + 4} textAnchor="end" fontSize={isMobile ? "10" : "12"} className="fill-muted-foreground">{percent}%</text>
                                                        </g>
                                                    );
                                                })}

                                                {/* Vertical Grid Lines */}
                                                {[150, 250, 350, 450, 550, 650, 750].map((x) => (
                                                    <line key={`v-grid-${x}`} x1={x} y1="40" x2={x} y2="240" stroke="currentColor" strokeWidth="0.5" className="text-border opacity-20" />
                                                ))}

                                                {/* Axes */}
                                                <line x1="80" y1="240" x2="900" y2="240" stroke="currentColor" strokeWidth="1.5" className="text-border" />
                                                <line x1="80" y1="40" x2="80" y2="240" stroke="currentColor" strokeWidth="1.5" className="text-border" />

                                                {/* Time Labels - Show fewer on mobile */}
                                                {(isMobile 
                                                    ? [
                                                        { x: 150, label: "12 PM" },
                                                        { x: 350, label: "12 PM" },
                                                        { x: 550, label: "12 PM" },
                                                        { x: 750, label: "12 PM" }
                                                    ]
                                                    : [
                                                        { x: 150, label: "12 PM" },
                                                        { x: 250, label: "12 AM" },
                                                        { x: 350, label: "12 PM" },
                                                        { x: 450, label: "12 AM" },
                                                        { x: 550, label: "12 PM" },
                                                        { x: 650, label: "12 AM" },
                                                        { x: 750, label: "12 PM" }
                                                    ]
                                                ).map(({ x, label }) => (
                                                    <text key={`time-${label}`} x={x} y="265" textAnchor="middle" fontSize={isMobile ? "9" : "12"} className="fill-muted-foreground">
                                                        {label}
                                                    </text>
                                                ))}

                                                {market.market_type === 'BINARY' && chartData?.market ? (
                                                    <>
                                                        {/* Yes Area */}
                                                        <path
                                                            d={`M 150 ${240 - (chartData.market.yes[0] * 2)} L 250 ${240 - (chartData.market.yes[1] * 2)} L 350 ${240 - (chartData.market.yes[2] * 2)} L 450 ${240 - (chartData.market.yes[3] * 2)} L 550 ${240 - (chartData.market.yes[4] * 2)} L 650 ${240 - (chartData.market.yes[5] * 2)} L 750 ${240 - (chartData.market.yes[6] * 2)} L 850 ${240 - (chartData.market.yes[7] * 2)} L 850 240 L 150 240 Z`}
                                                            fill="url(#yesGradient2)"
                                                        />

                                                        {/* No Area */}
                                                        <path
                                                            d={`M 150 ${240 - (chartData.market.no[0] * 2)} L 250 ${240 - (chartData.market.no[1] * 2)} L 350 ${240 - (chartData.market.no[2] * 2)} L 450 ${240 - (chartData.market.no[3] * 2)} L 550 ${240 - (chartData.market.no[4] * 2)} L 650 ${240 - (chartData.market.no[5] * 2)} L 750 ${240 - (chartData.market.no[6] * 2)} L 850 ${240 - (chartData.market.no[7] * 2)} L 850 240 L 150 240 Z`}
                                                            fill="url(#noGradient2)"
                                                        />

                                                        {/* Yes Line */}
                                                        <path
                                                            d={`M 150 ${240 - (chartData.market.yes[0] * 2)} L 250 ${240 - (chartData.market.yes[1] * 2)} L 350 ${240 - (chartData.market.yes[2] * 2)} L 450 ${240 - (chartData.market.yes[3] * 2)} L 550 ${240 - (chartData.market.yes[4] * 2)} L 650 ${240 - (chartData.market.yes[5] * 2)} L 750 ${240 - (chartData.market.yes[6] * 2)} L 850 ${240 - (chartData.market.yes[7] * 2)}`}
                                                            stroke="rgb(59, 130, 246)"
                                                            strokeWidth="3"
                                                            fill="none"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />

                                                        {/* No Line */}
                                                        <path
                                                            d={`M 150 ${240 - (chartData.market.no[0] * 2)} L 250 ${240 - (chartData.market.no[1] * 2)} L 350 ${240 - (chartData.market.no[2] * 2)} L 450 ${240 - (chartData.market.no[3] * 2)} L 550 ${240 - (chartData.market.no[4] * 2)} L 650 ${240 - (chartData.market.no[5] * 2)} L 750 ${240 - (chartData.market.no[6] * 2)} L 850 ${240 - (chartData.market.no[7] * 2)}`}
                                                            stroke="rgb(249, 115, 22)"
                                                            strokeWidth="3"
                                                            fill="none"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />

                                                        {/* Current Price Dots */}
                                                        <circle cx="850" cy={240 - (chartData.market.yes[7] * 2)} r="5" fill="rgb(59, 130, 246)" stroke="rgb(15, 23, 42)" strokeWidth="2" />
                                                        <circle cx="850" cy={240 - (chartData.market.no[7] * 2)} r="5" fill="rgb(249, 115, 22)" stroke="rgb(15, 23, 42)" strokeWidth="2" />
                                                    </>
                                                ) : (
                                                    market.options?.map((option: any, index: number) => {
                                                        const colors = [
                                                            "rgb(59, 130, 246)", // blue
                                                            "rgb(249, 115, 22)", // orange
                                                            "rgb(34, 197, 94)", // green
                                                            "rgb(239, 68, 68)", // red
                                                            "rgb(168, 85, 247)", // purple
                                                        ];
                                                        const color = colors[index % colors.length];
                                                        const history = chartData[`option_${option.id}`];
                                                        if (!history) return null;
                                                        const pathD = `M 150 ${240 - (history.yes[0] * 2)} L 250 ${240 - (history.yes[1] * 2)} L 350 ${240 - (history.yes[2] * 2)} L 450 ${240 - (history.yes[3] * 2)} L 550 ${240 - (history.yes[4] * 2)} L 650 ${240 - (history.yes[5] * 2)} L 750 ${240 - (history.yes[6] * 2)} L 850 ${240 - (history.yes[7] * 2)}`;
                                                        return (
                                                            <g key={`option-${option.id}`}>
                                                                {/* Area */}
                                                                <path
                                                                    d={`${pathD} L 850 240 L 150 240 Z`}
                                                                    fill={`url(#optionGradient${option.id})`}
                                                                />
                                                                {/* Line */}
                                                                <path
                                                                    d={pathD}
                                                                    stroke={color}
                                                                    strokeWidth="3"
                                                                    fill="none"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                />
                                                                {/* Current Price Dot */}
                                                                <circle cx="850" cy={240 - (history.yes[7] * 2)} r="5" fill={color} stroke="rgb(15, 23, 42)" strokeWidth="2" />
                                                            </g>
                                                        );
                                                    })
                                                )}
                                            </svg>
                                        </div>

                                        {/* Chart Footer Info */}
                                        <div className={isMobile ? "px-4 py-3 border-t border-border bg-muted/50 flex items-center justify-between gap-2 flex-wrap text-xs" : "px-6 py-4 border-t border-border bg-muted/50 flex items-center justify-between"}>
                                            <div className={isMobile ? "flex items-center gap-2" : "flex items-center gap-6"}>
                                                <div className="flex items-center gap-1">
                                                    <TrendingUp className={isMobile ? "h-3 w-3" : "h-4 w-4"} />
                                                    <span className={isMobile ? "text-xs font-semibold" : "text-sm font-semibold"}>{market.volume}</span>
                                                    <span className="text-xs text-muted-foreground">Vol.</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className={isMobile ? "h-3 w-3" : "h-4 w-4"} />
                                                    <span className="text-xs text-muted-foreground">{formatDate(market.end_date)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {market.market_type === 'BINARY' ? (
                                                    <>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                                            <span className="text-sm font-bold text-foreground">{market.yes_probability}%</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                                            <span className="text-sm font-bold text-foreground">{noProbability}%</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    market.options?.map((option: any, index: number) => {
                                                        const colors = [
                                                            "bg-blue-500",
                                                            "bg-orange-500",
                                                            "bg-green-500",
                                                            "bg-red-500",
                                                            "bg-purple-500",
                                                        ];
                                                        const bgColor = colors[index % colors.length];
                                                        return (
                                                            <div key={option.id} className="flex items-center gap-2">
                                                                <div className={`w-3 h-3 rounded-full ${bgColor}`}></div>
                                                                <span className="text-sm font-bold text-foreground">{option.yes_probability}%</span>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Options List for OPTION_LIST */}
                        {market.market_type === 'OPTION_LIST' && market.options && (
                            <div className="bg-muted rounded-2xl p-4">
                                <h3 className="text-sm font-bold text-foreground mb-4">Options</h3>
                                <div className="space-y-3">
                                    {market.options.map((option: any) => (
                                        <div key={option.id} className="space-y-2">
                                            <div className="text-xs font-bold text-muted-foreground">{option.label}</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedOptionId(option.id);
                                                        setSelectedOutcome("Yes");
                                                    }}
                                                    className={`p-3 rounded-lg font-bold transition-all text-sm ${
                                                        selectedOptionId === option.id && selectedOutcome === "Yes"
                                                            ? "bg-green-500 text-white"
                                                            : "bg-background border border-border text-foreground hover:bg-green-500/20 hover:border-green-500"
                                                    }`}
                                                >
                                                    Yes ({(100 / option.yes_probability).toFixed(2)}x) {option.yes_probability}%
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedOptionId(option.id);
                                                        setSelectedOutcome("No");
                                                    }}
                                                    className={`p-3 rounded-lg font-bold transition-all text-sm ${
                                                        selectedOptionId === option.id && selectedOutcome === "No"
                                                            ? "bg-red-500 text-white"
                                                            : "bg-background border border-border text-foreground hover:bg-red-500/20 hover:border-red-500"
                                                    }`}
                                                >
                                                    No ({(100 / (100 - option.yes_probability)).toFixed(2)}x) {100 - option.yes_probability}%
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Info Grid */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-muted rounded-lg p-4">
                                <span className="text-xs font-bold text-muted-foreground uppercase">Volume</span>
                                <div className="text-xl font-bold text-foreground mt-1">{market.volume || 'KES 0'}</div>
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
                    <div className="order-2 md:order-none bg-muted border border-border rounded-2xl p-4 md:sticky md:top-32 md:h-fit">
                        {/* Selected Option Display */}
                        {market.market_type === 'OPTION_LIST' && selectedOptionId && (
                            <div className="mb-4 p-3 bg-background rounded-lg border border-border">
                                <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Selected Option</div>
                                <div className="text-sm font-bold text-foreground">
                                    {market.options?.find((o: any) => o.id === selectedOptionId)?.label}
                                </div>
                            </div>
                        )}

                        {/* Position Display */}
                        <div className="space-y-3 mb-4">
                            <label className="text-xs font-bold text-muted-foreground uppercase block">Position</label>
                            {market.market_type === 'OPTION_LIST' ? (
                                selectedOptionId ? (
                                    <div className="space-y-2">
                                        {(() => {
                                            const option = market.options?.find((o: any) => o.id === selectedOptionId);
                                            const yesOdds = option?.yes_probability ? (100 / option.yes_probability).toFixed(2) : '0';
                                            const noOdds = option?.yes_probability ? (100 / (100 - option.yes_probability)).toFixed(2) : '0';
                                            return (
                                                <>
                                                    <button
                                                        onClick={() => setSelectedOutcome("Yes")}
                                                        className={`w-full p-4 rounded-lg font-bold transition-all text-sm ${
                                                            selectedOutcome === "Yes"
                                                                ? "bg-green-500 text-white"
                                                                : "bg-background border border-border text-foreground hover:bg-green-500/20 hover:border-green-500"
                                                        }`}
                                                    >
                                                        Yes ({yesOdds}x) <span className="font-bold">{option?.yes_probability}%</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedOutcome("No")}
                                                        className={`w-full p-4 rounded-lg font-bold transition-all text-sm ${
                                                            selectedOutcome === "No"
                                                                ? "bg-red-500 text-white"
                                                                : "bg-background border border-border text-foreground hover:bg-red-500/20 hover:border-red-500"
                                                        }`}
                                                    >
                                                        No ({noOdds}x) <span className="font-bold">{100 - (option?.yes_probability || 0)}%</span>
                                                    </button>
                                                </>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground p-3 bg-background rounded-lg">Select an option from the list</div>
                                )
                            ) : (
                                <div className="space-y-2">
                                    <button
                                        onClick={() => setSelectedOutcome("Yes")}
                                        className={`w-full p-3 rounded-lg font-bold transition-all text-sm ${
                                            selectedOutcome === "Yes"
                                                ? "bg-green-500 text-white"
                                                : "bg-background border border-border text-foreground hover:bg-green-500/20 hover:border-green-500"
                                        }`}
                                    >
                                        Yes <span className="text-xs font-bold ml-1">({(100 / market.yes_probability).toFixed(2)}x)</span>
                                    </button>
                                    <button
                                        onClick={() => setSelectedOutcome("No")}
                                        className={`w-full p-3 rounded-lg font-bold transition-all text-sm ${
                                            selectedOutcome === "No"
                                                ? "bg-red-500 text-white"
                                                : "bg-background border border-border text-foreground hover:bg-red-500/20 hover:border-red-500"
                                        }`}
                                    >
                                        No <span className="text-xs font-bold ml-1">({(100 / noProbability).toFixed(2)}x)</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Buy/Sell Tabs */}
                        <div className="flex gap-2 mb-3 border-b border-border">
                            <button
                                onClick={() => setActiveTab("buy")}
                                className={`flex-1 py-2 font-bold text-sm transition-colors ${
                                    activeTab === "buy"
                                        ? "text-foreground border-b-2 border-foreground -mb-[2px]"
                                        : "text-muted-foreground"
                                }`}
                            >
                                Buy
                            </button>
                            <button
                                onClick={() => setActiveTab("sell")}
                                className={`flex-1 py-2 font-bold text-sm transition-colors ${
                                    activeTab === "sell"
                                        ? "text-foreground border-b-2 border-foreground -mb-[2px]"
                                        : "text-muted-foreground"
                                }`}
                            >
                                Sell
                            </button>
                        </div>

                        {/* Order Type Toggle */}
                        <div className="mb-3 flex gap-2 border-b border-border pb-2">
                            <button
                                onClick={() => setOrderType("market")}
                                className={`flex-1 py-2 font-bold text-xs transition-colors rounded ${
                                    orderType === "market"
                                        ? "bg-foreground text-background"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Market
                            </button>
                            <button
                                onClick={() => setOrderType("limit")}
                                className={`flex-1 py-2 font-bold text-xs transition-colors rounded ${
                                    orderType === "limit"
                                        ? "bg-foreground text-background"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Limit
                            </button>
                        </div>

                        {orderType === "limit" ? (
                            <>
                                {/* Limit Price Input */}
                                <div className="mb-3">
                                    <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Limit Price</label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setLimitPrice(Math.max(1, limitPrice - 1))}
                                            className="w-10 h-10 rounded-lg bg-border text-foreground hover:bg-border/80 transition font-bold"
                                        >
                                            −
                                        </button>
                                        <div className="flex-1 text-2xl font-bold text-right p-3 border border-border rounded-lg bg-muted/50 text-foreground">
                                            {limitPrice}%
                                        </div>
                                        <button
                                            onClick={() => setLimitPrice(Math.min(100, limitPrice + 1))}
                                            className="w-10 h-10 rounded-lg bg-border text-foreground hover:bg-border/80 transition font-bold"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Shares Input */}
                                <div className="mb-3">
                                    <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Shares</label>
                                    <div className="relative mb-3">
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={shares}
                                            onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-full text-3xl font-bold text-right p-3 border border-border rounded-lg bg-muted/50 text-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
                                        />
                                    </div>
                                    
                                    {/* Quick Select Buttons for Shares */}
                                    <div className="grid grid-cols-4 gap-2">
                                        <button onClick={() => setShares(Math.max(1, shares - 100))} className="text-xs font-bold border border-border rounded-md p-2 bg-muted/50 hover:bg-muted hover:border-foreground/40 transition-colors cursor-pointer">−100</button>
                                        <button onClick={() => setShares(Math.max(1, shares - 10))} className="text-xs font-bold border border-border rounded-md p-2 bg-muted/50 hover:bg-muted hover:border-foreground/40 transition-colors cursor-pointer">−10</button>
                                        <button onClick={() => setShares(shares + 10)} className="text-xs font-bold border border-border rounded-md p-2 bg-muted/50 hover:bg-muted hover:border-foreground/40 transition-colors cursor-pointer">+10</button>
                                        <button onClick={() => setShares(shares + 100)} className="text-xs font-bold border border-border rounded-md p-2 bg-muted/50 hover:bg-muted hover:border-foreground/40 transition-colors cursor-pointer">+100</button>
                                    </div>
                                </div>

                                {/* Total and To Win Display */}
                                <div className="bg-gradient-to-r from-green-950/40 to-blue-950/40 rounded-lg p-3 mb-3 border border-green-900/40">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-muted-foreground uppercase">Total</span>
                                            <span className="text-2xl font-bold text-green-400">KES {limitStats.totalCost.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-green-900/40">
                                            <span className="text-xs text-muted-foreground">Total Return</span>
                                            <span className="text-lg font-bold text-green-300">KES {(limitStats.totalCost + limitStats.toWin).toFixed(2)} <span className="text-xs text-green-400">({limitStats.totalCost.toFixed(2)} + {limitStats.toWin.toFixed(2)})</span></span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Market Order - Amount Input */}
                                <div className="mb-3">
                                    <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Amount</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={betAmount}
                                            onChange={(e) => setBetAmount(e.target.value)}
                                            className="w-full text-3xl font-bold text-right p-3 border border-border rounded-lg bg-muted/50 text-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
                                        />
                                    </div>
                                </div>

                                {/* Quick Select Buttons */}
                                <div className="mb-3">
                                    <div className="grid grid-cols-5 gap-2">
                                        <button onClick={() => setBetAmount(((parseFloat(betAmount) || 0) + 100).toString())} className="text-xs font-bold border border-border rounded-md p-2 bg-muted/50 hover:bg-muted hover:border-foreground/40 transition-colors cursor-pointer">+100</button>
                                        <button onClick={() => setBetAmount(((parseFloat(betAmount) || 0) + 500).toString())} className="text-xs font-bold border border-border rounded-md p-2 bg-muted/50 hover:bg-muted hover:border-foreground/40 transition-colors cursor-pointer">+500</button>
                                        <button onClick={() => setBetAmount(((parseFloat(betAmount) || 0) + 1000).toString())} className="text-xs font-bold border border-border rounded-md p-2 bg-muted/50 hover:bg-muted hover:border-foreground/40 transition-colors cursor-pointer">+1K</button>
                                        <button onClick={() => setBetAmount(((parseFloat(betAmount) || 0) + 5000).toString())} className="text-xs font-bold border border-border rounded-md p-2 bg-muted/50 hover:bg-muted hover:border-foreground/40 transition-colors cursor-pointer">+5K</button>
                                        <button onClick={() => setBetAmount(((parseFloat(betAmount) || 0) + 10000).toString())} className="text-xs font-bold border border-border rounded-md p-2 bg-muted/50 hover:bg-muted hover:border-foreground/40 transition-colors cursor-pointer">+10K</button>
                                    </div>
                                </div>

                                {/* Estimated Winnings / AMM Price Info */}
                                {betAmount && !isNaN(Number(betAmount)) && Number(betAmount) > 0 && (
                                    <>
                                        {ammPrice && ammPrice.is_amm && (
                                            <div className={`rounded-lg p-4 mb-4 border-2 ${
                                                getSlippageWarningLevel(ammPrice.price_impact) === 'none'
                                                    ? 'bg-green-950/20 border-green-700/40'
                                                    : getSlippageWarningLevel(ammPrice.price_impact) === 'warning'
                                                    ? 'bg-yellow-950/20 border-yellow-700/40'
                                                    : 'bg-red-950/20 border-red-700/40'
                                            }`}>
                                                <div className="flex items-start gap-2 mb-3">
                                                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-yellow-400" />
                                                    <div>
                                                        <span className="text-xs font-bold text-muted-foreground uppercase block">
                                                            AMM Pricing
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            Price impact: {formatPriceImpact(ammPrice.price_impact)}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-2 text-xs mb-3">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Market price:</span>
                                                        <span className="font-semibold">{ammPrice.current_probability.toFixed(2)}%</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Execution price:</span>
                                                        <span className="font-semibold text-green-400">{ammPrice.execution_price.toFixed(2)}%</span>
                                                    </div>
                                                    <div className="pt-2 border-t border-border flex justify-between">
                                                        <span className="text-muted-foreground">After trade:</span>
                                                        <span className="font-semibold">{ammPrice.new_probability.toFixed(2)}%</span>
                                                    </div>
                                                </div>
                                                
                                                {activeTab === 'buy' && ammPrice.shares_received && (
                                                    <div className="text-xs font-bold text-green-400">
                                                        You receive: {ammPrice.shares_received.toFixed(2)} shares
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        <div className="bg-gradient-to-r from-green-950/40 to-blue-950/40 rounded-lg p-4 mb-4 border border-green-900/40">
                                            <span className="text-xs font-bold text-muted-foreground uppercase block mb-2">
                                                {activeTab === "sell" ? "You'll receive" : "If correct: you get"}
                                            </span>
                                            <div className="text-3xl font-bold text-green-400">
                                                KES {estimatedReturn.toFixed(2)}
                                            </div>
                                            <span className="text-xs text-muted-foreground mt-1 block">
                                                @ {(() => {
                                                    if (market.market_type === 'OPTION_LIST' && selectedOptionId) {
                                                        const option = market.options?.find((o: any) => o.id === selectedOptionId);
                                                        const prob = selectedOutcome === "Yes" ? (option ? option.yes_probability : market.yes_probability) : (option ? (100 - option.yes_probability) : noProbability);
                                                        return `${prob}% (${(100 / prob).toFixed(2)}x)`;
                                                    } else {
                                                        const prob = selectedOutcome === "Yes" ? market.yes_probability : noProbability;
                                                        return `${prob}% (${(100 / prob).toFixed(2)}x)`;
                                                    }
                                                })()}
                                            </span>
                                        </div>
                                    </>
                                )}

                            </>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={() => handleBet(selectedOutcome)}
                                disabled={placingBet}
                                className={`w-full text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 ${
                                    selectedOutcome === "Yes"
                                        ? "bg-green-500 hover:opacity-90"
                                        : "bg-red-500 hover:opacity-90"
                                }`}
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
                    <div className="md:col-span-2 space-y-3 order-3 md:order-none">
                        {/* Market Description */}
                        {market.description && (
                            <div className="bg-muted rounded-2xl p-4 border border-border">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Description</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{market.description}</p>
                            </div>
                        )}

                        <div className="bg-muted rounded-2xl p-4 border border-border">
                            <div className="flex items-center justify-between mb-3">
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
                                                                <p className="text-xs text-muted-foreground">KES {Number(position.amount).toLocaleString()}</p>
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
                                                            <p className="text-sm font-semibold text-foreground">KES {Number(item.amount).toLocaleString()}</p>
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
                                        <div key={msg.id} className={`rounded-2xl border p-4 space-y-3 transition-colors ${
                                            replyingToId === msg.id 
                                                ? 'border-apple-blue bg-apple-blue/10 bg-background/80' 
                                                : 'border-border bg-background/80'
                                        }`}>
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
                                                <div key={reply.id} className={`ml-5 rounded-2xl border p-4 space-y-3 transition-colors ${
                                                    replyingToId === reply.id 
                                                        ? 'border-apple-blue bg-apple-blue/10 bg-muted' 
                                                        : 'border-border bg-muted'
                                                }`}>
                                                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                                        <span className="font-semibold text-foreground">
                                                            {reply.user_name || 'Trader'}
                                                        </span>
                                                        <span>{formatChatTimestamp(reply.created_at)}</span>
                                                    </div>
                                                    <p className="text-sm text-foreground">
                                                        <span className="font-semibold text-foreground">Reply to {reply.parent_user_name || 'them'}: </span>
                                                        {reply.message}
                                                    </p>
                                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                        <button
                                                            onClick={() => handleStartReply(reply.id, reply.user_name || 'Trader')}
                                                            className="font-semibold text-foreground hover:text-apple-blue"
                                                        >
                                                            Reply
                                                        </button>
                                                        {getRepliesForMessage(reply.id).length > 0 && (
                                                            <span>{getRepliesForMessage(reply.id).length} repl{getRepliesForMessage(reply.id).length === 1 ? 'y' : 'ies'}</span>
                                                        )}
                                                    </div>
                                                    {getRepliesForMessage(reply.id).map((nestedReply) => (
                                                        <div key={nestedReply.id} className={`ml-5 rounded-2xl border p-4 space-y-3 transition-colors ${
                                                            replyingToId === nestedReply.id 
                                                                ? 'border-apple-blue bg-apple-blue/10 bg-background' 
                                                                : 'border-border bg-background'
                                                        }`}>
                                                            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                                                <span className="font-semibold text-foreground">
                                                                    {nestedReply.user_name || 'Trader'}
                                                                </span>
                                                                <span>{formatChatTimestamp(nestedReply.created_at)}</span>
                                                            </div>
                                                            <p className="text-sm text-foreground">
                                                                <span className="font-semibold text-foreground">Reply to {nestedReply.parent_user_name || 'them'}: </span>
                                                                {nestedReply.message}
                                                            </p>
                                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                                <button
                                                                    onClick={() => handleStartReply(nestedReply.id, nestedReply.user_name || 'Trader')}
                                                                    className="font-semibold text-foreground hover:text-apple-blue"
                                                                >
                                                                    Reply
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    ))
                                )}
                            </div>

                                    {/* Chat Input */}
                                    <div ref={chatInputRef} className="mt-4 pt-4 border-t border-border">
                                        {replyingToId && (
                                            <div className="flex items-center justify-between rounded-2xl border border-apple-blue/30 bg-apple-blue/5 p-3 text-sm text-foreground mb-3">
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
                                        <div className="flex gap-2 items-end">
                                            <textarea
                                                value={newChatMessage}
                                                onChange={(e) => setNewChatMessage(e.target.value)}
                                                placeholder="Add a comment..."
                                                className="flex-1 min-h-[44px] max-h-[120px] rounded-lg border border-border bg-background/60 p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground resize-none"
                                            />
                                            <button
                                                onClick={handleSendChat}
                                                disabled={sendingChat}
                                                className="bg-apple-blue hover:opacity-90 text-white font-bold py-2.5 px-3 rounded-lg transition disabled:opacity-50 flex-shrink-0 flex items-center justify-center"
                                            >
                                                <Send className="h-4 w-4" />
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
                            <h2 className="text-lg font-bold">{lastBet.orderType === "limit" ? "Limit Order" : "Position"} Confirmed</h2>
                        </div>

                        <div className="space-y-3 mb-4">
                            <div className="flex justify-between">
                                <span className="text-background/75">Outcome</span>
                                <span className={`font-bold ${lastBet.outcome === 'Yes' ? 'text-green-400' : 'text-red-400'}`}>{lastBet.outcome}</span>
                            </div>
                            
                            {lastBet.orderType === "limit" ? (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-background/75">Limit Price</span>
                                        <span className="font-bold">{lastBet.limitPrice}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-background/75">Shares</span>
                                        <span className="font-bold">{lastBet.shares}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-background/20 pt-2">
                                        <span className="text-background/75">Total</span>
                                        <span className="font-bold">KES {lastBet.totalCost.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-background/75">Total Return</span>
                                        <span className="font-bold text-green-300">KES {(lastBet.totalCost + lastBet.toWin).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-background/60">
                                        <span>({lastBet.totalCost.toFixed(2)} + {lastBet.toWin.toFixed(2)})</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-background/75">Amount</span>
                                        <span className="font-bold">KES {Number(lastBet.amount).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-background/75">Probability</span>
                                        <span className="font-bold">{lastBet.probability}%</span>
                                    </div>
                                </>
                            )}
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
