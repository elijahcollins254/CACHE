"use client";

import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import {
    TrendingUp, TrendingDown, Users, Activity, AlertTriangle, CheckCircle,
    AlertCircle, DollarSign, Target, PieChart as PieChartIcon
} from "lucide-react";
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter
} from "recharts";

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

type DashboardData = {
    metrics: {
        total_users: number;
        active_users_30d: number;
        total_markets: number;
        open_markets: number;
        resolved_markets: number;
    };
    financial: {
        total_volume_wagered: number;
        commission_earned: number;
        total_payouts: number;
        total_deposits: number;
        total_withdrawals: number;
        net_cash_flow: number;
    };
    by_category: Record<string, { volume: number; markets: number; commission: number }>;
    top_markets: Array<{ id: number; question: string; volume: number; yes_probability: number; status: string; commission: number }>;
    daily_volume: Array<{ date: string; volume: number }>;
};

type RiskData = {
    market_exposure: Array<{
        market_id: number;
        question: string;
        yes_probability: number;
        status: string;
        volume: number;
        yes_volume: number;
        no_volume: number;
        potential_loss_if_yes: number;
        potential_loss_if_no: number;
        max_exposure: number;
    }>;
    portfolio_health: {
        total_potential_exposure: number;
        liquidity_reserve: number;
        coverage_ratio: number;
        health_score: number;
        risk_level: string;
        recommendation: string;
    };
};

interface DashboardHomeProps {
    loading: boolean;
    error: string;
}

export default function DashboardHome({ loading, error }: DashboardHomeProps) {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [riskData, setRiskData] = useState<RiskData | null>(null);
    const [dashLoading, setDashLoading] = useState(true);
    const [dashError, setDashError] = useState("");

    useEffect(() => {
        loadDashboardData();
        // Refresh every 60 seconds
        const interval = setInterval(loadDashboardData, 60000);
        return () => clearInterval(interval);
    }, []);

    const loadDashboardData = async () => {
        try {
            const [analyticsRes, riskRes] = await Promise.all([
                fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/admin/analytics/`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }),
                fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/admin/risk/`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }),
            ]);

            if (analyticsRes.ok && riskRes.ok) {
                const analytics = await analyticsRes.json();
                const risk = await riskRes.json();
                setDashboardData(analytics);
                setRiskData(risk);
            } else {
                setDashError("Failed to load dashboard data");
            }
        } catch (err) {
            setDashError("Connection error");
            console.error(err);
        } finally {
            setDashLoading(false);
        }
    };

    if (dashLoading) {
        return (
            <div className="text-center py-12">
                <div className="h-8 w-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
        );
    }

    if (dashError && !dashboardData) {
        return (
            <div className="bg-apple-red/10 border border-apple-red/30 rounded-lg p-4 text-center">
                <p className="text-sm text-apple-red font-bold">{dashError}</p>
            </div>
        );
    }

    if (!dashboardData || !riskData) {
        return <div className="text-center py-12"><p className="text-muted-foreground">No data available</p></div>;
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const categoryData = Object.entries(dashboardData.by_category).map(([name, data]) => ({
        name,
        value: data.volume,
        markets: data.markets,
    }));

    const getRiskColor = (score: number) => {
        if (score >= 70) return 'text-apple-green';
        if (score >= 40) return 'text-apple-yellow';
        return 'text-apple-red';
    };

    const getRiskBgColor = (score: number) => {
        if (score >= 70) return 'bg-apple-green/10 border-apple-green/30';
        if (score >= 40) return 'bg-apple-yellow/10 border-apple-yellow/30';
        return 'bg-apple-red/10 border-apple-red/30';
    };

    return (
        <div className="space-y-6">
            {/* Alert System */}
            {riskData.portfolio_health.risk_level === 'HIGH' && (
                <div className="bg-apple-red/10 border border-apple-red/30 rounded-lg p-4 flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-apple-red flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-apple-red">High Risk Alert</p>
                        <p className="text-sm text-apple-red/70">{riskData.portfolio_health.recommendation}</p>
                    </div>
                </div>
            )}

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Total Markets */}
                <div className="apple-card p-4 border border-border">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs text-muted-foreground font-bold uppercase">Total Markets</p>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold text-black">{dashboardData.metrics.total_markets}</p>
                    <div className="flex gap-2 mt-2 text-xs">
                        <span className="px-2 py-1 bg-apple-green/10 text-apple-green rounded">
                            {dashboardData.metrics.open_markets} Open
                        </span>
                        <span className="px-2 py-1 bg-blue/10 text-blue rounded">
                            {dashboardData.metrics.resolved_markets} Resolved
                        </span>
                    </div>
                </div>

                {/* Total Volume */}
                <div className="apple-card p-4 border border-border">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs text-muted-foreground font-bold uppercase">Total Volume</p>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold text-black">{formatCurrency(dashboardData.financial.total_volume_wagered)}</p>
                    <p className="text-xs text-muted-foreground mt-2">All-time wagered</p>
                </div>

                {/* Commission Earned */}
                <div className="apple-card p-4 border border-border">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs text-muted-foreground font-bold uppercase">Commission</p>
                        <DollarSign className="h-4 w-4 text-apple-green" />
                    </div>
                    <p className="text-2xl font-bold text-apple-green">{formatCurrency(dashboardData.financial.commission_earned)}</p>
                    <p className="text-xs text-muted-foreground mt-2">2% platform fee</p>
                </div>

                {/* Active Users */}
                <div className="apple-card p-4 border border-border">
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs text-muted-foreground font-bold uppercase">Active Users</p>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold text-black">{dashboardData.metrics.active_users_30d}k</p>
                    <p className="text-xs text-muted-foreground mt-2">Last 30 days</p>
                </div>

                {/* Health Score */}
                <div className={`apple-card p-4 border ${getRiskBgColor(riskData.portfolio_health.health_score)}`}>
                    <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-bold uppercase">Health Score</p>
                        <CheckCircle className={`h-4 w-4 ${getRiskColor(riskData.portfolio_health.health_score)}`} />
                    </div>
                    <p className={`text-2xl font-bold ${getRiskColor(riskData.portfolio_health.health_score)}`}>
                        {riskData.portfolio_health.health_score}%
                    </p>
                    <p className={`text-xs font-semibold mt-2 ${getRiskColor(riskData.portfolio_health.health_score)}`}>
                        {riskData.portfolio_health.risk_level} Risk
                    </p>
                </div>
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Cash Flow */}
                <div className="apple-card p-6 border border-border">
                    <h3 className="text-lg font-bold text-black mb-4">Cash Flow</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Deposits</span>
                            <span className="font-bold text-apple-green">+{formatCurrency(dashboardData.financial.total_deposits)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Withdrawals</span>
                            <span className="font-bold text-apple-red">-{formatCurrency(dashboardData.financial.total_withdrawals)}</span>
                        </div>
                        <div className="border-t border-border pt-3 flex justify-between">
                            <span className="font-bold text-black">Net Flow</span>
                            <span className={`font-bold ${dashboardData.financial.net_cash_flow >= 0 ? 'text-apple-green' : 'text-apple-red'}`}>
                                {formatCurrency(dashboardData.financial.net_cash_flow)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Payout Summary */}
                <div className="apple-card p-6 border border-border">
                    <h3 className="text-lg font-bold text-black mb-4">Payout Summary</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Payouts</span>
                            <span className="font-bold text-black">{formatCurrency(dashboardData.financial.total_payouts)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Commission Earned</span>
                            <span className="font-bold text-apple-green">{formatCurrency(dashboardData.financial.commission_earned)}</span>
                        </div>
                        <div className="border-t border-border pt-3">
                            <p className="text-xs text-muted-foreground mb-2">Liquidity Reserve</p>
                            <p className="text-xl font-bold text-black">{formatCurrency(riskData.portfolio_health.liquidity_reserve)}</p>
                        </div>
                    </div>
                </div>

                {/* Risk Metrics */}
                <div className="apple-card p-6 border border-border">
                    <h3 className="text-lg font-bold text-black mb-4">Risk Metrics</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Exposure</span>
                            <span className="font-bold text-black">{formatCurrency(riskData.portfolio_health.total_potential_exposure)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Coverage Ratio</span>
                            <span className={`font-bold ${riskData.portfolio_health.coverage_ratio > 1.5 ? 'text-apple-green' : 'text-apple-red'}`}>
                                {riskData.portfolio_health.coverage_ratio.toFixed(2)}x
                            </span>
                        </div>
                        <div className="border-t border-border pt-3">
                            <p className="text-xs text-muted-foreground mb-2">Status</p>
                            <p className={`font-bold ${getRiskColor(riskData.portfolio_health.health_score)}`}>
                                {riskData.portfolio_health.risk_level} Risk
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Daily Volume Trend */}
                <div className="apple-card p-6 border border-border">
                    <h3 className="text-lg font-bold text-black mb-4">Volume Trend (30 days)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={dashboardData.daily_volume}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value) => formatCurrency(value as number)} />
                            <Line
                                type="monotone"
                                dataKey="volume"
                                stroke="#000"
                                dot={false}
                                strokeWidth={2}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Market Distribution */}
                <div className="apple-card p-6 border border-border">
                    <h3 className="text-lg font-bold text-black mb-4">Volume by Category</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry) => `${entry.name}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Markets & High Risk Exposure */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Markets by Volume */}
                <div className="apple-card p-6 border border-border">
                    <h3 className="text-lg font-bold text-black mb-4">Top Markets</h3>
                    <div className="space-y-3">
                        {dashboardData.top_markets.slice(0, 5).map((market, idx) => (
                            <div key={market.id} className="flex items-start justify-between pb-3 border-b border-border last:border-0">
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-black line-clamp-2">{market.question}</p>
                                    <div className="flex gap-2 mt-1 text-xs">
                                        <span className="px-2 py-0.5 bg-muted rounded">{market.category}</span>
                                        <span className="px-2 py-0.5 bg-muted rounded">{market.yes_probability}% Yes</span>
                                    </div>
                                </div>
                                <div className="text-right ml-2">
                                    <p className="text-sm font-bold text-black">{formatCurrency(market.volume)}</p>
                                    <p className="text-xs text-muted-foreground">{formatCurrency(market.commission)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* High Exposure Markets */}
                <div className="apple-card p-6 border border-border">
                    <h3 className="text-lg font-bold text-black mb-4">Highest Exposure</h3>
                    <div className="space-y-3">
                        {riskData.market_exposure.slice(0, 5).map((market, idx) => (
                            <div key={market.market_id} className="flex items-start justify-between pb-3 border-b border-border last:border-0">
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-black line-clamp-2">{market.question}</p>
                                    <div className="flex gap-2 mt-1 text-xs">
                                        <span className="px-2 py-0.5 bg-muted rounded">
                                            Yes: {formatCurrency(market.yes_volume)}
                                        </span>
                                        <span className="px-2 py-0.5 bg-muted rounded">
                                            No: {formatCurrency(market.no_volume)}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right ml-2">
                                    <p className="text-sm font-bold text-apple-red">{formatCurrency(market.max_exposure)}</p>
                                    <p className="text-xs text-muted-foreground">Max Exposure</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
