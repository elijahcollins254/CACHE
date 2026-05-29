import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = useSelector;

// Auth selectors
export const selectUser = (state: RootState) => state.auth.user;
export const selectBalance = (state: RootState) => state.auth.balance;
export const selectPortfolioBalance = (state: RootState) => state.auth.portfolioBalance;
export const selectAuthLoading = (state: RootState) => state.auth.loading;
export const selectAuthError = (state: RootState) => state.auth.error;
export const selectAuthLastUpdate = (state: RootState) => state.auth.lastUpdate;

// Markets selectors
export const selectAllMarkets = (state: RootState) => state.markets.allMarkets;
export const selectFilteredMarkets = (state: RootState) => state.markets.filteredMarkets;
export const selectMarketsLoading = (state: RootState) => state.markets.loading;
export const selectMarketsError = (state: RootState) => state.markets.error;
export const selectMarketsLastUpdate = (state: RootState) => state.markets.lastUpdate;
export const selectSavedMarketIds = (state: RootState) => state.markets.savedMarketIds;

// Memoized selector for saved markets to prevent unnecessary re-renders
export const selectSavedMarkets = createSelector(
    [selectAllMarkets],
    (allMarkets) => allMarkets.filter(m => m.saved)
);

// Portfolio selectors
export const selectBets = (state: RootState) => state.portfolio.bets;
export const selectStatistics = (state: RootState) => state.portfolio.statistics;
export const selectTransactions = (state: RootState) => state.portfolio.transactions;
export const selectPortfolioValue = (state: RootState) => state.portfolio.portfolio_value;
export const selectPortfolioLoading = (state: RootState) => state.portfolio.loading;
export const selectPortfolioError = (state: RootState) => state.portfolio.error;
export const selectPortfolioLastUpdate = (state: RootState) => state.portfolio.lastUpdate;

// Notifications selectors
export const selectNotifications = (state: RootState) => state.notifications.items;
export const selectUnreadCount = (state: RootState) => state.notifications.unreadCount;
export const selectNotificationsLoading = (state: RootState) => state.notifications.loading;
export const selectNotificationsError = (state: RootState) => state.notifications.error;
export const selectNotificationsLastUpdate = (state: RootState) => state.notifications.lastUpdate;
