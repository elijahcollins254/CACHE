"use client";

import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import {
    AlertTriangle, AlertCircle, CheckCircle, Info, Bell, X, Clock,
    TrendingUp, TrendingDown, DollarSign, Users, Zap
} from "lucide-react";

interface Alert {
    id: string;
    type: "error" | "warning" | "info" | "success";
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    actionUrl?: string;
    metadata?: Record<string, any>;
}

export default function AlertsCenter() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "unread" | "errors" | "warnings">("unread");

    useEffect(() => {
        loadAlerts();
        // Check for new alerts every 15 seconds
        const interval = setInterval(loadAlerts, 15000);
        return () => clearInterval(interval);
    }, []);

    const loadAlerts = async () => {
        try {
            // In a real app, this would be a dedicated endpoint
            // For now, we'll simulate alerts based on system state
            const newAlerts: Alert[] = [];

            // Check system health
            const healthRes = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/health/`,
                { method: "GET" }
            ).catch(() => null);

            if (healthRes && !healthRes.ok) {
                newAlerts.push({
                    id: "health-" + Date.now().toString(),
                    type: "error",
                    title: "System Health Alert",
                    message: "API connectivity issues detected",
                    timestamp: new Date(),
                    read: false,
                });
            }

            // Get analytics to detect anomalies
            const analyticsRes = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/admin/analytics/`,
                { method: "GET" }
            );

            if (analyticsRes.ok) {
                const data = await analyticsRes.json();

                // Large deposit alert
                if (data.financial?.total_deposits > 1000000) {
                    newAlerts.push({
                        id: "large-deposit-" + Date.now(),
                        type: "info",
                        title: "Large Deposit Detected",
                        message: `KES ${(data.financial.total_deposits / 1000000).toFixed(1)}M in deposits today`,
                        timestamp: new Date(),
                        read: false,
                        metadata: { amount: data.financial.total_deposits },
                    });
                }

                // Low liquidity warning
                const riskRes = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/markets/admin/risk/`,
                    { method: "GET" }
                );

                if (riskRes.ok) {
                    const risk = await riskRes.json();
                    if (risk.portfolio_health.health_score < 40) {
                        newAlerts.push({
                            id: "low-liquidity-" + Date.now(),
                            type: "warning",
                            title: "Low Liquidity Reserve",
                            message: `Health score: ${risk.portfolio_health.health_score}%. ${risk.portfolio_health.recommendation}`,
                            timestamp: new Date(),
                            read: false,
                            metadata: { healthScore: risk.portfolio_health.health_score },
                        });
                    }
                }

                // New market alert
                if (data.metrics?.total_markets > 0) {
                    newAlerts.push({
                        id: "new-market-" + Date.now(),
                        type: "success",
                        title: "Markets Active",
                        message: `${data.metrics.open_markets} markets currently open for trading`,
                        timestamp: new Date(),
                        read: true,
                        metadata: { openMarkets: data.metrics.open_markets },
                    });
                }
            }

            setAlerts(newAlerts);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = (id: string) => {
        setAlerts(alerts.map((a) => (a.id === id ? { ...a, read: true } : a)));
    };

    const dismissAlert = (id: string) => {
        setAlerts(alerts.filter((a) => a.id !== id));
    };

    const filteredAlerts = alerts.filter((a) => {
        if (filter === "unread") return !a.read;
        if (filter === "errors") return a.type === "error";
        if (filter === "warnings") return a.type === "warning";
        return true;
    });

    const getAlertIcon = (type: string) => {
        switch (type) {
            case "error":
                return <AlertTriangle className="h-5 w-5 text-apple-red" />;
            case "warning":
                return <AlertCircle className="h-5 w-5 text-apple-yellow" />;
            case "success":
                return <CheckCircle className="h-5 w-5 text-apple-green" />;
            default:
                return <Info className="h-5 w-5 text-blue" />;
        }
    };

    const getAlertBgColor = (type: string) => {
        switch (type) {
            case "error":
                return "bg-apple-red/5 border-apple-red/20";
            case "warning":
                return "bg-apple-yellow/5 border-apple-yellow/20";
            case "success":
                return "bg-apple-green/5 border-apple-green/20";
            default:
                return "bg-blue/5 border-blue/20";
        }
    };

    const unreadCount = alerts.filter((a) => !a.read).length;

    return (
        <div className="space-y-4">
            {/* Alert Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="apple-card p-4 border border-border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground">Total Alerts</p>
                            <p className="text-2xl font-bold text-black">{alerts.length}</p>
                        </div>
                        <Bell className="h-5 w-5 text-muted-foreground" />
                    </div>
                </div>
                <div className="apple-card p-4 border border-border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground">Unread</p>
                            <p className="text-2xl font-bold text-blue">{unreadCount}</p>
                        </div>
                        <Zap className="h-5 w-5 text-blue" />
                    </div>
                </div>
                <div className="apple-card p-4 border border-border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground">Errors</p>
                            <p className="text-2xl font-bold text-apple-red">
                                {alerts.filter((a) => a.type === "error").length}
                            </p>
                        </div>
                        <AlertTriangle className="h-5 w-5 text-apple-red" />
                    </div>
                </div>
                <div className="apple-card p-4 border border-border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground">Warnings</p>
                            <p className="text-2xl font-bold text-apple-yellow">
                                {alerts.filter((a) => a.type === "warning").length}
                            </p>
                        </div>
                        <AlertCircle className="h-5 w-5 text-apple-yellow" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {(["all", "unread", "errors", "warnings"] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                            filter === f
                                ? "bg-black text-white"
                                : "border border-border hover:border-black"
                        }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Alerts List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="h-8 w-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading alerts...</p>
                </div>
            ) : filteredAlerts.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-lg">
                    <CheckCircle className="h-8 w-8 text-apple-green mx-auto mb-2" />
                    <p className="text-muted-foreground">No alerts to display</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredAlerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`border rounded-lg p-4 ${getAlertBgColor(alert.type)} ${
                                !alert.read ? "border-l-4" : ""
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                    {getAlertIcon(alert.type)}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-black">{alert.title}</h4>
                                            {!alert.read && (
                                                <span className="h-2 w-2 bg-blue rounded-full animate-pulse"></span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {alert.timestamp.toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-2">
                                    {!alert.read && (
                                        <button
                                            onClick={() => markAsRead(alert.id)}
                                            className="px-2 py-1 text-xs border border-border rounded hover:bg-muted transition-all"
                                        >
                                            Mark Read
                                        </button>
                                    )}
                                    <button
                                        onClick={() => dismissAlert(alert.id)}
                                        className="text-muted-foreground hover:text-black transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
