"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAppDispatch, useAppSelector, selectNotifications, selectNotificationsLoading } from "@/lib/redux/hooks";
import { fetchNotifications } from "@/lib/redux/slices/notificationsSlice";
import { ArrowLeft, Bell } from "lucide-react";

export default function NotificationsPage() {
    const dispatch = useAppDispatch();
    const notifications = useAppSelector(selectNotifications);
    const loading = useAppSelector(selectNotificationsLoading);

    useEffect(() => {
        dispatch(fetchNotifications());
    }, [dispatch]);

    const getColorClasses = (colorClass: string) => {
        const colorMap: { [key: string]: { bg: string; border: string; textTitle: string; textMsg: string; textTime: string } } = {
            blue: {
                bg: 'bg-blue-50 dark:bg-blue-950/40',
                border: 'border-blue-200 dark:border-blue-900/40',
                textTitle: 'text-blue-800 dark:text-blue-300',
                textMsg: 'text-blue-700 dark:text-blue-300',
                textTime: 'text-blue-700 dark:text-blue-400'
            },
            green: {
                bg: 'bg-green-50 dark:bg-green-950/40',
                border: 'border-green-200 dark:border-green-900/40',
                textTitle: 'text-green-800 dark:text-green-300',
                textMsg: 'text-green-700 dark:text-green-300',
                textTime: 'text-green-700 dark:text-green-400'
            },
            purple: {
                bg: 'bg-purple-50 dark:bg-purple-950/40',
                border: 'border-purple-200 dark:border-purple-900/40',
                textTitle: 'text-purple-950 dark:text-purple-200',
                textMsg: 'text-purple-900 dark:text-purple-200',
                textTime: 'text-purple-900 dark:text-purple-300'
            },
            orange: {
                bg: 'bg-orange-50 dark:bg-orange-950/40',
                border: 'border-orange-200 dark:border-orange-900/40',
                textTitle: 'text-orange-800 dark:text-orange-300',
                textMsg: 'text-orange-700 dark:text-orange-300',
                textTime: 'text-orange-700 dark:text-orange-400'
            },
            red: {
                bg: 'bg-red-50 dark:bg-red-950/40',
                border: 'border-red-200 dark:border-red-900/40',
                textTitle: 'text-red-800 dark:text-red-300',
                textMsg: 'text-red-700 dark:text-red-300',
                textTime: 'text-red-700 dark:text-red-400'
            },
        };
        return colorMap[colorClass] || colorMap.blue;
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="mx-auto pt-32 sm:pt-24 max-w-2xl px-4 md:px-6 pb-20">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-6 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <Bell className="h-6 w-6 text-foreground" />
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Notifications</h1>
                    </div>
                    <p className="text-sm text-muted-foreground">Stay updated with your activity</p>
                </div>

                {/* Notifications List */}
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : notifications.length > 0 ? (
                    <div className="space-y-4">
                        {notifications.map((notif) => {
                            const colors = getColorClasses(notif.color_class);
                            return (
                                <div
                                    key={notif.id}
                                    className={`p-4 rounded-lg border ${colors.bg} ${colors.border} transition-colors hover:opacity-80`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className={`text-sm font-bold ${colors.textTitle}`}>{notif.title}</p>
                                            <p className={`text-sm ${colors.textMsg} mt-1`}>{notif.message}</p>
                                        </div>
                                    </div>
                                    <p className={`text-xs ${colors.textTime} mt-2`}>{notif.time}</p>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Bell className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h2 className="text-lg font-semibold text-foreground mb-1">No notifications yet</h2>
                        <p className="text-sm text-muted-foreground">You'll see your activity notifications here</p>
                    </div>
                )}
            </main>
        </div>
    );
}
