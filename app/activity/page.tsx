"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { TrendingUp, User, Clock, ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

const activities = [
    {
        user: "0x71...2f4",
        action: "Bought YES",
        market: "Nairobi Rainfall March 2026",
        amount: "KSh 45,000",
        time: "2 mins ago"
    },
    {
        user: "0x12...a8e",
        action: "Sold NO",
        market: "KES/USD stays below 130",
        amount: "KSh 12,500",
        time: "15 mins ago"
    },
    {
        user: "0x9d...441",
        action: "Bought Patriots",
        market: "Seahawks vs Patriots",
        amount: "KSh 250,000",
        time: "45 mins ago"
    },
    {
        user: "0xb2...c3d",
        action: "Claimed Profit",
        market: "Eliud Kipchoge Retirement",
        amount: "KSh 8,200",
        time: "1 hour ago"
    }
];

export default function Activity() {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="mx-auto max-w-[800px] px-6 pt-32 pb-20">
                <h1 className="text-4xl font-extrabold tracking-tight mb-4">Global Activity</h1>
                <p className="text-muted-foreground mb-12">Live feed of predictions happening across Kenya.</p>

                <div className="space-y-4">
                    {activities.map((act, i) => (
                        <div key={i} className="apple-card p-6 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm tracking-tight">{act.user}</span>
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${act.action.includes("Bought") ? "bg-apple-green/10 text-apple-green" :
                                                act.action.includes("Sold") ? "bg-apple-red/10 text-apple-red" :
                                                    "bg-apple-blue/10 text-apple-blue"
                                            }`}>
                                            {act.action}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground mt-0.5">{act.market}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-sm">{act.amount}</div>
                                <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-muted-foreground mt-1 uppercase">
                                    <Clock className="h-3 w-3" />
                                    {act.time}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
