"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useParams } from "next/navigation";
import { useAppDispatch, useAppSelector, selectAllMarkets, selectMarketsLoading, selectSavedMarketIds } from "@/lib/redux/hooks";
import { fetchMarkets, toggleSaveMarket } from "@/lib/redux/slices/marketsSlice";

import { extractMarketId, generateMarketSlug } from "@/lib/slugify";
import SearchFilterBar from "@/components/SearchFilterBar";
import LoadingSpinner from "@/components/LoadingSpinner";
import { InlineSpinner } from "@/components/InlineSpinner";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { TrendingUp, Clock, ShieldCheck, Wallet, ArrowLeft, Bookmark, Send, BarChart3, Percent, Droplet } from "lucide-react";
import Link from "next/link";
import ShareButton from "@/components/ShareButton";
import AddLiquidityModal from "@/components/AddLiquidityModal";

// Ensure this page is rendered dynamically (never prerendered)
export const dynamic = 'force-dynamic';


// Break this into components for more complex markets

// ============================================================================
// LMSR (Logarithmic Market Scoring Rule) Utilities
// ============================================================================

const LMSR_B = 100.0; // Liquidity parameter (default)
const PAYOUT_PER_SHARE = 100; // KES per share

/**
 * Calculate LMSR cost function: C(q) = b * ln(exp(q_yes/b) + exp(q_no/b))
 */
function lmsrCost(q_yes: number, q_no: number, b: number = LMSR_B): number {
    try {
        // Validate inputs
        if (!Number.isFinite(q_yes) || !Number.isFinite(q_no) || !Number.isFinite(b)) {
            console.warn('Invalid LMSR inputs:', { q_yes, q_no, b });
            return 0;
        }
        const exp_yes = Math.exp(q_yes / b);
        const exp_no = Math.exp(q_no / b);
        const result = b * Math.log(exp_yes + exp_no);
        
        // Return 0 if result is NaN
        return Number.isFinite(result) ? result : 0;
    } catch {
        console.warn('LMSR cost calculation error');
        return 0;
    }
}

/**
 * Calculate cost to buy shares using LMSR
 */
function calculateLMSRBuyCost(
    q_yes_before: number,
    q_no_before: number,
    shares: number,
    outcome: string,
    b: number = LMSR_B
): number {
    // Validate inputs
    if (!Number.isFinite(q_yes_before) || !Number.isFinite(q_no_before) || !Number.isFinite(shares) || shares <= 0) {
        console.warn('Invalid LMSR buy cost inputs:', { q_yes_before, q_no_before, shares });
        return 0;
    }
    
    const q_yes_after = outcome.toUpperCase() === 'YES' ? q_yes_before + shares : q_yes_before;
    const q_no_after = outcome.toUpperCase() === 'YES' ? q_no_before : q_no_before + shares;
    
    const cost_before = lmsrCost(q_yes_before, q_no_before, b);
    const cost_after = lmsrCost(q_yes_after, q_no_after, b);
    
    const result = (cost_after - cost_before) * PAYOUT_PER_SHARE;
    
    // Return 0 if result is NaN or invalid
    return Number.isFinite(result) && result >= 0 ? result : 0;
}

/**
 * Calculate payout from selling shares using LMSR
 */
function calculateLMSRSellPayout(
    q_yes_before: number,
    q_no_before: number,
    shares: number,
    outcome: string,
    b: number = LMSR_B
): number {
    // Validate inputs
    if (!Number.isFinite(q_yes_before) || !Number.isFinite(q_no_before) || !Number.isFinite(shares) || shares <= 0) {
        console.warn('Invalid LMSR sell payout inputs:', { q_yes_before, q_no_before, shares });
        return 0;
    }
    
    const q_yes_after = outcome.toUpperCase() === 'YES' ? q_yes_before - shares : q_yes_before;
    const q_no_after = outcome.toUpperCase() === 'YES' ? q_no_before : q_no_before - shares;
    
    const cost_before = lmsrCost(q_yes_before, q_no_before, b);
    const cost_after = lmsrCost(q_yes_after, q_no_after, b);
    
    const result = (cost_before - cost_after) * PAYOUT_PER_SHARE;
    
    // Return 0 if result is NaN or invalid
    return Number.isFinite(result) && result >= 0 ? result : 0;
}

/**
 * Estimate shares received from buying a given KES amount
 */
function estimateSharesFromKES(
    amount_kes: number,
    q_yes: number,
    q_no: number,
    outcome: string,
    b: number = LMSR_B
): number {
    // Binary search to find shares that cost approximately amount_kes
    let low = 0;
    let high = amount_kes * 2; // Upper bound
    let result = 0;
    
    for (let i = 0; i < 20; i++) {
        const mid = (low + high) / 2;
        const cost = calculateLMSRBuyCost(q_yes, q_no, mid, outcome, b);
        
        if (cost < amount_kes) {
            result = mid;
            low = mid;
        } else {
            high = mid;
        }
    }
    
    return result;
}

/**
 * Derive q_yes and q_no from market's LMSR state
 * ALWAYS use backend q_yes/q_no if available (they are the source of truth)
 * Only derive from yes_probability as a last resort fallback
 * 
 * IMPORTANT: Backend must return q_yes and q_no to ensure price consistency!
 */
function deriveQValuesFromMarket(
    market: any,
    b: number = LMSR_B
): { q_yes: number; q_no: number } {
    // ✅ PRIMARY: Use backend q values if both are provided (source of truth)
    if (market?.q_yes !== null && market?.q_yes !== undefined && 
        market?.q_no !== null && market?.q_no !== undefined) {
        return {
            q_yes: market.q_yes,
            q_no: market.q_no
        };
    }
    
    // ⚠️ FALLBACK: Only if backend doesn't provide q values
    // Derive from yes_probability with strict validation
    if (market?.yes_probability !== null && market?.yes_probability !== undefined) {
        const yes_prob = market.yes_probability / 100;
        
        // Clamp probability to valid range to avoid log(0) errors
        const clampedProb = Math.max(0.01, Math.min(0.99, yes_prob));
        
        const p_ratio = clampedProb / (1 - clampedProb);
        const q_yes = b * Math.log(p_ratio);
        const q_no = 0;
        
        console.warn(
            `⚠️ LMSR: Backend didn't provide q_yes/q_no. Deriving from yes_probability=${market.yes_probability}%. ` +
            `q_yes=${q_yes.toFixed(2)}, q_no=${q_no}. ` +
            `Backend should return q_yes and q_no for price consistency!`
        );
        
        return { q_yes, q_no };
    }
    
    // 🔴 LAST RESORT: Default to 50/50
    console.error(
        `❌ LMSR: Backend didn't provide q_yes/q_no or yes_probability. Defaulting to 50/50. ` +
        `This indicates a backend data issue!`
    );
    return { q_yes: 0, q_no: 0 }; // 50/50 (symmetric around 0)
}

/**
 * Calculate the current share price (cost to buy 1 share)
 * Returns the price in KES for a single share
 */
function getCurrentSharePrice(
    market: any,
    outcome: string,
    b: number = LMSR_B
): number {
    if (!market) return 0;
    
    const { q_yes, q_no } = deriveQValuesFromMarket(market, b);
    const price = calculateLMSRBuyCost(q_yes, q_no, 1, outcome, b);
    
    return price;
}

export default function MarketDetail() {
    const { id: paramId } = useParams();
    const marketId = extractMarketId(paramId);
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
    const [showReceipt, setShowReceipt] = useState(false);
    const [showLiquidityModal, setShowLiquidityModal] = useState(false);
    const [lastBet, setLastBet] = useState<any>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [marketPositions, setMarketPositions] = useState<any[]>([]);
    const [topHolders, setTopHolders] = useState<{yes:any[]; no:any[]}>({yes: [], no: []});
    const [marketActivity, setMarketActivity] = useState<any[]>([]);
    const [marketTab, setMarketTab] = useState<"comments" | "topHolders" | "positions" | "activity">("comments");
    const [replyingToId, setReplyingToId] = useState<number | null>(null);
    const [replyingToName, setReplyingToName] = useState("");
    const [newChatMessage, setNewChatMessage] = useState("");
    const [shareLoadMessage, setShareLoadMessage] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const [sendingChat, setSendingChat] = useState(false);
    const [chatError, setChatError] = useState("");
    const [probabilityViewMode, setProbabilityViewMode] = useState<"percentage" | "graph">("graph");
    const [timePeriod, setTimePeriod] = useState<"1H" | "6H" | "1D" | "1W" | "1M" | "ALL">("ALL");
    const [priceHistory, setPriceHistory] = useState<{[key: string]: {yes: number[]; no: number[]}}>({});
    const [loadingChart, setLoadingChart] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [limitPrice, setLimitPrice] = useState<number>(50); // Default to 50% probability
    const [shares, setShares] = useState<number>(100); // Supports fractional shares (e.g., 19.6, 10.25)
    const [orderType, setOrderType] = useState<"market" | "limit">("market");
    const [availableShares, setAvailableShares] = useState<number | null>(null);
    const [loadingAvailableShares, setLoadingAvailableShares] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const chatInputRef = useRef<HTMLDivElement>(null);

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

    // Check if user is admin
    useEffect(() => {
        const userStr = localStorage.getItem("poly_user");
        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                setIsAdmin(userData.is_staff || userData.is_superuser || false);
            } catch {
                setIsAdmin(false);
            }
        }
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
        if (allMarkets.length > 0 && marketId) {
            const found = allMarkets.find((m: any) => m.id === marketId);
            setMarket(found);
            setIsSaved(savedMarketIds.includes(marketId));
        }
    }, [allMarkets, marketId, savedMarketIds]);



    // Auto-load available shares when switching to sell tab
    useEffect(() => {
        if (activeTab === "sell" && market && selectedOutcome) {
            setLoadingAvailableShares(true);
            const queryParams = new URLSearchParams({
                outcome: selectedOutcome,
            });
            if (selectedOptionId) {
                queryParams.append('option_id', selectedOptionId.toString());
            }
            
            fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/${market.id}/available-shares/?${queryParams}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            )
            .then((response) => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error("Failed to fetch available shares");
            })
            .then((data) => {
                const available = data.available_quantity || 0;
                setAvailableShares(available);
                // Auto-populate shares field if user has shares to sell
                if (available > 0) {
                    setShares(available);
                    setShareLoadMessage(`You own ${available} shares. We've auto-loaded this amount!`);
                } else {
                    setShares(1);
                    setShareLoadMessage("You don't own any shares of this outcome to sell.");
                }
            })
            .catch((err) => {
                console.error("Error fetching available shares:", err);
                setAvailableShares(0);
                setShareLoadMessage("Could not load available shares");
            })
            .finally(() => {
                setLoadingAvailableShares(false);
            });
        }
    }, [activeTab, market, selectedOutcome, selectedOptionId]);

    useEffect(() => {
        if (market && market.id) {
            fetchMarketDetails();
            fetchPriceHistory();
        }
    }, [market]);

    const fetchPriceHistory = async () => {
        setLoadingChart(true);
        try {
            // For Polymarket data, fetch real trade history
            if (market.source === 'polymarket') {
                try {
                    const response = await fetchWithAuth(
                        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/brokerage/markets/${market.external_id}/trades/`,
                        {
                            method: "GET",
                            headers: { "Content-Type": "application/json" },
                        }
                    );
                    
                    if (response.ok) {
                        const trades = await response.json();
                        
                        // Extract price points from trades
                        // Trades contain pricePoints with timestamp and price data
                        if (trades && Array.isArray(trades) && trades.length > 0) {
                            // Group trades by time and calculate average prices
                            const pricePoints: { timestamp: number; yes_prob: number }[] = [];
                            
                            trades.forEach((trade: any) => {
                                if (trade.price !== undefined && trade.size !== undefined) {
                                    // trade.price should be the yes outcome price (0-1)
                                    pricePoints.push({
                                        timestamp: new Date(trade.timestamp || trade.created_at).getTime(),
                                        yes_prob: (trade.price || 0.5) * 100,
                                    });
                                }
                            });
                            
                            if (pricePoints.length > 0) {
                                // Sort by timestamp and take last 8 points for the chart
                                pricePoints.sort((a, b) => a.timestamp - b.timestamp);
                                const chartPoints = pricePoints.slice(-8);
                                
                                const yesProbs = chartPoints.map(p => Math.min(95, Math.max(5, p.yes_prob)));
                                const noProbs = yesProbs.map(y => 100 - y);
                                
                                setPriceHistory({
                                    market: {
                                        yes: yesProbs,
                                        no: noProbs,
                                    }
                                });
                                setLoadingChart(false);
                                return;
                            }
                        }
                    }
                } catch (err) {
                    console.warn("Failed to fetch Polymarket trades, falling back to generated data:", err);
                }
                
                // Fallback to generated data if trade history unavailable
                const generated = generateHistoricalPrices();
                setPriceHistory({
                    market: generated
                });
                setLoadingChart(false);
                return;
            }

            if (market.market_type === 'OPTION_LIST' && market.options) {
                const histories: {[key: string]: {yes: number[]; no: number[]}} = {};
                for (const option of market.options) {
                    const response = await fetchWithAuth(
                        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/${marketId}/price-history/?period=${timePeriod}&option_id=${option.id}`,
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
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/${marketId}/price-history/?period=${timePeriod}`,
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
            // Skip details fetch for Polymarket markets - they don't have the same endpoints
            if (market.source === 'polymarket') {
                console.log("Skipping details fetch for Polymarket market");
                setChatLoading(false);
                return;
            }

            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/${marketId}/details/`,
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
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/${marketId}/chat/`,
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
            // Determine if this is a Polymarket order
            const isPolymarket = market.source === 'polymarket';
            
            let response;
            
            if (isPolymarket) {
                // ============================================
                // POLYMARKET ORDER PLACEMENT
                // ============================================
                
                // Map outcome to side: "Yes" → "BUY", "No" → "SELL"
                const side = outcome === "Yes" ? "BUY" : "SELL";
                
                // Get token ID from market data
                let tokenId: string;
                try {
                    console.log("Market data for token IDs:", {
                        clobTokenIds: market.clobTokenIds,
                        clobTokenIdsType: typeof market.clobTokenIds,
                        external_id: market.external_id,
                    });

                    let clobTokenIds = market.clobTokenIds;
                    
                    // Handle if it's already an array
                    if (Array.isArray(clobTokenIds)) {
                        tokenId = outcome === "Yes" ? clobTokenIds[0] : clobTokenIds[1];
                    } else if (typeof clobTokenIds === 'string') {
                        // Try to parse if it's a JSON string
                        clobTokenIds = JSON.parse(clobTokenIds);
                        tokenId = outcome === "Yes" ? clobTokenIds[0] : clobTokenIds[1];
                    } else {
                        throw new Error("clobTokenIds not found or in unexpected format");
                    }
                } catch (e) {
                    console.error("Token ID parsing error:", e);
                    console.error("Full market object:", market);
                    setMessage(`Invalid market configuration: ${e instanceof Error ? e.message : 'missing token IDs'}`);
                    setPlacingBet(false);
                    return;
                }
                
                if (!tokenId) {
                    console.error("Token ID is empty or undefined");
                    setMessage("Invalid market configuration (missing token ID)");
                    setPlacingBet(false);
                    return;
                }
                
                // For market orders, calculate shares from KES amount
                let size: number;
                let price: number;
                
                if (orderType === "market") {
                    // Convert KES to USD (1 USD = 130 KES)
                    const kesAmount = Number(betAmount);
                    const usdAmount = kesAmount / 130;
                    
                    // Round size to 8 decimal places (Polymarket requirement)
                    size = Math.round(usdAmount * 100000000) / 100000000;
                    
                    // Price is not used for market orders, but we send market probability as reference
                    price = market.yes_probability / 100;
                } else {
                    // For limit orders, use shares and limit_price directly
                    // Round to 8 decimal places
                    size = Math.round(shares * 100000000) / 100000000;
                    // Convert limit_price from percentage (0-100) to decimal (0-1)
                    price = Math.max(0.001, Math.min(0.999, limitPrice / 100));
                }
                
                const polyPayload = {
                    market_id: market.external_id,  // Use Polymarket external_id
                    token_id: tokenId,               // Token ID for py-clob-client
                    side: side,
                    size: size,
                    price: price,
                    order_type: orderType,          // 'market' or 'limit'
                };
                
                console.log("Placing Polymarket order:", polyPayload);
                
                response = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/brokerage/orders/place/`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(polyPayload),
                    }
                );
            } else {
                // ============================================
                // LOCAL MARKET ORDER PLACEMENT
                // ============================================
                
                const payload: any = {
                    market_id: marketId,
                    outcome,
                    action: activeTab,
                    order_type: orderType,
                };

                // Build payload based on order type and action
                if (orderType === "market") {
                    if (activeTab === "sell") {
                        // For SELL market orders, amount is shares
                        payload.amount = shares;
                    } else {
                        // For BUY market orders, amount is KES
                        payload.amount = betAmount;
                    }
                } else {
                    // For limit orders, amount is always shares, not KES
                    payload.amount = shares;
                    payload.limit_price = limitPrice;
                }

                // Add option_id for option-list markets
                if (market.market_type === 'OPTION_LIST' && selectedOptionId) {
                    payload.option_id = selectedOptionId;
                }

                response = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/bet/`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    }
                );
            }

            const data = await response.json();
            if (response.ok) {
                // Store bet details for receipt
                const userStr = localStorage.getItem("poly_user");
                const userData = userStr ? JSON.parse(userStr) : {};
                
                let lastBetData: any = {
                    id: Math.random().toString(36).substr(2, 9),
                    market: market.question,
                    outcome,
                    action: activeTab,
                    phoneNumber: userData.phone_number,
                    timestamp: new Date(),
                    isPolymarket: isPolymarket,
                };

                if (orderType === "market") {
                    const amountValue = Number(betAmount);
                    
                    // Use LMSR to calculate actual shares bought and potential winnings
                    const b = market.b || LMSR_B;
                    const { q_yes, q_no } = deriveQValuesFromMarket(market, b);
                    
                    const actualShares = estimateSharesFromKES(amountValue, q_yes, q_no, selectedOutcome, b);
                    
                    // Max payout if you win: shares * 100 KES
                    const potentialWinnings = actualShares * PAYOUT_PER_SHARE;
                    
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
                    
                    lastBetData = {
                        ...lastBetData,
                        amount: betAmount,
                        probability: probabilityValue,
                        potentialWinnings: potentialWinnings,
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
                
                // Update market state immediately from response if available
                if (data.market) {
                    setMarket((prev: any) => ({
                        ...prev,
                        q_yes: data.market.q_yes,
                        q_no: data.market.q_no,
                        yes_probability: data.market.yes_probability,
                    }));
                }
                
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

    if (loading) return <LoadingSpinner />;

    // Show loading state if market data hasn't loaded yet (moved up before any market access)
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

    // Calculate estimated payout return using LMSR
    const calculateEstimatedReturn = () => {
        if (!betAmount || isNaN(Number(betAmount))) return 0;
        const amount = Number(betAmount);
        
        const b = market?.b || LMSR_B;
        const { q_yes, q_no } = deriveQValuesFromMarket(market, b);
        
        const estimatedShares = estimateSharesFromKES(amount, q_yes, q_no, selectedOutcome, b);
        
        // If you win, you get 100 KES per share
        return estimatedShares * PAYOUT_PER_SHARE;
    };

    const estimatedReturn = calculateEstimatedReturn();

    // Limit order calculations using LMSR
    const calculateLimitOrderStats = () => {
        if (!market) {
            return {
                totalCost: 0,
                toWin: 0,
                potentialProfit: 0,
                winPayout: 0,
            };
        }
        
        // Validate shares is a valid positive number
        const validShares = Number.isFinite(shares) && shares > 0 ? shares : 0;
        
        if (validShares === 0) {
            return {
                totalCost: 0,
                toWin: 0,
                potentialProfit: 0,
                winPayout: 0,
            };
        }
        
        const b = market.b || LMSR_B;
        const { q_yes, q_no } = deriveQValuesFromMarket(market, b);
        
        // Validate q values
        if (!Number.isFinite(q_yes) || !Number.isFinite(q_no)) {
            return {
                totalCost: 0,
                toWin: 0,
                potentialProfit: 0,
                winPayout: 0,
            };
        }
        
        // Calculate cost using LMSR: what does it cost to buy 'shares' RIGHT NOW?
        const totalCost = calculateLMSRBuyCost(q_yes, q_no, validShares, selectedOutcome, b);
        
        // In LMSR: max payout is always 100 KES per share if outcome wins
        const maxPayout = validShares * PAYOUT_PER_SHARE;
        const winAmount = maxPayout * (1 - TRADING_FEE_PERCENT / 100);
        const potentialProfit = winAmount - totalCost;
        
        return {
            totalCost: Number.isFinite(totalCost) ? totalCost : 0,
            toWin: Number.isFinite(maxPayout - totalCost) ? (maxPayout - totalCost) : 0,
            potentialProfit: Number.isFinite(potentialProfit) ? potentialProfit : 0,
            winPayout: Number.isFinite(winAmount) ? winAmount : 0,
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

    /**
     * Format shares for display (hide long decimals)
     * Shows max 2 decimal places but keeps full precision in state
     */
    const formatSharesForDisplay = (value: number): string => {
        if (!value) return "0";
        // Round to 2 decimal places for display only
        return (Math.round(value * 100) / 100).toString();
    };

    const topLevelChatMessages = chatMessages.filter((msg) => !msg.parent_id);

    const handleSaveToggle = () => {
        if (!marketId) return;
        
        dispatch(toggleSaveMarket(marketId));
        setIsSaved(!isSaved);
        
        // Update localStorage
        const savedIds = [...savedMarketIds];
        if (isSaved) {
            const index = savedIds.indexOf(marketId);
            if (index > -1) savedIds.splice(index, 1);
        } else {
            savedIds.push(marketId);
        }
        localStorage.setItem("poly_saved_markets", JSON.stringify(savedIds));
    };

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-8 font-sans">            <Suspense fallback={<div className="h-16 bg-muted animate-pulse" />}>
              <SearchFilterBar />
            </Suspense>

            <main className="mx-auto pt-32 md:pt-40 max-w-7xl px-4 md:px-6 page-enter-slide-up">
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
                                <ShareButton 
                                    marketTitle={market.question}
                                    marketId={market.id}
                                    imageUrl={market.image_url}
                                    size="md"
                                    variant="full"
                                />
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
                                                <span className="text-xs text-muted-foreground">{market.yes_probability}% • {getCurrentSharePrice(market, "Yes").toFixed(2)} KES</span>
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
                                                <span className="text-xs text-muted-foreground">{noProbability}% • {getCurrentSharePrice(market, "No").toFixed(2)} KES</span>
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
                                                    Yes ({option.yes_probability}%) KES {option.yes_probability}
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
                                                    No ({100 - option.yes_probability}%) KES {100 - option.yes_probability}
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
                                <div className={`text-sm font-bold mt-1 ${
                                    market.status === 'CLOSED' ? 'text-red-600' : 
                                    market.status === 'RESOLVED' ? 'text-blue-600' : 
                                    'text-green-600'
                                }`}>
                                    {market.status.charAt(0).toUpperCase() + market.status.slice(1).toLowerCase()}
                                </div>
                            </div>
                        </div>

                        {/* Add Liquidity Button */}
                        {market.source !== 'polymarket' && (
                            <button
                                onClick={() => setShowLiquidityModal(true)}
                                disabled={market.status === 'CLOSED' || market.status === 'RESOLVED'}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-bold rounded-lg border border-blue-600/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Droplet className="h-5 w-5" />
                                Add Liquidity
                            </button>
                        )}
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
                                            const yesPriceKes = option?.yes_probability ? option.yes_probability : 0;
                                            const noPriceKes = option?.yes_probability ? (100 - option.yes_probability) : 0;
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
                                                        Yes ({option?.yes_probability}%) KES {yesPriceKes.toFixed(2)}
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedOutcome("No")}
                                                        className={`w-full p-4 rounded-lg font-bold transition-all text-sm ${
                                                            selectedOutcome === "No"
                                                                ? "bg-red-500 text-white"
                                                                : "bg-background border border-border text-foreground hover:bg-red-500/20 hover:border-red-500"
                                                        }`}
                                                    >
                                                        No ({100 - (option?.yes_probability || 0)}%) KES {noPriceKes.toFixed(2)}
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
                                        Yes <span className="text-xs font-bold ml-1">({market.yes_probability}%) KES {market.yes_probability}</span>
                                    </button>
                                    <button
                                        onClick={() => setSelectedOutcome("No")}
                                        className={`w-full p-3 rounded-lg font-bold transition-all text-sm ${
                                            selectedOutcome === "No"
                                                ? "bg-red-500 text-white"
                                                : "bg-background border border-border text-foreground hover:bg-red-500/20 hover:border-red-500"
                                        }`}
                                    >
                                        No <span className="text-xs font-bold ml-1">({noProbability}%) KES {noProbability}</span>
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
                                    <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Shares (Fractional OK)</label>
                                    <div className="relative mb-3">
                                        <input
                                            type="number"
                                            placeholder="0"
                                            step="0.01"
                                            value={formatSharesForDisplay(shares)}
                                            onChange={(e) => setShares(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                                            className="w-full text-3xl font-bold text-right p-3 border border-border rounded-lg bg-muted/50 text-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
                                        />
                                    </div>
                                    
                                    {/* Quick Select Buttons for Shares */}
                                    <div className="grid grid-cols-4 gap-2">
                                        <button onClick={() => setShares(Math.max(0.01, shares - 100))} className="text-xs font-bold border border-border rounded-md p-2 bg-muted/50 hover:bg-muted hover:border-foreground/40 transition-colors cursor-pointer">−100</button>
                                        <button onClick={() => setShares(Math.max(0.01, shares - 10))} className="text-xs font-bold border border-border rounded-md p-2 bg-muted/50 hover:bg-muted hover:border-foreground/40 transition-colors cursor-pointer">−10</button>
                                        <button onClick={() => setShares(shares + 10)} className="text-xs font-bold border border-border rounded-md p-2 bg-muted/50 hover:bg-muted hover:border-foreground/40 transition-colors cursor-pointer">+10</button>
                                        <button onClick={() => setShares(shares + 100)} className="text-xs font-bold border border-border rounded-md p-2 bg-muted/50 hover:bg-muted hover:border-foreground/40 transition-colors cursor-pointer">+100</button>
                                    </div>

                                    {/* Auto-Load Share Message (for Sell tab) */}
                                    {activeTab === "sell" && shareLoadMessage && (
                                        <div className={`mt-2 p-2 rounded-md text-xs font-medium ${
                                            availableShares && availableShares > 0
                                                ? "bg-blue-950/40 text-blue-300 border border-blue-900/40"
                                                : "bg-yellow-950/40 text-yellow-300 border border-yellow-900/40"
                                        }`}>
                                            {loadingAvailableShares ? "Loading your shares..." : shareLoadMessage}
                                        </div>
                                    )}
                                </div>

                                {/* Total and To Win Display */}
                                <div className="bg-gradient-to-r from-green-950/40 to-blue-950/40 rounded-lg p-3 mb-3 border border-green-900/40">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-muted-foreground uppercase">{activeTab === "sell" ? "Proceeds" : "Total"}</span>
                                            <span className="text-2xl font-bold text-green-400">KES {Number.isFinite(limitStats.totalCost) ? limitStats.totalCost.toFixed(2) : "0.00"}</span>
                                        </div>
                                        {activeTab === "buy" && (
                                            <div className="flex justify-between items-center pt-2 border-t border-green-900/40">
                                                <span className="text-xs text-muted-foreground">Total Return</span>
                                                <span className="text-lg font-bold text-green-300">KES {Number.isFinite(limitStats.totalCost + limitStats.toWin) ? (limitStats.totalCost + limitStats.toWin).toFixed(2) : "0.00"} <span className="text-xs text-green-400">({Number.isFinite(limitStats.totalCost) ? limitStats.totalCost.toFixed(2) : "0.00"} + {Number.isFinite(limitStats.toWin) ? limitStats.toWin.toFixed(2) : "0.00"})</span></span>
                                            </div>
                                        )}
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

                                {/* Estimated Winnings */}
                                {betAmount && !isNaN(Number(betAmount)) && Number(betAmount) > 0 && (
                                    <>
                                        <div className="bg-gradient-to-r from-green-950/40 to-blue-950/40 rounded-lg p-4 mb-4 border border-green-900/40">
                                            <span className="text-xs font-bold text-muted-foreground uppercase block mb-2">
                                                {activeTab === "sell" ? "You'll receive" : "If correct: you get"}
                                            </span>
                                            <div className="text-3xl font-bold text-green-400">
                                                KES {Number.isFinite(estimatedReturn) ? estimatedReturn.toFixed(2) : "0.00"}
                                            </div>
                                            <span className="text-xs text-muted-foreground mt-1 block">
                                                @ {(() => {
                                                    if (market.market_type === 'OPTION_LIST' && selectedOptionId) {
                                                        const option = market.options?.find((o: any) => o.id === selectedOptionId);
                                                        const prob = selectedOutcome === "Yes" ? (option ? option.yes_probability : market.yes_probability) : (option ? (100 - option.yes_probability) : noProbability);
                                                        return `${prob}%`;
                                                    } else {
                                                        const prob = selectedOutcome === "Yes" ? market.yes_probability : noProbability;
                                                        return `${prob}%`;
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
                            {market.status === 'CLOSED' ? (
                                <button
                                    disabled
                                    className="w-full text-white font-bold py-3 rounded-lg transition-all opacity-50 bg-muted cursor-not-allowed"
                                >
                                    Trading Closed
                                </button>
                            ) : (
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
                            )}
                        </div>

                        {/* Market Status Message */}
                        {market.status === 'CLOSED' && (
                            <div className="mt-3 p-3 rounded-lg bg-yellow-950/40 text-yellow-500 text-sm font-medium text-center">
                                This market has closed for trading
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

                        {/* Recommended Markets */}
                        <div className="mt-8 pt-6 border-t border-border">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Recommended Markets</h3>
                            <div className="space-y-2">
                                {allMarkets.slice(0, 3).map((rec_market: any) => (
                                    <Link 
                                        key={rec_market.id}
                                        href={`/markets/${rec_market.id}-${generateMarketSlug(rec_market.question)}`}
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
                                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">{market.description}</div>
                            </div>
                        )}

                        <div className="bg-muted rounded-2xl p-4 border border-border">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Market Chat</h3>
                                    <p className="text-sm text-muted-foreground">Talk about this market with others.</p>
                                </div>
                                {chatLoading && <InlineSpinner />}
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
                                                className="bg-red-500 hover:opacity-90 text-white font-bold py-2.5 px-3 rounded-lg transition disabled:opacity-50 flex-shrink-0 flex items-center justify-center"
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

            {/* Add Liquidity Modal */}
            {marketId !== null && (
                <AddLiquidityModal
                    isOpen={showLiquidityModal}
                    onClose={() => setShowLiquidityModal(false)}
                    marketId={marketId}
                    marketQuestion={market?.question || ""}
                    onSuccess={() => {
                        dispatch(fetchMarkets());
                        fetchMarketDetails();
                    }}
                />
            )}

            {/* Position Receipt Modal - Minimalist */}
            {showReceipt && lastBet && (
                <div className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowReceipt(false)}></div>
                    <div className="relative bg-foreground text-background rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 scale-95 origin-center"  style={{animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' as any}}>
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
                                        <span className="text-background/75">{lastBet.action === "sell" ? "Proceeds" : "Total"}</span>
                                        <span className="font-bold">KES {lastBet.totalCost.toFixed(2)}</span>
                                    </div>
                                    {lastBet.action === "buy" && (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="text-background/75">Total Return</span>
                                                <span className="font-bold text-green-300">KES {(lastBet.totalCost + lastBet.toWin).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-background/60">
                                                <span>({lastBet.totalCost.toFixed(2)} + {lastBet.toWin.toFixed(2)})</span>
                                            </div>
                                        </>
                                    )}
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
