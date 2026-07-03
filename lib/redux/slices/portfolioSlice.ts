import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

export interface Bet {
    id: number;
    market_id: number;
    market_question: string;
    outcome: string;
    amount: string;
    entry_probability: number;
    result: string;
    payout?: string;
    timestamp: string;
    quantity: string;
    order_type?: string;
    limit_price?: string;
    order_status?: string;
}

export interface Statistics {
    total_wagered: number;
    total_returns: number;
    win_rate: number;
}

interface PortfolioState {
    bets: Bet[];
    statistics: Statistics | null;
    transactions: any[];
    portfolio_value: string;
    loading: boolean;
    error: string | null;
    lastUpdate: number;
}

const initialState: PortfolioState = {
    bets: [],
    statistics: null,
    transactions: [],
    portfolio_value: '0.00',
    loading: false,
    error: null,
    lastUpdate: 0,
};

// Thunk to fetch dashboard data (bets, statistics, portfolio)
export const fetchDashboardData = createAsyncThunk(
    'portfolio/fetchDashboardData',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/dashboard/`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                return rejectWithValue('Failed to fetch dashboard data');
            }

            const data = await response.json();
            return {
                bets: data.bets || [],
                statistics: data.statistics,
                transactions: data.transactions || [],
                portfolio_value: data.portfolio?.total_value || '0.00',
            };
        } catch (error) {
            return rejectWithValue('Connection error');
        }
    }
);

// Thunk to fetch transaction history
export const fetchTransactionHistory = createAsyncThunk(
    'portfolio/fetchTransactionHistory',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/history/`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                return rejectWithValue('Failed to fetch transaction history');
            }

            const data = await response.json();
            return data.transactions || [];
        } catch (error) {
            return rejectWithValue('Connection error');
        }
    }
);

const portfolioSlice = createSlice({
    name: 'portfolio',
    initialState,
    reducers: {
        clearPortfolio: (state) => {
            state.bets = [];
            state.statistics = null;
            state.transactions = [];
            state.portfolio_value = '0.00';
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDashboardData.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDashboardData.fulfilled, (state, action) => {
                state.bets = action.payload.bets;
                state.statistics = action.payload.statistics;
                state.transactions = action.payload.transactions;
                const portfolioVal = parseFloat(action.payload.portfolio_value);
                state.portfolio_value = isNaN(portfolioVal) ? '0.00' : portfolioVal.toFixed(2);
                state.loading = false;
                state.lastUpdate = Date.now();
            })
            .addCase(fetchDashboardData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchTransactionHistory.fulfilled, (state, action) => {
                state.transactions = action.payload;
            });
    },
});

export const { clearPortfolio } = portfolioSlice.actions;
export default portfolioSlice.reducer;
