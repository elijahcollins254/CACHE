import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export interface Market {
    id: number;
    question: string;
    category: string;
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

// USD to KES conversion rate
const USD_TO_KES = 130;

// Helper function to convert USD volume to KES format string
const convertVolumeToKES = (usdVolume: string | number): string => {
    try {
        const numValue = typeof usdVolume === 'string' ? parseFloat(usdVolume) : usdVolume;
        if (!isFinite(numValue) || numValue <= 0) return 'KES 0';
        
        const kesValue = numValue * USD_TO_KES;
        
        if (kesValue >= 1000000000) {
            return `KES ${(kesValue / 1000000000).toFixed(1)}B`;
        } else if (kesValue >= 1000000) {
            return `KES ${(kesValue / 1000000).toFixed(1)}M`;
        } else if (kesValue >= 1000) {
            return `KES ${(kesValue / 1000).toFixed(1)}K`;
        } else {
            return `KES ${kesValue.toFixed(0)}`;
        }
    } catch (error) {
        return 'KES 0';
    }
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
    let status = 'active';
    if (metadata.closed) {
        status = 'closed';
    } else if (metadata.resolved) {
        status = 'resolved';
    }

    // Check if market is closing soon (within 7 days)
    const endDate = new Date(metadata.endDate || polymarket.end_date);
    const now = new Date();
    const daysUntilClose = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    const closingSoon = daysUntilClose > 0 && daysUntilClose <= 7;

    // Convert volume from USD to KES
    const volumeUSD = metadata.volume || metadata.volumeNum || polymarket.volume || 0;
    const volumeKES = convertVolumeToKES(volumeUSD);

    // Get external_id - try multiple field names since Polymarket API might return it differently
    const externalId = polymarket.external_id || polymarket.id || polymarket.market_id || '';
    
    // Ensure external_id looks like a valid Polymarket hex ID or market ID
    if (!externalId) {
        console.warn('Polymarket market missing external_id:', polymarket);
    }

    // Get category - prioritize database category if available, fallback to electionType or General
    const category = polymarket.category || metadata.electionType || 'Other';

    return {
        id: parseInt(polymarket.id) || Math.random(), // Use as numeric ID for Redux key
        external_id: String(externalId), // Keep as string for API calls
        question: metadata.question || polymarket.question || polymarket.title || '',
        description: metadata.description || polymarket.description,
        category: category,
        yes_probability: yesProbability,
        volume: volumeKES,
        status,
        end_date: metadata.endDate || polymarket.end_date,
        is_live: (metadata.active !== false && !metadata.closed) || polymarket.is_approved,
        image_url: metadata.image || metadata.icon || polymarket.image_url,
        closing_soon: closingSoon,
        source: 'polymarket',
        clobTokenIds: metadata.clobTokenIds || polymarket.clobTokenIds,
    };
};

// Helper function to transform local market data if needed
const transformLocalMarketData = (market: any): Market => {
    return {
        ...market,
        source: 'local',
    };
};

// Thunk to fetch all markets from both sources
export const fetchMarkets = createAsyncThunk(
    'markets/fetchMarkets',
    async (_, { rejectWithValue }) => {
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
            
            // Fetch from both APIs in parallel
            const [brokerageRes, localRes] = await Promise.all([
                fetch(`${baseUrl}/api/brokerage/markets/`).catch(() => null),
                fetch(`${baseUrl}/api/markets/`).catch(() => null),
            ]);

            let allMarkets: Market[] = [];

            // Process brokerage markets (Polymarket)
            if (brokerageRes?.ok) {
                try {
                    const brokerageData = await brokerageRes.json();
                    const brokerageMarkets = Array.isArray(brokerageData) ? brokerageData : brokerageData.results || [];
                    allMarkets.push(...brokerageMarkets.map(transformPolymarketData));
                } catch (error) {
                    console.error('Error processing brokerage markets:', error);
                }
            }

            // Process local markets
            if (localRes?.ok) {
                try {
                    const localData = await localRes.json();
                    const localMarkets = Array.isArray(localData) ? localData : localData.results || [];
                    allMarkets.push(...localMarkets.map(transformLocalMarketData));
                } catch (error) {
                    console.error('Error processing local markets:', error);
                }
            }

            if (allMarkets.length === 0) {
                return rejectWithValue('Failed to fetch markets from both sources');
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
