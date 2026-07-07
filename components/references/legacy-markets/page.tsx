"use client";

import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
// import { useAppDispatch, useAppSelector, selectAllMarkets, selectMarketsLoading, selectSavedMarketIds } from "@/lib/redux/hooks";
// import { fetchMarkets, toggleSaveMarket } from "@/lib/redux/slices/marketsSlice";
import { useMarketWebSocket } from "@/lib/useMarketWebSocket";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import MarketChart, { ChartDataPoint } from "@/components/MarketChart";

import { extractMarketId, generateMarketSlug } from "@/lib/slugify";
import { USD_TO_KES, convertUSDVolumeToKES, formatKES, polymarketProbabilityToKES } from "@/lib/currency";
import { formatVolume } from "@/lib/volume";
import SearchFilterBar from "@/components/SearchFilterBar";
import LoadingSpinner from "@/components/LoadingSpinner";
import { InlineSpinner } from "@/components/InlineSpinner";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { TrendingUp, Clock, ShieldCheck, Wallet, ArrowLeft, Bookmark, Send, Droplet } from "lucide-react";
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

function getDisplaySharePriceKes(market: any, probability: number, outcome: string): number {
    if (market?.source === "polymarket") {
        return polymarketProbabilityToKES(probability);
    }

    return getCurrentSharePrice(market, outcome);
}

    function getPayoutPerShareKes(market: any): number {
        return market?.source === "polymarket" ? USD_TO_KES : PAYOUT_PER_SHARE;
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
    const [wsConnected, setWsConnected] = useState(false);
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

    // Auto-close receipt modal after 3 seconds
    useEffect(() => {
        if (showReceipt) {
            const timer = setTimeout(() => setShowReceipt(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showReceipt]);

    // WebSocket hook for real-time price updates
    const onPriceUpdate = useCallback((update: any) => {
        console.log('[WebSocket] Price update received:', update);
        
        // Add new price point to chart
        setChartData(prev => {
            const newData = [...prev];
            // Find if we have data for this timestamp or add new
            const lastPoint = newData[newData.length - 1];
            const now = Date.now() / 1000;
            
            if (lastPoint && Math.abs(lastPoint.timestamp - now) < 60) {
                // Update last point if within 1 minute
                newData[newData.length - 1] = {
                    timestamp: now,
                    yes: update.price ? update.price * 100 : lastPoint.yes,
                    no: update.price ? (1 - update.price) * 100 : lastPoint.no,
                };
            } else {
                // Add new point
                newData.push({
                    timestamp: now,
                    yes: update.price ? update.price * 100 : 50,
                    no: update.price ? (1 - update.price) * 100 : 50,
                });
            }
            
            // Keep only last 100 points to avoid memory issues
            return newData.slice(-100);
        });
    }, []);

    useMarketWebSocket(
        marketId ? String(marketId) : null,
        onPriceUpdate,
        true // enabled
    );



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

    // Auto-refresh Polymarket prices every 5 seconds
    useEffect(() => {
        if (!market || market.source !== 'polymarket') {
            return; // Only poll for Polymarket markets
        }

        const pollInterval = setInterval(async () => {
            try {
                // Re-fetch markets to get updated prices with cache busting
                const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
                const timestamp = Date.now(); // Cache buster
                
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
                    
                    // Find current market in fresh data
                    const freshMarket = brokerageMarkets.find((m: any) => {
                        const freshId = parseInt(m.id);
                        return freshId === market.id || m.external_id === market.external_id;
                    });
                    
                    if (freshMarket) {
                        // Update market with fresh data
                        setMarket((prev: any) => ({
                            ...prev,
                            yes_probability: freshMarket.bestBid ? Math.round(freshMarket.bestBid * 100) : freshMarket.yes_probability,
                            volume: convertUSDVolumeToKES(freshMarket.volume || freshMarket.volumeNum || 0),
                        }));
                        
                        console.log(`✓ Updated market price: ${freshMarket.bestBid ? Math.round(freshMarket.bestBid * 100) : freshMarket.yes_probability}%`);
                    }
                }
            } catch (err) {
                console.warn("Error polling market updates:", err);
            }
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(pollInterval);
    }, [market]);

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
                        const normalized = transformPolymarketHistory(data?.history || [], market.yes_probability || 50);

                        console.log("Polymarket chart data:", { points: normalized.length, first: normalized[0], last: normalized[normalized.length - 1] });
                        setChartData(normalized);
                        if (showLoading) {
                            setLoadingChart(false);
                        }
                        return;
                    }
                    
                    console.log("No price history found, using current probability");
                    const currentProb = market.yes_probability || 50;
                    setChartData([{
                        timestamp: Date.now() / 1000,
                        yes: currentProb,
                        no: 100 - currentProb,
                    }]);
                } catch (err) {
                    console.warn("Error fetching Polymarket price history, using current probability:", err);
                    // Fallback to current probability
                    const currentProb = market.yes_probability || 50;
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
            const currentProb = market?.yes_probability || 50;
            setChartData([{
                timestamp: Date.now() / 1000,
                yes: currentProb,
                no: 100 - currentProb,
            }]);
        } catch (err) {
            console.error("Error fetching price history:", err);
            const currentProb = market?.yes_probability || 50;
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
        setChatLoading(true);
        setChatError("");
        setChatMessages([]);
        setMarketPositions([]);
        setTopHolders({ yes: [], no: [] });
        setMarketActivity([]);
        setRelatedMarkets([]);
        setChatLoading(false);
    };

    const handleSendChat = async () => {
        if (!newChatMessage.trim()) {
            setChatError("Please type a message before sending.");
            return;
        }

        setSendingChat(true);
        setChatError("");
        setChatError("Chat is disabled while this page is using brokerage market data only.");
        setSendingChat(false);
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
            // POLYMARKET ORDER PLACEMENT (Polymarket-only trading)
            
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
                    throw new Error("clobTokenIds not found or in unexpected format");
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
                    isPolymarket: true,
                });

                setShowReceipt(true);
                setBetAmount("");
                setMessage("");

                if (data.market) {
                    setMarket((prev: any) => ({
                        ...prev,
                        q_yes: data.market.q_yes,
                        q_no: data.market.q_no,
                        yes_probability: data.market.yes_probability,
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

    const noProbability = 100 - market.yes_probability;

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

    const getSelectedOutcomeProbability = () => {
        if (market.market_type === 'OPTION_LIST' && selectedOptionId) {
            const option = market.options?.find((o: any) => o.id === selectedOptionId);
            if (option) {
                return selectedOutcome === "Yes" ? option.yes_probability : (100 - option.yes_probability);
            }
        }

        return selectedOutcome === "Yes" ? market.yes_probability : noProbability;
    };

    // Calculate estimated payout return using LMSR
    const calculateEstimatedReturn = () => {
        if (!betAmount || isNaN(Number(betAmount))) return 0;
        const amount = Number(betAmount);

        if (market?.source === "polymarket") {
            const priceKes = polymarketProbabilityToKES(getSelectedOutcomeProbability());
            if (priceKes <= 0) return 0;
            const estimatedShares = amount / priceKes;
            return estimatedShares * getPayoutPerShareKes(market);
        }
        
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
        
        if (market.source === "polymarket") {
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
        return [];
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
                                            {market.yes_probability}% Yes
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
                                        {market.volume}
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
                                        Yes <span className="text-xs font-bold ml-1">({market.yes_probability}%) {getDisplayMultiplier(market, market.yes_probability, "Yes")}</span>
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
                            <div className="rounded-lg border border-border bg-background/70 p-3">
                                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Odds</div>
                                <div className="mt-2 text-sm font-semibold text-foreground">
                                    Yes {market.yes_probability}% · No {noProbability}%
                                </div>
                            </div>

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
                                            at {selectedOutcome === "Yes" ? market.yes_probability : noProbability}% odds
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

                        <div className="mt-4 space-y-3">
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
                        fetchBrokerageMarket();
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
