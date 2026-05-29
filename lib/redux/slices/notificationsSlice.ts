import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

export interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    color_class: string;
    is_read: boolean;
    time: string;
    related_market_id?: number;
    related_transaction_id?: number;
    related_bet_id?: number;
}

interface NotificationsState {
    items: Notification[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
    lastUpdate: number;
}

const initialState: NotificationsState = {
    items: [],
    unreadCount: 0,
    loading: false,
    error: null,
    lastUpdate: 0,
};

// Thunk to fetch notifications
export const fetchNotifications = createAsyncThunk(
    'notifications/fetchNotifications',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/notifications/`,
                { method: 'GET' }
            );

            if (!response.ok) {
                return rejectWithValue('Failed to fetch notifications');
            }

            const data = await response.json();
            return {
                notifications: data.notifications,
                unreadCount: data.unread_count,
            };
        } catch (error) {
            return rejectWithValue('Connection error');
        }
    }
);

// Thunk to mark notification as read
export const markNotificationRead = createAsyncThunk(
    'notifications/markRead',
    async (notificationId: number, { rejectWithValue }) => {
        try {
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/notifications/${notificationId}/read/`,
                { method: 'POST' }
            );

            if (!response.ok) {
                return rejectWithValue('Failed to mark notification as read');
            }

            return { notificationId };
        } catch (error) {
            return rejectWithValue('Connection error');
        }
    }
);

// Thunk to mark all notifications as read
export const markAllNotificationsRead = createAsyncThunk(
    'notifications/markAllRead',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/notifications/mark-all-read/`,
                { method: 'POST' }
            );

            if (!response.ok) {
                return rejectWithValue('Failed to mark all as read');
            }

            return true;
        } catch (error) {
            return rejectWithValue('Connection error');
        }
    }
);

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        clearNotifications: (state) => {
            state.items = [];
            state.unreadCount = 0;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch notifications
            .addCase(fetchNotifications.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.items = action.payload.notifications;
                state.unreadCount = action.payload.unreadCount;
                state.loading = false;
                state.lastUpdate = Date.now();
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Mark notification as read
            .addCase(markNotificationRead.fulfilled, (state, action) => {
                const notif = state.items.find(n => n.id === action.payload.notificationId);
                if (notif && !notif.is_read) {
                    notif.is_read = true;
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
            })
            // Mark all as read
            .addCase(markAllNotificationsRead.fulfilled, (state) => {
                state.items.forEach(notif => {
                    notif.is_read = true;
                });
                state.unreadCount = 0;
            });
    },
});

export const { clearNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;
