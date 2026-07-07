import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { convertUSDVolumeToKES } from '@/lib/currency';

export interface Market {
    id: number;
    question: string;
    category: string;
    subcategory?: string | null;
    // Canonical slugs supplied by the API
    category_slug?: string | null;
    subcategory_slug?: string | null;
    // Optional league/league slug for sports
    league?: string | null;
    yes_probability: number;
    volume: string;
    status: string;
    end_date: string;
    resolved_outcome?: string;
    image_url?: string;
    is_live?: boolean;
    saved?: boolean;
    closing_soon?: boolean; // Flag for markets marked as closing soon
    // LMSR state
    q_yes?: number;
    q_no?: number;
    b?: number;
    source?: 'polymarket' | 'local';
    external_id?: string;
    description?: string;
    clobTokenIds?: string | string[]; // Token IDs for Polymarket orders
    // Parent event grouping (for multi-outcome markets like "What will happen before GTA VI?")
    parentEventId?: string;
    parentEventTitle?: string;
    groupItemTitle?: string;
    groupItemThreshold?: string;
    // Child markets for grouped parent markets
    children?: Market[];
}

interface MarketsState {
    allMarkets: Market[];
    filteredMarkets: Market[];
    loading: boolean;
    error: string | null;
    lastUpdate: number;
    savedMarketIds: number[];
}

const initialState: MarketsState = {
    allMarkets: [],
    filteredMarkets: [],
    loading: false,
    error: null,
    lastUpdate: 0,
    savedMarketIds: [],
};

// Helper function to transform Polymarket data to Market interface
const transformPolymarketData = (polymarket: any): Market => {
    const metadata = polymarket.metadata || polymarket;
    
    // Extract yes probability from outcomePrices or use bestBid
    // Polymarket returns probabilities as decimals (0-1), convert to percentage (0-100)
    let yesProbabilityDecimal = 0.5;
    if (metadata.outcomePrices) {
        try {
            const prices = typeof metadata.outcomePrices === 'string' 
                ? JSON.parse(metadata.outcomePrices) 
                : metadata.outcomePrices;
            yesProbabilityDecimal = parseFloat(prices[0]) || 0.5;
        } catch (e) {
            yesProbabilityDecimal = metadata.bestBid || 0.5;
        }
    } else if (metadata.bestBid) {
        yesProbabilityDecimal = metadata.bestBid;
    }
    
    // Convert to percentage (0-100)
    const yesProbability = parseFloat((yesProbabilityDecimal * 100).toFixed(2));

    // Determine status
    let status = 'OPEN';
    if (metadata.closed) {
        status = 'CLOSED';
    } else if (metadata.resolved) {
        status = 'RESOLVED';
    }

    // Check if market is closing soon (within 7 days)
    const endDate = new Date(metadata.endDate || polymarket.end_date);
    const now = new Date();
    const daysUntilClose = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    const closingSoon = daysUntilClose > 0 && daysUntilClose <= 7;

    // Convert volume from USD to KES
    const volumeUSD = metadata.volume || metadata.volumeNum || polymarket.volume || 0;
    const volumeKES = convertUSDVolumeToKES(volumeUSD);

    // Get external_id - try multiple field names since Polymarket API might return it differently
    const externalId = polymarket.external_id || polymarket.id || polymarket.market_id || '';
    
    // Ensure external_id looks like a valid Polymarket hex ID or market ID
    if (!externalId) {
        console.warn('Polymarket market missing external_id:', polymarket);
    }

    // Get category - prioritize database category if available, fallback to electionType or General
    const category = polymarket.category || metadata.electionType || 'Other';
    const subcategory = polymarket.subcategory || metadata.subcategory || null;
    const category_slug = polymarket.category_slug || (category ? category.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '');
    const subcategory_slug = polymarket.subcategory_slug || (subcategory ? subcategory.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '');

    // Extract parent event information if available
    // Polymarket markets can have a parent event (e.g., "What will happen before GTA VI?")
    let parentEventId: string | undefined;
    let parentEventTitle: string | undefined;
    if (metadata.events && Array.isArray(metadata.events) && metadata.events.length > 0) {
        const parentEvent = metadata.events[0];
        parentEventId = String(parentEvent.id || parentEvent.ticker);
        parentEventTitle = parentEvent.title;
    }

    return {
        id: parseInt(polymarket.id) || Math.random(), // Use as numeric ID for Redux key
        external_id: String(externalId), // Keep as string for API calls
        question: metadata.question || polymarket.question || polymarket.title || '',
        description: metadata.description || polymarket.description,
        category: category,
        subcategory,
        category_slug,
        subcategory_slug,
        yes_probability: yesProbability,
        volume: volumeKES,
        status,
        end_date: metadata.endDate || polymarket.end_date,
        is_live: (metadata.active !== false && !metadata.closed) || polymarket.is_approved,
        image_url: metadata.image || metadata.icon || polymarket.image_url,
        closing_soon: closingSoon,
        source: 'polymarket',
        clobTokenIds: metadata.clobTokenIds || polymarket.clobTokenIds,
        parentEventId,
        parentEventTitle,
        groupItemTitle: metadata.groupItemTitle,
        groupItemThreshold: metadata.groupItemThreshold,
        children: Array.isArray(polymarket.children)
            ? polymarket.children.map(transformPolymarketData)
            : undefined,
    };
};

// Thunk to fetch all markets from Polymarket-backed brokerage only
export const fetchMarkets = createAsyncThunk(
    'markets/fetchMarkets',
    async (_, { rejectWithValue }) => {
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
            const brokerageRes = await fetch(`${baseUrl}/api/brokerage/markets/`).catch(() => null);

            if (!brokerageRes?.ok) {
                return rejectWithValue('Failed to fetch Polymarket markets');
            }

            const brokerageData = await brokerageRes.json();
            const brokerageMarkets = Array.isArray(brokerageData) ? brokerageData : brokerageData.results || [];
            const allMarkets = brokerageMarkets.map(transformPolymarketData);

            if (allMarkets.length === 0) {
                return rejectWithValue('No Polymarket markets available');
            }

            return allMarkets;
        } catch (error) {
            return rejectWithValue('Connection error');
        }
    }
);

const marketsSlice = createSlice({
    name: 'markets',
    initialState,
    reducers: {
        setFilteredMarkets: (state, action) => {
            state.filteredMarkets = action.payload;
        },
        clearMarkets: (state) => {
            state.allMarkets = [];
            state.filteredMarkets = [];
        },
        toggleSaveMarket: (state, action) => {
            const marketId = action.payload;
            const index = state.savedMarketIds.indexOf(marketId);
            if (index > -1) {
                state.savedMarketIds.splice(index, 1);
            } else {
                state.savedMarketIds.push(marketId);
            }
            // Update saved status in allMarkets
            state.allMarkets = state.allMarkets.map(m => 
                m.id === marketId 
                    ? { ...m, saved: state.savedMarketIds.includes(m.id) }
                    : m
            );
        },
        loadSavedMarketsFromStorage: (state, action) => {
            state.savedMarketIds = action.payload;
            // Update saved status in allMarkets
            state.allMarkets = state.allMarkets.map(m => ({
                ...m,
                saved: state.savedMarketIds.includes(m.id)
            }));
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMarkets.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMarkets.fulfilled, (state, action) => {
                state.allMarkets = action.payload.map((m: Market) => ({
                    ...m,
                    saved: state.savedMarketIds.includes(m.id)
                }));
                state.filteredMarkets = state.allMarkets;
                state.loading = false;
                state.lastUpdate = Date.now();
            })
            .addCase(fetchMarkets.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { setFilteredMarkets, clearMarkets, toggleSaveMarket, loadSavedMarketsFromStorage } = marketsSlice.actions;
export default marketsSlice.reducer;
