"use client";

import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
// import { useAppDispatch, useAppSelector, selectAllMarkets, selectMarketsLoading, selectSavedMarketIds } from "@/lib/redux/hooks";
// import { fetchMarkets, toggleSaveMarket } from "@/lib/redux/slices/marketsSlice";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import MarketChart, { ChartDataPoint } from "@/components/MarketChart";

import { extractMarketId, generateMarketSlug } from "@/lib/slugify";
import { USD_TO_KES, convertUSDVolumeToKES, formatKES, polymarketProbabilityToKES } from "@/lib/currency";
import SearchFilterBar from "@/components/SearchFilterBar";
import { formatVolume } from "@/lib/volume";
import LoadingSpinner from "@/components/LoadingSpinner";
import { InlineSpinner } from "@/components/InlineSpinner";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { resolvePolymarketTokenId, extractPolymarketTokenIds } from "@/lib/polymarketTokens";
import { TrendingUp, Clock, ShieldCheck, Wallet, ArrowLeft, Bookmark, Send } from "lucide-react";
import Link from "next/link";
import ShareButton from "@/components/ShareButton";

// Ensure this page is rendered dynamically (never prerendered)
export const dynamic = 'force-dynamic';


// Break this into components for more complex markets

function getDisplaySharePriceKes(market: any, probability: number, outcome: string): number {
    return polymarketProbabilityToKES(probability);
}

    function getPayoutPerShareKes(market: any): number {
        return market?.source === "polymarket" ? USD_TO_KES : 100;
    }

    /**
     * Calculate multiplier (payout / cost ratio)
     * Multiplier shows how much you get back relative to your bet
     */
    function calculateMultiplier(sharePriceKes: number, payoutPerShare: number): number {
        if (sharePriceKes <= 0) return 1;
        const multiplier = payoutPerShare / sharePriceKes;
        return Math.max(1, Math.round(multiplier * 100) / 100);
    }

    /**
     * Format multiplier for display (e.g., "x2.50")
     */
    function formatMultiplier(multiplier: number): string {
        return `x${multiplier.toFixed(2)}`;
    }

    /**
     * Get display multiplier for outcome
     */
    function getDisplayMultiplier(market: any, probability: number, outcome: string): string {
        const priceKes = getDisplaySharePriceKes(market, probability, outcome);
        const payoutPerShare = getPayoutPerShareKes(market);
        const multiplier = calculateMultiplier(priceKes, payoutPerShare);
        return formatMultiplier(multiplier);
    }

function getPolymarketTokenId(market: any, outcome: "Yes" | "No" = "Yes"): string | null {
    return resolvePolymarketTokenId(market, outcome);
}

function parseJsonArray(value: any): any[] {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

function normalizeBrokerageMarketData(rawMarket: any): any {
    if (!rawMarket) return rawMarket;

    const metadata = rawMarket.metadata || {};
    const normalized: any = { ...rawMarket };

    const outcomePrices = parseJsonArray(rawMarket.outcomePrices || metadata.outcomePrices)
        .map((price: any) => Number(price))
        .filter(Number.isFinite);
    const yesProbabilityFromPrices = outcomePrices.length > 0 ? outcomePrices[0] : undefined;

    const normalizeProb = (value: number | undefined | null): number | undefined => {
        if (!Number.isFinite(value)) return undefined;
        const prob = Number(value);
        if (prob >= 0 && prob <= 1) {
            return Math.round(prob * 10000) / 100;
        }
        return Math.round(prob * 100) / 100;
    };

    const yesProbability = normalizeProb(yesProbabilityFromPrices)
        ?? normalizeProb(rawMarket.yes_probability)
        ?? normalizeProb(metadata.yes_probability)
        ?? normalizeProb(rawMarket.lastTradePrice)
        ?? normalizeProb(metadata.lastTradePrice)
        ?? 50;

    normalized.yes_probability = yesProbability;
    normalized.no_probability = Math.round((100 - yesProbability) * 100) / 100;
    normalized.end_date = rawMarket.endDate || rawMarket.end_date || rawMarket.endDateIso || rawMarket.end_date_iso || rawMarket.end_date || metadata.endDate || metadata.end_date;
    normalized.image_url = rawMarket.image || rawMarket.icon || rawMarket.image_url || rawMarket.imageUrl || metadata.image || metadata.icon || "";
    normalized.volume = rawMarket.volume != null ? rawMarket.volume : rawMarket.volumeNum || metadata.volume || "";
    normalized.category = rawMarket.category || rawMarket.category_slug || metadata.category || "Other";
    normalized.status = rawMarket.closed ? "CLOSED" : rawMarket.resolved ? "RESOLVED" : rawMarket.active === false ? "CLOSED" : "OPEN";
    normalized.source = rawMarket.source || metadata.source || (rawMarket.clobTokenIds || metadata.clobTokenIds || rawMarket.conditionId || metadata.conditionId || rawMarket.outcomePrices || metadata.outcomePrices ? "polymarket" : rawMarket.source);
    normalized.external_id = String(rawMarket.external_id || rawMarket.id || rawMarket.market_id || rawMarket.conditionId || metadata.external_id || "");

    return normalized;
}

function getMarketProbability(market: any): number {
    return Number.isFinite(market?.yes_probability) ? market.yes_probability : 50;
}

function normalizePolymarketHistory(data: any, currentProbability: number): { yes: number[]; no: number[] } {
    const history = Array.isArray(data?.history) ? data.history : [];
    const yes = history
        .map((point: any) => {
            const rawPrice = point?.p ?? point?.price ?? point?.value;
            const price = typeof rawPrice === "string" ? parseFloat(rawPrice) : rawPrice;
            if (!Number.isFinite(price)) return null;
            const probability = price <= 1 ? price * 100 : price;
            return Math.max(0, Math.min(100, probability));
        })
        .filter((probability: number | null): probability is number => probability !== null);

    if (yes.length === 0) {
        const fallback = Number.isFinite(currentProbability) ? currentProbability : 50;
        return {
            yes: Array(8).fill(fallback),
            no: Array(8).fill(100 - fallback),
        };
    }

    return {
        yes,
        no: yes.map((probability: number) => 100 - probability),
    };
}

const CHART_LEFT = 150;
const CHART_RIGHT = 850;
const CHART_TOP = 40;
const CHART_BOTTOM = 240;

// Calculate Y scale range based on actual data (with padding)
function getYScaleRange(values: number[]): { min: number; max: number } {
    if (values.length === 0) return { min: 0, max: 100 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const padding = range === 0 ? 10 : range * 0.1; // 10% padding or minimum 10
    return {
        min: Math.max(0, min - padding),
        max: Math.min(100, max + padding),
    };
}

function chartY(probability: number, yMin: number = 0, yMax: number = 100): number {
    const clamped = Math.max(yMin, Math.min(yMax, Number.isFinite(probability) ? probability : 50));
    const normalized = (clamped - yMin) / (yMax - yMin); // 0 to 1
    return CHART_BOTTOM - (normalized * (CHART_BOTTOM - CHART_TOP));
}

function generatePolylinePoints(values: number[], yMin: number, yMax: number): string {
    if (values.length === 0) return "";
    const denominator = Math.max(values.length - 1, 1);
    
    return values
        .map((value, index) => {
            const x = CHART_LEFT + ((CHART_RIGHT - CHART_LEFT) * index) / denominator;
            const normalized = (value - yMin) / (yMax - yMin);
            const y = CHART_BOTTOM - (normalized * (CHART_BOTTOM - CHART_TOP));
            return `${x},${y}`;
        })
        .join(" ");
}

/**
 * Transform historical price data into Recharts-compatible format
 * Converts {yes: [], no: []} format to [{timestamp, yes, no}, ...]
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
    const intervalSeconds = totalPoints > 1 ? 300 : 0; // 5-minute intervals
    
    // Validate startTime - if it's too small, use current time
    const now = Date.now() / 1000;
    const validStartTime = startTime < 1000000000 ? now : startTime;

    for (let i = 0; i < totalPoints; i++) {
        points.push({
            // Generate timestamps going backwards from now (historical data)
            timestamp: validStartTime - ((totalPoints - 1 - i) * intervalSeconds),
            yes: yesValues[i],
            no: noValues[i],
        });
    }

    return points;
}

/**
 * Transform Polymarket API response into chart data
 * API returns {t: unix_timestamp, p: price_0_to_1}
 */
function transformPolymarketHistory(
    rawHistory: any[],
    currentProbability: number
): ChartDataPoint[] {
    if (!Array.isArray(rawHistory) || rawHistory.length === 0) {
        // Return current price as single point
        return [
            {
                timestamp: Date.now() / 1000,
                yes: currentProbability,
                no: 100 - currentProbability,
            },
        ];
    }

    const now = Date.now() / 1000;
    const intervalSeconds = 300; // 5-minute intervals
    
    return rawHistory.map((point: any, index: number) => {
        const rawPrice = point?.p ?? point?.price ?? point?.value ?? 0.5;
        const price = typeof rawPrice === "string" ? parseFloat(rawPrice) : rawPrice;
        const yesProb = price <= 1 ? price * 100 : price;
        const noProb = 100 - yesProb;
        
        // Validate timestamp - if < 1000000000, it's invalid (pre-2001)
        let timestamp = (point?.t ?? point?.timestamp ?? 0) / 1000;
        if (timestamp < 1000000000) {
            // Invalid timestamp - generate based on current date going backwards
            timestamp = now - ((rawHistory.length - 1 - index) * intervalSeconds);
        }

        return {
            timestamp,
            yes: Math.max(0, Math.min(100, yesProb)),
            no: Math.max(0, Math.min(100, noProb)),
        };
    });
}

export default function MarketDetail() {
    const { id: paramId } = useParams();
    const marketId = extractMarketId(paramId);
    // const dispatch = useAppDispatch();
    
    // Redux state is intentionally disabled so this page uses brokerage market data only.
    // const allMarkets = useAppSelector(selectAllMarkets);
    // const loading = useAppSelector(selectMarketsLoading);
    // const savedMarketIds = useAppSelector(selectSavedMarketIds);
    
    const [market, setMarket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [betAmount, setBetAmount] = useState("");
    const [selectedOutcome, setSelectedOutcome] = useState<"Yes" | "No">("Yes");
    const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
    const [placingBet, setPlacingBet] = useState(false);
    const [message, setMessage] = useState("");
    const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
    const [isSaved, setIsSaved] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastBet, setLastBet] = useState<any>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [replyingToId, setReplyingToId] = useState<number | null>(null);
    const [replyingToName, setReplyingToName] = useState("");
    const [newChatMessage, setNewChatMessage] = useState("");
    const [shareLoadMessage, setShareLoadMessage] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const [sendingChat, setSendingChat] = useState(false);
    const [chatError, setChatError] = useState("");
    const [timePeriod, setTimePeriod] = useState<"1H" | "6H" | "1D" | "1W" | "1M" | "ALL">("ALL");
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [priceHistory, setPriceHistory] = useState<Record<string, { yes: number[]; no: number[] }>>({});
    const [loadingChart, setLoadingChart] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [limitPrice, setLimitPrice] = useState<number>(50); // Default to 50% probability
    const [shares, setShares] = useState<number>(100); // Supports fractional shares (e.g., 19.6, 10.25)
    const [orderType, setOrderType] = useState<"market" | "limit">("market");
    const [availableShares, setAvailableShares] = useState<number | null>(null);
    const [loadingAvailableShares, setLoadingAvailableShares] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [relatedMarkets, setRelatedMarkets] = useState<any[]>([]);  // Markets with same question
    const [allMarkets, setAllMarkets] = useState<any[]>([]);
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

    const fetchBrokerageMarket = useCallback(async () => {
        if (!marketId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
            const response = await fetch(
                `${baseUrl}/api/brokerage/markets/${encodeURIComponent(String(marketId))}/?ts=${Date.now()}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to fetch brokerage market");
            }

            const rawMarket = await response.json();
            const normalizedMarket = normalizeBrokerageMarketData(rawMarket);
            setMarket(normalizedMarket);
            setRelatedMarkets([]);
            setAllMarkets([normalizedMarket]);

            const savedMarketIds = JSON.parse(localStorage.getItem("poly_saved_markets") || "[]");
            setIsSaved(Array.isArray(savedMarketIds) && savedMarketIds.includes(String(marketId)));
        } catch (err) {
            console.error("Error fetching brokerage market:", err);
            setMarket(null);
            setRelatedMarkets([]);
            setAllMarkets([]);
        } finally {
            setLoading(false);
        }
    }, [marketId]);

    useEffect(() => {
        fetchBrokerageMarket();
    }, [fetchBrokerageMarket]);

    // Auto-close receipt modal after 3 seconds
    useEffect(() => {
        if (showReceipt) {
            const timer = setTimeout(() => setShowReceipt(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showReceipt]);

    const fetchLatestMarketPrice = useCallback(async () => {
        if (!market?.external_id) {
            return;
        }

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
            const response = await fetch(
                `${baseUrl}/api/brokerage/markets/${encodeURIComponent(market.external_id)}/latest/?ts=${Date.now()}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch latest market price');
            }

            const latestData = await response.json();
            setMarket((prev: any) => normalizeBrokerageMarketData({
                ...prev,
                ...latestData,
            }));
        } catch (err) {
            console.warn('Error fetching latest market price:', err);
        }
    }, [market?.external_id]);

    useEffect(() => {
        if (!market?.external_id) {
            return;
        }

        fetchLatestMarketPrice();
        const interval = setInterval(fetchLatestMarketPrice, 5000);
        return () => clearInterval(interval);
    }, [market?.external_id, fetchLatestMarketPrice]);

    // Auto-load available shares when switching to sell tab
    useEffect(() => {
        if (activeTab === "sell" && market && selectedOutcome) {
            setLoadingAvailableShares(true);
            setAvailableShares(0);
            setShareLoadMessage("Available shares are disabled while using brokerage market data.");
            setLoadingAvailableShares(false);
        }
    }, [activeTab, market, selectedOutcome, selectedOptionId]);

    useEffect(() => {
        if (market?.id) {
            // fetchMarketDetails();
            fetchPriceHistory();
        }
    }, [market?.id]);


    const fetchPriceHistory = useCallback(async (showLoading: boolean = true) => {
        if (showLoading) {
            setLoadingChart(true);
        }

        try {
            // For Polymarket data, fetch CLOB price history by outcome token.
            if (market.source === 'polymarket') {
                try {
                    const polyId = market.external_id || market.id;
                    const tokenId = getPolymarketTokenId(market, "Yes");
                    
                    console.log("Fetching Polymarket price history for:", {
                        polyId,
                        tokenId,
                        external_id: market.external_id,
                        id: market.id,
                        source: market.source,
                    });
                    
                    const queryParams = new URLSearchParams({
                        period: timePeriod,
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

                        // If API returned no history points, synthesize a short history
                        // so the chart can render a proper line instead of an empty state.
                        if (!Array.isArray(data?.history) || data.history.length === 0) {
                            console.log("Polymarket returned empty history, synthesizing points");
                            const currentProb = getMarketProbability(market);
                            const synthesized = normalizePolymarketHistory({ history: [] }, currentProb);
                            const points = transformHistoryToChartData(synthesized.yes, synthesized.no);
                            console.log("Synthesized chart points:", points.length);
                            setChartData(points);
                            if (showLoading) setLoadingChart(false);
                            return;
                        }

                        const normalized = transformPolymarketHistory(data.history || [], getMarketProbability(market));

                        console.log("Polymarket chart data:", { points: normalized.length, first: normalized[0], last: normalized[normalized.length - 1] });
                        setChartData(normalized);
                        if (showLoading) {
                            setLoadingChart(false);
                        }
                        return;
                    }

                    console.log("No price history found, using current probability");
                    const currentProb = getMarketProbability(market);
                    setChartData([{
                        timestamp: Date.now() / 1000,
                        yes: currentProb,
                        no: 100 - currentProb,
                    }]);
                } catch (err) {
                    console.warn("Error fetching Polymarket price history, using current probability:", err);
                    // Fallback to current probability
                    const currentProb = getMarketProbability(market);
                    setChartData([{
                        timestamp: Date.now() / 1000,
                        yes: currentProb,
                        no: 100 - currentProb,
                    }]);
                }
                
                if (showLoading) {
                    setLoadingChart(false);
                }
                return;
            }

            // Local /api/markets price-history flow is disabled. This page now relies on brokerage market data only.
            const currentProb = getMarketProbability(market);
            setChartData([{
                timestamp: Date.now() / 1000,
                yes: currentProb,
                no: 100 - currentProb,
            }]);
        } catch (err) {
            console.error("Error fetching price history:", err);
            const currentProb = getMarketProbability(market);
            setChartData([{
                timestamp: Date.now() / 1000,
                yes: currentProb,
                no: 100 - currentProb,
            }]);
        } finally {
            if (showLoading) {
                setLoadingChart(false);
            }
        }
    }, [market, timePeriod, marketId]);

    useEffect(() => {
        if (market?.id) {
            fetchPriceHistory();
        }
    }, [timePeriod, market?.id]);

    // Auto-refresh price history for Polymarket markets every 5 seconds
    useEffect(() => {
        if (!market || market.source !== 'polymarket') {
            return; // Only auto-refresh for Polymarket markets
        }

        const refreshInterval = setInterval(async () => {
            try {
                await fetchPriceHistory(false);
                console.log('✓ Refreshed price history');
            } catch (err) {
                console.warn("Error refreshing price history:", err);
            }
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(refreshInterval);
    }, [market, timePeriod]);

    const fetchMarketDetails = async () => {
        if (!market?.id) {
            setChatMessages([]);
            return;
        }

        setChatLoading(true);
        setChatError("");

        try {
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/api/brokerage/${market.id}/chat/`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to fetch market comments");
            }

            const data = await response.json();
            const comments = Array.isArray(data?.comments) ? data.comments : [];
            setChatMessages(comments);
        } catch (err) {
            console.error("Error loading market comments:", err);
            setChatError("Unable to load comments right now.");
        } finally {
            setChatLoading(false);
        }
    };

    useEffect(() => {
        if (market?.id) {
            fetchMarketDetails();
        }
    }, [market?.id]);

    const handleSendChat = async () => {
        if (!newChatMessage.trim()) {
            setChatError("Please type a message before sending.");
            return;
        }

        if (!market?.id) {
            setChatError("This market is not ready for comments yet.");
            return;
        }

        const storedUser = localStorage.getItem("poly_user");
        if (!storedUser) {
            setChatError("Please log in to leave a comment.");
            return;
        }

        setSendingChat(true);
        setChatError("");

        try {
            const payload: Record<string, unknown> = {
                message: newChatMessage.trim(),
            };

            if (replyingToId) {
                payload.reply_to = replyingToId;
            }

            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/api/brokerage/${market.id}/chat/`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || data?.detail || "Failed to save comment");
            }

            const savedComment = data?.message;
            if (savedComment) {
                setChatMessages((prev: any[]) => [...prev, savedComment]);
            }

            setNewChatMessage("");
            setReplyingToId(null);
            setReplyingToName("");
        } catch (err) {
            console.error("Error saving market comment:", err);
            setChatError(err instanceof Error ? err.message : "Unable to save comment right now.");
        } finally {
            setSendingChat(false);
        }
    };

    const getRepliesForMessage = (messageId: number) => {
        return chatMessages.filter((msg: any) => msg.parent_id === messageId);
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
        const user = localStorage.getItem("poly_user");
        if (!user) {
            setMessage("Please log in to enter a position");
            return;
        }

        if (market.market_type === 'OPTION_LIST' && !selectedOptionId) {
            setMessage("Please select an option");
            return;
        }

        if (!betAmount || isNaN(Number(betAmount))) {
            setMessage("Please enter a valid amount");
            return;
        }

        setPlacingBet(true);
        setMessage("");

        try {
            const isPolymarket = market.source === 'polymarket' || Boolean(market.clobTokenIds || market.conditionId || market.outcomePrices);
            if (!isPolymarket) {
                setMessage("This market is not configured for Polymarket trading");
                setPlacingBet(false);
                return;
            }

            const side = activeTab === "sell" ? "SELL" : "BUY";
            let tokenId = resolvePolymarketTokenId(market, outcome);

            // Fallback: attempt to extract token IDs array and pick by outcome index
            if (!tokenId) {
                try {
                    const tokenValues = extractPolymarketTokenIds(market || {});
                    const idx = outcome === "Yes" ? 0 : 1;
                    if (tokenValues && tokenValues[idx]) {
                        tokenId = String(tokenValues[idx]);
                    }
                } catch (e) {
                    // ignore and fall through to error
                }
            }

            if (!tokenId) {
                console.error("Polymarket token resolution failed", {
                    market,
                    selectedOutcome: outcome,
                    extractedTokens: extractPolymarketTokenIds(market || {}),
                });
                setMessage("Invalid market configuration: no Polymarket token ID found for this outcome");
                setPlacingBet(false);
                return;
            }

            const kesAmount = Number(betAmount);
            const usdAmount = kesAmount / USD_TO_KES;
            const size = Math.round(usdAmount * 100000000) / 100000000;
            const selectedProbability = getSelectedOutcomeProbability();
            const price = Number((selectedProbability / 100).toFixed(8));

            const polyPayload = {
                market_id: market.external_id,
                token_id: tokenId,
                side,
                size,
                price,
                order_type: "market",
            };

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

                const probabilityValue = getSelectedOutcomeProbability();
                const priceKes = polymarketProbabilityToKES(probabilityValue);
                const actualShares = priceKes > 0 ? Number(betAmount) / priceKes : 0;
                const potentialWinnings = actualShares * getPayoutPerShareKes(market);

                setLastBet({
                    id: Math.random().toString(36).substr(2, 9),
                    market: market.question,
                    outcome,
                    amount: betAmount,
                    probability: probabilityValue,
                    potentialWinnings,
                    phoneNumber: userData.phone_number,
                    timestamp: new Date(),
                    isPolymarket,
                });

                setShowReceipt(true);
                setBetAmount("");
                setMessage("");

                if (data.market) {
                    setMarket((prev: any) => normalizeBrokerageMarketData({
                        ...prev,
                        ...data.market,
                    }));
                }

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

    const noProbability = 100 - getMarketProbability(market);

    // Trading fee constant
    const TRADING_FEE_PERCENT = 2.0; // 2.0% fee

    // Calculate trading fee
    const calculateTradingFee = (amount: number): { fee: number; totalCost: number } => {
        const fee = amount * (TRADING_FEE_PERCENT / 100);
        return {
            fee: Math.round(fee * 100) / 100,
            totalCost: Math.round((amount + fee) * 100) / 100,
        };
    };

    // Generate historical price data based on time period
    const generateHistoricalPrices = () => {
        const numPoints = 8;
        const yesProb = getMarketProbability(market);
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

    const getSelectedOutcomeProbability = () => {
        if (market.market_type === 'OPTION_LIST' && selectedOptionId) {
            const option = market.options?.find((o: any) => o.id === selectedOptionId);
            if (option) {
                return selectedOutcome === "Yes" ? option.yes_probability : (100 - option.yes_probability);
            }
        }

        return selectedOutcome === "Yes" ? getMarketProbability(market) : noProbability;
    };

    const calculateEstimatedReturn = () => {
        if (!betAmount || isNaN(Number(betAmount))) return 0;
        const amount = Number(betAmount);
        const priceKes = polymarketProbabilityToKES(getSelectedOutcomeProbability());
        if (priceKes <= 0) return 0;
        const estimatedShares = amount / priceKes;
        return estimatedShares * getPayoutPerShareKes(market);
    };

    const estimatedReturn = calculateEstimatedReturn();

    const calculateLimitOrderStats = () => {
        if (!market) {
            return {
                totalCost: 0,
                toWin: 0,
                potentialProfit: 0,
                winPayout: 0,
            };
        }
        
        const validShares = Number.isFinite(shares) && shares > 0 ? shares : 0;
        if (validShares === 0) {
            return {
                totalCost: 0,
                toWin: 0,
                potentialProfit: 0,
                winPayout: 0,
            };
        }

        const totalCost = validShares * polymarketProbabilityToKES(limitPrice);
        const maxPayout = validShares * getPayoutPerShareKes(market);
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

    const topLevelChatMessages = chatMessages.filter((msg: any) => !msg.parent_id);

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

    /**
     * Get recommended markets intelligently
     * Priority:
     * 1. Related markets from backend (same parent question)
     * 2. Markets in same category
     * 3. Trending markets (by volume)
     */
    const getRecommendedMarkets = () => {
        if (!market || allMarkets.length === 0) return [];

        if (relatedMarkets.length > 0) {
            return relatedMarkets.slice(0, 3);
        }

        const categoryMatches = allMarkets
            .filter((item: any) =>
                item.external_id !== market.external_id &&
                item.category?.toLowerCase?.() === market.category?.toLowerCase?.()
            )
            .sort((a: any, b: any) => (Number(b.volume) || 0) - (Number(a.volume) || 0));

        if (categoryMatches.length > 0) {
            return categoryMatches.slice(0, 3);
        }

        return allMarkets
            .filter((item: any) => item.external_id !== market.external_id)
            .sort((a: any, b: any) => (Number(b.volume) || 0) - (Number(a.volume) || 0))
            .slice(0, 3);
    };

    return (
        <div className="min-h-screen bg-background pb-32 sm:pb-20 md:pb-8 font-sans">            <Suspense fallback={<div className="h-16 bg-muted animate-pulse" />}>
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

                        {/* Related Markets Options - Same Question - Show as Full Cards */}
                        {relatedMarkets && relatedMarkets.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-foreground mb-3">More Options</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {relatedMarkets.map((relatedMarket: any) => (
                                        <Link
                                            key={relatedMarket.id}
                                            href={`/markets/${relatedMarket.id}-${generateMarketSlug(relatedMarket.question)}`}
                                            className="group block overflow-hidden rounded-2xl border border-border bg-muted shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 p-3 cursor-pointer"
                                        >
                                            <div className="space-y-2">
                                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                    {relatedMarket.description || `Option ${relatedMarket.id}`}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="rounded-lg border border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 p-2">
                                                        <div className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 mb-1">Yes</div>
                                                        <div className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                                                            {relatedMarket.yes_probability}%
                                                        </div>
                                                    </div>
                                                    <div className="rounded-lg border border-rose-300 dark:border-rose-600 bg-rose-50 dark:bg-rose-900/20 p-2">
                                                        <div className="text-[10px] font-medium text-rose-700 dark:text-rose-300 mb-1">No</div>
                                                        <div className="text-lg font-bold text-rose-900 dark:text-rose-100">
                                                            {relatedMarket.no_probability}%
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                                                    {formatVolume(relatedMarket.volume)} • {relatedMarket.end_date}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-muted rounded-2xl p-4">
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground">Market Odds</h3>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                            {getMarketProbability(market)}% Yes
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                            {noProbability}% No
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] items-start">
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        {(["1H", "6H", "1D", "1W", "1M", "ALL"] as const).map((period) => (
                                            <button
                                                key={period}
                                                onClick={() => setTimePeriod(period)}
                                                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                                                    timePeriod === period
                                                        ? "bg-foreground text-background"
                                                        : "bg-border text-muted-foreground hover:bg-border/80"
                                                }`}
                                            >
                                                {period}
                                            </button>
                                        ))}
                                    </div>

                                </div>

                                <MarketChart
                                    data={chartData}
                                    loading={loadingChart}
                                    isMobile={isMobile}
                                />

                                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className={isMobile ? "h-3 w-3" : "h-4 w-4"} />
                                            {formatVolume(market.volume)}
                                        </div>
                                    <div className="hidden sm:flex items-center gap-2">
                                        <Clock className={isMobile ? "h-3 w-3" : "h-4 w-4"} />
                                        {market.end_date ? formatDate(market.end_date) : "Closing soon"}
                                    </div>
                                </div>
                            </div>
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
                                                    Yes ({option.yes_probability}%) {getDisplayMultiplier(market, option.yes_probability, "Yes")}
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
                                                    No ({100 - option.yes_probability}%) {getDisplayMultiplier(market, 100 - option.yes_probability, "No")}
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
                                <div className="text-xl font-bold text-foreground mt-1">{formatVolume(market.volume)}</div>
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
                                    {typeof market.status === 'string' && market.status.length > 0
                                        ? market.status.charAt(0).toUpperCase() + market.status.slice(1).toLowerCase()
                                        : 'Unknown'}
                                </div>
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
                                            const yesProbability = option?.yes_probability || 0;
                                            const noProbability = 100 - yesProbability;
                                            const yesPriceKes = getDisplaySharePriceKes(market, yesProbability, "Yes");
                                            const noPriceKes = getDisplaySharePriceKes(market, noProbability, "No");
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
                                                        Yes ({yesProbability}%) {getDisplayMultiplier(market, yesProbability, "Yes")}
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedOutcome("No")}
                                                        className={`w-full p-4 rounded-lg font-bold transition-all text-sm ${
                                                            selectedOutcome === "No"
                                                                ? "bg-red-500 text-white"
                                                                : "bg-background border border-border text-foreground hover:bg-red-500/20 hover:border-red-500"
                                                        }`}
                                                    >
                                                        No ({noProbability}%) {getDisplayMultiplier(market, noProbability, "No")}
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
                                        Yes <span className="text-xs font-bold ml-1">({getMarketProbability(market)}%) {getDisplayMultiplier(market, getMarketProbability(market), "Yes")}</span>
                                    </button>
                                    <button
                                        onClick={() => setSelectedOutcome("No")}
                                        className={`w-full p-3 rounded-lg font-bold transition-all text-sm ${
                                            selectedOutcome === "No"
                                                ? "bg-red-500 text-white"
                                                : "bg-background border border-border text-foreground hover:bg-red-500/20 hover:border-red-500"
                                        }`}
                                    >
                                        No <span className="text-xs font-bold ml-1">({noProbability}%) {getDisplayMultiplier(market, noProbability, "No")}</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div className="mb-3">
                                <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">Amount</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={betAmount}
                                    onChange={(e) => setBetAmount(e.target.value)}
                                    className="w-full rounded-lg border border-border bg-background p-3 text-right text-3xl font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
                                />
                            </div>

                            <div className="mb-3 grid grid-cols-5 gap-2">
                                {[100, 500, 1000, 5000, 10000].map((amount) => (
                                    <button
                                        key={amount}
                                        onClick={() => setBetAmount(((parseFloat(betAmount) || 0) + amount).toString())}
                                        className="rounded-md border border-border bg-background p-2 text-xs font-bold transition-colors hover:bg-muted"
                                    >
                                        +{amount > 999 ? `${amount / 1000}K` : amount}
                                    </button>
                                ))}
                            </div>

                            {betAmount && !isNaN(Number(betAmount)) && Number(betAmount) > 0 && (
                                <>
                                    <div className="rounded-lg border border-green-900/40 bg-gradient-to-r from-green-950/40 to-blue-950/40 p-4">
                                        <div className="text-xs font-bold uppercase text-muted-foreground">If correct: you get</div>
                                        <div className="mt-2 text-3xl font-bold text-green-400">
                                            KES {Number.isFinite(estimatedReturn) ? estimatedReturn.toFixed(0) : "0.00"}
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            at {selectedOutcome === "Yes" ? getMarketProbability(market) : noProbability}% odds
                                        </div>
                                    </div>

                                    {(() => {
                                        const feeInfo = calculateTradingFee(Number(betAmount));
                                        return (
                                            <div className="rounded-lg border border-amber-900/40 bg-amber-950/30 p-3">
                                                <div className="mb-2 flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">Bet Amount</span>
                                                    <span className="text-sm font-semibold text-foreground">KES {(feeInfo.totalCost - feeInfo.fee).toFixed(0)}</span>
                                                </div>
                                                <div className="mb-2 flex items-center justify-between border-b border-amber-900/40 pb-2">
                                                    <span className="text-xs text-muted-foreground">Fee ({TRADING_FEE_PERCENT}%)</span>
                                                    <span className="text-sm font-semibold text-amber-300">+ KES {feeInfo.fee.toFixed(0)}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-foreground">Total</span>
                                                    <span className="text-lg font-bold text-foreground">KES {feeInfo.totalCost.toFixed(0)}</span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </>
                            )}
                        </div>

                        <div className="mt-4 space-y-3 hidden sm:block">
                            {market.status === 'CLOSED' ? (
                                <button
                                    disabled
                                    className="w-full cursor-not-allowed rounded-lg bg-muted py-3 font-bold text-white opacity-50"
                                >
                                    Trading Closed
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleBet(selectedOutcome)}
                                    disabled={placingBet}
                                    className={`w-full rounded-lg py-3 font-bold text-white transition-all disabled:opacity-50 ${
                                        selectedOutcome === "Yes"
                                            ? "bg-green-500 hover:opacity-90"
                                            : "bg-red-500 hover:opacity-90"
                                    }`}
                                >
                                    {placingBet ? "Placing..." : `Buy ${selectedOutcome}`}
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
                                {getRecommendedMarkets().map((rec_market: any) => (
                                    <Link 
                                        key={rec_market.id}
                                        href={`/markets/${rec_market.id}-${generateMarketSlug(rec_market.question)}`}
                                        className="block p-3 rounded-lg bg-muted/50 hover:bg-muted border border-border/50 transition-colors"
                                    >
                                        <p className="text-xs font-semibold text-foreground truncate">{rec_market.question}</p>
                                        <div className="mt-2 grid grid-cols-2 gap-3 text-[11px] text-muted-foreground">
                                            <div className="rounded-md bg-background/70 px-2 py-1">
                                                <span className="font-semibold text-foreground">Yes</span>{' '}
                                                <span>{rec_market.yes_probability}%</span>
                                            </div>
                                            <div className="rounded-md bg-background/70 px-2 py-1">
                                                <span className="font-semibold text-foreground">Volume</span>{' '}
                                                <span>{formatVolume(rec_market.volume)}</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                                {getRecommendedMarkets().length === 0 && (
                                    <div className="rounded-lg border border-dashed border-border/50 bg-muted/60 p-4 text-sm text-muted-foreground">
                                        No recommended markets available right now.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Market Chat */}
                    <div className="md:col-span-2 space-y-3 order-3 md:order-none">
                        {market.description && (
                            <div className="bg-muted rounded-2xl p-4 border border-border">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Description</h3>
                                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">{market.description}</div>
                            </div>
                        )}

                        <div className="bg-muted rounded-2xl p-4 border border-border">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Comments</h3>
                                    <p className="text-sm text-muted-foreground">Share your view on this market and reply to others.</p>
                                </div>
                                {chatLoading && <InlineSpinner />}
                            </div>

                            <div className="mb-4 rounded-xl border border-border bg-background/70 px-3 py-2 text-sm text-muted-foreground">
                                {chatMessages.length} comment{chatMessages.length === 1 ? "" : "s"}
                            </div>

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
                                    topLevelChatMessages.map((msg: any) => (
                                        <div
                                            key={msg.id}
                                            className={`rounded-2xl border p-4 space-y-3 transition-colors ${
                                                replyingToId === msg.id
                                                    ? 'border-apple-blue bg-apple-blue/10 bg-background/80'
                                                    : 'border-border bg-background/80'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                                <span className="font-semibold text-foreground">{msg.user_name || 'Trader'}</span>
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

                                            {getRepliesForMessage(msg.id).map((reply: any) => (
                                                <div
                                                    key={reply.id}
                                                    className={`ml-5 rounded-2xl border p-4 space-y-3 transition-colors ${
                                                        replyingToId === reply.id
                                                            ? 'border-apple-blue bg-apple-blue/10 bg-muted'
                                                            : 'border-border bg-muted'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                                        <span className="font-semibold text-foreground">{reply.user_name || 'Trader'}</span>
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
                                                    {getRepliesForMessage(reply.id).map((nestedReply: any) => (
                                                        <div
                                                            key={nestedReply.id}
                                                            className={`ml-5 rounded-2xl border p-4 space-y-3 transition-colors ${
                                                                replyingToId === nestedReply.id
                                                                    ? 'border-apple-blue bg-apple-blue/10 bg-background'
                                                                    : 'border-border bg-background'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                                                <span className="font-semibold text-foreground">{nestedReply.user_name || 'Trader'}</span>
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
                        </div>
                    </div>
                </div>
            </main>

            {/* Mobile floating yes/no buy control */}
            <div className="fixed inset-x-0 bottom-0 z-50 sm:hidden px-4 pb-4">
                <div className="rounded-3xl border border-border bg-muted/95 p-3 shadow-2xl shadow-black/10 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSelectedOutcome("Yes")}
                            className={`flex-1 rounded-2xl py-3 font-bold text-sm transition ${
                                selectedOutcome === "Yes"
                                    ? "bg-green-500 text-white"
                                    : "bg-background border border-border text-foreground hover:bg-green-500/20 hover:border-green-500"
                            }`}
                        >
                            Yes
                            <span className="ml-2 text-xs font-semibold text-muted-foreground">{getMarketProbability(market)}%</span>
                        </button>
                        <button
                            onClick={() => setSelectedOutcome("No")}
                            className={`flex-1 rounded-2xl py-3 font-bold text-sm transition ${
                                selectedOutcome === "No"
                                    ? "bg-red-500 text-white"
                                    : "bg-background border border-border text-foreground hover:bg-red-500/20 hover:border-red-500"
                            }`}
                        >
                            No
                            <span className="ml-2 text-xs font-semibold text-muted-foreground">{noProbability}%</span>
                        </button>
                    </div>
                    <button
                        onClick={() => handleBet(selectedOutcome)}
                        disabled={placingBet || market.status === 'CLOSED'}
                        className={`mt-3 w-full rounded-2xl py-3 font-bold text-white transition ${
                            market.status === 'CLOSED'
                                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                : selectedOutcome === 'Yes'
                                    ? 'bg-green-500 hover:opacity-90'
                                    : 'bg-red-500 hover:opacity-90'
                        }`}
                    >
                        {market.status === 'CLOSED'
                            ? 'Trading Closed'
                            : placingBet
                                ? 'Placing...'
                                : `Buy ${selectedOutcome}`}
                    </button>
                </div>
            </div>

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
