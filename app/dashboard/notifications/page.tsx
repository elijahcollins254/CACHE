"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector, selectNotifications, selectUnreadCount } from "@/lib/redux/hooks";
import { fetchNotifications } from "@/lib/redux/slices/notificationsSlice";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/useAuth";
import { ArrowLeft, Bell, Trash2, CheckCircle, AlertCircle } from "lucide-react";

export default function NotificationsPage() {
    const { user: authUser, loading: authLoading } = useAuth("/dashboard/notifications");
    const dispatch = useAppDispatch();
    const fetchAttemptedRef = useRef(false);

    const notifications = useAppSelector(selectNotifications);
    const unreadCount = useAppSelector(selectUnreadCount);

    const [error, setError] = useState("");
    const [filter, setFilter] = useState<"all" | "read" | "unread">("all");

    useEffect(() => {
        if (authLoading) return;

        if (!authUser) {
            setError("Please log in");
            return;
        }

        if (fetchAttemptedRef.current) return;
        fetchAttemptedRef.current = true;

        dispatch(fetchNotifications());
    }, [authUser?.phone_number, authLoading, dispatch]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="mx-auto pt-24 max-w-[1200px] px-4">
                    <div className="text-center py-12">
                        <div className="h-8 w-8 border-4 border-foreground border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !authUser) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="mx-auto pt-24 max-w-[1200px] px-4 text-center">
                    <p className="text-red-500 mb-4">{error || "Failed to load page"}</p>
                    <Link href="/dashboard" className="text-apple-blue hover:underline">
                        Back to Dashboard
                    </Link>
                </main>
            </div>
        );
    }

    const filteredNotifications = notifications.filter((notif) => {
        if (filter === "unread") return !notif.read;
        if (filter === "read") return notif.read;
        return true;
    });

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case "warning":
                return <AlertCircle className="h-5 w-5 text-yellow-600" />;
            case "success":
                return <CheckCircle className="h-5 w-5 text-apple-green" />;
            default:
                return <Bell className="h-5 w-5 text-apple-blue" />;
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <Navbar />

            <main className="mx-auto pt-24 max-w-[1200px] px-4 md:px-6">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 hover:bg-muted rounded-lg transition">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-2">
                                <Bell className="h-8 w-8" />
                                Notifications
                            </h1>
                            <p className="text-muted-foreground text-sm">Stay updated with market alerts</p>
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <div className="px-4 py-2 bg-apple-red/10 border border-apple-red/30 rounded-lg">
                            <p className="text-sm font-bold text-apple-red">{unreadCount} unread</p>
                        </div>
                    )}
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-3 mb-8">
                    {["all", "unread", "read"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab as any)}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                                filter === tab
                                    ? "bg-black text-white dark:bg-white dark:text-black"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)} {tab === "all" && `(${notifications.length})`}
                        </button>
                    ))}
                </div>

                {/* Notifications List */}
                <div className="space-y-4">
                    {filteredNotifications.length > 0 ? (
                        filteredNotifications.map((notif) => (
                            <div
                                key={notif.id}
                                className={`bg-background rounded-xl border p-4 transition-all hover:shadow-md ${
                                    notif.read
                                        ? "border-border opacity-75"
                                        : "border-apple-blue/30 bg-apple-blue/5"
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="mt-1">{getNotificationIcon(notif.type || "info")}</div>

                                    <div className="flex-1">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-foreground">{notif.title}</h3>
                                                <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                                                {notif.market_question && (
                                                    <p className="text-xs text-apple-blue font-semibold mt-2 truncate">
                                                        Market: {notif.market_question}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!notif.read && (
                                                    <div className="h-3 w-3 rounded-full bg-apple-blue" />
                                                )}
                                                <button className="p-2 hover:bg-muted rounded-lg transition">
                                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-apple-red" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 text-xs text-muted-foreground">
                                    {new Date(notif.created_at).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12">
                            <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">
                                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
                            </p>
                            <Link href="/" className="text-apple-blue hover:underline text-sm font-bold">
                                Start trading to receive updates
                            </Link>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
