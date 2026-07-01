"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { Wallet, TrendingUp, History, Bell, ArrowLeft, LogOut, ChevronRight } from "lucide-react";
import { useAppDispatch, useAppSelector, selectBalance, selectPortfolioValue, selectBets, selectUnreadCount } from "@/lib/redux/hooks";
import { fetchDashboardData } from "@/lib/redux/slices/portfolioSlice";

export default function DashboardHub() {
    const { user: authUser, loading: authLoading } = useAuth("/dashboard");
    const dispatch = useAppDispatch();
    const fetchAttemptedRef = useRef(false);
    
    const balance = useAppSelector(selectBalance);
    const portfolioValue = useAppSelector(selectPortfolioValue);
    const bets = useAppSelector(selectBets);
    const unreadCount = useAppSelector(selectUnreadCount);
    
    const [error, setError] = useState("");

    useEffect(() => {
        if (!authLoading && !authUser) {
            setError("Please log in");
        }
    }, [authUser, authLoading]);

    useEffect(() => {
        if (authLoading || !authUser) return;
        if (fetchAttemptedRef.current) return;
        fetchAttemptedRef.current = true;
        dispatch(fetchDashboardData());
    }, [authUser?.phone_number, authLoading, dispatch]);

    const handleLogout = () => {
        localStorage.removeItem("poly_user");
        window.location.href = "/login";
    };

    // Calculate portfolio stats
    const netPositions: { [key: string]: any } = {};
    bets
        .filter(b => b.result === 'PENDING')
        .forEach((bet: any) => {
            const positionKey = `${bet.market_id}-${bet.outcome}`;
            if (!netPositions[positionKey]) {
                netPositions[positionKey] = { total_bought: 0, total_sold: 0 };
            }
            if (bet.action === 'BUY') netPositions[positionKey].total_bought += Number(bet.quantity || 1);
            else if (bet.action === 'SELL') netPositions[positionKey].total_sold += Number(bet.quantity || 1);
        });
    const activePositions = Object.values(netPositions).filter((pos: any) => pos.total_bought > pos.total_sold).length;

    // Calculate P&L
    const completedBets = bets.filter(b => b.result !== 'PENDING');
    const wins = completedBets.filter(b => b.result === 'WON');
    const losses = completedBets.filter(b => b.result === 'LOST');
    const totalWinnings = wins.reduce((sum, b) => sum + (parseFloat(b.payout || "0") - parseFloat(b.amount)), 0);
    const totalLosses = losses.reduce((sum, b) => sum + parseFloat(b.amount), 0);
    const netPnL = totalWinnings - totalLosses;

    const formatCurrency = (value: string | number | undefined) => {
        const amount = Number(value || 0);
        return `KES ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    };

    const recentActivity = [...bets]
        .sort((a: any, b: any) => {
            const aTime = new Date(a.created_at || a.updated_at || a.timestamp || 0).getTime();
            const bTime = new Date(b.created_at || b.updated_at || b.timestamp || 0).getTime();
            return bTime - aTime;
        })
        .slice(0, 4);

    const quickStats = [
        {
            label: "Wallet balance",
            value: formatCurrency(balance),
            description: "Available funds ready to use",
            icon: Wallet,
        },
        {
            label: "Portfolio value",
            value: formatCurrency(portfolioValue),
            description: "Estimated value of your holdings",
            icon: TrendingUp,
        },
        {
            label: "Open positions",
            value: activePositions.toString(),
            description: "Markets currently exposed",
            icon: History,
        },
        {
            label: "Unread alerts",
            value: unreadCount.toString(),
            description: "Notifications and market updates",
            icon: Bell,
        },
    ];

    if (authLoading) {
        return (
            <div className="min-h-screen bg-background">                <main className="mx-auto pt-24 max-w-[1200px] px-4">
                    <div className="text-center py-12">
                        <div className="h-8 w-8 border-4 border-foreground border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !authUser) {
        return (
            <div className="min-h-screen bg-background">                <main className="mx-auto pt-24 max-w-[1200px] px-4 text-center">
                    <p className="text-red-500 mb-4">{error || "Failed to load dashboard"}</p>
                    <Link href="/login" className="text-apple-blue hover:underline">
                        Return to login
                    </Link>
                </main>
            </div>
        );
    }

    const sections = [
        {
            title: "Portfolio",
            icon: TrendingUp,
            href: "/dashboard/portfolio",
            stat: activePositions,
            statLabel: "open positions",
        },
        {
            title: "P&L",
            icon: History,
            href: "/dashboard/profits-losses",
            stat: `${netPnL >= 0 ? '+' : ''}KES ${netPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            statLabel: "net result",
            statColor: netPnL >= 0 ? "text-emerald-600" : "text-red-600",
        },
        {
            title: "Alerts",
            icon: Bell,
            href: "/dashboard/notifications",
            stat: unreadCount,
            statLabel: "unread",
        },
    ];

    return (
        <div className="min-h-screen bg-background pb-12">
            <main className="mx-auto pt-24 max-w-[1200px] px-4 md:px-6">
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="rounded-lg p-2 transition hover:bg-muted">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-4xl font-bold">Dashboard</h1>
                            <p className="text-sm text-muted-foreground">
                                Welcome back, {authUser?.username ? `@${authUser.username}` : authUser?.full_name || "User"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>

                <div className="rounded-2xl border bg-card p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Overview</p>
                            <h2 className="text-xl font-semibold">Your account at a glance</h2>
                        </div>
                        <div className={`rounded-lg border px-3 py-2 text-sm ${netPnL >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400" : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"}`}>
                            {netPnL >= 0 ? "+" : ""}{netPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })} P&amp;L
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {quickStats.map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <div key={stat.label} className="rounded-xl border bg-background/70 p-3">
                                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                                        <Icon className="h-4 w-4 text-foreground" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                                    <p className="mt-1 text-base font-semibold text-foreground">{stat.value}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-2xl border bg-card p-5 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-base font-semibold">Quick view</h3>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                            {sections.map((section) => {
                                const Icon = section.icon;
                                return (
                                    <Link
                                        key={section.href}
                                        href={section.href}
                                        className="flex items-center justify-between rounded-xl border bg-background/70 p-3 transition hover:bg-muted"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{section.title}</p>
                                                <p className="text-xs text-muted-foreground">{section.statLabel}</p>
                                            </div>
                                        </div>
                                        <div className={`text-sm font-semibold ${section.statColor || "text-foreground"}`}>
                                            {section.stat ?? "—"}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded-2xl border bg-card p-5 shadow-sm">
                        <div className="mb-3">
                            <h3 className="text-base font-semibold">Recent activity</h3>
                        </div>
                        {recentActivity.length > 0 ? (
                            <ul className="space-y-3">
                                {recentActivity.map((bet: any, index: number) => (
                                    <li key={bet.id || `${bet.market_id}-${index}`} className="flex items-center justify-between rounded-lg border bg-background/70 p-3">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{bet.market_name || bet.market_id || "Market"}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {bet.outcome || "Outcome"} • {bet.action || "Bet"}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-foreground">{formatCurrency(bet.amount || 0)}</p>
                                            <p className={`text-xs ${bet.result === "WON" ? "text-emerald-600" : bet.result === "LOST" ? "text-red-600" : "text-muted-foreground"}`}>
                                                {bet.result || "Pending"}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                                No activity yet.
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
