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

// Thunk to fetch all markets
export const fetchMarkets = createAsyncThunk(
    'markets/fetchMarkets',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/brokerage/markets/`);
            if (!response.ok) {
                return rejectWithValue('Failed to fetch markets');
            }
            const data = await response.json();
            return data;
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
