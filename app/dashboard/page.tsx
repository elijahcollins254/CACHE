"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { Wallet, TrendingUp, History, Bell, ArrowLeft, LogOut } from "lucide-react";
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
            description: "View your active positions and market holdings",
            icon: TrendingUp,
            href: "/dashboard/portfolio",
            color: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40",
            iconColor: "text-amber-700 dark:text-amber-400",
            stat: activePositions,
            statLabel: "active positions",
        },
        {
            title: "Profits & Losses",
            description: "Track your earnings and performance over time",
            icon: History,
            href: "/dashboard/profits-losses",
            color: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/40",
            iconColor: "text-orange-700 dark:text-orange-400",
            stat: `${netPnL >= 0 ? '+' : ''}KES ${netPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            statLabel: "net P&L",
            statColor: netPnL >= 0 ? "text-emerald-600" : "text-red-600",
        },
        {
            title: "Notifications",
            description: "Stay updated with market alerts and updates",
            icon: Bell,
            href: "/dashboard/notifications",
            color: "bg-stone-50 dark:bg-stone-950/20 border-stone-200 dark:border-stone-900/40",
            iconColor: "text-stone-700 dark:text-stone-400",
            stat: unreadCount,
            statLabel: "unread",
        },
    ];

    return (
        <div className="min-h-screen bg-background pb-12">            <main className="mx-auto pt-24 max-w-[1200px] px-4 md:px-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Link href="/" className="p-2 hover:bg-muted rounded-lg transition">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                            <div>
                                <h1 className="text-4xl font-bold">Dashboard</h1>
                                <p className="text-muted-foreground text-sm">Welcome back, {authUser?.username ? `@${authUser.username}` : authUser?.full_name || "User"}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                        >
                            <LogOut className="h-4 w-4" />
                            Logout
                        </button>
                    </div>

                </div>

                {/* Navigation Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {sections.map((section) => {
                        const Icon = section.icon;
                        return (
                            <Link
                                key={section.href}
                                href={section.href}
                                className={`group rounded-xl border p-4 transition-all hover:shadow-lg active:scale-95 cursor-pointer ${section.color}`}
                            >
                                <div className="flex flex-col h-full">
                                    <div className={`mb-3 p-2 rounded-lg w-fit group-hover:scale-110 transition-transform`}>
                                        <Icon className={`h-5 w-5 ${section.iconColor}`} />
                                    </div>
                                    <h3 className="font-bold text-foreground text-sm md:text-base mb-3">{section.title}</h3>
                                    
                                    {/* Summary Stat */}
                                    <div className="mb-3">
                                        <p className={`text-sm md:text-base font-bold ${section.statColor || 'text-foreground'} truncate`}>
                                            {section.stat ?? '—'}
                                        </p>
                                    </div>
                                    
                                    <button className="mt-auto text-apple-blue font-semibold text-xs md:text-sm hover:underline text-left">
                                        See more →
                                    </button>
                                </div>
                            </Link>
                        );
                    })}
                </div>

            </main>
        </div>
    );
}