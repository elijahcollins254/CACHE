import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

export interface User {
    id: number;
    phone_number: string;
    full_name: string;
    username: string;
    balance: string;
    kyc_verified: boolean;
    phone_locked?: boolean;
    email?: string;
    picture?: string;
    provider?: string;
    date_joined?: string;
}

interface AuthState {
    user: User | null;
    balance: string;
    portfolioBalance: string;
    loading: boolean;
    error: string | null;
    lastUpdate: number;
}

const initialState: AuthState = {
    user: null,
    balance: '0.00',
    portfolioBalance: '0.00',
    loading: false,
    error: null,
    lastUpdate: 0,
};

// Thunk to fetch user and balance data
export const fetchUserData = createAsyncThunk(
    'auth/fetchUserData',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/dashboard/`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                return rejectWithValue('Failed to fetch user data');
            }

            const data = await response.json();
            return {
                user: data.user,
                portfolioValue: data.portfolio?.total_value || '0.00',
            };
        } catch (error) {
            return rejectWithValue('Connection error');
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setUser: (state, action) => {
            state.user = action.payload;
        },
        logout: (state) => {
            state.user = null;
            state.balance = '0.00';
            state.portfolioBalance = '0.00';
        },
        updateBalance: (state, action) => {
            state.balance = action.payload;
        },
        updatePortfolioBalance: (state, action) => {
            state.portfolioBalance = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUserData.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUserData.fulfilled, (state, action) => {
                state.user = action.payload.user;
                state.balance = parseFloat(action.payload.user.balance).toFixed(2);
                const portfolioVal = parseFloat(action.payload.portfolioValue);
                state.portfolioBalance = isNaN(portfolioVal) ? '0.00' : portfolioVal.toFixed(2);
                state.loading = false;
                state.lastUpdate = Date.now();
            })
            .addCase(fetchUserData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { setUser, logout, updateBalance, updatePortfolioBalance } = authSlice.actions;
export default authSlice.reducer;
